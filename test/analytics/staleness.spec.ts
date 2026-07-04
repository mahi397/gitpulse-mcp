import { describe, it, expect } from "vitest";
import { findStalePrs, type OpenPrInput } from "../../src/analytics/staleness";
import openPrs from "../fixtures/open-prs.json";

const NOW = new Date("2026-07-03T09:00:00Z");

describe("findStalePrs", () => {
	it("filters out PRs with recent activity and sorts most-stale first", () => {
		const stale = findStalePrs(openPrs as OpenPrInput[], 7, NOW);
		expect(stale.map((pr) => pr.number)).toEqual([101]);
		expect(stale[0].daysStale).toBe(18);
	});

	it("returns all PRs when the threshold is very low", () => {
		const stale = findStalePrs(openPrs as OpenPrInput[], 1, NOW);
		expect(stale.map((pr) => pr.number)).toEqual([101, 102, 103]);
		expect(stale[0].daysStale).toBeGreaterThanOrEqual(stale[1].daysStale);
		expect(stale[1].daysStale).toBeGreaterThanOrEqual(stale[2].daysStale);
	});

	it("returns nothing when no PR exceeds the threshold", () => {
		expect(findStalePrs(openPrs as OpenPrInput[], 100, NOW)).toEqual([]);
	});
});
