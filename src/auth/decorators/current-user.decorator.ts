import {
    createParamDecorator,
    ExecutionContext,
} from '@nestjs/common';

import { JwtPayload } from '../types/jwt-payload';

export const CurrentUser = createParamDecorator(
    (
        data: unknown,
        ctx: ExecutionContext,
    ): JwtPayload => {
        const request = ctx
            .switchToHttp()
            .getRequest<{ user: JwtPayload }>();

        return request.user;
    },
);