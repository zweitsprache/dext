import { publishText } from "@/lib/neon";
import { NextRequest } from "next/server";
import { z } from "zod";

const publishRequestSchema = z.object({
  generatedTextId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1, "Title is required"),
  summary: z.string().trim().min(1, "Summary is required"),
  paragraphs: z.array(z.string()).min(1, "At least one paragraph required"),
  imageUrl: z.string().trim().min(1).optional(),
  imagePrompt: z.string().trim().optional(),
  isPublic: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = publishRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          error: "Invalid request body",
          issues: parsed.error.issues.map((issue) => issue.message),
        },
        { status: 400 }
      );
    }

    const id = await publishText({
      generatedTextId: parsed.data.generatedTextId,
      title: parsed.data.title,
      summary: parsed.data.summary,
      paragraphs: parsed.data.paragraphs,
      imageUrl: parsed.data.imageUrl,
      imagePrompt: parsed.data.imagePrompt,
      isPublic: parsed.data.isPublic,
    });

    if (!id) {
      return Response.json(
        { error: "Failed to publish text" },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      publishedTextId: id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: `Publication failed: ${message}` },
      { status: 500 }
    );
  }
}
