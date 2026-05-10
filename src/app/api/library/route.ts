import { getLibraryTexts, getPublishedTexts } from "@/lib/neon";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const published = url.searchParams.get("published");
  const onlyPublic = url.searchParams.get("onlyPublic") !== "false";

  if (published === "true") {
    const texts = await getPublishedTexts(50, onlyPublic);
    return new Response(JSON.stringify({ publishedTexts: texts }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const texts = await getLibraryTexts();

  return new Response(JSON.stringify({ texts }), {
    headers: { "Content-Type": "application/json" },
  });
}
