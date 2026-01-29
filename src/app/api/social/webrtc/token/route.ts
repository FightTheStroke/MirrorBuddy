import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { logger } from "@/lib/logger";

/**
 * 📹 WebRTC Token Generator (LiveKit)
 * Provides secure tokens for students joining a study room.
 */
export async function POST(req: NextRequest) {
  try {
    const { roomName, identity } = await req.json();

    if (!roomName || !identity) {
      return NextResponse.json({ error: "Missing roomName or identity" }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      logger.error("LiveKit configuration missing in environment variables");
      return NextResponse.json({ error: "WebRTC not configured" }, { status: 500 });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: identity,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    return NextResponse.json({
      participantToken: await at.toJwt(),
      serverUrl: wsUrl,
      roomName
    });

  } catch (error) {
    logger.error("Failed to generate WebRTC token", { error: String(error) });
    return NextResponse.json({ error: "Token generation failed" }, { status: 500 });
  }
}
