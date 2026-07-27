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
      aria-label="Додати їжу або калорії"
      className="fab-wrap absolute right-4 z-20"
    >
      <motion.span
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 26, delay: 0.05 }}
        whileTap={{ scale: 0.9 }}
        className="fab-btn flex items-center justify-center text-[#f5f4ff]"
      >
        <Plus className="fab-btn-icon" strokeWidth={2.6} />
      </motion.span>
    </Link>
  );
}
