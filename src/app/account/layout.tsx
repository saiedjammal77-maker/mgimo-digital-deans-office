import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AccountShell } from "@/components/portal/AccountShell";

export const metadata: Metadata = {
  title: "Student portal",
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
