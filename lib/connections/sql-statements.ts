/**
 * Splits a SQL script into individual statements.
 *
 * Why this exists: Neon's HTTP driver sends one statement per request, so
 * handing it a whole schema file fails with "cannot insert multiple commands
 * into a prepared statement". The file still has to stay readable and
 * paste-able into a SQL editor, so it is split here rather than rewritten.
 *
 * It is a scanner, not a parser — it only needs to know where a `;` is *not* a
 * statement boundary:
 *
 *   - inside 'single quotes' (with '' escaping)
 *   - inside "quoted identifiers"
 *   - inside dollar-quoted blocks: $$ … $$ and $tag$ … $tag$, which is what
 *     `do $$ … $$` and `format($f$ … $f$)` in the schema use
 *   - inside -- line comments and block comments
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];

  let current = "";
  let index = 0;

  while (index < sql.length) {
    const char = sql[index];
    const rest = sql.slice(index);

    // -- line comment
    if (rest.startsWith("--")) {
      const newline = sql.indexOf("\n", index);
      const end = newline === -1 ? sql.length : newline;
      current += sql.slice(index, end);
      index = end;
      continue;
    }

    // block comment (Postgres allows nesting)
    if (rest.startsWith("/*")) {
      let depth = 1;
      let cursor = index + 2;
      while (cursor < sql.length && depth > 0) {
        if (sql.startsWith("/*", cursor)) {
          depth += 1;
          cursor += 2;
        } else if (sql.startsWith("*/", cursor)) {
          depth -= 1;
          cursor += 2;
        } else {
          cursor += 1;
        }
      }
      current += sql.slice(index, cursor);
      index = cursor;
      continue;
    }

    // dollar-quoted string: $$ … $$ or $tag$ … $tag$
    const dollar = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(rest);
    if (dollar) {
      const tag = dollar[0];
      const closing = sql.indexOf(tag, index + tag.length);
      const end = closing === -1 ? sql.length : closing + tag.length;
      current += sql.slice(index, end);
      index = end;
      continue;
    }

    // 'string literal' or "quoted identifier"
    if (char === "'" || char === '"') {
      let cursor = index + 1;
      while (cursor < sql.length) {
        if (sql[cursor] === char) {
          // A doubled quote is an escaped quote, not the end.
          if (sql[cursor + 1] === char) cursor += 2;
          else {
            cursor += 1;
            break;
          }
        } else {
          cursor += 1;
        }
      }
      current += sql.slice(index, cursor);
      index = cursor;
      continue;
    }

    if (char === ";") {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = "";
      index += 1;
      continue;
    }

    current += char;
    index += 1;
  }

  const trailing = current.trim();
  if (trailing) statements.push(trailing);

  // A chunk that is only comments is not a statement.
  return statements.filter((statement) =>
    statement
      .split("\n")
      .some((line) => line.trim() && !line.trim().startsWith("--")),
  );
}
