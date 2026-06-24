import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UploadImageDto } from './dto/upload-image.dto';

@ApiTags('Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @ApiOperation({
    summary: '(ADMIN) Sube y procesa una imagen para un producto',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Archivo de imagen y opciones opcionales de recorte/redimensionamiento',
    type: UploadImageDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Imagen procesada y subida exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Archivo inválido o faltante' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: { buffer: Buffer; originalname: string },
    @Body() options: UploadImageDto,
  ) {
    const processOptions = {
      targetWidth: options.targetWidth
        ? Number.parseInt(options.targetWidth.toString())
        : undefined,
      targetHeight: options.targetHeight
        ? Number.parseInt(options.targetHeight.toString())
        : undefined,
      cropX: options.cropX
        ? Number.parseFloat(options.cropX.toString())
        : undefined,
      cropY: options.cropY
        ? Number.parseFloat(options.cropY.toString())
        : undefined,
      cropWidth: options.cropWidth
        ? Number.parseFloat(options.cropWidth.toString())
        : undefined,
      cropHeight: options.cropHeight
        ? Number.parseFloat(options.cropHeight.toString())
        : undefined,
      fit: options.fit,
    };

    const publicUrl = await this.uploadsService.processAndUploadImage(
      file,
      processOptions,
    );
    return { url: publicUrl };
  }
}
