import type { CommitRecord } from "../types";

const MAX_PATTERN_LENGTH = 200;

export interface AuthorMatchRate {
	author: string;
	matchRate: number;
	totalCommits: number;
}

export interface WeeklyMatchRate {
	weekStart: string;
	matchRate: number;
	totalCommits: number;
}

export interface CommitLintResult {
	totalCommits: number;
	matchCount: number;
	matchRate: number;
	worstOffenders: AuthorMatchRate[];
	weeklyTrend: WeeklyMatchRate[];
}

export function compileLintPattern(pattern: string): RegExp {
	if (pattern.length > MAX_PATTERN_LENGTH) {
		throw new Error(`Pattern too long (max ${MAX_PATTERN_LENGTH} characters)`);
	}
	try {
		return new RegExp(pattern);
	} catch {
		throw new Error(`Invalid regular expression: ${pattern}`);
	}
}

function isoWeekStart(dateStr: string): string {
	const date = new Date(dateStr);
	const day = date.getUTCDay();
	const diffToMonday = (day + 6) % 7;
	const monday = new Date(date);
	monday.setUTCDate(date.getUTCDate() - diffToMonday);
	monday.setUTCHours(0, 0, 0, 0);
	return monday.toISOString().slice(0, 10);
}

function rate(matches: number, total: number): number {
	return total === 0 ? 0 : matches / total;
}

export function analyzeCommitLint(commits: CommitRecord[], pattern: RegExp): CommitLintResult {
	const matches = commits.map((c) => pattern.test(c.message));
	const matchCount = matches.filter(Boolean).length;

	const byAuthor = new Map<string, { matches: number; total: number }>();
	commits.forEach((c, i) => {
		const entry = byAuthor.get(c.authorLogin) ?? { matches: 0, total: 0 };
		entry.total += 1;
		if (matches[i]) entry.matches += 1;
		byAuthor.set(c.authorLogin, entry);
	});
	const worstOffenders = [...byAuthor.entries()]
		.map(([author, { matches, total }]) => ({
			author,
			matchRate: rate(matches, total),
			totalCommits: total,
		}))
		.sort((a, b) => a.matchRate - b.matchRate)
		.slice(0, 5);

	const byWeek = new Map<string, { matches: number; total: number }>();
	commits.forEach((c, i) => {
		const week = isoWeekStart(c.authoredDate);
		const entry = byWeek.get(week) ?? { matches: 0, total: 0 };
		entry.total += 1;
		if (matches[i]) entry.matches += 1;
		byWeek.set(week, entry);
	});
	const weeklyTrend = [...byWeek.entries()]
		.map(([weekStart, { matches, total }]) => ({
			weekStart,
			matchRate: rate(matches, total),
			totalCommits: total,
		}))
		.sort((a, b) => a.weekStart.localeCompare(b.weekStart));

	return {
		totalCommits: commits.length,
		matchCount,
		matchRate: rate(matchCount, commits.length),
		worstOffenders,
		weeklyTrend,
	};
}
