/**
 * @grid/agents - Agent orchestration primitives
 */

export const VERSION = "0.0.0";

export type Agent = {
  id: string;
  name: string;
};

export const createAgent = (id: string, name: string): Agent => {
  return { id, name };
};
