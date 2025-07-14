import { ChatMessageSchema } from "../types/index.js";

export const validateChatMessage = (data: unknown) => {
  const result = ChatMessageSchema.safeParse(data);
  if (!result.success) {
    return { success: false, data: null, error: result.error };
  }
  return { success: true, data: result.data, error: null };
};
