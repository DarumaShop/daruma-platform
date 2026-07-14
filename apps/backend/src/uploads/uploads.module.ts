import { Module } from '@nestjs/common';
import { UploadImageService } from './services/upload-image.service';
import { DeleteImageService } from './services/delete-image.service';
import { UploadsController } from './uploads.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UploadImageService, DeleteImageService],
  controllers: [UploadsController],
  exports: [UploadImageService, DeleteImageService],
})
export class UploadsModule {}
