import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Post } from '../posts/entities/post.entity';
import { PostLike } from './entities/post-like.entity';

@Injectable()
export class LikesService {
    constructor(
        @InjectRepository(PostLike)
        private readonly likesRepository: Repository<PostLike>,

        @InjectRepository(Post)
        private readonly postsRepository: Repository<Post>,
    ) { }

    async like(postId: string, userId: string) {
        const post = await this.postsRepository.findOne({
            where: { id: postId },
        });

        if (!post) {
            throw new NotFoundException('Post not found');
        }

        const existingLike = await this.likesRepository.findOne({
            where: {
                post: { id: postId },
                user: { id: userId },
            },
        });

        if (existingLike) {
            throw new ConflictException('Post already liked');
        }

        const like = this.likesRepository.create({
            post: { id: postId },
            user: { id: userId },
        });

        await this.likesRepository.save(like);

        return {
            message: 'Post liked successfully',
        };
    }

    async unlike(postId: string, userId: string) {
        const like = await this.likesRepository.findOne({
            where: {
                post: { id: postId },
                user: { id: userId },
            },
        });

        if (!like) {
            throw new NotFoundException('Like not found');
        }

        await this.likesRepository.remove(like);

        return {
            message: 'Post unliked successfully',
        };
    }

    async getLikes(postId: string) {
        const post = await this.postsRepository.findOne({
            where: { id: postId },
        });

        if (!post) {
            throw new NotFoundException('Post not found');
        }

        const count = await this.likesRepository.count({
            where: {
                post: { id: postId },
            },
        });

        return {
            postId,
            likesCount: count,
        };
    }
}