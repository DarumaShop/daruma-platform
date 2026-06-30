import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Tags')
@Controller()
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get('public/tags')
  @ApiOperation({
    summary: '(PUBLIC) Obtiene el árbol de etiquetas, o filtra por nombre',
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

  @Get('public/tags/:id')
  @ApiOperation({
    summary: '(PUBLIC) Obtiene una etiqueta por su ID',
    description:
      'Si se envía ?tree=true devolverá el árbol infinito de hijos, de lo contrario solo devolverá la etiqueta.',
  })
  @ApiResponse({ status: 200, description: 'Etiqueta encontrada' })
  @ApiQuery({
    name: 'tree',
    required: false,
    description: 'Enviar true para obtener todos los descendientes',
  })
  findOne(@Param('id') id: string, @Query('tree') tree?: string) {
    const withTree = tree === 'true';
    return this.tagsService.findOne(id, withTree);
  }

  @Post('admin/tags')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '(ADMIN) Crea una nueva etiqueta' })
  @ApiResponse({ status: 201, description: 'Etiqueta creada' })
  create(@Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(createTagDto);
  }

  @Patch('admin/tags/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '(ADMIN) Edita una etiqueta existente' })
  @ApiResponse({ status: 200, description: 'Etiqueta editada' })
  update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    return this.tagsService.update(id, updateTagDto);
  }

  @Delete('admin/tags/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '(ADMIN) Elimina una etiqueta por ID' })
  @ApiResponse({ status: 200, description: 'Etiqueta eliminada' })
  remove(@Param('id') id: string) {
    return this.tagsService.remove(id);
  }
}
