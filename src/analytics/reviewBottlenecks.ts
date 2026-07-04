import { median, p90 } from "./percentiles";
import type { ReviewTimings } from "../types";

export interface RawReviewPr {
	number: number;
	title: string;
	url: string;
	author: string;
	createdAt: string;
	firstReviewAt: string | null;
	mergedAt: string;
}

export interface ReviewBottlenecksResult {
	medianHoursToFirstReview: number;
	p90HoursToFirstReview: number;
	medianHoursToMerge: number;
	p90HoursToMerge: number;
	slowestPrs: ReviewTimings[];
}

const MS_PER_HOUR = 60 * 60 * 1000;
const MAX_SLOWEST = 5;

function hoursBetween(startIso: string, endIso: string): number {
	return (new Date(endIso).getTime() - new Date(startIso).getTime()) / MS_PER_HOUR;
}

export function computeReviewBottlenecks(prs: RawReviewPr[]): ReviewBottlenecksResult {
	const timings: ReviewTimings[] = prs.map((pr) => ({
		number: pr.number,
		title: pr.title,
		url: pr.url,
		author: pr.author,
		hoursToFirstReview: pr.firstReviewAt ? hoursBetween(pr.createdAt, pr.firstReviewAt) : null,
		hoursToMerge: hoursBetween(pr.createdAt, pr.mergedAt),
	}));

	const firstReviewHours = timings
		.map((t) => t.hoursToFirstReview)
		.filter((h): h is number => h !== null);
	const mergeHours = timings.map((t) => t.hoursToMerge);

	const slowestPrs = [...timings].sort((a, b) => b.hoursToMerge - a.hoursToMerge).slice(0, MAX_SLOWEST);

	return {
		medianHoursToFirstReview: median(firstReviewHours),
		p90HoursToFirstReview: p90(firstReviewHours),
		medianHoursToMerge: median(mergeHours),
		p90HoursToMerge: p90(mergeHours),
		slowestPrs,
	};
}
