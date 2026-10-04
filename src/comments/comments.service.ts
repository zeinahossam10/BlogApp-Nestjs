import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Post } from '../posts/entities/post.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Comment } from './entities/comment.entity';

@Injectable()
export class CommentsService {
    constructor(
        @InjectRepository(Comment)
        private readonly commentsRepository: Repository<Comment>,

        @InjectRepository(Post)
        private readonly postsRepository: Repository<Post>,
    ) { }

    async create(
        postId: string,
        createCommentDto: CreateCommentDto,
        userId: string,
    ) {
        const post = await this.postsRepository.findOne({
            where: { id: postId },
        });

        if (!post) {
            throw new NotFoundException('Post not found');
        }

        const comment = this.commentsRepository.create({
            ...createCommentDto,
            post: {
                id: postId,
            },
            author: {
                id: userId,
            },
        });

        return this.commentsRepository.save(comment);
    }

    async findByPost(postId: string) {
        const post = await this.postsRepository.findOne({
            where: { id: postId },
        });

        if (!post) {
            throw new NotFoundException('Post not found');
        }

        return this.commentsRepository.find({
            where: {
                post: {
                    id: postId,
                },
            },
            relations: {
                author: true,
            },
            select: {
                id: true,
                content: true,
                createdAt: true,
                updatedAt: true,
                author: {
                    id: true,
                    username: true,
                    email: true,
                },
            },
            order: {
                createdAt: 'ASC',
            },
        });
    }

    async update(
        id: string,
        updateCommentDto: UpdateCommentDto,
        userId: string,
    ) {
        const comment = await this.commentsRepository.findOne({
            where: { id },
            relations: {
                author: true,
            },
        });

        if (!comment) {
            throw new NotFoundException('Comment not found');
        }

        if (comment.author.id !== userId) {
            throw new ForbiddenException(
                'You can only update your own comments',
            );
        }

        Object.assign(comment, updateCommentDto);

        return this.commentsRepository.save(comment);
    }

    async remove(
        id: string,
        userId: string,
    ) {
        const comment = await this.commentsRepository.findOne({
            where: { id },
            relations: {
                author: true,
            },
        });

        if (!comment) {
            throw new NotFoundException('Comment not found');
        }

        if (comment.author.id !== userId) {
            throw new ForbiddenException(
                'You can only delete your own comments',
            );
        }

        await this.commentsRepository.remove(comment);

        return {
            message: 'Comment deleted successfully',
        };
    }
}