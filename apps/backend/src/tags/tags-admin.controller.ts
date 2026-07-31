import {
  Controller,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ValidateSlugService } from './services/validate-slug.service';
import { SuggestSlugService } from './services/suggest-slug.service';
import { CreateTagService } from './services/create-tag.service';
import { UpdateTagService } from './services/update-tag.service';
import { DeleteTagService } from './services/delete-tag.service';
import { DeleteTagCascadeService } from './services/delete-tag-cascade.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Tags (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/tags')
export class TagsAdminController {
  constructor(
    private readonly validateSlugService: ValidateSlugService,
    private readonly suggestSlugService: SuggestSlugService,
    private readonly createTagService: CreateTagService,
    private readonly updateTagService: UpdateTagService,
    private readonly deleteTagService: DeleteTagService,
    private readonly deleteTagCascadeService: DeleteTagCascadeService,
  ) {}

  @Get('validate-slug/:slug')
  @ApiOperation({ summary: '(ADMIN) Valida si un slug está disponible.' })
  @ApiResponse({ status: 200, description: 'Disponibilidad del slug' })
  validateSlug(@Param('slug') slug: string) {
    return this.validateSlugService.validateSlug(slug);
  }

  @Get('suggest-slug')
  @ApiOperation({
    summary: '(ADMIN) Sugiere un slug válido basado en un nombre.',
  })
  @ApiQuery({
    name: 'name',
    required: true,
    description: 'Nombre para generar el slug',
  })
  @ApiQuery({
    name: 'ignoreSlug',
    required: false,
    description: 'Slug a ignorar (para edición)',
  })
  @ApiResponse({ status: 200, description: 'Slug sugerido' })
  suggestSlug(
    @Query('name') name: string,
    @Query('ignoreSlug') ignoreSlug?: string,
  ) {
    return this.suggestSlugService.suggestSlug(name, ignoreSlug);
  }

  @Post()
  @ApiOperation({ summary: '(ADMIN) Crea una nueva etiqueta.' })
  @ApiResponse({ status: 201, description: 'Etiqueta creada' })
  create(@Body() createTagDto: CreateTagDto) {
    return this.createTagService.create(createTagDto);
  }

  @Patch(':slug')
  @ApiOperation({ summary: '(ADMIN) Edita una etiqueta existente.' })
  @ApiResponse({ status: 200, description: 'Etiqueta editada' })
  update(@Param('slug') slug: string, @Body() updateTagDto: UpdateTagDto) {
    return this.updateTagService.update(slug, updateTagDto);
  }

  @Delete(':slug')
  @ApiOperation({ summary: '(ADMIN) Elimina una etiqueta por ID.' })
  @ApiResponse({ status: 200, description: 'Etiqueta eliminada' })
  remove(@Param('slug') slug: string, @Query('cascade') cascade?: string) {
    if (cascade === 'true') {
      return this.deleteTagCascadeService.removeCascade(slug);
    }
    return this.deleteTagService.remove(slug);
  }
}
