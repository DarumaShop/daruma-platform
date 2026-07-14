import { Module } from '@nestjs/common';
import { GetDashboardStatsService } from './services/get-dashboard-stats.service';
import { DashboardController } from './dashboard.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [GetDashboardStatsService],
  controllers: [DashboardController],
})
export class DashboardModule {}
