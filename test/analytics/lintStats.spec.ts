import { describe, it, expect } from "vitest";
import { analyzeCommitLint, compileLintPattern } from "../../src/analytics/lintStats";
import type { CommitRecord } from "../../src/types";
import commits from "../fixtures/commits.json";

describe("compileLintPattern", () => {
	it("compiles a valid pattern", () => {
		expect(compileLintPattern("^[A-Z]+-[0-9]+: .+")).toBeInstanceOf(RegExp);
	});

	it("rejects an invalid pattern", () => {
		expect(() => compileLintPattern("[unterminated")).toThrow(/Invalid regular expression/);
	});

	it("rejects a pathologically long pattern", () => {
		expect(() => compileLintPattern("a".repeat(500))).toThrow(/too long/);
	});
});

describe("analyzeCommitLint", () => {
	const pattern = compileLintPattern("^[A-Z]+-[0-9]+: .+");
	const result = analyzeCommitLint(commits as CommitRecord[], pattern);

	it("computes overall match rate", () => {
		expect(result.totalCommits).toBe(6);
		expect(result.matchCount).toBe(4);
		expect(result.matchRate).toBeCloseTo(4 / 6, 5);
	});

	it("ranks worst offenders ascending by match rate", () => {
		expect(result.worstOffenders[0]).toEqual({ author: "bob", matchRate: 0, totalCommits: 2 });
		expect(result.worstOffenders.at(-1)?.matchRate).toBe(1);
	});

	it("buckets commits into a chronologically sorted weekly trend", () => {
		const totalAcrossWeeks = result.weeklyTrend.reduce((sum, w) => sum + w.totalCommits, 0);
		expect(totalAcrossWeeks).toBe(6);
		const weekStarts = result.weeklyTrend.map((w) => w.weekStart);
		expect(weekStarts).toEqual([...weekStarts].sort());
	});
});
