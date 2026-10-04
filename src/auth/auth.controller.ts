import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiConflictResponse, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse, ApiBadRequestResponse } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    @ApiOperation({ summary: 'Register a user account' })
    @ApiCreatedResponse({ description: 'Account created', schema: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, email: { type: 'string', example: 'writer@example.com' }, username: { type: 'string', example: 'Jane Writer' }, createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' } } } })
    @ApiConflictResponse({ description: 'An account with this email already exists' })
    @ApiBadRequestResponse({ description: 'Request validation failed' })
    register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Log in and receive an access token' })
    @ApiOkResponse({ description: 'Authentication succeeded', schema: { type: 'object', properties: { access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' } } } })
    @ApiUnauthorizedResponse({ description: 'Email or password is invalid' })
    @ApiBadRequestResponse({ description: 'Request validation failed' })
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }
}
