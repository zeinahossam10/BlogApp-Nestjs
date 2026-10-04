import {
    IsNotEmpty,
    IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
    @ApiProperty({ example: 'Thanks for sharing this!' })
    @IsString()
    @IsNotEmpty()
    content: string;
}
