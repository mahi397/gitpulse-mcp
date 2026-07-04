import type { GitPulseMCP } from "./index";

export interface Env {
	MCP_OBJECT: DurableObjectNamespace<GitPulseMCP>;
	GITPULSE_CACHE: KVNamespace;
	GITHUB_TOKEN: string;
}

export interface ToolError {
	error: string;
	retry_after_seconds?: number;
}

export interface PullRequestSummary {
	number: number;
	title: string;
	author: string;
	url: string;
	createdAt: string;
}

export interface StalePullRequest extends PullRequestSummary {
	daysStale: number;
	requestedReviewers: string[];
}

export interface ReviewTimings {
	number: number;
	title: string;
	url: string;
	author: string;
	hoursToFirstReview: number | null;
	hoursToMerge: number;
}

export interface CommitRecord {
	sha: string;
	message: string;
	authorLogin: string;
	authoredDate: string;
}
