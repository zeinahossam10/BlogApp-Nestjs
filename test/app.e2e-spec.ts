import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import testDataSource from '../src/database/data-source';

describe('Blog API (e2e)', () => {
  let app: INestApplication<App>;
  let db: DataSource;
  let schemaReady = false;
  let sequence = 0;
  const email = () => `e2e-${Date.now()}-${++sequence}@example.test`;
  const register = async (address: string, username: string) => {
    const response = await request(app.getHttpServer()).post('/auth/register').send({ email: address, username, password: 'secret123' }).expect(201);
    expect(response.body).not.toHaveProperty('password');
    return response.body;
  };
  const login = async (address: string) => {
    const response = await request(app.getHttpServer()).post('/auth/login').send({ email: address, password: 'secret123' }).expect(200);
    return response.body.access_token as string;
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    db = testDataSource;
    await db.initialize();
    await db.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await db.runMigrations();
    schemaReady = true;
  });

  beforeEach(async () => {
    await db.query('TRUNCATE TABLE "post_likes", "comments", "posts", "users" CASCADE');
  });

  afterAll(async () => {
    await app?.close();
    if (schemaReady && db?.isInitialized) {
      await db.query('TRUNCATE TABLE "post_likes", "comments", "posts", "users" CASCADE');
    }
    if (db?.isInitialized) await db.destroy();
  });

  it('registers and logs in; rejects invalid credentials', async () => {
    const address = email();
    const user = await register(address, 'First Writer');
    expect(user).toHaveProperty('id');
    await request(app.getHttpServer()).post('/auth/register').send({ email: address, username: 'First Writer', password: 'secret123' }).expect(409);
    expect(await login(address)).toBeTruthy();
    await request(app.getHttpServer()).post('/auth/login').send({ email: address, password: 'wrongpass' }).expect(401);
  });

  it('runs post, comment, and like flows with authentication and ownership checks', async () => {
    const authorEmail = email();
    const otherEmail = email();
    await register(authorEmail, 'Post Author');
    await register(otherEmail, 'Other Writer');
    const authorToken = await login(authorEmail);
    const otherToken = await login(otherEmail);

    await request(app.getHttpServer()).post('/posts').send({ title: 'Private attempt', content: 'Body' }).expect(401);
    const created = await request(app.getHttpServer()).post('/posts').set('Authorization', `Bearer ${authorToken}`).send({ title: 'First post', content: 'Post body' }).expect(201);
    const postId = created.body.id as string;
    expect((await request(app.getHttpServer()).get('/posts').expect(200)).body).toEqual(expect.arrayContaining([expect.objectContaining({ id: postId, title: 'First post' })]));
    await request(app.getHttpServer()).get(`/posts/${postId}`).expect(200).expect(({ body }) => expect(body.id).toBe(postId));
    await request(app.getHttpServer()).patch(`/posts/${postId}`).set('Authorization', `Bearer ${otherToken}`).send({ title: 'No' }).expect(403);
    await request(app.getHttpServer()).delete(`/posts/${postId}`).set('Authorization', `Bearer ${otherToken}`).expect(403);
    await request(app.getHttpServer()).patch(`/posts/${postId}`).send({ title: 'No' }).expect(401);
    await request(app.getHttpServer()).patch(`/posts/${postId}`).set('Authorization', `Bearer ${authorToken}`).send({ title: 'Updated post' }).expect(200);
    await request(app.getHttpServer()).put(`/posts/${postId}`).set('Authorization', `Bearer ${authorToken}`).send({ title: 'Replaced post', content: 'Replacement body' }).expect(200);

    await request(app.getHttpServer()).post(`/posts/${postId}/comments`).send({ content: 'No token' }).expect(401);
    const comment = await request(app.getHttpServer()).post(`/posts/${postId}/comments`).set('Authorization', `Bearer ${authorToken}`).send({ content: 'First comment' }).expect(201);
    const commentId = comment.body.id as string;
    expect((await request(app.getHttpServer()).get(`/posts/${postId}/comments`).expect(200)).body).toEqual(expect.arrayContaining([expect.objectContaining({ id: commentId, content: 'First comment' })]));
    await request(app.getHttpServer()).patch(`/comments/${commentId}`).set('Authorization', `Bearer ${otherToken}`).send({ content: 'No' }).expect(403);
    await request(app.getHttpServer()).delete(`/comments/${commentId}`).set('Authorization', `Bearer ${otherToken}`).expect(403);
    await request(app.getHttpServer()).delete(`/comments/${commentId}`).expect(401);
    await request(app.getHttpServer()).patch(`/comments/${commentId}`).send({ content: 'No token' }).expect(401);
    await request(app.getHttpServer()).patch(`/comments/${commentId}`).set('Authorization', `Bearer ${authorToken}`).send({ content: 'Updated comment' }).expect(200);
    await request(app.getHttpServer()).delete(`/comments/${commentId}`).set('Authorization', `Bearer ${authorToken}`).expect(200);

    await request(app.getHttpServer()).post(`/posts/${postId}/likes`).expect(401);
    await request(app.getHttpServer()).delete(`/posts/${postId}/likes`).expect(401);
    await request(app.getHttpServer()).post(`/posts/${postId}/likes`).set('Authorization', `Bearer ${authorToken}`).expect(201);
    await request(app.getHttpServer()).get(`/posts/${postId}/likes`).expect(200).expect(({ body }) => expect(body.likesCount).toBe(1));
    await request(app.getHttpServer()).post(`/posts/${postId}/likes`).set('Authorization', `Bearer ${authorToken}`).expect(409);
    await request(app.getHttpServer()).delete(`/posts/${postId}/likes`).set('Authorization', `Bearer ${authorToken}`).expect(200);
    await request(app.getHttpServer()).get(`/posts/${postId}/likes`).expect(200).expect(({ body }) => expect(body.likesCount).toBe(0));
    await request(app.getHttpServer()).delete(`/posts/${postId}`).set('Authorization', `Bearer ${authorToken}`).expect(200);
  });
});
