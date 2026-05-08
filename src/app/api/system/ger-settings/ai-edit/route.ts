import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NextRequest } from "next/server";
import { GER_LEVEL_ORDER, type GerLevel } from "@/lib/ger-level-specs";

const SYSTEM_PROMPT = `Du bist ein präziser Editor für GER-Niveau-Spezifikationen, die in KI-Systempromt-Blöcken verwendet werden.
Du erhältst den aktuellen Prompt-Block eines GER-Niveaus und eine Bearbeitungsanweisung.
Führe die Anweisung präzise aus und gib NUR den überarbeiteten Block-Text zurück.
Keine Erklärungen, keine Präambeln, kein Markdown-Formatting außer dem, das bereits im Original vorhanden ist.`;

async function callAnthropic(apiKey: string, currentContent: string, instruction: string): Promise<string> {
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Aktueller Block:\n\n${currentContent}\n\nAnweisung: ${instruction}`,
      },
    ],
  });
  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unerwarteter Antworttyp von Anthropic.");
  return block.text.trim();
}

async function callOpenAI(client: OpenAI, model: string, currentContent: string, instruction: string): Promise<string> {
  const response = await client.chat.completions.create({
    model,
    max_tokens: 2048,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Aktueller Block:\n\n${currentContent}\n\nAnweisung: ${instruction}`,
      },
    ],
  });
  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("Leere Antwort vom Modell.");
  return text.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { level?: string; currentContent?: string; instruction?: string };

    const { level, currentContent, instruction } = body;

    if (!level || !GER_LEVEL_ORDER.includes(level as GerLevel)) {
      return Response.json({ error: "Ungültiges oder fehlendes Niveau." }, { status: 400 });
    }
    if (!currentContent || typeof currentContent !== "string" || currentContent.trim().length === 0) {
      return Response.json({ error: "Kein Block-Inhalt übergeben." }, { status: 400 });
    }
    if (!instruction || typeof instruction !== "string" || instruction.trim().length === 0) {
      return Response.json({ error: "Keine Anweisung übergeben." }, { status: 400 });
    }

    // Try Anthropic first, then OpenAI, then Qwen
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      const updatedContent = await callAnthropic(anthropicKey, currentContent, instruction);
      return Response.json({ updatedContent });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const client = new OpenAI({ apiKey: openaiKey });
      const updatedContent = await callOpenAI(client, "gpt-4o-mini", currentContent, instruction);
      return Response.json({ updatedContent });
    }

    const dashscopeKey = process.env.DASHSCOPE_API_KEY;
    if (dashscopeKey) {
      const client = new OpenAI({
        apiKey: dashscopeKey,
        baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
      });
      const updatedContent = await callOpenAI(client, "qwen3.5-plus", currentContent, instruction);
      return Response.json({ updatedContent });
    }

    return Response.json({ error: "Kein KI-API-Schlüssel konfiguriert." }, { status: 500 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return Response.json({ error: message }, { status: 500 });
  }
}
