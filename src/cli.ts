#!/usr/bin/env node

import { Command } from 'commander';
import MCPSnowflakeReader, { SnowflakeConnectionConfig } from './index.js';

// CLI 프로그램 정의
const program = new Command();
program
  .name('mcp-snowflake-reader')
  .description('Snowflake 데이터베이스의 읽기 전용 MCP 서버')
  .version('0.2.1')
  .requiredOption('--connection <json>', 'JSON 문자열 형식의 Snowflake 연결 정보');

program.parse(process.argv);

const options = program.opts();

// 연결 정보 파싱
let connectionConfig: SnowflakeConnectionConfig;
try {
  connectionConfig = JSON.parse(options.connection);
} catch (error) {
  console.error('연결 정보가 올바른 JSON 형식이 아닙니다.');
  process.exit(1);
}

// MCP 서버 인스턴스 생성 및 시작
const server = new MCPSnowflakeReader(connectionConfig);

// 종료 시그널 처리
const handleShutdown = async () => {
  console.log('\n👋 MCP Snowflake Reader가 종료됩니다.');
  try {
    await server.stop();
    process.exit(0);
  } catch (error) {
    console.error('종료 중 오류 발생:', error);
    process.exit(1);
  }
};

// SIGINT(Ctrl+C) 및 SIGTERM 이벤트 처리
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

// 서버 시작 (top-level await 대신 즉시 실행 함수 사용)
(async () => {
  try {
    await server.start();
  } catch (error) {
    console.error('서버 시작 실패:', error);
    process.exit(1);
  }
})(); 