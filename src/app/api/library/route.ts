import { getLibraryTexts } from "@/lib/neon";

export async function GET() {
  const texts = await getLibraryTexts();

  return new Response(JSON.stringify({ texts }), {
    headers: { "Content-Type": "application/json" },
  });
}
