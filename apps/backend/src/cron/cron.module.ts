import { Module } from '@nestjs/common';
import { GarbageCollectorService } from './garbage-collector.service';
import { UploadsModule } from '../uploads/uploads.module';

import { CronController } from './cron.controller';

@Module({
  imports: [UploadsModule],
  controllers: [CronController],
  providers: [GarbageCollectorService],
})
export class CronModule {}
