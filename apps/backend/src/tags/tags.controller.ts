import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
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
  @ApiOperation({ summary: '(PUBLIC) Obtiene el árbol completo de etiquetas' })
  @ApiResponse({
    status: 200,
    description: 'Árbol de etiquetas retornado exitosamente',
  })
  findAll() {
    return this.tagsService.findAll();
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
