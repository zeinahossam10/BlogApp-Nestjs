import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../posts/entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { LikesService } from './likes.service';

describe('LikesService', () => {
  let service: LikesService;
  let likes: jest.Mocked<Pick<Repository<PostLike>, 'create' | 'save' | 'findOne' | 'remove' | 'count'>>;
  let posts: jest.Mocked<Pick<Repository<Post>, 'findOne'>>;
  beforeEach(async () => {
    likes = { create: jest.fn(), save: jest.fn(), findOne: jest.fn(), remove: jest.fn(), count: jest.fn() };
    posts = { findOne: jest.fn() };
    const module = await Test.createTestingModule({ providers: [LikesService, { provide: getRepositoryToken(PostLike), useValue: likes }, { provide: getRepositoryToken(Post), useValue: posts }] }).compile();
    service = module.get(LikesService);
  });
  it('likes an existing post and rejects a nonexistent post or duplicate like', async () => {
    posts.findOne.mockResolvedValueOnce({ id: 'post-1' } as Post); likes.findOne.mockResolvedValue(null); likes.create.mockReturnValue({} as PostLike);
    await expect(service.like('post-1', 'user-1')).resolves.toEqual({ message: 'Post liked successfully' });
    expect(likes.create).toHaveBeenCalledWith({ post: { id: 'post-1' }, user: { id: 'user-1' } });
    posts.findOne.mockResolvedValue(null);
    await expect(service.like('missing', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    posts.findOne.mockResolvedValue({ id: 'post-1' } as Post); likes.findOne.mockResolvedValue({ id: 'like-1' } as PostLike);
    await expect(service.like('post-1', 'user-1')).rejects.toBeInstanceOf(ConflictException);
  });
  it('removes an existing like and reports a missing like', async () => {
    const like = { id: 'like-1' } as PostLike;
    likes.findOne.mockResolvedValueOnce(like).mockResolvedValueOnce(null);
    await expect(service.unlike('post-1', 'user-1')).resolves.toEqual({ message: 'Post unliked successfully' });
    expect(likes.remove).toHaveBeenCalledWith(like);
    await expect(service.unlike('post-1', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });
  it('returns the post like count and rejects a missing post', async () => {
    posts.findOne.mockResolvedValueOnce({ id: 'post-1' } as Post); likes.count.mockResolvedValue(3);
    await expect(service.getLikes('post-1')).resolves.toEqual({ postId: 'post-1', likesCount: 3 });
    expect(likes.count).toHaveBeenCalledWith({ where: { post: { id: 'post-1' } } });
    posts.findOne.mockResolvedValue(null);
    await expect(service.getLikes('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
