import {
  Controller,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
  Get,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ValidateSlugService } from './services/validate-slug.service';
import { CreateTagService } from './services/create-tag.service';
import { UpdateTagService } from './services/update-tag.service';
import { DeleteTagService } from './services/delete-tag.service';
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
    private readonly createTagService: CreateTagService,
    private readonly updateTagService: UpdateTagService,
    private readonly deleteTagService: DeleteTagService,
  ) {}

  @Get('validate-slug/:slug')
  @ApiOperation({ summary: '(ADMIN) Valida si un slug está disponible.' })
  @ApiResponse({ status: 200, description: 'Disponibilidad del slug' })
  validateSlug(@Param('slug') slug: string) {
    return this.validateSlugService.validateSlug(slug);
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
  remove(@Param('slug') slug: string) {
    return this.deleteTagService.remove(slug);
  }
}
