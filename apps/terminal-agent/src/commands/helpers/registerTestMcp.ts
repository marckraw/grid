import * as p from "@clack/prompts";
import { createSpinner } from "../../utils/spinners.js";
import {
  experimental_createMCPClient as createMCPClient,
  type ToolSet,
} from "ai";
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio";

export type MCPClientType = "figma" | "linear";

export const registerTestMCPTools = async (
  selectedClients: MCPClientType[] = []
) => {
  let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;
  let linearMcpClient: Awaited<ReturnType<typeof createMCPClient>> | null =
    null;
  let mcpTools: ToolSet = {};
  let linearMcpTools: ToolSet = {};

  const spinner = createSpinner();

  // Initialize Figma MCP client if selected
  if (selectedClients.includes("figma")) {
    spinner.start("Connecting to Figma MCP server...");
    try {
      mcpClient = await createMCPClient({
        transport: {
          type: "sse",
          url: "https://figma-context-mcp-production-a90a.up.railway.app/sse",
        },
      });

      mcpTools = await mcpClient.tools();
      spinner.stop();
    } catch (error) {
      spinner.stop();
      p.log.error(
        `Failed to connect to Figma MCP server: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // Initialize Linear MCP client if selected
  if (selectedClients.includes("linear")) {
    spinner.start("Connecting to Linear MCP server...");
    try {
      const transport = new Experimental_StdioMCPTransport({
        command: "npx",
        args: ["-y", "mcp-remote", "https://mcp.linear.app/sse"],
      });

      linearMcpClient = await createMCPClient({
        transport: transport,
      });

      linearMcpTools = await linearMcpClient.tools();
      spinner.stop();
    } catch (error) {
      spinner.stop();
      p.log.error(
        `Failed to connect to Linear MCP server: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  const transformerMcpTools = Object.entries(mcpTools).map(([key, value]) => ({
    name: key,
    ...value,
  }));

  const transformedLinearMcpTools = Object.entries(linearMcpTools).map(
    ([key, value]) => ({
      name: key,
      ...value,
    })
  );

  return {
    transformerMcpTools,
    transformedLinearMcpTools,
    mcpTools,
    linearMcpTools,
    clients: { mcpClient, linearMcpClient }, // Return clients for cleanup
  };
};
