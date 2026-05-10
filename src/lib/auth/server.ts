import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

const isAuthConfigured = Boolean(baseUrl && cookieSecret);

if (!isAuthConfigured && process.env.NODE_ENV !== "production") {
  console.warn(
    "Neon Auth is not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET to enable authentication.",
  );
}

export const auth = isAuthConfigured
  ? createNeonAuth({
      baseUrl: baseUrl!,
      cookies: {
        secret: cookieSecret!,
        sessionDataTtl: 300,
      },
    })
  : null;
