# MCP Snowflake Reader

[English](#english) | [한국어](#korean)

## English

A read-only MCP server for Snowflake databases. This server provides secure, read-only access to Snowflake databases through the MCP protocol.

### Features

- **Read-only Access**: Secure read-only access to Snowflake databases

### Installation

```bash
npm install -g mcp-snowflake-reader
```

### Usage

```bash
mcp-snowflake-reader --connection '{"account":"your-account","username":"your-user","password":"your-password","warehouse":"your-warehouse","database":"your-database","schema":"your-schema","role":"your-role"}'
```

### MCP Client Configuration

Add the following configuration to your MCP client settings file (Cursor AI or Claude):

```json
{
  "mcpServers": {
    "mcp-snowflake-reader": {
      "command": "mcp-snowflake-reader",
      "args": [
        "--connection",
        "{\"account\":\"your-account\",\"username\":\"your-user\",\"password\":\"your-password\",\"warehouse\":\"your-warehouse\",\"database\":\"your-database\",\"schema\":\"your-schema\",\"role\":\"your-role\"}"
      ]
    }
  }
}
```

### Limitations

- Only read-only operations are allowed
- Table names can only contain alphanumeric characters, underscores, and dots
- The following SQL keywords are prohibited:
  - INSERT
  - UPDATE
  - DELETE
  - DROP
  - TRUNCATE
  - ALTER
  - CREATE
  - GRANT
  - REVOKE
  - COMMIT
  - ROLLBACK

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Korean

Snowflake 데이터베이스의 테이블을 읽어오는 MCP(Microservice Control Protocol) 서버입니다.

### 주요 기능

- **읽기 전용 접근**: Snowflake 데이터베이스에 대한 안전한 읽기 전용 접근

### 설치

```bash
npm install -g mcp-snowflake-reader
```

### 사용 방법

```bash
mcp-snowflake-reader --connection '{"account":"your-account","username":"your-user","password":"your-password","warehouse":"your-warehouse","database":"your-database","schema":"your-schema","role":"your-role"}'
```

### MCP 클라이언트 설정

Cursor AI나 Claude와 같은 MCP 클라이언트의 설정 파일에 다음 설정을 추가하세요:

```json
{
  "mcpServers": {
    "mcp-snowflake-reader": {
      "command": "mcp-snowflake-reader",
      "args": [
        "--connection",
        "{\"account\":\"your-account\",\"username\":\"your-user\",\"password\":\"your-password\",\"warehouse\":\"your-warehouse\",\"database\":\"your-database\",\"schema\":\"your-schema\",\"role\":\"your-role\"}"
      ]
    }
  }
}
```

### 제한사항

- 읽기 전용 작업만 허용됩니다
- 테이블 이름은 영숫자, 언더스코어, 점만 허용됩니다
- 다음 SQL 키워드는 금지됩니다:
  - INSERT
  - UPDATE
  - DELETE
  - DROP
  - TRUNCATE
  - ALTER
  - CREATE
  - GRANT
  - REVOKE
  - COMMIT
  - ROLLBACK

### 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요. 