/**
 * PWA на iOS розморожує ту саму WKWebView — JS не перезапускається, тож
 * Zustand selectedDate лишається «вчорашнім», якщо застосунок був згорнутий
 * на ніч. Оновлюємо лише коли календарний день змінився і користувач дивився
 * саме «сьогодні» на момент згортання (не архів).
 */
export function selectedDateAfterCalendarDayChange(
  selectedDate: string,
  todayWhenHidden: string,
  todayNow: string,
): string | null {
  if (todayWhenHidden === todayNow) return null;
  if (selectedDate !== todayWhenHidden) return null;
  return todayNow;
}
