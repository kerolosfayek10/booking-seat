import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // For serverless environments, only connect when needed
    if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
      await this.$connect();
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Override methods to handle connection on demand for serverless
  async $connect() {
    if (!this._isConnected) {
      await super.$connect();
      this._isConnected = true;
    }
  }

  private _isConnected = false;
}
