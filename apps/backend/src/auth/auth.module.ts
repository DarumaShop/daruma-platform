import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
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
        //TODO: Aplicar en produccion -> signOptions: { expiresIn: '15m' },
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  controllers: [AuthPublicController, AuthAdminController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
