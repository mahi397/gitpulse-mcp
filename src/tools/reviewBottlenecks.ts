import { z } from "zod";
import type { Env } from "../types";
import { ghGraphQL } from "../github/client";
import { REVIEW_BOTTLENECKS_QUERY, type ReviewBottlenecksSearchResponse } from "../github/queries";
import { computeReviewBottlenecks, type RawReviewPr } from "../analytics/reviewBottlenecks";
import { withCache } from "../cache";
import { toToolError } from "../errors";

export const reviewBottlenecksSchema = z.object({
	owner: z.string().describe("GitHub repository owner (user or org)"),
	repo: z.string().describe("GitHub repository name"),
	days: z.number().int().positive().max(365).default(30).describe("Size of the lookback window in days"),
});

export type ReviewBottlenecksInput = z.infer<typeof reviewBottlenecksSchema>;

export const reviewBottlenecksDescription =
	"Time-to-first-review and time-to-merge (median + p90) for recently merged PRs, plus the slowest PRs to merge. Answers 'where are code reviews bottlenecked?'";

const MAX_PAGES = 3;

export async function getReviewBottlenecks(env: Env, input: ReviewBottlenecksInput) {
	try {
		return await withCache(env, "get_review_bottlenecks", input, async () => {
			const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
			const searchQuery = `repo:${input.owner}/${input.repo} is:pr is:merged merged:>=${since}`;

			const prs: RawReviewPr[] = [];
			let cursor: string | null = null;
			for (let page = 0; page < MAX_PAGES; page++) {
				const data: ReviewBottlenecksSearchResponse = await ghGraphQL(env, REVIEW_BOTTLENECKS_QUERY, {
					searchQuery,
					cursor,
				});
				for (const node of data.search.nodes) {
					prs.push({
						number: node.number,
						title: node.title,
						url: node.url,
						author: node.author?.login ?? "unknown",
						createdAt: node.createdAt,
						mergedAt: node.mergedAt,
						firstReviewAt: node.reviews.nodes[0]?.submittedAt ?? null,
					});
				}
				if (!data.search.pageInfo.hasNextPage) break;
				cursor = data.search.pageInfo.endCursor;
			}

			const bottlenecks = computeReviewBottlenecks(prs);

			return {
				owner: input.owner,
				repo: input.repo,
				days: input.days,
				mergedPrCount: prs.length,
				...bottlenecks,
				summary: `${input.owner}/${input.repo}: median time-to-first-review ${bottlenecks.medianHoursToFirstReview.toFixed(1)}h (p90 ${bottlenecks.p90HoursToFirstReview.toFixed(1)}h), median time-to-merge ${bottlenecks.medianHoursToMerge.toFixed(1)}h (p90 ${bottlenecks.p90HoursToMerge.toFixed(1)}h) across ${prs.length} merged PRs in the last ${input.days} days.`,
			};
		});
	} catch (err) {
		return toToolError(err);
	}
}
