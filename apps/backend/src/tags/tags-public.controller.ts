import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TagsService } from './tags.service';

@ApiTags('Tags (Public)')
@Controller('public/tags')
export class TagsPublicController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @ApiOperation({
    summary: '(PUBLIC) Obtiene el árbol de etiquetas o filtra por nombre.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Árbol de etiquetas o lista plana filtrada retornado exitosamente',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Término de búsqueda opcional',
  })
  findAll(@Query('search') search?: string) {
    return this.tagsService.findAll(search);
  }

  @Get(':slug')
  @ApiOperation({
    summary: '(PUBLIC) Obtiene una etiqueta por su ID.',
    description:
      'Si se envía ?tree=true devolverá el árbol infinito de hijos, de lo contrario solo devolverá la etiqueta.',
  })
  @ApiResponse({ status: 200, description: 'Etiqueta encontrada' })
  @ApiQuery({
    name: 'tree',
    required: false,
    description: 'Enviar true para obtener todos los descendientes',
  })
  findOne(@Param('slug') slug: string, @Query('tree') tree?: string) {
    const withTree = tree === 'true';
    return this.tagsService.findOne(slug, withTree);
  }
}
