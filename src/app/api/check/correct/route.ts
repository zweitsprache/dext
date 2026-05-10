import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { NextRequest } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  telcLevel: z.enum(["TELC A1", "TELC A2", "TELC B1"]),
  taskText: z.string().trim().min(1, "Task text is required."),
  candidateSolution: z.string().trim().min(1, "Candidate solution is required."),
  checkNotes: z.string().optional(),
});

type CheckResult = {
  score: number;
  levelEstimate: string;
  verdict: string;
  strengths: string[];
  issues: string[];
  feedback: string;
};

function extractJsonObject(raw: string): string {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end >= 0 && end > start) {
    return cleaned.slice(start, end + 1);
  }
  return cleaned;
}

function normalizeResult(input: unknown): CheckResult {
  const data = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;

  const scoreRaw = typeof data.score === "number" ? data.score : Number(data.score ?? 0);
  const score = Number.isFinite(scoreRaw) ? Math.max(0, Math.min(100, Math.round(scoreRaw))) : 0;

  const strengths = Array.isArray(data.strengths)
    ? data.strengths.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  const issues = Array.isArray(data.issues)
    ? data.issues.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  return {
    score,
    levelEstimate: typeof data.levelEstimate === "string" ? data.levelEstimate.trim() : "",
    verdict: typeof data.verdict === "string" ? data.verdict.trim() : "",
    strengths,
    issues,
    feedback: typeof data.feedback === "string" ? data.feedback.trim() : "",
  };
}

function buildSystemPrompt(): string {
  return `Du bist TELC-Pruefer:in fuer Schreiben.
Bewerte eine Kandidatenloesung anhand:
1) Aufgabenstellung (Task)
2) Bewertungsraster aus angehaengter PDF (telc_b1_schreiben.pdf)

Regeln:
- Nutze die PDF als primaere Bewertungsgrundlage.
- Begruende knapp, klar, konkret und fair.
- Orthografie DE-CH: schreibe ss statt ß.
- Gib AUSSCHLIESSLICH valides JSON zurueck, ohne Markdown.

JSON-Format:
{
  "score": 0,
  "levelEstimate": "string",
  "verdict": "string",
  "strengths": ["string"],
  "issues": ["string"],
  "feedback": "string"
}`;
}

function buildUserPrompt(telcLevel: string, taskText: string, candidateSolution: string, checkNotes?: string): string {
  return `TELC Niveau: ${telcLevel}

Task (aus Upload):
${taskText}

Candidate Solution (eingefuegt):
${candidateSolution}

Zusatzhinweise:
${checkNotes?.trim() ? checkNotes.trim() : "keine"}

Bewerte die Loesung gegen den Task und das PDF-Raster. Gib score als 0-100 und levelEstimate als kurze Einschaetzung (z. B. "B1 erreicht", "zwischen A2 und B1").`;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "OPENAI_API_KEY not configured." }, { status: 500 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json(
        {
          error: "Invalid request body.",
          issues: parsed.error.issues.map((issue) => issue.message),
        },
        { status: 400 },
      );
    }

    const rubricPath = path.join(process.cwd(), "public", "telc_b1_schreiben.pdf");
    const rubricBuffer = await readFile(rubricPath);
    const rubricDataUrl = `data:application/pdf;base64,${rubricBuffer.toString("base64")}`;

    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model: "gpt-4.1",
      temperature: 0.2,
      input: [
        { role: "system", content: [{ type: "input_text", text: buildSystemPrompt() }] },
        {
          role: "user",
          content: [
            { type: "input_text", text: buildUserPrompt(parsed.data.telcLevel, parsed.data.taskText, parsed.data.candidateSolution, parsed.data.checkNotes) },
            {
              type: "input_file",
              filename: "telc_b1_schreiben.pdf",
              file_data: rubricDataUrl,
            },
          ],
        },
      ],
    });

    const rawOutput = response.output_text;
    if (!rawOutput || rawOutput.trim().length === 0) {
      return Response.json({ error: "Empty model response." }, { status: 502 });
    }

    const result = normalizeResult(JSON.parse(extractJsonObject(rawOutput)));
    return Response.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return Response.json({ error: message }, { status: 500 });
  }
}
