import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';

jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn() }));

describe('AuthService', () => {
  let service: AuthService;
  let users: jest.Mocked<Pick<Repository<User>, 'findOne' | 'create' | 'save'>>;
  let jwt: jest.Mocked<Pick<JwtService, 'sign'>>;

  beforeEach(async () => {
    users = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    jwt = { sign: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: users },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  it('registers a user with a hashed password and omits the password from the response', async () => {
    users.findOne.mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    users.create.mockImplementation((value) => value as User);
    const saved = { id: 'user-1', email: 'a@example.com', username: 'Writer', password: 'hashed-password' } as User;
    users.save.mockResolvedValue(saved);

    const result = await service.register({ email: 'a@example.com', username: 'Writer', password: 'secret123' });

    expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 10);
    expect(users.create).toHaveBeenCalledWith({ email: 'a@example.com', username: 'Writer', password: 'hashed-password' });
    expect(result).toEqual({ id: 'user-1', email: 'a@example.com', username: 'Writer' });
    expect(result).not.toHaveProperty('password');
  });

  it('rejects registration for an existing email', async () => {
    users.findOne.mockResolvedValue({ id: 'user-1' } as User);
    await expect(service.register({ email: 'a@example.com', username: 'Writer', password: 'secret123' })).rejects.toBeInstanceOf(ConflictException);
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it('logs in and signs a JWT containing the user id and email', async () => {
    users.findOne.mockResolvedValue({ id: 'user-1', email: 'a@example.com', password: 'hash' } as User);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwt.sign.mockReturnValue('token');

    await expect(service.login({ email: 'a@example.com', password: 'secret123' })).resolves.toEqual({ access_token: 'token' });
    expect(bcrypt.compare).toHaveBeenCalledWith('secret123', 'hash');
    expect(jwt.sign).toHaveBeenCalledWith({ sub: 'user-1', email: 'a@example.com' });
  });

  it('rejects a nonexistent email', async () => {
    users.findOne.mockResolvedValue(null);
    await expect(service.login({ email: 'missing@example.com', password: 'secret123' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('rejects an incorrect password', async () => {
    users.findOne.mockResolvedValue({ id: 'user-1', email: 'a@example.com', password: 'hash' } as User);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expect(service.login({ email: 'a@example.com', password: 'wrong' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('updates the image URL and returns the updated user without its password', async () => {
    const user = { id: 'user-1', email: 'a@example.com', username: 'Writer', password: 'hash', imageUrl: null } as User;
    const image = {
      filename: 'new-image.png',
      path: join(process.cwd(), 'uploads', 'new-image.png'),
    } as Express.Multer.File;
    users.findOne.mockResolvedValue(user);
    users.save.mockResolvedValue(user);

    const result = await service.updateProfileImage('user-1', 'user-1', image);

    expect(user.imageUrl).toBe('/uploads/new-image.png');
    expect(users.save).toHaveBeenCalledWith(user);
    expect(result).toMatchObject({ id: 'user-1', imageUrl: '/uploads/new-image.png' });
    expect(result).not.toHaveProperty('password');
  });

  it('removes the uploaded file and reports a missing user', async () => {
    const unlink = jest.spyOn(fs, 'unlink').mockResolvedValue(undefined);
    users.findOne.mockResolvedValue(null);
    const image = {
      filename: 'orphan.png',
      path: join(process.cwd(), 'uploads', 'orphan.png'),
    } as Express.Multer.File;

    await expect(service.updateProfileImage('missing', 'missing', image)).rejects.toBeInstanceOf(NotFoundException);

    expect(unlink).toHaveBeenCalledWith(image.path);
    expect(users.save).not.toHaveBeenCalled();
    unlink.mockRestore();
  });
});
