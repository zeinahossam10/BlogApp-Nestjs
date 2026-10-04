import {
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';

import { User } from '../../auth/entities/user.entity';
import { Post } from '../../posts/entities/post.entity';

@Entity('post_likes')
@Unique(['user', 'post'])
export class PostLike {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => Post, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'postId' })
    post: Post;

    @CreateDateColumn()
    createdAt: Date;
}