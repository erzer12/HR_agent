
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
  jobTitle: z
    .string()
    .describe('The title of the job the candidate applied for.'),
  interviewDate: z.string().describe('The date of the interview.'),
  interviewTime: z.string().describe('The time of the interview.'),
  interviewerName: z.string().describe('The name of the interviewer.'),
  candidateEmail: z
    .string()
    .optional()
    .describe('The email address of the candidate.'),
});
export type DraftPersonalizedConfirmationEmailInput = z.infer<
  typeof DraftPersonalizedConfirmationEmailInputSchema
>;

const DraftPersonalizedConfirmationEmailOutputSchema = z.object({
  emailSubject: z.string().describe('The subject of the confirmation email.'),
  emailBody: z.string().describe('The body of the confirmation email.'),
});
export type DraftPersonalizedConfirmationEmailOutput = z.infer<
  typeof DraftPersonalizedConfirmationEmailOutputSchema
>;

export async function draftPersonalizedConfirmationEmail(
  input: DraftPersonalizedConfirmationEmailInput
): Promise<DraftPersonalizedConfirmationEmailOutput> {
  return draftPersonalizedConfirmationEmailFlow(input);
}

const prompt = ai.definePrompt({
  name: 'draftPersonalizedConfirmationEmailPrompt',
  input: {schema: DraftPersonalizedConfirmationEmailInputSchema},
  output: {schema: DraftPersonalizedConfirmationEmailOutputSchema},
  prompt: `You are an HR assistant. Draft a personalized confirmation email to a candidate with interview details.

  Candidate Name: {{{candidateName}}}
  Job Title: {{{jobTitle}}}
  Interview Date: {{{interviewDate}}}
  Interview Time: {{{interviewTime}}}
  Interviewer: {{{interviewerName}}}
  
  Generate a professional and friendly email with a clear subject line and body.
  The body should be well-formatted with appropriate line breaks.`,
});

const draftPersonalizedConfirmationEmailFlow = ai.defineFlow(
  {
    name: 'draftPersonalizedConfirmationEmailFlow',
    inputSchema: DraftPersonalizedConfirmationEmailInputSchema,
    outputSchema: DraftPersonalizedConfirmationEmailOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
