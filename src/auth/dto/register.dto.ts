import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({ example: 'writer@example.com', format: 'email' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'Jane Writer', minLength: 3 })
    @IsString()
    @MinLength(3)
    username: string;

    @ApiProperty({ example: 'secret123', minLength: 6 })
    @IsString()
    @MinLength(6)
    password: string;
}
