"use client";

import { useEffect, useState } from "react";

/** true після монтування на клієнті — для безпечної роботи з persist-стором */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
