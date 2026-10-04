import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReplacePostDto } from './dto/replace-post.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post } from './entities/post.entity';

@Injectable()
export class PostsService {
    constructor(
        @InjectRepository(Post)
        private readonly postsRepository: Repository<Post>,
    ) { }

    async create(
        createPostDto: CreatePostDto,
        userId: string,
    ) {
        const post = this.postsRepository.create({
            ...createPostDto,
            author: {
                id: userId,
            },
        });

        return this.postsRepository.save(post);
    }

    async findAll() {
        return this.postsRepository.find({
            relations: {
                author: true,
            },
            select: {
                id: true,
                title: true,
                content: true,
                createdAt: true,
                updatedAt: true,
                author: {
                    id: true,
                    username: true,
                    email: true,
                },
            },
        });
    }

    async findOne(id: string) {
        const post = await this.postsRepository.findOne({
            where: { id },
            relations: {
                author: true,
            },
            select: {
                id: true,
                title: true,
                content: true,
                createdAt: true,
                updatedAt: true,
                author: {
                    id: true,
                    username: true,
                    email: true,
                },
            },
        });

        if (!post) {
            throw new NotFoundException('Post not found');
        }

        return post;
    }

    async replace(
        id: string,
        replacePostDto: ReplacePostDto,
        userId: string,
    ) {
        const post = await this.postsRepository.findOne({
            where: { id },
            relations: {
                author: true,
            },
        });

        if (!post) {
            throw new NotFoundException('Post not found');
        }

        if (post.author.id !== userId) {
            throw new ForbiddenException(
                'You can only replace your own posts',
            );
        }

        post.title = replacePostDto.title;
        post.content = replacePostDto.content;

        return this.postsRepository.save(post);
    }

    async update(
        id: string,
        updatePostDto: UpdatePostDto,
        userId: string,
    ) {
        const post = await this.postsRepository.findOne({
            where: { id },
            relations: {
                author: true,
            },
        });

        if (!post) {
            throw new NotFoundException('Post not found');
        }

        if (post.author.id !== userId) {
            throw new ForbiddenException(
                'You can only update your own posts',
            );
        }

        Object.assign(post, updatePostDto);

        return this.postsRepository.save(post);
    }

    async remove(
        id: string,
        userId: string,
    ) {
        const post = await this.postsRepository.findOne({
            where: { id },
            relations: {
                author: true,
            },
        });

        if (!post) {
            throw new NotFoundException('Post not found');
        }

        if (post.author.id !== userId) {
            throw new ForbiddenException(
                'You can only delete your own posts',
            );
        }

        await this.postsRepository.remove(post);

        return {
            message: 'Post deleted successfully',
        };
    }
}