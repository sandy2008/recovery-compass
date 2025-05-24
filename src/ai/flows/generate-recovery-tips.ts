'use server';
/**
 * @fileOverview This file contains the Genkit flow for generating personalized recovery tips.
 *
 * - generateRecoveryTips - A function that generates personalized recovery tips based on user's daily log.
 * - GenerateRecoveryTipsInput - The input type for the generateRecoveryTips function.
 * - GenerateRecoveryTipsOutput - The return type for the generateRecoveryTips function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRecoveryTipsInputSchema = z.object({
  painLevel: z.number().describe('Pain level reported by the user (1-10).'),
  swellingLevel: z.number().describe('Swelling level reported by the user (1-10).'),
  medicationTaken: z.string().describe('Medications taken by the user today.'),
  notes: z.string().describe('Any additional notes from the user about their recovery.'),
  photoDataUri: z
    .string()
    .describe(
      "A photo related to the recovery, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    )
    .optional(),
  surgeryType: z.string().describe('Type of surgery the user had.'),
  surgeryDate: z.string().describe('Date of the surgery.'),
  userName: z.string().describe('Name of the user.'),
});

export type GenerateRecoveryTipsInput = z.infer<typeof GenerateRecoveryTipsInputSchema>;

const GenerateRecoveryTipsOutputSchema = z.object({
  tips: z.string().describe('Personalized recovery tips and suggestions.'),
});

export type GenerateRecoveryTipsOutput = z.infer<typeof GenerateRecoveryTipsOutputSchema>;

export async function generateRecoveryTips(input: GenerateRecoveryTipsInput): Promise<GenerateRecoveryTipsOutput> {
  return generateRecoveryTipsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRecoveryTipsPrompt',
  input: {schema: GenerateRecoveryTipsInputSchema},
  output: {schema: GenerateRecoveryTipsOutputSchema},
  prompt: `You are a virtual assistant providing personalized recovery tips to patients after surgery.

  Based on the user's daily log, provide tips and suggestions to improve their recovery process.
  Consider the pain level, swelling level, medications taken, and any additional notes provided by the user.
  If a photo is provided, analyze it to provide more specific and tailored advice.
  The user had a {{surgeryType}} surgery on {{surgeryDate}}.

  Here is the user's recovery log:
  - Pain Level: {{painLevel}}
  - Swelling Level: {{swellingLevel}}
  - Medication Taken: {{medicationTaken}}
  - Notes: {{notes}}
  {{#if photoDataUri}}
  - Photo: {{media url=photoDataUri}}
  {{/if}}

  Provide specific and actionable advice to help the user improve their recovery. Address the user as {{userName}}.
`,
});

const generateRecoveryTipsFlow = ai.defineFlow(
  {
    name: 'generateRecoveryTipsFlow',
    inputSchema: GenerateRecoveryTipsInputSchema,
    outputSchema: GenerateRecoveryTipsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
