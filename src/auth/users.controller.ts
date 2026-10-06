import {
  Controller,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileTypeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { JwtPayload } from './types/jwt-payload';
import { AuthService } from './auth.service';
import {
  MAX_PROFILE_IMAGE_SIZE,
  PROFILE_IMAGE_DIRECTORY,
  PROFILE_IMAGE_MIME_TYPES,
} from './profile-image.constants';
import { ProfileImageContentValidator } from './profile-image.validator';

const imageFileType = /^image\/(jpeg|png|webp)$/;

@Controller('users')
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Patch(':userId/image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          try {
            mkdirSync(PROFILE_IMAGE_DIRECTORY, { recursive: true });
            callback(null, PROFILE_IMAGE_DIRECTORY);
          } catch (error) {
            callback(error as Error, PROFILE_IMAGE_DIRECTORY);
          }
        },
        filename: (_request, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: MAX_PROFILE_IMAGE_SIZE },
      fileFilter: (_request, file, callback) => {
        if (!PROFILE_IMAGE_MIME_TYPES.has(file.mimetype)) {
          callback(null, false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  updateProfileImage(
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_PROFILE_IMAGE_SIZE }),
          new FileTypeValidator({
            fileType: imageFileType,
            skipMagicNumbersValidation: true,
          }),
          new ProfileImageContentValidator(),
        ],
      }),
    )
    image: Express.Multer.File,
  ) {
    return this.authService.updateProfileImage(userId, user.sub, image);
  }
}
