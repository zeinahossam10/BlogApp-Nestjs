import {
    IsNotEmpty,
    IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplacePostDto {
    @ApiProperty({ example: 'A Day in the Garden' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: 'This morning I planted tomatoes and herbs...' })
    @IsString()
    @IsNotEmpty()
    content: string;
}
