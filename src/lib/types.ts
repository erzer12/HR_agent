
import type { Timestamp } from "firebase/firestore";

// This represents the structure of a candidate object that the frontend components expect.
// Your Python backend should return candidate data in this format from its API endpoints.
export type ClientCandidate = {
  id: string;
  selected: boolean;
  candidateName: string;
  candidateEmail: string | null;
  summary: string;
  suitabilityScore: number;
};

// This represents the structure of a job object that the frontend components expect.
// Your Python backend should return job data in this format, and it will be
// stored in Firestore for the frontend to read in real-time.
export interface Job {
    id: string;
    title: string;
    jobDescription: string;
    createdAt: Timestamp;
    status: 'processing' | 'completed' | 'failed';
}
