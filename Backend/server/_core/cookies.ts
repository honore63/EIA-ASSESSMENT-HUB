import type { CookieOptions, Request } from "express";

export function getSessionCookieOptions(req: Request): CookieOptions {
  const host = req.headers.host?.split(":")[0]?.toLowerCase();
  const localHttpDevelopment = process.env.NODE_ENV !== "production"
    && (host === "localhost" || host === "127.0.0.1" || host === "::1");
  // Preview is public HTTPS in a cross-site frame even when the upstream request is HTTP.
  return {
    httpOnly: true,
    path: "/",
    sameSite: localHttpDevelopment ? "lax" : "none",
    secure: !localHttpDevelopment,
  };
}
