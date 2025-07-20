import type { ConversationFlow } from "@mrck-labs/grid-core";
import { writeFile } from "fs/promises";
import path from "path";
import * as p from "@clack/prompts";
import pc from "picocolors";

// Helper function to save conversation to file
export const saveConversation = async (conversation: ConversationFlow) => {
  try {
    const conversationData = conversation.exportConversation();
    const filePath = path.join(process.cwd(), "conversation.json");
    await writeFile(
      filePath,
      JSON.stringify(conversationData, null, 2),
      "utf-8"
    );

    if (process.env.DEBUG) {
      p.log.info(pc.dim(`💾 Conversation saved to ${filePath}`));
    }
  } catch (error) {
    if (process.env.DEBUG) {
      p.log.error(`Failed to save conversation: ${error}`);
    }
  }
};
