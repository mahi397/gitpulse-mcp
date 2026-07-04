import { z } from "zod";
import type { Env } from "../types";
import { ghPaginated } from "../github/client";
import { findStalePrs, type OpenPrInput } from "../analytics/staleness";
import { withCache } from "../cache";
import { toToolError } from "../errors";

export const stalePrsSchema = z.object({
	owner: z.string().describe("GitHub repository owner (user or org)"),
	repo: z.string().describe("GitHub repository name"),
	stale_after_days: z.number().int().positive().max(365).default(7).describe("Days of inactivity before a PR is considered stale"),
});

export type StalePrsInput = z.infer<typeof stalePrsSchema>;

export const stalePrsDescription =
	"Open PRs with no activity past a staleness threshold, sorted most-stale first. Answers 'which open PRs are at risk of going stale?'";

interface RestPull {
	number: number;
	title: string;
	html_url: string;
	created_at: string;
	updated_at: string;
	user: { login: string } | null;
	requested_reviewers: Array<{ login: string }>;
}

export async function findStalePullRequests(env: Env, input: StalePrsInput) {
	try {
		return await withCache(env, "find_stale_prs", input, async () => {
			const pulls = await ghPaginated<RestPull>(
				env,
				`/repos/${input.owner}/${input.repo}/pulls?state=open&sort=updated&direction=asc`,
			);

			const openPrs: OpenPrInput[] = pulls.map((pr) => ({
				number: pr.number,
				title: pr.title,
				author: pr.user?.login ?? "unknown",
				url: pr.html_url,
				createdAt: pr.created_at,
				lastActivityAt: pr.updated_at,
				requestedReviewers: pr.requested_reviewers.map((r) => r.login),
			}));

			const stale = findStalePrs(openPrs, input.stale_after_days);

			return {
				owner: input.owner,
				repo: input.repo,
				staleAfterDays: input.stale_after_days,
				staleCount: stale.length,
				prs: stale,
				summary: `${input.owner}/${input.repo}: ${stale.length} open PR(s) stale for ${input.stale_after_days}+ days.`,
			};
		});
	} catch (err) {
		return toToolError(err);
	}
}
