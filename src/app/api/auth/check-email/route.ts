import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ exists: false, valid: false });
  }

  // Rate limiting to prevent email scraping
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const rateLimit = checkRateLimit(`check_email_${ip}`, {
    interval: 60_000,
    maxRequests: 30,
  });

  if (!rateLimit.success) {
    return NextResponse.json({ exists: false, error: "Rate limit exceeded" }, { status: 429 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ exists: false });
  }

  try {
    const { data, error } = await adminClient
      .from("users")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: Boolean(data),
      valid: true,
    });
  } catch {
    return NextResponse.json({ exists: false });
  }
}
