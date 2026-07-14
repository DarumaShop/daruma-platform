import { Module } from '@nestjs/common';
import { FindUserByEmailService } from './services/find-user-by-email.service';
import { FindUserByIdentifierService } from './services/find-user-by-identifier.service';
import { FindUserByIdService } from './services/find-user-by-id.service';
import { CreateUserService } from './services/create-user.service';
import { UpdateRefreshTokenService } from './services/update-refresh-token.service';

@Module({
  providers: [
    FindUserByEmailService,
    FindUserByIdentifierService,
    FindUserByIdService,
    CreateUserService,
    UpdateRefreshTokenService,
  ],
  exports: [
    FindUserByEmailService,
    FindUserByIdentifierService,
    FindUserByIdService,
    CreateUserService,
    UpdateRefreshTokenService,
  ],
})
export class UsersModule {}
