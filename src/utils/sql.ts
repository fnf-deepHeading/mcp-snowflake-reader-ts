// SQL 쿼리가 읽기 전용인지 검증하는 함수
export function validateSqlQuery(sql: string): boolean {
  if (!sql || typeof sql !== 'string') {
    return false;
  }
  
  // 금지된 SQL 키워드 목록
  const forbiddenKeywords = [
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER',
    'CREATE', 'GRANT', 'REVOKE', 'COMMIT', 'ROLLBACK'
  ];
  
  // 대소문자 구분 없이 검사하기 위해 대문자로 변환
  const sqlUpper = sql.toUpperCase();
  
  // 키워드가 단어 경계에서 시작하는지 확인 (SQL 인젝션 방지)
  return !forbiddenKeywords.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(sqlUpper);
  });
}

// 테이블 이름이 유효한지 검증하는 함수
export function isValidTableName(tableName: string): boolean {
  if (!tableName || typeof tableName !== 'string') {
    return false;
  }
  
  // 테이블 이름은 영숫자, 언더스코어, 점만 포함해야 함
  const validNameRegex = /^[a-zA-Z0-9_.]+$/;
  if (!validNameRegex.test(tableName)) {
    return false;
  }
  
  // 금지된 키워드
  const forbiddenKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER'];
  const tableNameUpper = tableName.toUpperCase();
  
  // 키워드가 테이블 이름에 포함되어 있는지 확인
  return !forbiddenKeywords.some(keyword => tableNameUpper.includes(keyword));
} 