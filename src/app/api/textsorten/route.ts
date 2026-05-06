import { getTextsorten } from "@/lib/neon";

export async function GET() {
  const textsorten = await getTextsorten();

  return new Response(JSON.stringify({ textsorten }), {
    headers: { "Content-Type": "application/json" },
  });
}
