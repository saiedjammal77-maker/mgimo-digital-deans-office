import type { Metadata } from "next";
import CampusTour from "@/components/campus/CampusTour";

export const metadata: Metadata = {
  title: "Moscow campus tour",
  description: "Explore MGIMO Moscow in English or Russian with an illustrated campus model and a guided tour of three landmarks.",
};

export default function CampusPage() {
  return <CampusTour />;
}
