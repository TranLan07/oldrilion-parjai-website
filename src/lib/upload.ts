import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type UploadKind = "avatar" | "clan-logo" | "clan-banner";

const MAX_BYTES: Record<UploadKind, number> = {
  avatar: 2 * 1024 * 1024,
  "clan-logo": 2 * 1024 * 1024,
  "clan-banner": 5 * 1024 * 1024,
};

// Enregistre une image uploadée dans public/uploads/<kind>/ et renvoie son URL publique (/uploads/...).
export async function saveUploadedImage(file: File, kind: UploadKind): Promise<{ url: string } | { error: string }> {
  const ext = MIME_EXT[file.type];
  if (!ext) return { error: "Format d'image non supporté (png, jpg, webp ou gif uniquement)." };
  const maxBytes = MAX_BYTES[kind];
  if (file.size > maxBytes) return { error: `Fichier trop volumineux (max ${Math.round(maxBytes / 1024 / 1024)} Mo).` };

  const dir = path.join(UPLOAD_ROOT, kind);
  await mkdir(dir, { recursive: true });

  const filename = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return { url: `/uploads/${kind}/${filename}` };
}

// Supprime un ancien fichier uploadé (best-effort, ignore les URLs externes ou invalides).
export async function deleteUploadedImage(url: string | null | undefined): Promise<void> {
  if (!url || !url.startsWith("/uploads/")) return;
  const filePath = path.join(process.cwd(), "public", url);
  if (!filePath.startsWith(UPLOAD_ROOT)) return;
  try { await unlink(filePath); } catch { /* déjà absent, tant pis */ }
}
