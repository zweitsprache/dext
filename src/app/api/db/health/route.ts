import { getNeonHealth, isNeonConfigured } from "@/lib/neon";

export async function GET() {
  if (!isNeonConfigured()) {
    return new Response(
      JSON.stringify({
        connected: false,
        error: "DATABASE_URL not configured",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const health = await getNeonHealth();
  const statusCode = health.connected ? 200 : 500;

  return new Response(JSON.stringify(health), {
    status: statusCode,
    headers: { "Content-Type": "application/json" },
  });
}
