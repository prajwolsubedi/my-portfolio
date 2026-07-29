import { NextRequest, NextResponse } from "next/server";
import { createOtpChallenge, verifyPassword } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password || !(await verifyPassword(password))) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const code = await createOtpChallenge();
    await sendOtpEmail(code);

    return NextResponse.json({ step: "otp" });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
