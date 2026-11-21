import type { Metadata } from "next";
import CampusWalk from "@/components/campus/walk/CampusWalk";

export const metadata:Metadata = {
  title: "Campus walk",
  description: "Choose a starting point and walk through MGIMO’s Vernadsky campus in first person.",
};
export default function WalkPage() { return <CampusWalk/>; }
