import OpenAI from "openai";
import { NextRequest } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required."),
  model: z.string().trim().min(1).optional(),
  size: z.enum(["auto", "1024x1024", "1536x1024", "1024x1536"]).optional(),
  background: z.enum(["auto", "opaque", "transparent"]).optional(),
  quality: z.enum(["auto", "low", "medium", "high"]).optional(),
});

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

    const client = new OpenAI({ apiKey });
    const { prompt, model, size, background, quality } = parsed.data;

    const imageResponse = await client.images.generate({
      model: model ?? "gpt-image-2",
      prompt,
      size: size ?? "1024x1024",
      background,
      quality,
      n: 1,
    });

    if (!('data' in imageResponse)) {
      return Response.json({ error: "Unexpected response format from OpenAI." }, { status: 502 });
    }

    const image = imageResponse.data?.[0];
    if (!image?.b64_json) {
      return Response.json({ error: "No image returned by OpenAI." }, { status: 502 });
    }

    return Response.json({
      model: model ?? "gpt-image-2",
      mimeType: "image/png",
      dataUrl: `data:image/png;base64,${image.b64_json}`,
      base64: image.b64_json,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return Response.json({ error: message }, { status: 500 });
  }
}