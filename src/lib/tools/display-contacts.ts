import { tool } from "ai"
import { z } from "zod"
import { searchGoogleContacts } from "./google-contacts"

export function createDisplayContactsTool(accessToken: string) {
  return tool({
    description:
      "Display Google Contact matches as a visual list. Use this whenever you search for people by name, email, or phone number. Do NOT add a text summary after calling it.",
    inputSchema: z.object({
      query: z.string().describe("Name, email address, or phone number to search for"),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(200)
        .default(100)
        .describe("Maximum number of contacts to scan from Google Contacts"),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(10)
        .describe("Maximum number of matching contacts to return"),
    }),
    execute: ({ query, pageSize, maxResults }) =>
      searchGoogleContacts(accessToken, query, pageSize, maxResults),
  })
}
