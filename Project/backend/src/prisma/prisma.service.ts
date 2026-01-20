import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  

  private pool: Pool;

  constructor() {
    console.log('🔥 PrismaService using DATABASE_URL =', process.env.DATABASE_URL);
    // 用 DATABASE_URL 建立 pg 连接池
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is missing');
    }
    
    const pool = new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false, // 👈 解决 self-signed cert
        },
    });

    const adapter = new PrismaPg(pool);

    super({ adapter });

    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
