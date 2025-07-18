import { createSpinner } from "../../utils/spinners.js";
import { experimental_createMCPClient as createMCPClient, type Tool } from "ai";
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio";

export const registerTestMCPTools = async () => {
  // Check if MCP server should be connected
  let mcpClient: any = null;
  let linearMcpClient: any = null;
  let mcpTools: Record<string, any> = {};
  let linearMcpTools: Record<string, any> = {};

  console.log("process.env.LINEAR_API_KEY", process.env.LINEAR_API_KEY);

  const spinner = createSpinner();
  spinner.start("Connecting to Figma MCP server...");

  try {
    mcpClient = await createMCPClient({
      transport: {
        type: "sse",
        url: "https://figma-context-mcp-production-a90a.up.railway.app/sse",
      },
    });

    const transport = new Experimental_StdioMCPTransport({
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.linear.app/sse"],
    });

    linearMcpClient = await createMCPClient({
      transport: transport,
    });

    linearMcpTools = await linearMcpClient.tools();
    console.log("linearMcpTools", linearMcpTools);
    mcpTools = await mcpClient.tools();
    console.log("mcpTools", mcpTools);
    spinner.stop();
  } catch (error) {
    spinner.stop();
    console.log(
      `Failed to connect to Linear MCP server: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
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
  };
};
