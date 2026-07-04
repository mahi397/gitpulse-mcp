import { z } from "zod";
import type { Env } from "../types";
import { ghPaginated } from "../github/client";
import { compileLintPattern, analyzeCommitLint } from "../analytics/lintStats";
import { withCache } from "../cache";
import { toToolError } from "../errors";

const DEFAULT_PATTERN = "^[A-Z]+-[0-9]+: .+";

export const commitLintSchema = z.object({
	owner: z.string().describe("GitHub repository owner (user or org)"),
	repo: z.string().describe("GitHub repository name"),
	days: z.number().int().positive().max(365).default(30).describe("Size of the lookback window in days"),
	pattern: z
		.string()
		.max(200)
		.default(DEFAULT_PATTERN)
		.describe("Regex commit-message convention to check against, e.g. JIRA-style 'PROJ-123: description'"),
});

export type CommitLintInput = z.infer<typeof commitLintSchema>;

export const commitLintDescription =
	"Percentage of commits matching a message convention (regex), worst-offender authors, and week-over-week trend. Answers 'is our commit hygiene improving?'";

interface RestCommit {
	sha: string;
	commit: { message: string; author: { date: string } | null };
	author: { login: string } | null;
}

export async function lintCommitHistory(env: Env, input: CommitLintInput) {
	try {
		let pattern: RegExp;
		try {
			pattern = compileLintPattern(input.pattern);
		} catch (err) {
			return toToolError(err);
		}

		return await withCache(env, "lint_commit_history", input, async () => {
			const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000).toISOString();

			const commits = await ghPaginated<RestCommit>(
				env,
				`/repos/${input.owner}/${input.repo}/commits?since=${since}`,
			);

			const result = analyzeCommitLint(
				commits.map((c) => ({
					sha: c.sha,
					message: c.commit.message,
					authorLogin: c.author?.login ?? "unknown",
					authoredDate: c.commit.author?.date ?? since,
				})),
				pattern,
			);

			return {
				owner: input.owner,
				repo: input.repo,
				days: input.days,
				pattern: input.pattern,
				...result,
				summary: `${input.owner}/${input.repo}: ${(result.matchRate * 100).toFixed(0)}% of ${result.totalCommits} commits match the convention over the last ${input.days} days.`,
			};
		});
	} catch (err) {
		return toToolError(err);
	}
}
