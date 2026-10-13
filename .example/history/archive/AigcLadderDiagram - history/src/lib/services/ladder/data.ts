import type { LadderEntry, LadderQuery } from "@/types/ladder";

export type LadderResult = {
  data: LadderEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const SAMPLE: LadderEntry[] = [
  { id: "gpt-4o", name: "GPT-4o", vendor: "OpenAI", score: 92.0 },
  { id: "claude-3-opus", name: "Claude 3 Opus", vendor: "Anthropic", score: 91.0 },
  { id: "gemini-1-5-pro", name: "Gemini 1.5 Pro", vendor: "Google", score: 90.0 }
];

export function getLadderData(query: LadderQuery): LadderResult {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));

  const search = (query.search ?? "").trim().toLowerCase();
  const filtered = search
    ? SAMPLE.filter((x) => {
        return (
          x.name.toLowerCase().includes(search) ||
          (x.vendor ?? "").toLowerCase().includes(search)
        );
      })
    : SAMPLE;

  const sorted = [...filtered].sort((a, b) => b.score - a.score);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const sliced = sorted.slice((page - 1) * limit, page * limit);

  return {
    data: sliced,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  };
}
