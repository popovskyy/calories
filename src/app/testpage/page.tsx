import { notFound } from "next/navigation";
import { TestPageClient } from "./TestPageClient";

/** Dev-пісочниця неонової кнопки тижневого фідбеку. Prod → 404. */
export default function TestPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  return <TestPageClient />;
}
