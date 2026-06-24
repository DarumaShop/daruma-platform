import { Module } from '@nestjs/common';
import { GarbageCollectorService } from './garbage-collector.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  providers: [GarbageCollectorService],
})
export class CronModule {}
