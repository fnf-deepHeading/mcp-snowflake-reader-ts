import snowflake from 'snowflake-sdk';
import type { Connection } from 'snowflake-sdk';
import { Logger } from '../utils/logger.js';

// Snowflake 연결 설정 인터페이스
export interface SnowflakeConnectionConfig {
  account: string;
  username?: string;
  user?: string;
  password: string;
  warehouse?: string;
  database?: string;
  schema?: string;
  role?: string;
}

export class SnowflakeConnection {
  private connection: Connection | null = null;
  private readonly config: SnowflakeConnectionConfig;

  constructor(config: SnowflakeConnectionConfig) {
    // user를 username으로 매핑
    this.config = {
      ...config,
      username: config.user || config.username,
      user: undefined
    };

    if (!this.config.username) {
      throw new Error('username 또는 user가 설정되지 않았습니다.');
    }

    // Snowflake SDK 구성
    snowflake.configure({
      logLevel: 'ERROR'
    });
  }

  async getConnection(): Promise<Connection> {
    if (!this.connection) {
      try {
        const connectionInfo = {
          account: this.config.account,
          username: this.config.username,
          database: this.config.database,
          warehouse: this.config.warehouse,
          schema: this.config.schema,
          role: this.config.role
        };

        Logger.info(`Snowflake 연결 시도: ${JSON.stringify(connectionInfo).replace(/\n/g, '')}`);
        
        this.connection = snowflake.createConnection(this.config);
        
        await new Promise<void>((resolve, reject) => {
          this.connection!.connect((err, conn) => {
            if (err) {
              Logger.error(`Snowflake 연결 실패: ${err}`);
              reject(err);
              return;
            }
            Logger.info('Snowflake 연결 성공!');
            resolve();
          });
        });
      } catch (error) {
        this.connection = null;
        throw new Error(`Snowflake 연결 실패: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return this.connection;
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await new Promise<void>((resolve, reject) => {
        this.connection!.destroy((err) => {
          if (err) {
            reject(err);
            return;
          }
          this.connection = null;
          resolve();
        });
      });
    }
  }

  // 연결 정보를 캐싱하여 불필요한 검사를 줄입니다
  private lastSuccessfulConnectionTime: number = 0;
  private readonly CONNECTION_CACHE_TTL_MS: number = 60000; // 1분

  async testConnection(): Promise<void> {
    try {
      const now = Date.now();
      
      // 캐시된 연결 정보가 있고 유효 기간 내라면 실제 쿼리 없이 성공으로 처리
      if (this.connection && 
          this.lastSuccessfulConnectionTime > 0 && 
          (now - this.lastSuccessfulConnectionTime) < this.CONNECTION_CACHE_TTL_MS) {
        Logger.info('✅ Snowflake 연결 활성 상태 (캐시)');
        return;
      }
      
      // 연결이 없으면 새로 연결
      if (!this.connection) {
        await this.getConnection();
        this.lastSuccessfulConnectionTime = now;
        Logger.info('✅ Snowflake 연결 성공 (새 연결)');
        return;
      }
      
      // Snowflake SDK의 내장 메소드를 사용하여 연결 상태 확인 (쿼리 없이)
      if (this.connection.isUp() && await this.connection.isValidAsync()) {
        this.lastSuccessfulConnectionTime = now;
        Logger.info('✅ Snowflake 연결 활성 상태 (검증됨)');
        return;
      }
      
      // 연결이 끊어진 경우 재연결
      this.connection = null;
      await this.getConnection();
      this.lastSuccessfulConnectionTime = now;
      Logger.info('✅ Snowflake 재연결 성공');
    } catch (error) {
      Logger.error(`❌ Snowflake 연결 테스트 실패: ${error}`);
      throw error;
    }
  }
} 