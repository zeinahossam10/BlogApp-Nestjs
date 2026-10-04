import {
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePostDto {
    @ApiPropertyOptional({ example: 'A Day in the Garden' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    title?: string;

    @ApiPropertyOptional({ example: 'This morning I planted tomatoes and herbs...' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    content?: string;
}
