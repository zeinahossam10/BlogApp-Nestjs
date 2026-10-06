import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { promises as fs } from 'node:fs';
import { basename, join } from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import testDataSource from '../src/database/data-source';
import { PROFILE_IMAGE_DIRECTORY } from '../src/auth/profile-image.constants';

describe('Blog API (e2e)', () => {
  let app: NestExpressApplication;
  let db: DataSource;
  let schemaReady = false;
  let sequence = 0;
  const uploadedImages = new Set<string>();
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
    app = module.createNestApplication<NestExpressApplication>();
    app.useStaticAssets(PROFILE_IMAGE_DIRECTORY, { prefix: '/uploads/' });
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
    try {
      await app?.close();
      if (schemaReady && db?.isInitialized) {
        await db.query('TRUNCATE TABLE "post_likes", "comments", "posts", "users" CASCADE');
      }
    } finally {
      if (db?.isInitialized) await db.destroy();
      await Promise.all(
        [...uploadedImages].map((filename) =>
          fs.unlink(join(PROFILE_IMAGE_DIRECTORY, filename)).catch(() => undefined),
        ),
      );
    }
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

  it('validates, serves, and replaces an authenticated user profile image', async () => {
    const address = email();
    const user = await register(address, 'Image Writer');
    const token = await login(address);
    const endpoint = `/users/${user.id}/image`;
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pWQAAAAASUVORK5CYII=',
      'base64',
    );

    await request(app.getHttpServer())
      .patch(endpoint)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    await request(app.getHttpServer())
      .patch(endpoint)
      .set('Authorization', `Bearer ${token}`)
      .attach('image', Buffer.from('not an image'), {
        filename: 'note.txt',
        contentType: 'text/plain',
      })
      .expect(400);

    await request(app.getHttpServer())
      .patch(endpoint)
      .set('Authorization', `Bearer ${token}`)
      .attach('image', Buffer.from('fake png'), {
        filename: 'fake.png',
        contentType: 'image/png',
      })
      .expect(400);

    await request(app.getHttpServer())
      .patch(endpoint)
      .set('Authorization', `Bearer ${token}`)
      .attach('image', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'large.png',
        contentType: 'image/png',
      })
      .expect(413);

    const firstUpload = await request(app.getHttpServer())
      .patch(endpoint)
      .set('Authorization', `Bearer ${token}`)
      .attach('image', png, { filename: 'avatar.png', contentType: 'image/png' })
      .expect(200);
    const firstUrl = firstUpload.body.imageUrl as string;
    const firstFilename = basename(firstUrl);
    uploadedImages.add(firstFilename);

    expect(firstUrl).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/i);
    expect(firstUpload.body).not.toHaveProperty('password');
    await request(app.getHttpServer()).get(firstUrl).expect(200);

    const otherAddress = email();
    await register(otherAddress, 'Another Writer');
    const otherToken = await login(otherAddress);
    await request(app.getHttpServer())
      .patch(endpoint)
      .set('Authorization', `Bearer ${otherToken}`)
      .attach('image', png, { filename: 'unauthorized.png', contentType: 'image/png' })
      .expect(403);
    await request(app.getHttpServer()).get(firstUrl).expect(200);

    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const replacement = await request(app.getHttpServer())
      .patch(endpoint)
      .set('Authorization', `Bearer ${token}`)
      .attach('image', jpeg, { filename: 'replacement.jpeg', contentType: 'image/jpeg' })
      .expect(200);
    const replacementUrl = replacement.body.imageUrl as string;
    uploadedImages.add(basename(replacementUrl));

    await request(app.getHttpServer()).get(firstUrl).expect(404);
    await request(app.getHttpServer()).get(replacementUrl).expect(200);

    const webp = Buffer.from('RIFF0000WEBP');
    const webpUpload = await request(app.getHttpServer())
      .patch(endpoint)
      .set('Authorization', `Bearer ${token}`)
      .attach('image', webp, { filename: 'avatar.webp', contentType: 'image/webp' })
      .expect(200);
    const webpUrl = webpUpload.body.imageUrl as string;
    uploadedImages.add(basename(webpUrl));

    expect(webpUrl).toMatch(/^\/uploads\/[0-9a-f-]{36}\.webp$/i);
    await request(app.getHttpServer()).get(replacementUrl).expect(404);
    await request(app.getHttpServer()).get(webpUrl).expect(200);
  });
});
