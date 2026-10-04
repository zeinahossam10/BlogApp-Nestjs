import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post as HttpPost,
    UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/types/jwt-payload';

import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentsService } from './comments.service';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@ApiTags('Comments')
@Controller()
export class CommentsController {
    constructor(
        private readonly commentsService: CommentsService,
    ) { }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Add a comment to a post' })
    @ApiParam({ name: 'postId', description: 'Post UUID', type: String, format: 'uuid' })
    @ApiCreatedResponse({ description: 'Comment created' })
    @ApiUnauthorizedResponse({ description: 'Authentication is required' })
    @ApiNotFoundResponse({ description: 'Post not found' })
    @ApiBadRequestResponse({ description: 'Request validation failed' })
    @HttpPost('posts/:postId/comments')
    @UseGuards(JwtAuthGuard)
    create(
        @Param('postId') postId: string,
        @Body() createCommentDto: CreateCommentDto,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.commentsService.create(
            postId,
            createCommentDto,
            user.sub,
        );
    }

    @Get('posts/:postId/comments')
    @ApiOperation({ summary: 'List comments on a post' })
    @ApiParam({ name: 'postId', description: 'Post UUID', type: String, format: 'uuid' })
    @ApiOkResponse({ description: 'Comments with their authors', schema: { type: 'array', items: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, content: { type: 'string' }, createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' }, author: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, username: { type: 'string' }, email: { type: 'string' } } } } } } })
    @ApiNotFoundResponse({ description: 'Post not found' })
    findByPost(
        @Param('postId') postId: string,
    ) {
        return this.commentsService.findByPost(postId);
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a comment' })
    @ApiParam({ name: 'id', description: 'Comment UUID', type: String, format: 'uuid' })
    @ApiOkResponse({ description: 'Comment updated' })
    @ApiUnauthorizedResponse({ description: 'Authentication is required' })
    @ApiNotFoundResponse({ description: 'Comment not found' })
    @ApiForbiddenResponse({ description: 'Only the comment author can update it' })
    @ApiBadRequestResponse({ description: 'Request validation failed' })
    @Patch('comments/:id')
    @UseGuards(JwtAuthGuard)
    update(
        @Param('id') id: string,
        @Body() updateCommentDto: UpdateCommentDto,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.commentsService.update(
            id,
            updateCommentDto,
            user.sub,
        );
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a comment' })
    @ApiParam({ name: 'id', description: 'Comment UUID', type: String, format: 'uuid' })
    @ApiOkResponse({ description: 'Comment deleted', schema: { type: 'object', properties: { message: { type: 'string', example: 'Comment deleted successfully' } } } })
    @ApiUnauthorizedResponse({ description: 'Authentication is required' })
    @ApiNotFoundResponse({ description: 'Comment not found' })
    @ApiForbiddenResponse({ description: 'Only the comment author can delete it' })
    @Delete('comments/:id')
    @UseGuards(JwtAuthGuard)
    remove(
        @Param('id') id: string,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.commentsService.remove(
            id,
            user.sub,
        );
    }
}
