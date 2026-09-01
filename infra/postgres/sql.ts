/**
 * Minimal driver-neutral SQL boundary. A production composition root injects
 * a PostgreSQL client; this package deliberately does not create connections
 * or read credentials.
 */
export type SqlRow = Readonly<Record<string, unknown>>;

export type SqlResult<Row extends SqlRow = SqlRow> = Readonly<{
  rows: ReadonlyArray<Row>;
  rowCount: number;
}>;

export interface SqlClient {
  query<Row extends SqlRow = SqlRow>(text: string, values: ReadonlyArray<unknown>): Promise<SqlResult<Row>>;
}

export type SqlTransactionClient = SqlClient;

export interface SqlDatabase extends SqlClient {
  transaction<T>(work: (client: SqlTransactionClient) => Promise<T>): Promise<T>;
}

export function one<Row extends SqlRow>(result: { rows: ReadonlyArray<Row> }) {
  return result.rows[0] ?? null;
}

export function requireOne<Row extends SqlRow>(result: SqlResult<Row>, code: string): Row {
  const row = one(result);
  if (!row) throw new Error(code);
  return row;
}
