import 'dotenv/config';
import { DataSource, Like } from 'typeorm';

import { User } from '../auth/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { Comment } from '../comments/entities/comment.entity';
import { PostLike } from '../likes/entities/post-like.entity';
import { CreateUsers1790812272950 } from './migrations/1790812272950-CreateUsers';
import { CreatePosts1790901880367 } from './migrations/1790901880367-CreatePosts';
import { CreateComments1790988549751 } from './migrations/1790988549751-CreateComments';
import { CreatePostLikes1790991316004 } from './migrations/1790991316004-CreatePostLikes';
import { AddUserImageUrl1791260000000 } from './migrations/1791260000000-AddUserImageUrl';

export default new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    entities: [User, Post, Comment, PostLike],

    migrations: [
        CreateUsers1790812272950,
        CreatePosts1790901880367,
        CreateComments1790988549751,
        CreatePostLikes1790991316004,
        AddUserImageUrl1791260000000,
    ],
});
