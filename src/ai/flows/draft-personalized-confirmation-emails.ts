// This file is machine-generated - edit with caution!
'use server';
/**
 * @fileOverview This flow drafts personalized confirmation emails to candidates with interview details.
 *
 * - draftPersonalizedConfirmationEmail - A function that handles drafting personalized confirmation emails.
 * - DraftPersonalizedConfirmationEmailInput - The input type for the draftPersonalizedConfirmationEmail function.
 * - DraftPersonalizedConfirmationEmailOutput - The return type for the draftPersonalizedConfirmationEmail function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DraftPersonalizedConfirmationEmailInputSchema = z.object({
  candidateName: z.string().describe('The name of the candidate.'),
  jobTitle: z.string().describe('The title of the job the candidate applied for.'),
  interviewDate: z.string().describe('The date of the interview.'),
  interviewTime: z.string().describe('The time of the interview.'),
  interviewerName: z.string().describe('The name of the interviewer.'),
  candidateEmail: z.string().email().describe('The email address of the candidate.'),
});
export type DraftPersonalizedConfirmationEmailInput = z.infer<typeof DraftPersonalizedConfirmationEmailInputSchema>;

const DraftPersonalizedConfirmationEmailOutputSchema = z.object({
  emailSubject: z.string().describe('The subject of the confirmation email.'),
  emailBody: z.string().describe('The body of the confirmation email.'),
});
export type DraftPersonalizedConfirmationEmailOutput = z.infer<typeof DraftPersonalizedConfirmationEmailOutputSchema>;

export async function draftPersonalizedConfirmationEmail(input: DraftPersonalizedConfirmationEmailInput): Promise<DraftPersonalizedConfirmationEmailOutput> {
  return draftPersonalizedConfirmationEmailFlow(input);
}

const draftPersonalizedConfirmationEmailFlow = ai.defineFlow(
  {
    name: 'draftPersonalizedConfirmationEmailFlow',
    inputSchema: DraftPersonalizedConfirmationEmailInputSchema,
    outputSchema: DraftPersonalizedConfirmationEmailOutputSchema,
  },
  async input => {
    const {
        candidateName,
        jobTitle,
        interviewDate,
        interviewTime,
        interviewerName,
    } = input;

    const emailSubject = `Interview Confirmation: ${jobTitle}`;
    const emailBody = `Dear ${candidateName},

Thank you for your interest in the ${jobTitle} position. We would like to invite you for an interview.

Your interview is scheduled for:
Date: ${interviewDate}
Time: ${interviewTime}
Interviewer: ${interviewerName}

We look forward to speaking with you.

Best regards,
The Hiring Team`;

    return {
      emailSubject,
      emailBody,
    };
  }
);
