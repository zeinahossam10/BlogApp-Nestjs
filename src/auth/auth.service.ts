import {
    ConflictException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { promises as fs } from 'node:fs';
import { basename, isAbsolute, relative, resolve } from 'node:path';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from './entities/user.entity';
import { PROFILE_IMAGE_DIRECTORY, PROFILE_IMAGE_URL_PREFIX } from './profile-image.constants';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,
        private readonly jwtService: JwtService,
    ) { }

    async register(
        registerDto: RegisterDto,
    ): Promise<Omit<User, 'password'>> {
        const existingUser = await this.usersRepository.findOne({
            where: { email: registerDto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(registerDto.password, 10);

        const user = this.usersRepository.create({
            email: registerDto.email,
            username: registerDto.username,
            password: hashedPassword,
        });

        const savedUser = await this.usersRepository.save(user);
        const { password, ...safeUser } = savedUser;

        return safeUser;
    }

    async login(loginDto: LoginDto) {
        const user = await this.usersRepository.findOne({
            where: { email: loginDto.email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const passwordMatches = await bcrypt.compare(
            loginDto.password,
            user.password,
        );

        if (!passwordMatches) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = {
            sub: user.id,
            email: user.email,
        };

        const accessToken = this.jwtService.sign(payload);

        return {
            access_token: accessToken,
        };
    }

    async updateProfileImage(
        userId: string,
        requestingUserId: string,
        image: Express.Multer.File,
    ): Promise<Omit<User, 'password'>> {
        if (requestingUserId !== userId) {
            await this.removeUploadedImage(image.path);
            throw new ForbiddenException('You can only update your own profile image');
        }

        const user = await this.usersRepository.findOne({ where: { id: userId } });
        if (!user) {
            await this.removeUploadedImage(image.path);
            throw new NotFoundException('User not found');
        }

        const previousImageUrl = user.imageUrl;
        user.imageUrl = `${PROFILE_IMAGE_URL_PREFIX}/${image.filename}`;

        let savedUser: User;
        try {
            savedUser = await this.usersRepository.save(user);
        } catch (error) {
            await this.removeUploadedImage(image.path);
            throw error;
        }

        if (previousImageUrl) {
            await this.removeReplacedImage(previousImageUrl);
        }

        const { password: _password, ...safeUser } = savedUser;
        return safeUser;
    }

    private async removeUploadedImage(filePath: string): Promise<void> {
        const absolutePath = resolve(filePath);
        const fromUploads = relative(PROFILE_IMAGE_DIRECTORY, absolutePath);
        if (!fromUploads || fromUploads.startsWith('..') || isAbsolute(fromUploads)) {
            return;
        }

        await this.unlinkIfPresent(absolutePath);
    }

    private async removeReplacedImage(imageUrl: string): Promise<void> {
        if (!imageUrl.startsWith(`${PROFILE_IMAGE_URL_PREFIX}/`)) return;

        const filename = basename(imageUrl.slice(PROFILE_IMAGE_URL_PREFIX.length + 1));
        if (!filename) return;

        await this.unlinkIfPresent(resolve(PROFILE_IMAGE_DIRECTORY, filename));
    }

    private async unlinkIfPresent(filePath: string): Promise<void> {
        try {
            await fs.unlink(filePath);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                this.logger.warn('Could not remove a profile image file');
            }
        }
    }
}
