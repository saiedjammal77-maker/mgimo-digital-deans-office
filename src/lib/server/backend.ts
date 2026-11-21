import "server-only";
import { supabaseConfig } from "./config";
import { demoBackend, demoSessionCookie } from "./demo";
import { demoUsers } from "./fixtures";
import { ApiError, type Jar } from "./http";
import { supabaseBackend } from "./supabase";

export function sessionBackend(jar: Jar, readOnly = false) {
  const config = supabaseConfig();
  return config && !jar.has(demoSessionCookie)
    ? supabaseBackend(config, jar, readOnly)
    : demoBackend(jar, readOnly);
}

export async function signIn(jar: Jar, username: string, password: string) {
  const config = supabaseConfig();
  if (!config || Object.hasOwn(demoUsers, username)) {
    await demoBackend(jar).login(username, password);
    if (config) {
      // Drop this project's previous Supabase session, including chunked cookies.
      const token = "sb-" + new URL(config.url).hostname.split(".")[0] + "-auth-token";
      for (const { name } of jar.getAll()) {
        if (name === token || name.startsWith(token + ".")) jar.delete(name);
      }
    }
    return { home: "/account" };
  }
  const backend = supabaseBackend(config, jar);
  await backend.login(username, password);
  if (jar.has(demoSessionCookie)) await demoBackend(jar).logout();
  try {
    await backend.requireStaff();
    return { home: "/dean" };
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return { home: "/account" };
    throw error;
  }
}
