// Reasoning provider touchpoint.
import OpenAI from "openai";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt.mjs";

const MODEL = "gpt-4o-mini";

/**
 * @param {object} context - { today, tasks, github, calendar, gmail, previousBriefing }
 * @param {object} options - { apiKey }
 * @returns {Promise<string>} briefing as markdown (fixed 5-section contract)
 */
export async function getPriorityBriefing(context, { apiKey }) {
  if (!apiKey) {
    throw new Error(
      "OpenAI API key missing. Set OPENAI_API_KEY in .env (local) or SSM /orbit/openai-api-key (Lambda)."
    );
  }

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(context) },
    ],
  });

  const briefing = response.choices[0]?.message?.content?.trim();
  if (!briefing) {
    throw new Error("OpenAI returned an empty briefing.");
  }
  return briefing;
}
