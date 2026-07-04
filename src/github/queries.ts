export const REVIEW_BOTTLENECKS_QUERY = /* GraphQL */ `
	query ReviewBottlenecks($searchQuery: String!, $cursor: String) {
		search(query: $searchQuery, type: ISSUE, first: 50, after: $cursor) {
			pageInfo {
				hasNextPage
				endCursor
			}
			nodes {
				... on PullRequest {
					number
					title
					url
					createdAt
					mergedAt
					author {
						login
					}
					reviews(first: 1) {
						nodes {
							submittedAt
						}
					}
				}
			}
		}
	}
`;

export interface ReviewBottlenecksSearchResponse {
	search: {
		pageInfo: { hasNextPage: boolean; endCursor: string | null };
		nodes: Array<{
			number: number;
			title: string;
			url: string;
			createdAt: string;
			mergedAt: string;
			author: { login: string } | null;
			reviews: { nodes: Array<{ submittedAt: string }> };
		}>;
	};
}
