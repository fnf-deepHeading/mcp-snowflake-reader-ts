#!/usr/bin/env node

import { Command } from 'commander';
import { MCPSnowflakeReader } from './index.js';
import { Logger } from './utils/logger.js';

// 시작 시간 기록
const startTime = new Date().toISOString();
Logger.info(`MCP Snowflake Reader CLI 시작 (${startTime})`);

(async () => {
  try {
    const program = new Command();

    program
      .name('mcp-snowflake-reader')
      .description('MCP Snowflake Reader 서버')
      .version('0.2.1')
      .requiredOption(
        '--connection <json>',
        'Snowflake 연결 정보 (JSON 형식)'
      );

    program.parse();

    const options = program.opts();
    let connectionConfig;

    try {
      connectionConfig = JSON.parse(options.connection);
      Logger.info('Snowflake 연결 설정 파싱 성공');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`연결 설정 파싱 오류: ${errorMessage}`);
      console.error('Error: 연결 설정이 올바른 JSON 형식이 아닙니다.');
      process.exit(1);
    }
    
    const server = new MCPSnowflakeReader(connectionConfig);
    
    try {
      await server.testConnection();
      Logger.info('Snowflake 연결 테스트 성공');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Snowflake 연결 테스트 실패: ${errorMessage}`);
      console.error('Error: Snowflake 연결에 실패했습니다.');
      process.exit(1);
    }
    
    await server.start();
    Logger.info('MCP 서버 시작됨');

    const shutdown = async (signal: string) => {
      try {
        Logger.info(`신호 수신: ${signal}, 서버 종료 중...`);
        await server.stop();
        Logger.info('서버가 정상적으로 종료되었습니다.');
        process.exit(0);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        Logger.error(`서버 종료 중 오류 발생: ${errorMessage}`);
        process.exit(1);
      }
    };

    // Windows와 Unix 시스템 모두에서 작동하는 신호 처리
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // Windows 전용 처리
    if (process.platform === 'win32') {
      const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.on('SIGINT', () => {
        process.emit('SIGINT' as any);
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error(`예기치 않은 오류: ${errorMessage}`);
    console.error(`오류가 발생했습니다: ${errorMessage}`);
    process.exit(1);
  }
})(); 