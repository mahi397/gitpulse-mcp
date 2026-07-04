import { z } from "zod";
import type { Env } from "../types";
import { ghPaginated } from "../github/client";
import { computeRepoPulse } from "../analytics/repoPulse";
import { withCache } from "../cache";
import { toToolError } from "../errors";

export const repoPulseSchema = z.object({
	owner: z.string().describe("GitHub repository owner (user or org)"),
	repo: z.string().describe("GitHub repository name"),
	days: z.number().int().positive().max(365).default(30).describe("Size of the lookback window in days"),
});

export type RepoPulseInput = z.infer<typeof repoPulseSchema>;

export const repoPulseDescription =
	"Activity snapshot for a repo: PRs opened/merged/closed, commit count, and active contributor count over a time window. Answers 'how active is this repo right now?'";

interface RestPull {
	created_at: string;
	merged_at: string | null;
	closed_at: string | null;
}

interface RestCommit {
	author: { login: string } | null;
}

export async function getRepoPulse(env: Env, input: RepoPulseInput) {
	try {
		return await withCache(env, "get_repo_pulse", input, async () => {
			const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000).toISOString();

			const pulls = await ghPaginated<RestPull>(
				env,
				`/repos/${input.owner}/${input.repo}/pulls?state=all&sort=created&direction=desc`,
			);
			const windowedPulls: RestPull[] = [];
			for (const pr of pulls) {
				if (pr.created_at < since) break;
				windowedPulls.push(pr);
			}

			const commits = await ghPaginated<RestCommit>(
				env,
				`/repos/${input.owner}/${input.repo}/commits?since=${since}`,
			);

			const pulse = computeRepoPulse(
				windowedPulls.map((pr) => ({
					createdAt: pr.created_at,
					mergedAt: pr.merged_at,
					closedAt: pr.closed_at,
				})),
				commits.map((c) => ({ authorLogin: c.author?.login ?? null })),
			);

			return {
				owner: input.owner,
				repo: input.repo,
				days: input.days,
				...pulse,
				summary: `${input.owner}/${input.repo}: ${pulse.prsOpened} PRs opened, ${pulse.prsMerged} merged, ${pulse.commitCount} commits, ${pulse.activeContributors} active contributors in the last ${input.days} days.`,
			};
		});
	} catch (err) {
		return toToolError(err);
	}
}
