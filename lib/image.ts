// Client-side image downscaling. Runs in the browser before a meal photo is
// uploaded, so we send a small JPEG instead of a multi-MB original. Gemini bills
// image input by resolution, so capping the long edge at ~1024px and re-encoding
// as JPEG cuts token cost dramatically with no meaningful loss for food ID.

const MAX_EDGE = 1024;
const QUALITY = 0.82;

/**
 * Downscale + re-encode an image File to a smaller JPEG. Falls back to the
 * original file if anything goes wrong (e.g. HEIC the browser can't decode).
 */
export async function compressImage(file: File): Promise<File> {
  // Only attempt for raster types the browser can draw.
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await loadBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    if ("close" in bitmap) (bitmap as ImageBitmap).close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    if (!blob) return file;

    // If somehow larger than the source, keep the original.
    if (blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
