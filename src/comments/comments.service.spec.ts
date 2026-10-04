import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../posts/entities/post.entity';
import { Comment } from './entities/comment.entity';
import { CommentsService } from './comments.service';

describe('CommentsService', () => {
  let service: CommentsService;
  let comments: jest.Mocked<Pick<Repository<Comment>, 'create' | 'save' | 'find' | 'findOne' | 'remove'>>;
  let posts: jest.Mocked<Pick<Repository<Post>, 'findOne'>>;
  const owned = { id: 'comment-1', content: 'Original', author: { id: 'user-1' } } as Comment;
  beforeEach(async () => {
    comments = { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn(), remove: jest.fn() };
    posts = { findOne: jest.fn() };
    const module = await Test.createTestingModule({ providers: [CommentsService, { provide: getRepositoryToken(Comment), useValue: comments }, { provide: getRepositoryToken(Post), useValue: posts }] }).compile();
    service = module.get(CommentsService);
  });
  it('creates a comment for an existing post', async () => {
    posts.findOne.mockResolvedValue({ id: 'post-1' } as Post); comments.create.mockReturnValue(owned); comments.save.mockResolvedValue(owned);
    await expect(service.create('post-1', { content: 'Original' }, 'user-1')).resolves.toBe(owned);
    expect(comments.create).toHaveBeenCalledWith({ content: 'Original', post: { id: 'post-1' }, author: { id: 'user-1' } });
  });
  it('rejects creation on a missing post and lists comments for an existing post', async () => {
    posts.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'post-1' } as Post); comments.find.mockResolvedValue([owned]);
    await expect(service.create('missing', { content: 'x' }, 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findByPost('post-1')).resolves.toEqual([owned]);
    expect(comments.find).toHaveBeenCalledWith(expect.objectContaining({ where: { post: { id: 'post-1' } }, order: { createdAt: 'ASC' } }));
    posts.findOne.mockResolvedValue(null);
    await expect(service.findByPost('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
  it('updates an owned comment and forbids another author', async () => {
    comments.findOne.mockResolvedValueOnce(owned).mockResolvedValueOnce(owned); comments.save.mockResolvedValue(owned);
    await expect(service.update('comment-1', { content: 'Updated' }, 'user-1')).resolves.toBe(owned);
    expect(owned.content).toBe('Updated');
    await expect(service.update('comment-1', { content: 'No' }, 'user-2')).rejects.toBeInstanceOf(ForbiddenException);
    comments.findOne.mockResolvedValue(null);
    await expect(service.update('missing', { content: 'No' }, 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });
  it('deletes an owned comment and rejects another author or a missing comment', async () => {
    comments.findOne.mockResolvedValueOnce(owned).mockResolvedValueOnce(owned).mockResolvedValueOnce(null);
    await expect(service.remove('comment-1', 'user-1')).resolves.toEqual({ message: 'Comment deleted successfully' });
    expect(comments.remove).toHaveBeenCalledWith(owned);
    await expect(service.remove('comment-1', 'user-2')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove('missing', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
