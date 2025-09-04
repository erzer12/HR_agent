import type { Timestamp } from "firebase/firestore";

/**
 * Represents the structure of a candidate object as returned from the backend API 
 * and used throughout the frontend. The `selected` property is a client-side state.
 */
export type ClientCandidate = {
  id: string;
  selected: boolean; 
  candidateName: string;
  candidateEmail: string;
  summary: string;
  suitabilityScore: number;
  status?: 'pending' | 'selected' | 'contacted' | 'scheduled';
};

/**
 * Represents the structure of a job object stored in Firestore and used by the frontend.
 */
export interface Job {
    id: string;
    title: string;
    jobDescription: string;
    createdAt: Timestamp;
    status: 'processing' | 'completed' | 'failed';
}
