import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// 모든 로그를 기록할 파일 경로 (OS 독립적)
const LOG_DIR = path.join(os.tmpdir(), 'mcp-snowflake-reader');
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

// 로그 디렉터리가 없으면 생성
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (e) {
  // 디렉터리 생성 실패 무시 (권한 문제 등)
}

// 로그 파일 크기 확인 및 관리
function checkLogFileSize(): void {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      if (stats.size > MAX_LOG_SIZE) {
        // 백업 파일 경로
        const backupFile = path.join(LOG_DIR, 'app.log.old');
        
        // 기존 백업 파일이 있으면 삭제
        if (fs.existsSync(backupFile)) {
          fs.unlinkSync(backupFile);
        }
        
        // 현재 로그 파일을 백업으로 이동하고 새 로그 파일 생성
        fs.renameSync(LOG_FILE, backupFile);
      }
    }
  } catch (e) {
    // 파일 작업 오류 무시
  }
}

// 초기 시작 시 로그 파일 크기 확인
checkLogFileSize();

export type LogLevel = 'info' | 'error';

// 원본 로그 기능을 저장
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// MCP 프로토콜에서는 표준 출력의 모든 메시지가 JSON이어야 함
export class Logger {
  // 로그 억제 여부
  private static isSuppressed = false;

  // Snowflake 로그 억제 시작
  static suppressLogs(): void {
    if (this.isSuppressed) {
      return;
    }
    
    // console.log 재정의 - Snowflake 로그는 파일로만 리디렉션
    console.log = (message?: any, ...optionalParams: any[]) => {
      if (message && typeof message === 'string' && message.includes('[Snowflake]')) {
        // Snowflake 로그는 파일에만 기록하고 표준 출력으로는 보내지 않음
        try {
          // 로그 기록 전에 파일 크기 확인
          checkLogFileSize();
          fs.appendFileSync(LOG_FILE, `${message}\n`);
        } catch (e) {
          // 파일 쓰기 오류 무시
        }
        return;
      }
      
      // Snowflake 로그가 아닌 경우 원래 함수 호출
      originalConsoleLog(message, ...optionalParams);
    };
    
    console.error = (message?: any, ...optionalParams: any[]) => {
      if (message && typeof message === 'string' && message.includes('[Snowflake]')) {
        // Snowflake 로그는 파일에만 기록하고 표준 출력으로는 보내지 않음
        try {
          // 로그 기록 전에 파일 크기 확인
          checkLogFileSize();
          fs.appendFileSync(LOG_FILE, `ERROR: ${message}\n`);
        } catch (e) {
          // 파일 쓰기 오류 무시
        }
        return;
      }
      
      // Snowflake 로그가 아닌 경우 원래 함수 호출
      originalConsoleError(message, ...optionalParams);
    };
    
    this.isSuppressed = true;
  }

  // 콘솔 로그 억제 종료
  static restoreLogs(): void {
    if (!this.isSuppressed) {
      return;
    }
    
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    this.isSuppressed = false;
  }

  // 모든 로그를 파일에만 기록 (MCP 프로토콜을 방해하지 않도록)
  static log(level: LogLevel, message: string): void {
    try {
      // 로그 작성 전에 파일 크기 확인
      checkLogFileSize();
      
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
      
      // 파일에만 로그 기록
      try {
        fs.appendFileSync(LOG_FILE, logMessage);
      } catch (e) {
        // 파일 쓰기 오류 무시
      }
      
      // 중요: 콘솔에는 출력하지 않음 (MCP 프로토콜을 방해하지 않기 위해)
    } catch (e) {
      // 로깅 오류 무시
    }
  }

  static info(message: string): void {
    this.log('info', message);
  }

  static error(message: string): void {
    this.log('error', message);
  }
} 