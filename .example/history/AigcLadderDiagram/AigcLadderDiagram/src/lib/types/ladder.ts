export type LadderDimension = "model" | "skill" | "mcp" | "agent" | "api";

export type LadderEntry = {
  id: string;
  name: string;
  vendor?: string;
  score: number;
};

export type LadderQuery = {
  dimension: LadderDimension;
  search?: string;
  sortKey?: string;
  page?: number;
  limit?: number;
};

