import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Env } from "./types";
import { repoPulseSchema, repoPulseDescription, getRepoPulse } from "./tools/repoPulse";
import { stalePrsSchema, stalePrsDescription, findStalePullRequests } from "./tools/stalePrs";
import {
	reviewBottlenecksSchema,
	reviewBottlenecksDescription,
	getReviewBottlenecks,
} from "./tools/reviewBottlenecks";
import { commitLintSchema, commitLintDescription, lintCommitHistory } from "./tools/commitLint";

function asToolResult(result: unknown) {
	return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
}

export class GitPulseMCP extends McpAgent<Env, unknown, Record<string, unknown>> {
	server = new McpServer({ name: "gitpulse-mcp", version: "0.1.0" });

	async init() {
		this.server.tool("get_repo_pulse", repoPulseDescription, repoPulseSchema.shape, async (input) =>
			asToolResult(await getRepoPulse(this.env, input)),
		);

		this.server.tool("find_stale_prs", stalePrsDescription, stalePrsSchema.shape, async (input) =>
			asToolResult(await findStalePullRequests(this.env, input)),
		);

		this.server.tool(
			"get_review_bottlenecks",
			reviewBottlenecksDescription,
			reviewBottlenecksSchema.shape,
			async (input) => asToolResult(await getReviewBottlenecks(this.env, input)),
		);

		this.server.tool("lint_commit_history", commitLintDescription, commitLintSchema.shape, async (input) =>
			asToolResult(await lintCommitHistory(this.env, input)),
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		return GitPulseMCP.serve("/mcp", { binding: "MCP_OBJECT" }).fetch(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
