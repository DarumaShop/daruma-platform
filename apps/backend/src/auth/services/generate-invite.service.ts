import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GenerateInviteService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateInviteToken(): string {
    const inviteSecret =
      this.configService.get<string>('INVITE_SECRET') || 'invite-secret';
    return this.jwtService.sign(
      { purpose: 'admin_invite' },
      { secret: inviteSecret, expiresIn: '12h' },
    );
  }

  verifyInviteToken(token: string): boolean {
    try {
      const inviteSecret =
        this.configService.get<string>('INVITE_SECRET') || 'invite-secret';
      const decoded = this.jwtService.verify<{ purpose: string }>(token, {
        secret: inviteSecret,
      });
      return decoded.purpose === 'admin_invite';
    } catch {
      return false;
    }
  }
}
