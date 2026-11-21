import type { Metadata } from "next";
import { Login } from "@/components/portal/Login";

export const metadata: Metadata = { title: "Student sign in" };

export default function LoginPage() {
  return <Login />;
}
