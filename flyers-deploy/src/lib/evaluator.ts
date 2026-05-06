/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

export interface EvaluationReport {
  grammarScore: number; // 1-5
  vocabularyScore: number; // 1-5
  interactionScore: number; // 1-5
  pronunciationScore: number; // 1-5
  overallFeedback: string;
  tips: string[];
}

export async function generateEvaluationReport(apiKey: string, history: { text: string; role: 'user' | 'model' }[]): Promise<EvaluationReport> {
  const genAI = new GoogleGenAI({ apiKey });

  const transcript = history.map(m => `${m.role === 'user' ? 'Student' : 'Examiner'}: ${m.text}`).join('\n');

  const prompt = `
    You are an expert Cambridge English examiner for the Flyers Speaking exam. 
    Analyze the following transcript of a Part 4 Speaking practice.
    The student is usually 10-12 years old (A2 Level).
    
    Transcript:
    ${transcript}
    
    Evaluate the student across 4 categories (scores 1 to 5):
    1. Grammar & Structures (Correct use of tenses and basic grammar).
    2. Vocabulary range (Use of A2-appropriate words).
    3. Interaction & Detail (Providing full sentences vs. one-word answers).
    4. Pronunciation & Fluency (Based on the flow and clarity inferred from the transcript/repetition).
    
    Format your response as a JSON object with this structure:
    {
      "grammarScore": number,
      "vocabularyScore": number,
      "interactionScore": number,
      "pronunciationScore": number,
      "overallFeedback": "short encouraging paragraph",
      "tips": ["tip 1", "tip 2"]
    }
    
    Ensure the JSON is valid and only return the JSON.
  `;

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    const text = (result as any).text();
    // Clean JSON if needed (Gemini sometimes wraps in ```json)
    const jsonStr = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Error generating report:', err);
    throw new Error('Failed to generate evaluation report.');
  }
}
