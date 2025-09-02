import { config } from 'dotenv';
config();

import '@/ai/flows/rank-candidates-against-job-description.ts';
import '@/ai/flows/select-top-candidates.ts';
import '@/ai/flows/draft-personalized-confirmation-emails.ts';
import '@/ai/flows/generate-candidate-summaries.ts';