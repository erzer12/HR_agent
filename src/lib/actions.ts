// In src/lib/actions.ts

"use server";

import { rankCandidates } from "@/ai/flows/rank-candidates-against-job-description";
import { 
  addDoc, 
  collection, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  writeBatch, 
  getDocs, 
  getDoc, 
  deleteDoc 
} from "firebase/firestore";
import { db } from "./firebase";
import type { ClientCandidate, Job } from "./types";

import { Resend } from "resend";
import { google } from "googleapis";

// Initialize Resend - Make sure RESEND_API_KEY is in your .env file
const resend = new Resend(process.env.RESEND_API_KEY);

// Helper function to read file as a data URI on the server
const fileToDataURL = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const b64 = Buffer.from(buffer).toString("base64");
  return `data:${file.type};base64,${b64}`;
};

export async function createJobAndRankCandidates(
  title: string, 
  jobDescription: string, 
  resumeFiles: File[]
) {
  if (!jobDescription.trim() || !title.trim()) {
    throw new Error("Please provide a job title and description.");
  }

  const jobDocRef = await addDoc(collection(db, "jobs"), {
    title: title,
    jobDescription: jobDescription,
    createdAt: serverTimestamp(),
    status: resumeFiles.length > 0 ? "processing" : "completed",
  });

  if (resumeFiles.length === 0) {
    return { jobId: jobDocRef.id };
  }

  try {
    const resumeDataURLs = await Promise.all(resumeFiles.map(fileToDataURL));
    const result = await rankCandidates({ jobDescription, resumes: resumeDataURLs });

    const candidatesCollectionRef = collection(db, "jobs", jobDocRef.id, "candidates");
    const batch = writeBatch(db);

    for (const ranking of result.rankings) {
      const candidateData: Omit<ClientCandidate, "id" | "selected"> = {
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

    await updateDoc(jobDocRef, { status: "completed" });

    return { jobId: jobDocRef.id };
  } catch (error) {
    await updateDoc(jobDocRef, { status: "failed" });
    console.error("Error in createJobAndRankCandidates:", error);
    if (error instanceof Error) {
      throw new Error(`Ranking failed: ${error.message}`);
    }
    throw new Error("An unknown error occurred during ranking.");
  }
}

export async function addResumesToJob(jobId: string, resumeFiles: File[]) {
  if (!jobId) throw new Error("Job ID is required.");
  if (resumeFiles.length === 0) throw new Error("Please select at least one resume file.");

  const jobDocRef = doc(db, "jobs", jobId);
  await updateDoc(jobDocRef, { status: "processing" });

  try {
    const jobSnapshot = await getDoc(jobDocRef);
    if (!jobSnapshot.exists()) throw new Error("Job not found.");

    const jobData = jobSnapshot.data();
    const jobDescription = jobData.jobDescription;
    const resumeDataURLs = await Promise.all(resumeFiles.map(fileToDataURL));

    const result = await rankCandidates({ jobDescription, resumes: resumeDataURLs });

    const candidatesCollectionRef = collection(db, "jobs", jobId, "candidates");
    const batch = writeBatch(db);

    for (const ranking of result.rankings) {
      const candidateData: Omit<ClientCandidate, "id" | "selected"> = {
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

    await updateDoc(jobDocRef, { status: "completed" });
    return { jobId };
  } catch (error) {
    console.error("Error in addResumesToJob:", error);
    const errorMessage = error instanceof Error ? error.message : "";

    if (errorMessage.includes("503 Service Unavailable")) {
      await updateDoc(jobDocRef, { status: "completed" });
      throw new Error("The model is currently overloaded. Please try again in a few moments.");
    } else {
      await updateDoc(jobDocRef, { status: "failed" });
    }

    if (error instanceof Error) {
      throw new Error(`Adding resumes failed: ${error.message}`);
    }
    throw new Error("An unknown error occurred while adding resumes.");
  }
}

export async function updateJob(jobId: string, data: { title: string; jobDescription: string }) {
  if (!jobId) throw new Error("Job ID is required.");
  const jobRef = doc(db, "jobs", jobId);
  await updateDoc(jobRef, data);
}

export async function deleteJob(jobId: string) {
  if (!jobId) throw new Error("Job ID is required.");

  const batch = writeBatch(db);
  const candidatesRef = collection(db, "jobs", jobId, "candidates");
  const candidatesSnapshot = await getDocs(candidatesRef);

  candidatesSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  const jobRef = doc(db, "jobs", jobId);
  batch.delete(jobRef);

  await batch.commit();
}

export async function deleteCandidate(jobId: string, candidateId: string) {
  if (!jobId || !candidateId) throw new Error("Job ID and Candidate ID are required.");
  const candidateRef = doc(db, "jobs", jobId, "candidates", candidateId);
  await deleteDoc(candidateRef);
}

// ---------------------------
// Email Sending with Resend
// ---------------------------

export async function sendInterviewEmail(to: string, subject: string, body: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not found. Skipping email sending. Please add it to your .env file.");
    // To avoid breaking the flow, we'll "succeed" in dev, but you should handle this properly.
    return;
  }
  try {
    await resend.emails.send({
      // NOTE: This "from" address must be a verified domain on Resend.
      from: "ResumeRank <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: body.replace(/\n/g, "<br>"),
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    // We throw an error so the UI can catch it and inform the user.
    throw new Error(`Failed to send email to ${to}.`);
  }
}

// ---------------------------------
// Google Calendar Placeholder
// ---------------------------------

/**
 * Placeholder function for creating a Google Calendar event.
 * This requires a full OAuth 2.0 implementation to get user consent and tokens.
 * @param details - The details of the event to create.
 */
export async function createCalendarEvent(details: { title: string, startTime: string, endTime: string, attendeeEmail: string }) {
   if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    console.warn("GOOGLE_CLIENT_ID not found. Skipping calendar event creation.");
    return;
  }
  
  // 1. Check if user has valid, stored OAuth tokens.
  // 2. If not, initiate the OAuth flow. This cannot be done in a simple server action
  //    and requires dedicated API routes for the auth callback.
  // 3. If tokens are present, use them to instantiate a googleapis client.
  // 4. Create the event.

  console.log("--- GOOGLE CALENDAR INTEGRATION ---");
  console.log("This is a placeholder for creating a calendar event.");
  console.log("Event Details:", details);
  console.log("To implement this, you need to complete the OAuth 2.0 flow to get user permission and tokens.");
  console.log("See `src/lib/actions.ts` for more details.");

  // Example of what the call would look like with the 'googleapis' library
  /*
  const oauth2Client = new google.auth.OAuth2(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET, // This MUST be stored securely on the server
    // The redirect URI used in the OAuth flow
    // e.g., "http://localhost:3000/api/auth/google/callback" 
  );
  
  // You would fetch these tokens from your secure storage (e.g., Firestore) for the user
  const tokens = { 
    access_token: 'USER_ACCESS_TOKEN',
    refresh_token: 'USER_REFRESH_TOKEN' 
  };
  oauth2Client.setCredentials(tokens);

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  try {
    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: details.title,
        description: `Interview with ${details.attendeeEmail}`,
        start: { dateTime: details.startTime, timeZone: 'UTC' },
        end: { dateTime: details.endTime, timeZone: 'UTC' },
        attendees: [{ email: details.attendeeEmail }],
      },
    });
    console.log('Calendar event created successfully.');
  } catch (error) {
    console.error('Failed to create calendar event:', error);
    // If the access token was expired, the googleapis library with a refresh token
    // would typically handle refreshing it. If it fails for other reasons, we throw.
    throw new Error('Could not create calendar event.');
  }
  */
}
