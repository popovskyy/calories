/**
 * Ключ дедуплікації інвентарю: «Гантеля розбірна (до 13 кг)» і
 * «розбірна гантеля» мають збігатися, щоб повторний скан не плодив дублі.
 * Жодної агресивної лематизації — лише регістр, дужки, пунктуація й порядок слів.
 */
export function equipmentKey(name: string): string {
  const tokens = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  return Array.from(new Set(tokens)).sort().join(" ");
}
