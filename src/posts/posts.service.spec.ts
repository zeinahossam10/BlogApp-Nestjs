import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostsService } from './posts.service';
import { Post } from './entities/post.entity';

describe('PostsService', () => {
  let service: PostsService;
  let posts: jest.Mocked<Pick<Repository<Post>, 'create' | 'save' | 'find' | 'findOne' | 'remove'>>;
  const ownPost = { id: 'post-1', title: 'Original', content: 'Body', author: { id: 'user-1' } } as Post;
  beforeEach(async () => {
    posts = { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn(), remove: jest.fn() };
    const module = await Test.createTestingModule({ providers: [PostsService, { provide: getRepositoryToken(Post), useValue: posts }] }).compile();
    service = module.get(PostsService);
  });
  it('creates a post for the authenticated author', async () => {
    posts.create.mockReturnValue(ownPost); posts.save.mockResolvedValue(ownPost);
    await expect(service.create({ title: 'Original', content: 'Body' }, 'user-1')).resolves.toBe(ownPost);
    expect(posts.create).toHaveBeenCalledWith({ title: 'Original', content: 'Body', author: { id: 'user-1' } });
  });
  it('lists posts with their authors', async () => { posts.find.mockResolvedValue([ownPost]); await expect(service.findAll()).resolves.toEqual([ownPost]); });
  it('finds one post and reports a missing post', async () => {
    posts.findOne.mockResolvedValueOnce(ownPost).mockResolvedValueOnce(null);
    await expect(service.findOne('post-1')).resolves.toBe(ownPost);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
  it('updates an owned post and forbids another author', async () => {
    posts.findOne.mockResolvedValueOnce(ownPost).mockResolvedValueOnce(ownPost); posts.save.mockResolvedValue(ownPost);
    await expect(service.update('post-1', { title: 'Updated' }, 'user-1')).resolves.toBe(ownPost);
    expect(ownPost.title).toBe('Updated');
    await expect(service.update('post-1', { title: 'No' }, 'user-2')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('replaces an owned post and forbids another author', async () => {
    posts.findOne.mockResolvedValueOnce(ownPost).mockResolvedValueOnce(ownPost); posts.save.mockResolvedValue(ownPost);
    await expect(service.replace('post-1', { title: 'Replaced', content: 'New' }, 'user-1')).resolves.toBe(ownPost);
    expect(ownPost).toMatchObject({ title: 'Replaced', content: 'New' });
    await expect(service.replace('post-1', { title: 'No', content: 'No' }, 'user-2')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('deletes an owned post and rejects unauthorized or missing posts', async () => {
    posts.findOne.mockResolvedValueOnce(ownPost).mockResolvedValueOnce(ownPost).mockResolvedValueOnce(null);
    await expect(service.remove('post-1', 'user-1')).resolves.toEqual({ message: 'Post deleted successfully' });
    expect(posts.remove).toHaveBeenCalledWith(ownPost);
    await expect(service.remove('post-1', 'user-2')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove('missing', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
