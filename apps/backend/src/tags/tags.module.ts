import { Module } from '@nestjs/common';
import { TagsService } from './tags.service';
import { TagsPublicController } from './tags-public.controller';
import { TagsAdminController } from './tags-admin.controller';

@Module({
  providers: [TagsService],
  controllers: [TagsPublicController, TagsAdminController],
})
export class TagsModule {}
