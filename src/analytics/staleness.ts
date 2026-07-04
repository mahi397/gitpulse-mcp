import type { StalePullRequest } from "../types";

export interface OpenPrInput {
	number: number;
	title: string;
	author: string;
	url: string;
	createdAt: string;
	lastActivityAt: string;
	requestedReviewers: string[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_RESULTS = 20;

export function findStalePrs(
	prs: OpenPrInput[],
	staleAfterDays: number,
	now: Date = new Date(),
): StalePullRequest[] {
	return prs
		.map((pr) => ({
			pr,
			daysStale: Math.floor((now.getTime() - new Date(pr.lastActivityAt).getTime()) / MS_PER_DAY),
		}))
		.filter(({ daysStale }) => daysStale >= staleAfterDays)
		.sort((a, b) => b.daysStale - a.daysStale)
		.slice(0, MAX_RESULTS)
		.map(({ pr, daysStale }) => ({
			number: pr.number,
			title: pr.title,
			author: pr.author,
			url: pr.url,
			createdAt: pr.createdAt,
			daysStale,
			requestedReviewers: pr.requestedReviewers,
		}));
}
