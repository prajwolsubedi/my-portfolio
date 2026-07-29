import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const result = await verifyOtp(code);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
