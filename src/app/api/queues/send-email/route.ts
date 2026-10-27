/**
 * QStash Background Worker: /api/queues/send-email
 *
 * Receives background email dispatch tasks from Upstash QStash,
 * verifies request signatures, and dispatches the corresponding email.
 */

import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { executeEmailJob, type EmailJobPayload } from "@/lib/queue";

export const maxDuration = 60; // Allow sufficient time for transactional SMTP/Resend API

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    const currentSigningKey =
      process.env.QSTASH_CURRENT_SIGNING_KEY ||
      process.env.UPSTASH_CURRENT_SIGNING_KEY;
    const nextSigningKey =
      process.env.QSTASH_NEXT_SIGNING_KEY ||
      process.env.UPSTASH_NEXT_SIGNING_KEY;

    // 1. Signature Verification (when keys are configured)
    if (currentSigningKey) {
      const signature = req.headers.get("upstash-signature");

      if (!signature) {
        console.warn("[QStash Worker] Rejected: Missing 'upstash-signature' header.");
        return NextResponse.json(
          { error: "Unauthorized: Missing Upstash signature" },
          { status: 401 },
        );
      }

      const receiver = new Receiver({
        currentSigningKey,
        nextSigningKey: nextSigningKey || currentSigningKey,
      });

      try {
        const isValid = await receiver.verify({
          signature,
          body: rawBody,
        });

        if (!isValid) {
          console.warn("[QStash Worker] Rejected: Invalid signature.");
          return NextResponse.json(
            { error: "Unauthorized: Invalid signature" },
            { status: 401 },
          );
        }
      } catch (verifyError) {
        const errMessage =
          verifyError instanceof Error ? verifyError.message : String(verifyError);
        console.error(`[QStash Worker] Signature verification failed: ${errMessage}`);
        return NextResponse.json(
          { error: `Unauthorized: ${errMessage}` },
          { status: 401 },
        );
      }
    } else {
      console.warn(
        "[QStash Worker] QSTASH_CURRENT_SIGNING_KEY is not configured. Processing without signature verification.",
      );
    }

    // 2. Parse Payload
    let payload: EmailJobPayload;
    try {
      payload = JSON.parse(rawBody) as EmailJobPayload;
    } catch {
      return NextResponse.json(
        { error: "Bad Request: Invalid JSON body" },
        { status: 400 },
      );
    }

    if (!payload.type || !payload.email) {
      return NextResponse.json(
        { error: "Bad Request: Missing 'type' or 'email' in payload" },
        { status: 400 },
      );
    }

    console.info(
      `[QStash Worker] Processing job: "${payload.type}" for recipient: "${payload.email}"`,
    );

    // 3. Execute Transactional Email
    const result = await executeEmailJob(payload);

    if (!result.ok) {
      console.error(
        `[QStash Worker] Delivery failure for ${payload.type} to ${payload.email}: ${result.error}`,
      );
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      type: payload.type,
      recipient: payload.email,
      provider: result.provider,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[QStash Worker] Uncaught server error: ${errorMsg}`);
    return NextResponse.json(
      { error: `Internal Server Error: ${errorMsg}` },
      { status: 500 },
    );
  }
}
