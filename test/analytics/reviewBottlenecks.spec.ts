import { describe, it, expect } from "vitest";
import { computeReviewBottlenecks, type RawReviewPr } from "../../src/analytics/reviewBottlenecks";
import reviewPrs from "../fixtures/review-prs.json";

describe("computeReviewBottlenecks", () => {
	const result = computeReviewBottlenecks(reviewPrs as RawReviewPr[]);

	it("computes median/p90 time-to-first-review, ignoring PRs with no review", () => {
		expect(result.medianHoursToFirstReview).toBeCloseTo(8, 5);
		expect(result.p90HoursToFirstReview).toBeCloseTo(11.2, 5);
	});

	it("computes median/p90 time-to-merge across all PRs", () => {
		expect(result.medianHoursToMerge).toBeCloseTo(24, 5);
		expect(result.p90HoursToMerge).toBeCloseTo(139.2, 5);
	});

	it("sorts the slowest PRs to merge first, capped at 5", () => {
		expect(result.slowestPrs.map((pr) => pr.number)).toEqual([202, 201, 203]);
		expect(result.slowestPrs[0].hoursToMerge).toBeCloseTo(168, 5);
	});
});
