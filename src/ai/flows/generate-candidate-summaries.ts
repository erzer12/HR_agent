'use server';
/**
 * @fileOverview Generates summaries of each candidate's resume, highlighting relevant skills and experience based on the job description.
 *
 * - generateCandidateSummaries - A function that generates candidate summaries.
 * - GenerateCandidateSummariesInput - The input type for the generateCandidateSummaries function.
 * - GenerateCandidateSummariesOutput - The return type for the generateCandidateSummaries function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCandidateSummariesInputSchema = z.object({
  jobDescription: z
    .string()
    .describe('The job description to match the resumes against.'),
  resumeText: z.string().describe('The text content of the resume.'),
});
export type GenerateCandidateSummariesInput = z.infer<
  typeof GenerateCandidateSummariesInputSchema
>;

const GenerateCandidateSummariesOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A summary of the resume, highlighting relevant skills and experience based on the job description.'
    ),
});
export type GenerateCandidateSummariesOutput = z.infer<
  typeof GenerateCandidateSummariesOutputSchema
>;

export async function generateCandidateSummaries(
  input: GenerateCandidateSummariesInput
): Promise<GenerateCandidateSummariesOutput> {
  return generateCandidateSummariesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCandidateSummariesPrompt',
  input: {schema: GenerateCandidateSummariesInputSchema},
  output: {schema: GenerateCandidateSummariesOutputSchema},
  prompt: `You are an expert HR assistant tasked with summarizing resumes based on a job description.

  Given the following job description:
  {{jobDescription}}

  And the following resume text:
  {{resumeText}}

  Generate a concise summary of the resume, highlighting the skills and experience that are most relevant to the job description. Focus on quantifiable achievements and specific examples.
  The summary should not be more than 200 words.`,
});

const generateCandidateSummariesFlow = ai.defineFlow(
  {
    name: 'generateCandidateSummariesFlow',
    inputSchema: GenerateCandidateSummariesInputSchema,
    outputSchema: GenerateCandidateSummariesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
