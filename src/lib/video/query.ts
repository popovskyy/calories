/** Чисті хелпери запиту до відео — без серверних залежностей, тому безпечні для клієнтського бандла. */

export function normalizeQuery(q: string): string {
  return q.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Посилання на пошук YouTube — запасний варіант, коли конкретного відео немає. */
export function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/** Запит для відео вправи: англійський від ШІ; для старих вправ без нього — з назви. */
export function videoQueryFor(ex: { name: string; videoQuery?: string | null }): string {
  return ex.videoQuery?.trim() || `${ex.name} як правильно робити`;
}
