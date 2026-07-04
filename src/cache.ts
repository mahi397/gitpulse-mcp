import type { Env } from "./types";

const DEFAULT_TTL_SECONDS = 15 * 60;

async function sha256Hex(input: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function cacheKey(toolName: string, args: unknown): Promise<string> {
	const hash = await sha256Hex(JSON.stringify(args));
	return `${toolName}:${hash}`;
}

/** Returns the cached value for (toolName, args) if present, otherwise computes, caches, and returns it. */
export async function withCache<T>(
	env: Env,
	toolName: string,
	args: unknown,
	compute: () => Promise<T>,
	ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<T> {
	const key = await cacheKey(toolName, args);
	const cached = await env.GITPULSE_CACHE.get(key, "json");
	if (cached !== null) {
		return cached as T;
	}
	const value = await compute();
	await env.GITPULSE_CACHE.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
	return value;
}
