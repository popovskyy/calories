"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

/** Показується лише на екранах Огляд і Журнал */
export function Fab({ href = "/add" }: { href?: string }) {
  const pathname = usePathname();
  const visible = pathname === "/" || pathname.startsWith("/log");
  if (!visible) return null;

  return (
    <Link
      href={href}
      aria-label="Додати прийом їжі"
      className="absolute bottom-[60px] right-4 z-20"
    >
      <motion.span
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 26, delay: 0.05 }}
        whileTap={{ scale: 0.9 }}
        className="flex h-[68px] w-[68px] items-center justify-center rounded-[var(--radius-pill)] text-[#f5f4ff]"
        style={{
          background: "linear-gradient(135deg,#968ae0,#5d5294)",
          boxShadow: "var(--shadow-fab)",
        }}
      >
        <Plus size={34} strokeWidth={2.4} />
      </motion.span>
    </Link>
  );
}
