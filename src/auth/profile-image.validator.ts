import { FileValidator } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { extname } from 'node:path';

export class ProfileImageContentValidator extends FileValidator<
  Record<string, never>,
  Express.Multer.File
> {
  constructor() {
    super({});
  }

  async isValid(file?: Express.Multer.File): Promise<boolean> {
    if (!file?.path) return false;

    const extension = extname(file.originalname).toLowerCase();
    const validExtensions: Record<string, string[]> = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    };

    let handle: Awaited<ReturnType<typeof fs.open>> | undefined;
    let signature = Buffer.alloc(12);
    let bytesRead = 0;
    try {
      handle = await fs.open(file.path, 'r');
      ({ bytesRead } = await handle.read(signature, 0, signature.length, 0));
    } catch {
      bytesRead = 0;
    } finally {
      try {
        await handle?.close();
      } catch {
        bytesRead = 0;
      }
    }

    signature = signature.subarray(0, bytesRead);
    const matchesMimeType =
      (file.mimetype === 'image/jpeg' &&
        signature.length >= 3 &&
        signature[0] === 0xff &&
        signature[1] === 0xd8 &&
        signature[2] === 0xff) ||
      (file.mimetype === 'image/png' &&
        signature.subarray(0, 8).equals(
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        )) ||
      (file.mimetype === 'image/webp' &&
        signature.length >= 12 &&
        signature.toString('ascii', 0, 4) === 'RIFF' &&
        signature.toString('ascii', 8, 12) === 'WEBP');

    const isValid =
      bytesRead > 0 &&
      matchesMimeType &&
      validExtensions[file.mimetype]?.includes(extension);

    if (!isValid) {
      try {
        await fs.unlink(file.path);
      } catch {
        // Preserve the validation error if temporary-file cleanup also fails.
      }
    }

    return isValid;
  }

  buildErrorMessage(): string {
    return 'Validation failed (file contents must be a JPEG, PNG, or WebP image)';
  }
}
