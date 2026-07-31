import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { LoginUserService } from './services/login-user.service';
import { RegisterUserService } from './services/register-user.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { LogoutUserService } from './services/logout-user.service';
import { GenerateInviteService } from './services/generate-invite.service';
import { ForgotPasswordService } from './services/forgot-password.service';
import { ResetPasswordService } from './services/reset-password.service';
import { AuthPublicController } from './auth-public.controller';
import { AuthAdminController } from './auth-admin.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET')!,
      }),
    }),
  ],
  controllers: [AuthPublicController, AuthAdminController],
  providers: [
    LoginUserService,
    RegisterUserService,
    RefreshTokenService,
    LogoutUserService,
    GenerateInviteService,
    ForgotPasswordService,
    ResetPasswordService,
    JwtStrategy,
  ],
})
export class AuthModule {}
