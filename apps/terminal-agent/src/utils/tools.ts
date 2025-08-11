import type { GridTool } from "@mrck-labs/grid-tools";
import type { ToolSet } from "ai";

export const getTools = ({
  executionType = "custom",
  tools,
}: {
  executionType: "vercel-native" | "custom";
  tools: GridTool[];
}) => {
  const availableTools: ToolSet = tools.reduce((acc, tool) => {
    return {
      ...acc,
      [tool.definition.name]:
        // @ts-ignore
        executionType === "vercel-native"
          ? tool.withExecute
          : tool.withoutExecute,
    };
  }, {} as ToolSet);

  return availableTools;
};
