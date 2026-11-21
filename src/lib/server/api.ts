import "server-only";
import { cookies } from "next/headers";
import { sessionBackend, signIn } from "./backend";
import { ApiError, checkOrigin, isKind, jsonBody, unavailable, uuid, validNote, type Jar, type Backend } from "./http";

async function handle(req: Request, action: (jar: Jar) => Promise<unknown>) {
  const jar = await cookies();
  const headers = { "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate", Vary: "Cookie", Pragma: "no-cache", Expires: "0" };
  try {
    if (req.method === "POST") checkOrigin(req);
    const result = await action(jar);
    return Response.json(result ?? { ok: true }, { headers });
  } catch (error) {
    const failure = error instanceof ApiError ? error : unavailable();
    return Response.json({ error: failure.message }, { status: failure.status, headers });
  }
}

function withBackend(req: Request, action: (service: Backend) => Promise<unknown>) {
  return handle(req, jar => action(sessionBackend(jar)));
}

export const account = (req: Request) => withBackend(req, backend => backend.account());
export const login = (req: Request) => handle(req, async jar => {
  const { username, password } = await jsonBody(req, ["username", "password"]);
  if (typeof username !== "string" || !/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(username.trim()) ||
      typeof password !== "string" || !password || Buffer.byteLength(password) > 256) {
    throw new ApiError(400, "Invalid login fields.");
  }
  return signIn(jar, username.trim().toLowerCase(), password);
});
export const logout = (req: Request) => withBackend(req, async backend => {
  await jsonBody(req, []);
  await backend.logout();
});
export const applications = (req: Request) => withBackend(req, async backend => {
  const { kind, note } = await jsonBody(req, ["kind", "note"]);
  if (!isKind(kind) || !validNote(note)) throw new ApiError(400, "Invalid application. Notes may contain up to 256 UTF-8 bytes.");
  if (kind === "ticket" && !note.trim()) throw new ApiError(400, "Enter ticket details.");
  return { ok: true, id: await backend.apply(kind, note.trim()) };
});
export const notifications = (req: Request) => withBackend(req, async backend => {
  const { id } = await jsonBody(req, ["id"]);
  if (typeof id !== "string" || !uuid.test(id)) throw new ApiError(400, "Invalid notification ID.");
  await backend.markRead(id.toLowerCase());
});

export const deanAccess = (req: Request) => withBackend(req, backend => backend.requireStaff());
export const deanInbox = (req: Request) => withBackend(req, backend => backend.inbox());
export const deanStatus = (req: Request) => withBackend(req, async backend => {
  const { id, status } = await jsonBody(req, ["id", "status"]);
  if (typeof id !== "string" || !uuid.test(id) ||
      (status !== "submitted" && status !== "review" && status !== "ready")) {
    throw new ApiError(400, "Invalid ticket or status.");
  }
  await backend.changeStatus(id, status);
});
