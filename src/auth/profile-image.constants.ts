import { join } from 'node:path';

export const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
export const PROFILE_IMAGE_DIRECTORY = join(process.cwd(), 'uploads');
export const PROFILE_IMAGE_URL_PREFIX = '/uploads';
export const PROFILE_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
