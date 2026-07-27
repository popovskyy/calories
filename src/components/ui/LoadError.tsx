"use client";

/**
 * Помилка завантаження екрана з кнопкою повтору — замість вічного скелетона.
 * Той самий патерн, що вже жив у Хроніках і Крамниці.
 */
export function LoadError({
  message = "Не вдалося завантажити",
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-[15px] text-[var(--color-muted3)]">{message}</p>
      <button type="button" className="btn btn-primary" onClick={onRetry}>
        Спробувати знову
      </button>
    </div>
  );
}
