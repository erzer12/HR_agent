'use server';

/**
 * @fileOverview This flow automatically selects the top candidates based on their ranking.
 *
 * - selectTopCandidates - A function that handles the selection of top candidates.
 * - SelectTopCandidatesInput - The input type for the selectTopCandidates function.
 * - SelectTopCandidatesOutput - The return type for the selectTopCandidates function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SelectTopCandidatesInputSchema = z.object({
  candidateRankings: z
    .array(
      z.object({
        candidateId: z.string().describe('The unique identifier of the candidate.'),
        rankingScore: z.number().describe('The ranking score of the candidate.'),
      })
    )
    .describe('An array of candidate rankings, including their ID and score.'),
  numberOfCandidatesToSelect: z
    .number()
    .int()
    .positive()
    .describe('The number of top candidates to select.'),
});
export type SelectTopCandidatesInput = z.infer<typeof SelectTopCandidatesInputSchema>;

const SelectTopCandidatesOutputSchema = z.object({
  selectedCandidateIds: z
    .array(z.string())
    .describe('An array of candidate IDs that have been selected as top candidates.'),
});
export type SelectTopCandidatesOutput = z.infer<typeof SelectTopCandidatesOutputSchema>;

export async function selectTopCandidates(input: SelectTopCandidatesInput): Promise<SelectTopCandidatesOutput> {
  return selectTopCandidatesFlow(input);
}

const selectTopCandidatesFlow = ai.defineFlow(
  {
    name: 'selectTopCandidatesFlow',
    inputSchema: SelectTopCandidatesInputSchema,
    outputSchema: SelectTopCandidatesOutputSchema,
  },
  async input => {
    const {
      candidateRankings,
      numberOfCandidatesToSelect,
    } = input;

    // Sort candidates by ranking score in descending order
    const sortedCandidates = [...candidateRankings].sort((a, b) => b.rankingScore - a.rankingScore);

    // Select the top N candidates
    const selectedCandidates = sortedCandidates.slice(0, numberOfCandidatesToSelect);

    // Extract the candidate IDs of the selected candidates
    const selectedCandidateIds = selectedCandidates.map(candidate => candidate.candidateId);

    return {
      selectedCandidateIds,
    };
  }
);
