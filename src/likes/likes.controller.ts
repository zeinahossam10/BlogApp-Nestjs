import {
    Controller,
    Delete,
    Get,
    Param,
    Post as HttpPost,
    UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { LikesService } from './likes.service';
import { ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@ApiTags('Likes')
@Controller('posts/:postId/likes')
export class LikesController {
    constructor(
        private readonly likesService: LikesService,
    ) { }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Like a post' })
    @ApiParam({ name: 'postId', description: 'Post UUID', type: String, format: 'uuid' })
    @ApiCreatedResponse({ description: 'Post liked', schema: { type: 'object', properties: { message: { type: 'string', example: 'Post liked successfully' } } } })
    @ApiUnauthorizedResponse({ description: 'Authentication is required' })
    @ApiNotFoundResponse({ description: 'Post not found' })
    @ApiConflictResponse({ description: 'Post is already liked by this user' })
    @HttpPost()
    @UseGuards(JwtAuthGuard)
    like(
        @Param('postId') postId: string,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.likesService.like(
            postId,
            user.sub,
        );
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Remove your like from a post' })
    @ApiParam({ name: 'postId', description: 'Post UUID', type: String, format: 'uuid' })
    @ApiOkResponse({ description: 'Like removed', schema: { type: 'object', properties: { message: { type: 'string', example: 'Post unliked successfully' } } } })
    @ApiUnauthorizedResponse({ description: 'Authentication is required' })
    @ApiNotFoundResponse({ description: 'Like not found' })
    @Delete()
    @UseGuards(JwtAuthGuard)
    unlike(
        @Param('postId') postId: string,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.likesService.unlike(
            postId,
            user.sub,
        );
    }

    @Get()
    @ApiOperation({ summary: 'Get the like count for a post' })
    @ApiParam({ name: 'postId', description: 'Post UUID', type: String, format: 'uuid' })
    @ApiOkResponse({ description: 'Like count', schema: { type: 'object', properties: { postId: { type: 'string', format: 'uuid' }, likesCount: { type: 'integer', example: 12 } } } })
    @ApiNotFoundResponse({ description: 'Post not found' })
    getLikes(@Param('postId') postId: string) {
        return this.likesService.getLikes(postId);
    }
}
