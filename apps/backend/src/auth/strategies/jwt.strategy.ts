import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { FindUserByIdService } from '../../users/services/find-user-by-id.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly findUserByIdService: FindUserByIdService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.accessToken
            ? (request.cookies.accessToken as string)
            : null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.findUserByIdService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException(
        'El usuario asociado a este token ya no existe',
      );
    }
    return { id: user.id, email: user.email, role: user.role };
  }
}
