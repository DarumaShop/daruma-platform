import { Module } from '@nestjs/common';
import { CreateTagService } from './services/create-tag.service';
import { UpdateTagService } from './services/update-tag.service';
import { DeleteTagService } from './services/delete-tag.service';
import { GetTagsService } from './services/get-tags.service';
import { ValidateSlugService } from './services/validate-slug.service';
import { TagsPublicController } from './tags-public.controller';
import { TagsAdminController } from './tags-admin.controller';

@Module({
  providers: [
    CreateTagService,
    UpdateTagService,
    DeleteTagService,
    GetTagsService,
    ValidateSlugService,
  ],
  controllers: [TagsPublicController, TagsAdminController],
})
export class TagsModule {}
