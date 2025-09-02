import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      // Gemini 2.5 Flash is a lower-cost, high-throughput model.
      // https://ai.google.dev/docs/gemini/models-overview#gemini-2.5-flash
      model: 'gemini-2.5-flash',
      // The temperature is set to 0 to make the model's output more
      // deterministic and consistent. This is important for scoring resumes.
      // https://ai.google.dev/docs/concepts#model_parameters
      temperature: 0,
    }),
  ],
});
