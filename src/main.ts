import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import { LogsService } from './logs/logs.service';
import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 启用 CORS
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 配置静态资源服务 - 只服务 /assets 等静态路径
  const staticPath = path.join(process.cwd(), 'public', 'app');
  app.use('/assets', express.static(path.join(staticPath, 'assets')));

  // 获取配置
  const configService = app.get(ConfigService);
  const config = configService.getConfig();

  // 启动日志追踪
  const logsService = app.get(LogsService);

  // 尝试启动日志追踪（如果日志文件存在）
  try {
    await logsService.startTailing(config.pm2LogPath);
    console.log(`Started tailing logs from: ${config.pm2LogPath}`);
  } catch (error) {
    console.warn(`Failed to start log tailing: ${error}. Logs will be available when OpenClaw is running.`);
  }

  // 监听配置的主机/端口
  const port = config.port;
  const host = config.host;

  await app.listen(port, host);

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           OpenClaw Monitor UI                             ║
╠═══════════════════════════════════════════════════════════╣
║  Running on: http://${host}:${port}
║  Gateway URL: ${config.openclawGatewayUrl}
║  Access Mode: ${config.accessMode}${config.accessMode === 'token' ? ' (token required)' : ''}
║                                                           ║
║  Open http://localhost:${port} in your browser           ║
╚═══════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
