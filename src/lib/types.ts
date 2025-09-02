
import type { RankCandidatesOutput } from "@/ai/flows/rank-candidates-against-job-description";
import type { Timestamp } from "firebase/firestore";

type CandidateRanking = RankCandidatesOutput["rankings"][0];

export type ClientCandidate = Omit<CandidateRanking, 'fileName' | 'candidateEmail'> & {
  id: string;
  selected: boolean;
  candidateEmail: string | null;
};

export interface Job {
    id: string;
    title: string;
    jobDescription: string;
    createdAt: Date;
    status: 'processing' | 'completed' | 'failed';
}
