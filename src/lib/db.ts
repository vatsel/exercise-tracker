import "server-only";

// Talks to Neon over its HTTP SQL endpoint with plain fetch, so no Postgres driver is needed.

export type Query = { query: string; params: unknown[] };

type QueryResult<Row> = { rows: Row[] };

function connectionString(): string {
  const value = process.env.DB_CONN_STR;
  if (!value) {
    throw new Error("DB_CONN_STR is not set");
  }
  return value;
}

async function post<Body>(body: object): Promise<Body> {
  const connection = connectionString();
  const host = new URL(connection).hostname;
  const response = await fetch(`https://${host}/sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": connection,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Database error: ${payload.message}`);
  }
  return payload;
}

export async function sql<Row>(query: string, params: unknown[] = []): Promise<Row[]> {
  const result = await post<QueryResult<Row>>({ query, params });
  return result.rows;
}

// Runs every query in one transaction: either all of them apply or none do.
export async function transaction(queries: Query[]): Promise<void> {
  await post({ queries });
}
