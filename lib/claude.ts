import "server-only";

import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS ?? 2048);

let anthropicClient: Anthropic | null = null;

function getAnthropicApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  return apiKey;
}

export interface ClaudeTextRequest {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
}

export function getAnthropicClient(): Anthropic {
  anthropicClient ??= new Anthropic({ apiKey: getAnthropicApiKey() });

  return anthropicClient;
}

export async function generateClaudeText({
  systemPrompt,
  userPrompt,
  model,
  maxTokens,
}: ClaudeTextRequest): Promise<string> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: model ?? DEFAULT_MODEL,
    max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: 0,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textSegments = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text.trim())
    .filter(Boolean);

  if (textSegments.length === 0) {
    throw new Error("Claude response did not include text content");
  }

  return textSegments.join("\n\n");
}
