import { verify } from "discord-verify/node";
import { webcrypto } from "node:crypto";

const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY!;

export async function verifyDiscordRequest(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
): Promise<boolean> {
  if (!signature || !timestamp) return false;

  return verify(
    rawBody,
    signature,
    timestamp,
    PUBLIC_KEY,
    webcrypto.subtle,
  );
}
