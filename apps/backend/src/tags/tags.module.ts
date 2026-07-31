import { Module } from '@nestjs/common';
import { CreateTagService } from './services/create-tag.service';
import { UpdateTagService } from './services/update-tag.service';
import { DeleteTagService } from './services/delete-tag.service';
import { DeleteTagCascadeService } from './services/delete-tag-cascade.service';
import { GetTagsService } from './services/get-tags.service';
import { ValidateSlugService } from './services/validate-slug.service';
import { SuggestSlugService } from './services/suggest-slug.service';
import { TagsPublicController } from './tags-public.controller';
import { TagsAdminController } from './tags-admin.controller';

@Module({
  providers: [
    CreateTagService,
    UpdateTagService,
    DeleteTagService,
    DeleteTagCascadeService,
    GetTagsService,
    ValidateSlugService,
    SuggestSlugService,
  ],
  controllers: [TagsPublicController, TagsAdminController],
})
export class TagsModule {}
