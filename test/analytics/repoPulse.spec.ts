import { describe, it, expect } from "vitest";
import { computeRepoPulse } from "../../src/analytics/repoPulse";

describe("computeRepoPulse", () => {
	it("counts opened, merged, and closed-without-merge PRs separately", () => {
		const prs = [
			{ createdAt: "2026-06-01T00:00:00Z", mergedAt: "2026-06-02T00:00:00Z", closedAt: "2026-06-02T00:00:00Z" },
			{ createdAt: "2026-06-03T00:00:00Z", mergedAt: null, closedAt: "2026-06-04T00:00:00Z" },
			{ createdAt: "2026-06-05T00:00:00Z", mergedAt: null, closedAt: null },
		];
		const result = computeRepoPulse(prs, []);
		expect(result.prsOpened).toBe(3);
		expect(result.prsMerged).toBe(1);
		expect(result.prsClosed).toBe(1);
	});

	it("counts distinct authors as active contributors, ignoring null logins", () => {
		const commits = [{ authorLogin: "alice" }, { authorLogin: "alice" }, { authorLogin: "bob" }, { authorLogin: null }];
		const result = computeRepoPulse([], commits);
		expect(result.commitCount).toBe(4);
		expect(result.activeContributors).toBe(2);
	});
});
