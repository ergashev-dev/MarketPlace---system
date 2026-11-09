import { BadRequestException } from '@nestjs/common';
import { fileTypeFromFile } from 'file-type';
import { unlink } from 'fs/promises';

export const isAllowedImageMime = (mime: string): boolean =>
  Object.hasOwn(ALLOWED_IMAGE_MIMES, mime);

export const ALLOWED_IMAGE_MIMES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const IMAGE_ERROR = 'Faqat jpg, png yoki webp rasm yuklash mumkin';

/**
 * Diskka yozilgan fayl haqiqatan ham jpg/png/webp ekanini magic bytes bo'yicha tekshiradi.
 * Mos kelmasa faylni o'chiradi va 400 qaytaradi.
 */
export async function assertImageMagicBytes(
  path: string,
  declaredMime?: string,
): Promise<void> {
  let detected: { mime: string } | undefined;
  try {
    detected = await fileTypeFromFile(path);
  } catch {
    detected = undefined;
  }

  const valid =
    !!detected &&
    isAllowedImageMime(detected.mime) &&
    (!declaredMime || declaredMime === detected.mime);

  if (!valid) {
    await unlink(path).catch(() => undefined);
    throw new BadRequestException(IMAGE_ERROR);
  }
}
