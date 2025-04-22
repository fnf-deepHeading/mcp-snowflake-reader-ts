import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import snowflake from 'snowflake-sdk';
import { z } from 'zod';

// 타입 정의를 위한 가져오기
import type { Connection } from 'snowflake-sdk';

// 테이블 이름이 유효한지 검증하는 함수
export function validateTableName(tableName: string): boolean {
  // 영숫자, 밑줄, 점만 허용
  const pattern = /^[a-zA-Z0-9_\.]+$/;
  return pattern.test(tableName);
}

// SQL 쿼리가 읽기 전용인지 검증하는 함수
export function validateSqlQuery(sql: string): boolean {
  // 금지된 SQL 키워드 목록
  const forbiddenKeywords = [
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER',
    'CREATE', 'GRANT', 'REVOKE', 'COMMIT', 'ROLLBACK'
  ];
  
  // 대소문자 구분 없이 검사하기 위해 대문자로 변환
  const sqlUpper = sql.toUpperCase();
  return !forbiddenKeywords.some(keyword => sqlUpper.includes(keyword));
}

// 연결 정보 인터페이스
export interface SnowflakeConnectionConfig {
  account: string;
  username: string;
  password: string;
  warehouse?: string;
  database?: string;
  schema?: string;
  role?: string;
}

// MCP 서버 클래스
export class MCPSnowflakeReader {
  private mcp: McpServer;
  private connectionConfig: SnowflakeConnectionConfig;
  private connection: Connection | null = null;

  constructor(connectionConfig: SnowflakeConnectionConfig) {
    this.connectionConfig = connectionConfig;
    this.mcp = new McpServer({
      name: 'snowflake-read',
      version: '0.2.1'
    });
    this.registerHandlers();
  }

  // Snowflake 연결 얻기
  private getConnection(): Connection {
    if (!this.connection) {
      try {
        this.connection = snowflake.createConnection(this.connectionConfig);
      } catch (error) {
        throw new Error(`Snowflake 연결 실패: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return this.connection;
  }

  // 핸들러 등록
  private registerHandlers(): void {
    // 테이블 목록 조회
    this.mcp.resource('테이블 목록', 'snowflake://tables', async () => {
      try {
        const conn = this.getConnection();
        
        const result = await new Promise<any[]>((resolve, reject) => {
          const statement = conn.execute({
            sqlText: 'SHOW TABLES',
            complete: function(err, stmt, rows) {
              if (err) {
                reject(new Error(`테이블 목록 조회 실패: ${err.message}`));
                return;
              }
              resolve(rows || []);
            }
          });
        });
        
        return {
          contents: [{
            uri: 'snowflake://tables',
            text: JSON.stringify(result, null, 2),
            mimeType: 'application/json'
          }]
        };
      } catch (error) {
        throw new Error(`Snowflake 연결 실패: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    // 테이블 스키마 조회 - URI 패턴 등록
    this.mcp.resource('테이블 스키마', 'snowflake://schema/{tableName}', async (uri) => {
      try {
        const url = new URL(uri);
        const tableName = url.pathname.split('/').pop() || '';
        
        if (!validateTableName(tableName)) {
          throw new Error('유효하지 않은 테이블 이름');
        }
        
        const conn = this.getConnection();
        
        const result = await new Promise<any[]>((resolve, reject) => {
          const statement = conn.execute({
            sqlText: `DESCRIBE TABLE ${tableName}`,
            complete: function(err, stmt, rows) {
              if (err) {
                reject(new Error(`테이블 스키마 조회 실패: ${err.message}`));
                return;
              }
              resolve(rows || []);
            }
          });
        });
        
        return {
          contents: [{
            uri: `snowflake://schema/${tableName}`,
            text: JSON.stringify(result, null, 2),
            mimeType: 'application/json'
          }]
        };
      } catch (error) {
        throw new Error(`Snowflake 연결 실패: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    // SQL 쿼리 실행
    this.mcp.tool('query', 'SQL 쿼리 실행', { sql: z.string().describe('실행할 SQL 쿼리') }, async ({ sql }) => {
      if (!validateSqlQuery(sql)) {
        throw new Error('쿼리에 금지된 키워드가 포함되어 있거나 읽기 전용이 아닙니다');
      }
      
      try {
        const conn = this.getConnection();
        
        const result = await new Promise<any[]>((resolve, reject) => {
          const statement = conn.execute({
            sqlText: sql,
            complete: function(err, stmt, rows) {
              if (err) {
                reject(new Error(`쿼리 실행 실패: ${err.message}`));
                return;
              }
              resolve(rows || []);
            }
          });
        });

        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        throw new Error(`Snowflake 연결 실패: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  // 서버 시작
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.mcp.connect(transport);
  }

  // 서버 종료
  async stop(): Promise<void> {
    // MCP 서버 종료
    await this.mcp.close();
    
    // Snowflake 연결 종료
    if (this.connection) {
      this.connection.destroy((err) => {
        if (err) {
          console.error('Snowflake 연결 종료 오류:', err);
        }
      });
      this.connection = null;
    }
  }
}

export default MCPSnowflakeReader; 