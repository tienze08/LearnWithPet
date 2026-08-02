import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  words: z.array(z.string().min(1).max(60)).min(1).max(30),
  context: z.string().max(8000).default(""),
  title: z.string().max(200).default(""),
});

export type GeneratedCard = {
  word: string;
  pos: string;
  ipa: string;
  cefr: string;
  meaning: string;
  example: string;
};

export const generateFlashcards = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<{ cards: GeneratedCard[] }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured");

    const prompt = [
      `Reading passage title: ${data.title || "Untitled"}`,
      `Passage (use it as context for meanings and examples):`,
      data.context.slice(0, 6000),
      ``,
      `Create one flashcard for each of these words/phrases, in the same order:`,
      data.words.map((w, i) => `${i + 1}. ${w}`).join("\n"),
      ``,
      `Rules: meaning must be a short learner-friendly English definition that fits how the word is used in the passage. example must be the sentence from the passage containing the word (or a natural new sentence if absent). ipa in slashes. cefr one of A1,A2,B1,B2,C1,C2. pos one of noun,verb,adj,adv,phrase.`,
    ].join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: "You are an expert English vocabulary teacher." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_flashcards",
              description: "Return the generated flashcards",
              parameters: {
                type: "object",
                properties: {
                  cards: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        word: { type: "string" },
                        pos: { type: "string" },
                        ipa: { type: "string" },
                        cefr: { type: "string" },
                        meaning: { type: "string" },
                        example: { type: "string" },
                      },
                      required: ["word", "pos", "ipa", "cefr", "meaning", "example"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["cards"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_flashcards" } },
      }),
    });

    if (res.status === 429) throw new Error("Rate limit reached — please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please top up your workspace.");
    if (!res.ok) throw new Error(`AI request failed (${res.status})`);

    const json = (await res.json()) as {
      choices?: Array<{
        message?: { tool_calls?: Array<{ function?: { arguments?: string } }> };
      }>;
    };
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("AI returned no flashcards");

    const parsed = z
      .object({
        cards: z.array(
          z.object({
            word: z.string(),
            pos: z.string(),
            ipa: z.string(),
            cefr: z.string(),
            meaning: z.string(),
            example: z.string(),
          }),
        ),
      })
      .parse(JSON.parse(args));

    return parsed;
  });
