import { auth } from "@/lib/auth/server";
import { NextResponse } from "next/server";

const unavailableHandler = async (request: Request) =>
	NextResponse.json(
		{
			error:
				"Auth is not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET.",
		},
		{ status: 500 },
	);

const handlers = auth?.handler();

export const GET = handlers?.GET ?? unavailableHandler;
export const POST = handlers?.POST ?? unavailableHandler;
