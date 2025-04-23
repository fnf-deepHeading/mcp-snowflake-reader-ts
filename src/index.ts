import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { SnowflakeConnection, type SnowflakeConnectionConfig } from './snowflake/connection.js';
import { validateSqlQuery, isValidTableName } from './utils/sql.js';
import { Logger } from './utils/logger.js';

// 로그 억제 시작
Logger.suppressLogs();
Logger.info('MCP Snowflake Reader 초기화');

// MCP 서버 클래스
export class MCPSnowflakeReader {
  private mcp: McpServer;
  private snowflake: SnowflakeConnection;
  private tablesCache: any[] | null = null;
  private tablesCacheTime: number = 0;
  private readonly TABLES_CACHE_TTL_MS: number = 300000; // 5분

  constructor(connectionConfig: SnowflakeConnectionConfig) {
    this.snowflake = new SnowflakeConnection(connectionConfig);
    
    this.mcp = new McpServer({
      name: 'snowflake-read',
      version: '0.2.1'
    });
    
    this.registerHandlers();
  }

  // Snowflake 연결 테스트 (외부에서 호출하는 함수)
  // 단, 연결 테스트 시 쿼리 비용이 발생하므로 가능한 한 적게 실행하도록 함
  // 이 메소드가 자주 호출되어도 내부적으로 캐싱 처리함
  async testConnection(): Promise<void> {
    await this.snowflake.testConnection();
  }

  private async listTables(): Promise<any[]> {
    const now = Date.now();
    
    // 캐시된 테이블 목록이 있고 유효 기간 내라면 캐시 사용
    if (this.tablesCache && 
        this.tablesCacheTime > 0 && 
        (now - this.tablesCacheTime) < this.TABLES_CACHE_TTL_MS) {
      Logger.info('테이블 목록 캐시 사용');
      return this.tablesCache;
    }
    
    // 캐시가 없거나 만료된 경우 새로 조회
    const conn = await this.snowflake.getConnection();
    
    return new Promise<any[]>((resolve, reject) => {
      conn.execute({
        sqlText: 'SHOW TABLES',
        complete: (err, stmt, rows) => {
          if (err) {
            reject(err);
            return;
          }
          // 결과 캐싱
          this.tablesCache = rows || [];
          this.tablesCacheTime = now;
          Logger.info('테이블 목록 갱신됨');
          resolve(this.tablesCache);
        }
      });
    });
  }

  // 핸들러 등록
  private registerHandlers(): void {
    // 테이블 목록 조회
    this.mcp.resource('테이블 목록', 'snowflake://tables', async () => {
      const tables = await this.listTables();
      return {
        contents: tables.map(table => ({
          uri: `snowflake://table/${table.name || ''}`,
          text: JSON.stringify(table).replace(/\n/g, ''),
          mimeType: 'application/json'
        }))
      };
    });

    // 테이블 스키마 조회
    this.mcp.resource('테이블 스키마', 'snowflake://schema/{tableName}', async (uri) => {
      const url = new URL(uri);
      const tableName = url.pathname.split('/').pop() || '';
      
      if (!isValidTableName(tableName)) {
        throw new Error('유효하지 않은 테이블 이름');
      }
      
      const conn = await this.snowflake.getConnection();
      
      const result = await new Promise<any[]>((resolve, reject) => {
        conn.execute({
          sqlText: `DESCRIBE TABLE ${tableName}`,
          complete: function(err, stmt, rows) {
            if (err) {
              reject(err);
              return;
            }
            resolve(rows || []);
          }
        });
      });
      
      return {
        contents: [{
          uri: `snowflake://schema/${tableName}`,
          text: JSON.stringify(result).replace(/\n/g, ''),
          mimeType: 'application/json'
        }]
      };
    });

    // SQL 쿼리 실행
    this.mcp.tool('query', 'SQL 쿼리 실행', { sql: z.string().describe('실행할 SQL 쿼리') }, async ({ sql }: { sql: string }) => {
      if (!validateSqlQuery(sql)) {
        throw new Error('쿼리에 금지된 키워드가 포함되어 있거나 읽기 전용이 아닙니다');
      }
      
      const conn = await this.snowflake.getConnection();
      
      const result = await new Promise<any[]>((resolve, reject) => {
        conn.execute({
          sqlText: sql,
          complete: function(err, stmt, rows) {
            if (err) {
              reject(err);
              return;
            }
            resolve(rows || []);
          }
        });
      });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result)
        }]
      };
    });
  }

  async start(): Promise<void> {
    // 시작 시 한 번만 연결 테스트를 실행합니다
    await this.snowflake.testConnection();
    await this.mcp.connect(new StdioServerTransport());
    Logger.info('MCP Snowflake Reader 시작됨');
  }

  async stop(): Promise<void> {
    await this.mcp.close();
    await this.snowflake.disconnect();
    Logger.info('MCP Snowflake Reader 종료됨');
    Logger.restoreLogs();
  }
} 