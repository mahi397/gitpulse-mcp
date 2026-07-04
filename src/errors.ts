import { GitHubNotFoundError, GitHubRateLimitError } from "./github/client";
import type { ToolError } from "./types";

/** Converts any thrown error into a friendly, token-free ToolError for the MCP client. Never leaks stack traces or the GitHub token. */
export function toToolError(err: unknown): ToolError {
	if (err instanceof GitHubRateLimitError) {
		return {
			error: "GitHub API rate limit exceeded.",
			retry_after_seconds: err.retryAfterSeconds,
		};
	}
	if (err instanceof GitHubNotFoundError) {
		return {
			error: "Repository or resource not found. Check the owner/repo name and that it is public (or the token has access).",
		};
	}
	if (err instanceof Error && (err.message.startsWith("Invalid regular expression") || err.message.startsWith("Pattern too long"))) {
		return { error: err.message };
	}
	return { error: "Unexpected error talking to GitHub. Please try again shortly." };
}
