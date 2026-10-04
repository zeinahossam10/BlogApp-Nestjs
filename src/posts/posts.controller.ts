import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Put,
    Patch,
    Post as HttpPost,
    UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { ReplacePostDto } from './dto/replace-post.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
    constructor(
        private readonly postsService: PostsService,
    ) { }
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a post' })
    @ApiCreatedResponse({ description: 'Post created', schema: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, title: { type: 'string' }, content: { type: 'string' }, createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' } } } })
    @ApiUnauthorizedResponse({ description: 'Authentication is required' })
    @ApiBadRequestResponse({ description: 'Request validation failed' })
    @HttpPost()
    @UseGuards(JwtAuthGuard)
    create(
        @Body() createPostDto: CreatePostDto,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.postsService.create(
            createPostDto,
            user.sub,
        );
    }

    @Get()
    @ApiOperation({ summary: 'List posts' })
    @ApiOkResponse({ description: 'Posts with their authors', schema: { type: 'array', items: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, title: { type: 'string' }, content: { type: 'string' }, createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' }, author: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, username: { type: 'string' }, email: { type: 'string' } } } } } } })
    findAll() {
        return this.postsService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a post by ID' })
    @ApiParam({ name: 'id', description: 'Post UUID', type: String, format: 'uuid' })
    @ApiOkResponse({ description: 'Post with its author' })
    @ApiNotFoundResponse({ description: 'Post not found' })
    findOne(@Param('id') id: string) {
        return this.postsService.findOne(id);
    }
    
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Replace all post fields' })
    @ApiParam({ name: 'id', description: 'Post UUID', type: String, format: 'uuid' })
    @ApiOkResponse({ description: 'Post replaced' })
    @ApiUnauthorizedResponse({ description: 'Authentication is required' })
    @ApiNotFoundResponse({ description: 'Post not found' })
    @ApiForbiddenResponse({ description: 'Only the post author can replace it' })
    @ApiBadRequestResponse({ description: 'Request validation failed' })
    @Put(':id')
    @UseGuards(JwtAuthGuard)
    replace(
        @Param('id') id: string,
        @Body() replacePostDto: ReplacePostDto,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.postsService.replace(
            id,
            replacePostDto,
            user.sub,
        );
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update selected post fields' })
    @ApiParam({ name: 'id', description: 'Post UUID', type: String, format: 'uuid' })
    @ApiOkResponse({ description: 'Post updated' })
    @ApiUnauthorizedResponse({ description: 'Authentication is required' })
    @ApiNotFoundResponse({ description: 'Post not found' })
    @ApiForbiddenResponse({ description: 'Only the post author can update it' })
    @ApiBadRequestResponse({ description: 'Request validation failed' })
    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(
        @Param('id') id: string,
        @Body() updatePostDto: UpdatePostDto,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.postsService.update(
            id,
            updatePostDto,
            user.sub,
        );
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a post' })
    @ApiParam({ name: 'id', description: 'Post UUID', type: String, format: 'uuid' })
    @ApiOkResponse({ description: 'Post deleted', schema: { type: 'object', properties: { message: { type: 'string', example: 'Post deleted successfully' } } } })
    @ApiUnauthorizedResponse({ description: 'Authentication is required' })
    @ApiNotFoundResponse({ description: 'Post not found' })
    @ApiForbiddenResponse({ description: 'Only the post author can delete it' })
    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(
        @Param('id') id: string,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.postsService.remove(
            id,
            user.sub,
        );
    }
}
