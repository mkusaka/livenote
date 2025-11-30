import { generateText, generateObject } from "ai";
import { z } from "zod";
import { models } from "./index";

/**
 * Extract keywords and topics from a message segment
 */
export async function extractTopics(content: string) {
  const { object } = await generateObject({
    model: models.fast,
    schema: z.object({
      keywords: z.array(z.string()).describe("Key terms mentioned"),
      topics: z
        .array(
          z.object({
            title: z.string().describe("Topic title"),
            summary: z.string().describe("Brief summary of the topic"),
          })
        )
        .describe("Main discussion topics identified"),
    }),
    prompt: `Extract keywords and topics from the following conversation segment:

${content}

Identify the main keywords and discussion topics.`,
  });

  return object;
}

/**
 * Summarize a conversation segment
 */
export async function summarizeSegment(
  content: string,
  context?: string
): Promise<string> {
  const { text } = await generateText({
    model: models.fast,
    prompt: `${context ? `Context: ${context}\n\n` : ""}Summarize the following conversation segment concisely:

${content}`,
  });

  return text;
}

/**
 * Structure a meeting transcript into organized notes
 */
export async function structureMeeting(transcript: string) {
  const { object } = await generateObject({
    model: models.powerful,
    schema: z.object({
      summary: z.string().describe("Executive summary of the meeting"),
      sections: z
        .array(
          z.object({
            title: z.string(),
            content: z.string(),
          })
        )
        .describe("Main sections/topics discussed"),
      decisions: z
        .array(z.string())
        .describe("Key decisions made during the meeting"),
      actionItems: z
        .array(
          z.object({
            task: z.string(),
            assignee: z.string().optional(),
            deadline: z.string().optional(),
          })
        )
        .describe("Action items and TODOs"),
      participants: z
        .array(z.string())
        .describe("People who participated in the meeting"),
    }),
    prompt: `Structure the following meeting transcript into organized notes:

${transcript}

Extract the summary, main sections, decisions, action items, and participants.`,
  });

  return object;
}

/**
 * Perform inline research on selected text
 */
export async function inlineResearch(
  selectedText: string,
  context?: string
): Promise<string> {
  const { text } = await generateText({
    model: models.powerful,
    prompt: `${context ? `Conversation context: ${context}\n\n` : ""}The user selected the following text and wants to understand it better:

"${selectedText}"

Provide a concise explanation that:
1. Explains what this refers to
2. Provides relevant context
3. Includes any important details or implications

Keep the response focused and practical.`,
  });

  return text;
}
