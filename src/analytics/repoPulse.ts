export interface PulseInputPr {
	createdAt: string;
	mergedAt: string | null;
	closedAt: string | null;
}

export interface PulseInputCommit {
	authorLogin: string | null;
}

export interface RepoPulseResult {
	prsOpened: number;
	prsMerged: number;
	prsClosed: number;
	commitCount: number;
	activeContributors: number;
}

export function computeRepoPulse(prs: PulseInputPr[], commits: PulseInputCommit[]): RepoPulseResult {
	const prsOpened = prs.length;
	const prsMerged = prs.filter((pr) => pr.mergedAt !== null).length;
	const prsClosed = prs.filter((pr) => pr.closedAt !== null && pr.mergedAt === null).length;
	const contributors = new Set(
		commits.map((c) => c.authorLogin).filter((login): login is string => login !== null),
	);
	return {
		prsOpened,
		prsMerged,
		prsClosed,
		commitCount: commits.length,
		activeContributors: contributors.size,
	};
}
