import type { Metadata } from "next";
import { ArsenalScreen } from "@/components/arsenal/ArsenalScreen";

export const metadata: Metadata = { title: "Мій арсенал" };

export default function ArsenalPage() {
  return <ArsenalScreen />;
}
