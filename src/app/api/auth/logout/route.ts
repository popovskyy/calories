import { endSession } from "@/lib/auth";
import { handle, json } from "@/lib/http";

export async function POST() {
  return handle(
    async () => {
      await endSession();
      return json({ ok: true });
    },
    { auth: false },
  );
}
