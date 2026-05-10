import { auth } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authMiddleware = auth?.middleware({ loginUrl: "/auth/sign-in" });

export default function middleware(request: NextRequest) {
  return authMiddleware?.(request) ?? NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logos/|api/).*)",
  ],
};
