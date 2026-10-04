import {
    IsOptional,
    IsNotEmpty,
    IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCommentDto {
    @ApiPropertyOptional({ example: 'Thanks for sharing this!' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    content?: string;
}
