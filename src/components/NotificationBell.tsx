"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Modal } from "@/components/ui/Dialog";
import { useMarkNotificationsRead, useNotifications } from "@/hooks/useQueries";
import type { NotificationDTO } from "@/lib/types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "щойно";
  if (mins < 60) return `${mins} хв тому`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} год тому`;
  return `${Math.floor(hrs / 24)} дн тому`;
}

export function NotificationBell() {
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const [open, setOpen] = useState(false);

  const items: NotificationDTO[] = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  useEffect(() => {
    if (open && unreadCount > 0) {
      markRead.mutate({ all: true });
    }
    // лише на відкритті
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="icon-btn relative"
        aria-label="Сповіщення"
      >
        <Bell size={20} />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-red)] px-0.5 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Сповіщення"
      >
        {items.length === 0 ? (
          <p className="py-6 text-center text-[14px] text-[var(--color-muted3)]">
            Поки що тихо — сповіщень немає
          </p>
        ) : (
          <div className="flex flex-col">
            {items.map((n) => (
              <NotificationItem
                key={n.id}
                n={n}
                onClose={() => setOpen(false)}
              />
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}

function NotificationItem({
  n,
  onClose,
}: {
  n: NotificationDTO;
  onClose: () => void;
}) {
  const inner = (
    <div
      className={`flex flex-col gap-0.5 border-b border-[var(--color-divider)] py-3 last:border-0 ${
        !n.read
          ? "bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)]"
          : ""
      }`}
    >
      <span className="text-[14px] font-semibold text-[var(--color-text)]">
        {n.title}
      </span>
      <span className="text-[13px] text-[var(--color-muted)]">{n.body}</span>
      <span className="text-[11px] text-[var(--color-muted3)]">
        {timeAgo(n.createdAt)}
      </span>
    </div>
  );

  if (n.url) {
    return (
      <Link href={n.url} onClick={onClose} className="block hover:opacity-80">
        {inner}
      </Link>
    );
  }
  return inner;
}
