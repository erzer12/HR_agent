"use server";

import { rankCandidates } from "@/ai/flows/rank-candidates-against-job-description";
import { addDoc, collection, serverTimestamp, doc, updateDoc, getDoc, writeBatch, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import type { ClientCandidate, Job } from "./types";

export async function createJobAndRankCandidates(jobDescription: string, resumeFiles: File[]) {
  if (!jobDescription.trim() || resumeFiles.length === 0) {
    throw new Error("Please provide a job description and upload resumes.");
  }

  // 1. Create a job document in Firestore
  const jobDocRef = await addDoc(collection(db, "jobs"), {
    jobDescription: jobDescription,
    createdAt: serverTimestamp(),
    status: 'processing',
    title: 'New Job Posting' // Placeholder title
  });

  // Function to read file as a data URI on the server
  const fileToDataURL = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const b64 = Buffer.from(buffer).toString('base64');
    return `data:${file.type};base64,${b64}`;
  };

  try {
    const resumeDataURLs = await Promise.all(resumeFiles.map(fileToDataURL));
    
    // 2. Call the AI to rank candidates
    const result = await rankCandidates({ jobDescription, resumes: resumeDataURLs });

    // 3. Save ranked candidates to the 'candidates' sub-collection
    const candidatesCollectionRef = collection(db, "jobs", jobDocRef.id, "candidates");
    for (const ranking of result.rankings) {
      const candidateData: Omit<ClientCandidate, 'id' | 'selected' | 'fileName'> = {
        candidateName: ranking.candidateName,
        candidateEmail: ranking.candidateEmail,
        suitabilityScore: ranking.suitabilityScore,
        summary: ranking.summary,
        candidateIndex: ranking.candidateIndex,
      };
      await addDoc(candidatesCollectionRef, candidateData);
    }
    
    // 4. Update job status
    await updateDoc(jobDocRef, { status: 'completed' });
    
    // 5. Optionally, generate a job title from the description
    // This could be another AI call, for now we keep it simple
    const jobDoc = await getDoc(jobDocRef);
    const jobData = jobDoc.data() as Job;

    // A simple title extraction
    const extractedTitle = jobDescription.substring(0, 50).split('\n')[0];
    const finalTitle = extractedTitle.includes('Title:') ? extractedTitle.split('Title:')[1].trim() : extractedTitle;
    
    await updateDoc(jobDocRef, { title: finalTitle || 'Untitled Job' });


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

export async function updateJob(jobId: string, data: { title: string, jobDescription: string }) {
    if (!jobId) throw new Error("Job ID is required.");
    const jobRef = doc(db, "jobs", jobId);
    await updateDoc(jobRef, data);
}

export async function deleteJob(jobId: string) {
    if (!jobId) throw new Error("Job ID is required.");
    
    const batch = writeBatch(db);
    
    // 1. Delete all candidates in the subcollection
    const candidatesRef = collection(db, "jobs", jobId, "candidates");
    const candidatesSnapshot = await getDocs(candidatesRef);
    candidatesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    // 2. Delete the job document itself
    const jobRef = doc(db, "jobs", jobId);
    batch.delete(jobRef);
    
    // 3. Commit the batch
    await batch.commit();
}
