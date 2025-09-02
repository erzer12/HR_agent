
"use server";

import { rankCandidates } from "@/ai/flows/rank-candidates-against-job-description";
import { addDoc, collection, serverTimestamp, doc, updateDoc, writeBatch, getDocs, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { ClientCandidate, Job } from "./types";

// Helper function to read file as a data URI on the server
const fileToDataURL = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const b64 = Buffer.from(buffer).toString('base64');
    return `data:${file.type};base64,${b64}`;
};

export async function createJobAndRankCandidates(title: string, jobDescription: string, resumeFiles: File[]) {
  if (!jobDescription.trim() || !title.trim()) {
    throw new Error("Please provide a job title and description.");
  }

  // 1. Create a job document in Firestore
  const jobDocRef = await addDoc(collection(db, "jobs"), {
    title: title,
    jobDescription: jobDescription,
    createdAt: serverTimestamp(),
    status: resumeFiles.length > 0 ? 'processing' : 'completed',
  });

  if (resumeFiles.length === 0) {
      return { jobId: jobDocRef.id };
  }

  try {
    const resumeDataURLs = await Promise.all(resumeFiles.map(fileToDataURL));
    
    // 2. Call the AI to rank candidates
    const result = await rankCandidates({ jobDescription, resumes: resumeDataURLs });

    // 3. Save ranked candidates to the 'candidates' sub-collection
    const candidatesCollectionRef = collection(db, "jobs", jobDocRef.id, "candidates");
    const batch = writeBatch(db);

    for (const ranking of result.rankings) {
      const candidateData: Omit<ClientCandidate, 'id' | 'selected'> = {
        candidateName: ranking.candidateName,
        candidateEmail: ranking.candidateEmail ?? null,
        suitabilityScore: ranking.suitabilityScore,
        summary: ranking.summary,
        candidateIndex: ranking.candidateIndex,
      };
      const newCandidateRef = doc(candidatesCollectionRef);
      batch.set(newCandidateRef, candidateData);
    }
    await batch.commit();
    
    // 4. Update job status to completed
    await updateDoc(jobDocRef, { status: 'completed' });
    
    return { jobId: jobDocRef.id };

  } catch (error) {
    // If ranking fails, update job status to 'failed'
    await updateDoc(jobDocRef, { status: 'failed' });
    console.error("Error in createJobAndRankCandidates:", error);
    // Re-throw the error to be caught by the frontend
    if (error instanceof Error) {
        throw new Error(`Ranking failed: ${error.message}`);
    }
    throw new Error("An unknown error occurred during ranking.");
  }
}

export async function addResumesToJob(jobId: string, resumeFiles: File[]) {
  if (!jobId) {
    throw new Error("Job ID is required.");
  }
  if (resumeFiles.length === 0) {
    throw new Error("Please select at least one resume file.");
  }

  const jobDocRef = doc(db, "jobs", jobId);

  await updateDoc(jobDocRef, { status: 'processing' });
  
  try {
    const jobSnapshot = await getDoc(jobDocRef);
    if (!jobSnapshot.exists()) {
        throw new Error("Job not found.");
    }
    const jobData = jobSnapshot.data();
    const jobDescription = jobData.jobDescription;

    const resumeDataURLs = await Promise.all(resumeFiles.map(fileToDataURL));
    
    // Call the AI to rank candidates
    const result = await rankCandidates({ jobDescription, resumes: resumeDataURLs });

    // Save ranked candidates to the 'candidates' sub-collection
    const candidatesCollectionRef = collection(db, "jobs", jobId, "candidates");
    const batch = writeBatch(db);

    for (const ranking of result.rankings) {
      const candidateData: Omit<ClientCandidate, 'id' | 'selected'> = {
        candidateName: ranking.candidateName,
        candidateEmail: ranking.candidateEmail ?? null,
        suitabilityScore: ranking.suitabilityScore,
        summary: ranking.summary,
        candidateIndex: ranking.candidateIndex,
      };
      const newCandidateRef = doc(candidatesCollectionRef);
      batch.set(newCandidateRef, candidateData);
    }
    await batch.commit();
    
    // Update job status to completed
    await updateDoc(jobDocRef, { status: 'completed' });
    
    return { jobId: jobId };

  } catch (error) {
    // If ranking fails, update job status to 'failed'
    await updateDoc(jobDocRef, { status: 'failed' });
    console.error("Error in addResumesToJob:", error);
    if (error instanceof Error) {
        throw new Error(`Adding resumes failed: ${error.message}`);
    }
    throw new Error("An unknown error occurred while adding resumes.");
  }
}

export async function updateJob(jobId: string, data: { title: string, jobDescription: string }) {
    if (!jobId) throw new Error("Job ID is required.");
    const jobRef = doc(db, "jobs", jobId);
    await updateDoc(jobRef, data);
}

export async function deleteJob(jobId: string) {
    if (!jobId) throw new Error("Job ID is required.");
    
    const batch = writeBatch(db);
    
    const candidatesRef = collection(db, "jobs", jobId, "candidates");
    const candidatesSnapshot = await getDocs(candidatesRef);
    candidatesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    const jobRef = doc(db, "jobs", jobId);
    batch.delete(jobRef);
    
    await batch.commit();
}
