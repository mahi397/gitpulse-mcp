import { describe, it, expect } from "vitest";
import { median, p90, percentile } from "../../src/analytics/percentiles";

describe("percentiles", () => {
	it("returns 0 for an empty array", () => {
		expect(median([])).toBe(0);
		expect(p90([])).toBe(0);
	});

	it("returns the single value for a one-element array", () => {
		expect(median([42])).toBe(42);
		expect(p90([42])).toBe(42);
	});

	it("computes median via linear interpolation", () => {
		expect(median([1, 2, 3, 4])).toBe(2.5);
	});

	it("computes p90 via linear interpolation", () => {
		expect(percentile([6, 24, 168], 90)).toBeCloseTo(139.2, 5);
	});
});
