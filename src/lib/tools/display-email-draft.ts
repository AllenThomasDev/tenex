import { tool } from "ai";
import { z } from "zod";

export function createDisplayEmailDraftTool() {
  return tool({
    description:
      "Display a styled email draft to the user with a button to open it in Gmail. Use this when the user asks you to draft, write, or compose an email. Do NOT add any text summary — the UI component handles the display.",
    inputSchema: z.object({
      to: z
        .array(z.string())
        .describe("Recipient email addresses"),
      subject: z.string().describe("Email subject line"),
      body: z.string().describe("Email body text (plain text, use newlines for paragraphs)"),
      cc: z
        .array(z.string())
        .optional()
        .describe("CC email addresses"),
    }),
    execute: async ({ to, subject, body, cc }) => {
      return { to, subject, body, cc };
    },
  });
}
