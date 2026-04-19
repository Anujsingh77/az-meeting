import { type NextRequest, NextResponse } from "next/server";

// Completely bypass middleware auth checks.
// Auth is handled client-side in each page instead.
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
