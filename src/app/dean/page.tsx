import { Suspense } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { DeanInbox } from "@/components/portal/DeanInbox";
import { sessionBackend } from "@/lib/server/backend";
import { ApiError } from "@/lib/server/http";

export const metadata = { title: "Dean’s office inbox", robots: { index: false, follow: false } };

async function AuthorizedInbox() {
  try {
    await sessionBackend(await cookies(), true).requireStaff();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login?next=%2Fdean");
    if (error instanceof ApiError && error.status === 403) notFound();
    throw error;
  }
  return <DeanInbox />;
}

export default function DeanPage() {
  return <Suspense fallback={null}><AuthorizedInbox /></Suspense>;
}
