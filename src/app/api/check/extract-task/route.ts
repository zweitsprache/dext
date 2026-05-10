import { NextRequest } from "next/server";
import OpenAI from "openai";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export const runtime = "nodejs";

function normalizeExtractedText(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

async function extractTextFromImage(file: File): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = file.type || "image/jpeg";
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Extrahiere den gesamten lesbaren Text aus diesem Aufgabenbild. Gib ausschliesslich den extrahierten Text zurueck, ohne Erklaerung.",
          },
          {
            type: "input_image",
            image_url: dataUrl,
            detail: "auto",
          },
        ],
      },
    ],
  });

  return normalizeExtractedText(response.output_text ?? "");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "No file uploaded." }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || fileName.endsWith(".pdf");
    const isImage = IMAGE_MIME_TYPES.has(file.type) || /\.(jpg|jpeg|png|webp)$/.test(fileName);

    if (!isPdf && !isImage) {
      return Response.json({ error: "Only PDF and image files are supported." }, { status: 400 });
    }

    let text = "";
    if (isPdf) {
      const arrayBuffer = await file.arrayBuffer();
      const parsed = await pdfParse(Buffer.from(arrayBuffer));
      text = normalizeExtractedText(parsed.text ?? "");
    } else {
      text = await extractTextFromImage(file);
    }

    if (!text) {
      return Response.json({ error: "No text found in uploaded file." }, { status: 422 });
    }

    return Response.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return Response.json({ error: message }, { status: 500 });
  }
}
