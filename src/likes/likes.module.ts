import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Post } from '../posts/entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PostLike,
      Post,
    ]),
  ],
  controllers: [LikesController],
  providers: [LikesService],
})
export class LikesModule { }