import type { RankCandidatesOutput } from "@/ai/flows/rank-candidates-against-job-description";

type CandidateRanking = RankCandidatesOutput["rankings"][0];

export type ClientCandidate = CandidateRanking & {
  id: string;
  fileName: string;
  selected: boolean;
};
