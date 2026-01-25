import { NextApiRequest, NextApiResponse } from "next";
import { parse, serialize } from "cookie";
import crypto from "crypto";
import { logger } from "@/lib/logger";
import { VISITOR_COOKIE_NAME } from "@/lib/auth/cookie-constants";

const log = logger.child({ module: "trial/middleware" });

export interface TrialSession {
  visitorId: string;
  ip: string;
  createdAt: Date;
  lastActivity: Date;
}

// In-memory store (replace with DB in production)
const sessions = new Map<string, TrialSession>();

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers["x-real-ip"];
  return typeof realIp === "string"
    ? realIp
    : req.socket.remoteAddress || "unknown";
}

function getOrCreateVisitorId(
  req: NextApiRequest,
  res: NextApiResponse,
): string {
  const cookies = parse(req.headers.cookie || "");
  let visitorId = cookies[VISITOR_COOKIE_NAME];

  if (!visitorId) {
    visitorId = crypto.randomUUID();
    res.setHeader(
      "Set-Cookie",
      serialize(VISITOR_COOKIE_NAME, visitorId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      }),
    );
  }

  return visitorId;
}

function getOrCreateSession(visitorId: string, ip: string): TrialSession {
  if (sessions.has(visitorId)) {
    const session = sessions.get(visitorId)!;
    session.lastActivity = new Date();
    return session;
  }

  const session: TrialSession = {
    visitorId,
    ip,
    createdAt: new Date(),
    lastActivity: new Date(),
  };

  sessions.set(visitorId, session);
  return session;
}

export const withTrial = (
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    session: TrialSession,
  ) => Promise<void>,
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const visitorId = getOrCreateVisitorId(req, res);
    const ip = getClientIp(req);
    const session = getOrCreateSession(visitorId, ip);

    // Attach to request context
    (req as NextApiRequest & { trialSession: TrialSession }).trialSession =
      session;

    // Log trial session activity
    log.debug("Trial session activity", {
      visitorId: session.visitorId,
      ip: session.ip,
      method: req.method,
      path: req.url,
    });

    return handler(req, res, session);
  };
};
