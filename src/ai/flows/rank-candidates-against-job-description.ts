'use server';
/**
 * @fileOverview Ranks candidates based on their resumes against a job description.
 *
 * - rankCandidates - A function that handles the ranking of candidates.
 * - RankCandidatesInput - The input type for the rankCandidates function.
 * - RankCandidatesOutput - The return type for the rankCandidates function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RankCandidatesInputSchema = z.object({
  jobDescription: z.string().describe('The job description for the role.'),
  resumes: z
    .array(z.string())
    .describe(
      'An array of resumes, each as a data URI that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
});
export type RankCandidatesInput = z.infer<typeof RankCandidatesInputSchema>;

const CandidateRankingSchema = z.object({
  candidateIndex: z
    .number()
    .describe('The index of the candidate in the input resumes array.'),
  candidateName: z.string().describe("The full name of the candidate, extracted from the resume."),
  candidateEmail: z.string().optional().describe("The email address of the candidate, extracted from the resume."),
  suitabilityScore: z
    .number()
    .describe(
      'A score between 0 and 1 representing the candidate’s suitability for the role, with 1 being the most suitable.'
    ),
  summary: z
    .string()
    .describe(
      'A brief summary of the candidate’s qualifications and experience, highlighting their suitability for the role.'
    ),
});

const RankCandidatesOutputSchema = z.object({
  rankings: z.array(CandidateRankingSchema).describe('The rankings of the candidates.'),
});
export type RankCandidatesOutput = z.infer<typeof RankCandidatesOutputSchema>;

export async function rankCandidates(input: RankCandidatesInput): Promise<RankCandidatesOutput> {
  return rankCandidatesFlow(input);
}

const rankCandidatesPrompt = ai.definePrompt({
  name: 'rankCandidatesPrompt',
  input: {schema: RankCandidatesInputSchema},
  output: {schema: RankCandidatesOutputSchema},
  prompt: `You are an expert HR assistant. You will rank candidates based on their resumes against a job description.
From each resume, you MUST extract the candidate's full name and email address.

Job Description: {{{jobDescription}}}

Resumes:
{{#each resumes}}
Candidate {{@index}}: {{media url=this}}
{{/each}}

Rank the candidates based on their suitability for the role. For each candidate, provide:
1. Their full name.
2. Their email address. If no email is found, omit the field.
3. A suitability score between 0 and 1.
4. A brief summary of their qualifications and experience.

{{output.schema.description}}
`,
});

const rankCandidatesFlow = ai.defineFlow(
  {
    name: 'rankCandidatesFlow',
    inputSchema: RankCandidatesInputSchema,
    outputSchema: RankCandidatesOutputSchema,
  },
  async input => {
    const {output} = await rankCandidatesPrompt(input);
    return output!;
  }
);
