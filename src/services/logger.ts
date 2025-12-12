export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return levelOrder[level] >= levelOrder[currentLevel];
}

function sanitize(msg: unknown): string {
  const text = typeof msg === 'string' ? msg : JSON.stringify(msg);
  const apiKey = process.env.BUNGIE_API_KEY;

  let sanitized = text;

  // Replace actual API key value if present and long enough to be safe
  if (apiKey && apiKey.length > 8) {
    const keyRegex = new RegExp(apiKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    sanitized = sanitized.replace(keyRegex, '***REDACTED***');
  }

  // Sanitize common patterns
  sanitized = sanitized
    .replace(/(BUNGIE_API_KEY=)[^\s&]+/g, '$1***') // env var
    .replace(/(["']apiKey["']\s*:\s*["'])[^"']+(["'])/g, '$1***$2') // JSON key
    .replace(/(X-API-Key:\s*)[^\s,}]+/g, '$1***') // HTTP header
    .replace(/([?&]api[_-]?key=)[^&\s]+/g, '$1***'); // URL param

  return sanitized;
}

function log(level: LogLevel, msg: unknown, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const time = new Date().toISOString();
  const base = `[${time}] [${level.toUpperCase()}] ${sanitize(msg)}`;
  if (meta) {
    // Avoid large bodies
    const trimmed: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(meta)) {
      if (typeof v === 'string' && v.length > 500) trimmed[k] = v.slice(0, 500) + '…';
      else trimmed[k] = v;
    }
    process.stderr.write(base + ' ' + JSON.stringify(trimmed) + '\n');
  } else {
    process.stderr.write(base + '\n');
  }
}

export const logger = {
  debug: (m: unknown, meta?: Record<string, unknown>) => log('debug', m, meta),
  info: (m: unknown, meta?: Record<string, unknown>) => log('info', m, meta),
  warn: (m: unknown, meta?: Record<string, unknown>) => log('warn', m, meta),
  error: (m: unknown, meta?: Record<string, unknown>) => log('error', m, meta),
};

export default logger;
