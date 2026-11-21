import "server-only";
import { unavailable } from "./http";

export const secureCookies = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url && !key && !Object.entries(process.env).some(([name, value]) =>
    value && /^(NEXT_PUBLIC_)?SUPABASE_/.test(name))) return null;
  if (!url || !key) throw unavailable();
  try {
    const endpoint = new URL(url);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
    if ((endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && local)) ||
        endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw unavailable();
    if (!/^sb_publishable_[a-zA-Z0-9_-]+$/.test(key)) {
      const parts = key.split(".");
      if (parts.length !== 3 || JSON.parse(Buffer.from(parts[1], "base64url").toString()).role !== "anon") {
        throw unavailable();
      }
    }
  } catch {
    throw unavailable();
  }
  return { url, key };
}
