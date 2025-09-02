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
import { oAuth2Client } from "./google-auth-client";


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

export async function deleteAllCandidates(jobId: string) {
  if (!jobId) throw new Error("Job ID is required.");

  const batch = writeBatch(db);
  const candidatesRef = collection(db, "jobs", jobId, "candidates");
  const candidatesSnapshot = await getDocs(candidatesRef);

  candidatesSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}


// ---------------------------
// Email Sending with Resend
// ---------------------------
let resend: Resend | null = null;

const initializeResend = () => {
    if (!resend) {
        if (!process.env.RESEND_API_KEY) {
            console.warn("RESEND_API_KEY not found in .env. Skipping email sending.");
        } else {
            resend = new Resend(process.env.RESEND_API_KEY);
        }
    }
    return resend;
}

export async function sendInterviewEmail(to: string, subject: string, body: string) {
    const resendClient = initializeResend();
    if (!resendClient) {
        // To avoid breaking the flow in development, we'll log instead of throwing.
        console.log(`WOULD SEND EMAIL TO: ${to}\nSUBJECT: ${subject}\nBODY: ${body}`);
        return;
    }
    try {
        await resendClient.emails.send({
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
// Google Calendar
// ---------------------------------


/**
 * ######################################################################
 * # STEP 2: Generate the Authentication URL                            #
 * ######################################################################
 * This function generates the unique URL that the user will be sent to
 * in order to log in with Google and grant your app permissions.
 */
export async function getGoogleAuthUrl(): Promise<string> {
  const scopes = [
    // We are requesting the minimal scope needed to read/write calendar events.
    'https://www.googleapis.com/auth/calendar.events',
    // We also ask for user profile info to personalize the experience.
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  return oAuth2Client.generateAuthUrl({
    access_type: 'offline', // 'offline' is crucial for getting a refresh token
    prompt: 'consent', // Forces the consent screen to appear, ensuring you get a refresh token
    scope: scopes,
  });
}


/**
 * Placeholder function for creating a Google Calendar event.
 * This requires a full OAuth 2.0 implementation to get user consent and tokens.
 * @param details - The details of the event to create.
 */
export async function createCalendarEvent(details: { title: string, startTime: string, endTime: string, attendeeEmail: string }) {
   if (!process.env.GOOGLE_CLIENT_ID) {
    console.warn("GOOGLE_CLIENT_ID not found. Skipping calendar event creation.");
    return;
  }
  
  // A full implementation would first retrieve the stored tokens for the user,
  // set them on the oAuth2Client, and then make the API call.
  // oAuth2Client.setCredentials(tokens);

  console.log("--- GOOGLE CALENDAR INTEGRATION (Placeholder) ---");
  console.log("This placeholder simulates creating a calendar event.");
  console.log("Event Details:", details);
  
  // This is the point where you would use the authenticated oAuth2Client.
  // The client is already configured with your app's credentials.
  // The final step is to set the user's tokens on it before making the call.
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  console.log("Successfully created a calendar instance with the authenticated client.");
  console.log("To fully implement this, you must store and retrieve user OAuth tokens securely.");
}
