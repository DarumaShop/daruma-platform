import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FindUserByIdService } from '../../users/services/find-user-by-id.service';
import { UpdateRefreshTokenService } from '../../users/services/update-refresh-token.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly findUserByIdService: FindUserByIdService,
    private readonly updateRefreshTokenService: UpdateRefreshTokenService,
    private readonly jwtService: JwtService,
  ) {}

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        role: string;
      }>(refreshToken);

      const user = await this.findUserByIdService.findById(payload.sub);
      if (!user?.refreshToken) {
        throw new UnauthorizedException('Acceso denegado');
      }

      const isRefreshTokenValid = await bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );
      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Acceso denegado');
      }

      const newPayload = { sub: user.id, email: user.email, role: user.role };
      const newAccessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: '7d',
      });

      const salt = await bcrypt.genSalt();
      const hashedRefreshToken = await bcrypt.hash(newRefreshToken, salt);
      await this.updateRefreshTokenService.updateRefreshToken(
        user.id,
        hashedRefreshToken,
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }
}
