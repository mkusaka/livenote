import { createOpenAI } from "@ai-sdk/openai";

// OpenAI client instance
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Default models
export const models = {
  // For fast, lightweight tasks (keyword extraction, quick summaries)
  fast: openai("gpt-4o-mini"),
  // For complex tasks (meeting structuring, detailed analysis)
  powerful: openai("gpt-4o"),
} as const;
