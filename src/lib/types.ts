import type { RankCandidatesOutput } from "@/ai/flows/rank-candidates-against-job-description";
import type { Timestamp } from "firebase/firestore";

type CandidateRanking = RankCandidatesOutput["rankings"][0];

export type ClientCandidate = Omit<CandidateRanking, 'fileName'> & {
  id: string;
  selected: boolean;
};

export interface Job {
    id: string;
    title: string;
    jobDescription: string;
    createdAt: Date;
    status: 'processing' | 'completed' | 'failed';
}
