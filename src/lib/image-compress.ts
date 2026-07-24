/** Стискає зображення на клієнті до JPEG (макс. сторона). */
export async function compressImageToJpeg(
  file: File,
  maxSide = 1280,
  quality = 0.82,
): Promise<{ base64: string; mime: string; preview: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas недоступний");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64 = dataUrl.split(",")[1] ?? "";
  return { base64, mime: "image/jpeg", preview: dataUrl };
}
