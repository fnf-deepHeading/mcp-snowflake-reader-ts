/**
 * 단순 테스트 파일
 * 실제 프로젝트에서는 Jest 또는 Mocha와 같은 테스트 프레임워크를 사용하는 것이 좋습니다.
 */

import { validateTableName, validateSqlQuery } from './index.js';

// 테이블 이름 검증 테스트
console.log('=== 테이블 이름 검증 테스트 ===');
const validTableNames = ['customer', 'sales_2023', 'db.schema.table', 'TABLE_1'];
const invalidTableNames = ['drop table;', 'customer;', 'table-name', "table'name"];

console.log('유효한 테이블 이름:');
validTableNames.forEach(name => {
  const result = validateTableName(name);
  console.log(`  "${name}": ${result ? '통과 ✅' : '실패 ❌'}`);
});

console.log('\n유효하지 않은 테이블 이름:');
invalidTableNames.forEach(name => {
  const result = validateTableName(name);
  console.log(`  "${name}": ${!result ? '통과 ✅' : '실패 ❌'}`);
});

// SQL 쿼리 검증 테스트
console.log('\n=== SQL 쿼리 검증 테스트 ===');
const validQueries = [
  'SELECT * FROM customers',
  'SELECT id, name FROM users WHERE age > 18',
  'SELECT COUNT(*) FROM sales GROUP BY region'
];
const invalidQueries = [
  'DROP TABLE customers',
  'INSERT INTO users (name, age) VALUES ("John", 25)',
  'DELETE FROM orders WHERE status = "cancelled"'
];

console.log('유효한 쿼리:');
validQueries.forEach(query => {
  const result = validateSqlQuery(query);
  console.log(`  "${query}": ${result ? '통과 ✅' : '실패 ❌'}`);
});

console.log('\n유효하지 않은 쿼리:');
invalidQueries.forEach(query => {
  const result = validateSqlQuery(query);
  console.log(`  "${query}": ${!result ? '통과 ✅' : '실패 ❌'}`);
});

console.log('\n모든 테스트 완료!'); 