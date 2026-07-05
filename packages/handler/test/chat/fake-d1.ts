interface ChatLogRow {
  id: number;
  created_at: string;
  ip: string;
  route: string;
  message: string;
  response: string;
  over_limit: number;
}

/**
 * Minimal in-memory stand-in for D1Database, covering only what chat_logs
 * queries in this package need (INSERT + COUNT(*) with ip/created_at/over_limit filters).
 */
export function createFakeD1(): D1Database {
  const rows: ChatLogRow[] = [];
  let nextId = 1;

  const fake = {
    prepare(query: string) {
      let boundArgs: unknown[] = [];
      const statement = {
        bind(...args: unknown[]) {
          boundArgs = args;
          return statement;
        },
        async run() {
          if (query.startsWith("INSERT INTO chat_logs")) {
            const [createdAt, ip, route, message, response, overLimit] = boundArgs as [
              string,
              string,
              string,
              string,
              string,
              number,
            ];
            rows.push({
              id: nextId++,
              created_at: createdAt,
              ip,
              route,
              message,
              response,
              over_limit: overLimit,
            });
            return { success: true } as unknown as D1Result;
          }
          throw new Error(`fake D1: unsupported run() query: ${query}`);
        },
        async first<T>() {
          if (query.startsWith("SELECT COUNT(*)")) {
            const [ip, sinceIso] = boundArgs as [string, string];
            const count = rows.filter(
              (row) => row.ip === ip && row.created_at >= sinceIso && row.over_limit === 0,
            ).length;
            return { count } as unknown as T;
          }
          throw new Error(`fake D1: unsupported first() query: ${query}`);
        },
      };
      return statement;
    },
  };

  return fake as unknown as D1Database;
}
