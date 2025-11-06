import { experimental_createMCPClient } from "@ai-sdk/mcp";

export interface MCPServerConfig {
  name: string;
  url: string;
  type: "http" | "sse";
  authToken?: string;
  headers?: Record<string, string>;
}

export interface MCPClientService {
  clients: Map<string, any>;
  getAllTools: () => Promise<Record<string, any>>;
  closeAll: () => Promise<void>;
}

/**
 * Create MCP client service that manages multiple MCP server connections
 * and merges their tools for use with AI SDK
 */
export const createMCPClientService = async (
  servers: MCPServerConfig[]
): Promise<MCPClientService> => {
  const clients = new Map<string, any>();

  console.log(`[MCP Service] Initializing ${servers.length} MCP server(s)...`);

  // Initialize each MCP server
  for (const server of servers) {
    try {
      console.log(`[MCP Service] Connecting to ${server.name} at ${server.url}...`);

      const client = await experimental_createMCPClient({
        transport: {
          type: server.type,
          url: server.url,
          headers: {
            ...(server.authToken
              ? { Authorization: `Bearer ${server.authToken}` }
              : {}),
            ...(server.headers || {}),
          },
        },
      });

      clients.set(server.name, client);
      console.log(`[MCP Service] ✅ Connected to ${server.name}`);
    } catch (error) {
      console.error(
        `[MCP Service] ❌ Failed to connect to ${server.name}:`,
        error
      );
      // Continue with other servers even if one fails
    }
  }

  /**
   * Get all tools from all connected MCP servers
   * Merges tools into a single object for AI SDK
   */
  const getAllTools = async (): Promise<Record<string, any>> => {
    const allTools: Record<string, any> = {};

    console.log(`[MCP Service] Fetching tools from ${clients.size} server(s)...`);

    for (const [name, client] of clients.entries()) {
      try {
        const tools = await client.tools();
        Object.assign(allTools, tools);
        console.log(
          `[MCP Service] ✅ Loaded ${Object.keys(tools).length} tool(s) from ${name}`
        );
      } catch (error) {
        console.error(`[MCP Service] ❌ Failed to get tools from ${name}:`, error);
      }
    }

    console.log(
      `[MCP Service] Total MCP tools available: ${Object.keys(allTools).length}`
    );
    return allTools;
  };

  /**
   * Close all MCP client connections
   * Should be called when agent execution is complete
   */
  const closeAll = async (): Promise<void> => {
    console.log(`[MCP Service] Closing ${clients.size} MCP client(s)...`);

    for (const [name, client] of clients.entries()) {
      try {
        await client.close();
        console.log(`[MCP Service] ✅ Closed ${name}`);
      } catch (error) {
        console.error(`[MCP Service] ❌ Error closing ${name}:`, error);
      }
    }

    clients.clear();
  };

  return {
    clients,
    getAllTools,
    closeAll,
  };
};

