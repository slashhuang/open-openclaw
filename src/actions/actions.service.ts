import { Injectable, Logger } from '@nestjs/common';
import { OpenClawService } from '../openclaw/openclaw.service';
import * as pm2 from 'pm2';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ActionsService {
  private readonly logger = new Logger(ActionsService.name);

  constructor(private openclawService: OpenClawService) {}

  async restartGateway(): Promise<{ success: boolean; message: string }> {
    try {
      // 尝试通过 PM2 重启
      await this.pm2Restart('openclaw-gateway');
      return { success: true, message: 'Gateway 已重启' };
    } catch (error: any) {
      this.logger.error('Failed to restart gateway:', error);
      return {
        success: false,
        message: `重启失败：${error.message}，请尝试手动重启`,
      };
    }
  }

  async killSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    const result = await this.openclawService.killSession(sessionId);
    if (result) {
      return { success: true, message: `会话 ${sessionId} 已终止` };
    }
    return { success: false, message: '终止会话失败' };
  }

  async updateConcurrency(maxConcurrent: number): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.openclawService.updateConfig({
        sessions: { maxConcurrent },
      });

      if (result) {
        return { success: true, message: `并发数已更新为 ${maxConcurrent}` };
      }

      return { success: false, message: '更新配置失败' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async cleanupLogs(): Promise<{ success: boolean; message: string }> {
    try {
      const logDir = '/root/.pm2/logs';

      if (!fs.existsSync(logDir)) {
        return { success: true, message: '日志目录不存在，无需清理' };
      }

      const files = fs.readdirSync(logDir);
      let deleted = 0;

      files.forEach((file) => {
        const filePath = path.join(logDir, file);
        try {
          const stats = fs.statSync(filePath);
          // 删除 7 天前的日志
          if (stats.mtimeMs < Date.now() - 7 * 24 * 60 * 60 * 1000) {
            fs.unlinkSync(filePath);
            deleted++;
          }
        } catch (error) {
          // 忽略单个文件错误
        }
      });

      return { success: true, message: `已清理 ${deleted} 个旧日志文件` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  private pm2Restart(processName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      pm2.connect((err) => {
        if (err) {
          reject(err);
          return;
        }

        pm2.restart(processName, (err) => {
          pm2.disconnect();

          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }
}
