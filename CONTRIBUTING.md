# Contributing to Destiny 2 MCP Server

Thank you for your interest in contributing! This document provides guidelines and information about contributing to this project.

## Development Setup

### Prerequisites

- Node.js 18.x or later
- npm 8.x or later
- A Bungie API key (get one at https://www.bungie.net/en/Application)

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/destiny2-mcp-server.git
   cd destiny2-mcp-server
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

5. Add your Bungie API key to `.env`

6. Run the development server:
   ```bash
   npm run dev
   ```

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with watch mode |
| `npm run dev:once` | Run once without watch |
| `npm run build` | Build for production |
| `npm run test` | Run unit tests (no API key needed) |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:coverage` | Run unit tests with coverage |
| `npm run test:integration` | Run integration tests (requires .env with API key) |
| `npm run test:all` | Run all tests (unit + integration) |
| `npm run lint` | Check for lint errors |
| `npm run lint:fix` | Fix lint errors automatically |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting |
| `npm run typecheck` | Run TypeScript type checking |

## Code Style

This project uses:
- **TypeScript** for type safety
- **ESLint** for linting
- **Prettier** for formatting

### Before Committing

1. Run type checking: `npm run typecheck`
2. Run linting: `npm run lint`
3. Run tests: `npm run test`
4. Format your code: `npm run format`

If you have Husky installed, pre-commit hooks will run automatically.

## Project Structure

```
src/
├── api/                  # Bungie API client
│   ├── bungie-client.ts  # API client with retry logic
│   └── index.ts          # Exports
├── data/                 # Static data files
│   ├── day-one-triumphs.ts
│   └── watermark-seasons.json
├── services/             # Business logic
│   ├── logger.ts         # Logging utility
│   ├── manifest-cache.ts # Item manifest caching
│   └── index.ts          # Exports
├── tools/                # MCP tool implementations
│   ├── destiny-tools.ts  # All Destiny 2 tools
│   └── index.ts          # Exports
├── types/                # TypeScript types
│   └── index.ts          # All type definitions
├── config.ts             # Configuration management
└── index.ts              # Entry point
tests/
├── setup.ts              # Test setup and helpers
├── config.test.ts        # Config unit tests
├── bungie-client.test.ts # API client unit tests
└── integration/          # Integration tests (require real API key)
    ├── api.integration.test.ts
    └── cache.integration.test.ts
docs/
└── DOCKER.md             # Docker deployment guide
```

## Pull Request Process

1. Create a feature branch from `master`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Write or update tests as needed

4. Ensure all checks pass:
   ```bash
   npm run typecheck
   npm run lint
   npm run test
   ```

5. Commit with a clear message:
   ```bash
   git commit -m "feat: add support for vendor inventory checking"
   ```

6. Push and create a Pull Request

### Commit Message Format

We follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: add Xûr inventory checking tool
fix: handle rate limiting correctly
docs: update README with Docker instructions
```

## Adding New Tools

1. Add the tool implementation in `src/tools/destiny-tools.ts`
2. Use the `server.tool()` method to register it
3. Include proper Zod schemas for input validation
4. Add JSDoc documentation
5. Write tests for the new tool

Example:
```typescript
server.tool(
  'tool_name',
  'Description of what the tool does',
  {
    param: z.string().describe('Parameter description'),
  },
  async ({ param }) => {
    // Implementation
    return {
      content: [{
        type: 'text',
        text: 'Result',
      }],
    };
  }
);
```

## Testing

### Unit Tests

Unit tests use mocked API responses and don't require a real API key:

```bash
npm run test           # Run once
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage report
```

### Integration Tests

Integration tests make real API calls and require a `.env` file with a valid `BUNGIE_API_KEY`:

```bash
npm run test:integration        # Run integration tests
npm run test:integration:watch  # Watch mode
npm run test:all                # Run all tests (unit + integration)
```

### Writing Tests

- Write unit tests for new functionality
- Use the mock setup in `tests/setup.ts`
- Mock Bungie API responses for consistent unit tests
- Add integration tests for critical API interactions
- Run `npm run test:coverage` to check coverage

## Security

- Never commit API keys or secrets
- Sanitize error messages to prevent key leakage
- Report security issues privately (see SECURITY.md)

## Questions?

Open an issue for questions or discussions about contributions.

Thank you for contributing! 🚀
