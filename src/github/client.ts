import type { Env } from "../types";

const GITHUB_API = "https://api.github.com";
const GITHUB_GRAPHQL = "https://api.github.com/graphql";
const MAX_RETRIES = 2;
const MAX_PAGES = 5;
const PER_PAGE = 100;

export class GitHubNotFoundError extends Error {}

export class GitHubRateLimitError extends Error {
	retryAfterSeconds: number;
	constructor(message: string, retryAfterSeconds: number) {
		super(message);
		this.retryAfterSeconds = retryAfterSeconds;
	}
}

function authHeaders(env: Env): HeadersInit {
	return {
		Authorization: `Bearer ${env.GITHUB_TOKEN}`,
		"User-Agent": "gitpulse-mcp",
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
	};
}

function rateLimitFromResponse(response: Response): GitHubRateLimitError | null {
	if (response.status !== 403 && response.status !== 429) return null;
	if (response.headers.get("x-ratelimit-remaining") !== "0") return null;
	const reset = Number(response.headers.get("x-ratelimit-reset") ?? "0");
	const retryAfterSeconds = Math.max(0, reset - Math.floor(Date.now() / 1000));
	return new GitHubRateLimitError("GitHub API rate limit exceeded", retryAfterSeconds);
}

async function requestWithRetries(fn: () => Promise<Response>): Promise<Response> {
	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		const response = await fn();
		const rateLimitError = rateLimitFromResponse(response);
		if (rateLimitError) throw rateLimitError;
		if (response.status >= 500 && attempt < MAX_RETRIES) {
			await new Promise((resolve) => setTimeout(resolve, 200 * 2 ** attempt));
			continue;
		}
		return response;
	}
	throw new Error("GitHub API request failed after retries");
}

function nextLinkUrl(linkHeader: string | null): string | null {
	if (!linkHeader) return null;
	const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
	return match ? match[1] : null;
}

export async function ghRequest<T>(env: Env, path: string): Promise<T> {
	const response = await requestWithRetries(() =>
		fetch(`${GITHUB_API}${path}`, { headers: authHeaders(env) }),
	);
	if (response.status === 404) {
		throw new GitHubNotFoundError(`Not found: ${path}`);
	}
	if (!response.ok) {
		throw new Error(`GitHub API error ${response.status}`);
	}
	return response.json() as Promise<T>;
}

/** Follows Link-header pagination for endpoints that return a JSON array. Caps at MAX_PAGES. */
export async function ghPaginated<T>(env: Env, path: string): Promise<T[]> {
	const separator = path.includes("?") ? "&" : "?";
	let url: string | null = `${GITHUB_API}${path}${separator}per_page=${PER_PAGE}`;
	const items: T[] = [];

	for (let page = 0; page < MAX_PAGES && url; page++) {
		const response = await requestWithRetries(() => fetch(url as string, { headers: authHeaders(env) }));
		if (response.status === 404) {
			throw new GitHubNotFoundError(`Not found: ${path}`);
		}
		if (!response.ok) {
			throw new Error(`GitHub API error ${response.status}`);
		}
		const batch = (await response.json()) as T[];
		items.push(...batch);
		url = nextLinkUrl(response.headers.get("link"));
	}
	return items;
}

export async function ghGraphQL<T>(
	env: Env,
	query: string,
	variables: Record<string, unknown>,
): Promise<T> {
	const response = await requestWithRetries(() =>
		fetch(GITHUB_GRAPHQL, {
			method: "POST",
			headers: { ...authHeaders(env), "Content-Type": "application/json" },
			body: JSON.stringify({ query, variables }),
		}),
	);
	if (!response.ok) {
		throw new Error(`GitHub GraphQL error ${response.status}`);
	}
	const body = (await response.json()) as {
		data?: T;
		errors?: Array<{ message: string; type?: string }>;
	};
	if (body.errors?.length) {
		const notFound = body.errors.some((e) => e.type === "NOT_FOUND");
		if (notFound) throw new GitHubNotFoundError(body.errors[0].message);
		throw new Error(body.errors[0].message);
	}
	if (!body.data) throw new Error("GitHub GraphQL returned no data");
	return body.data;
}
