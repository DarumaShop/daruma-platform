import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';

@ApiTags('System (Public)')
@Controller()
export class AppController {
  @Get()
  @ApiExcludeEndpoint()
  @Redirect('/api/docs', 301)
  redirectRoot() {
    return { url: '/api/docs' };
  }
  @Get('health')
  @ApiOperation({ summary: '(PUBLIC) Verifica el estado de salud de la API.' })
  checkHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
    };
  }
}
