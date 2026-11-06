// CSV helpers for GTFS text files. Lines are only split on demand, so a 20 MB stop_times.txt can
// be filtered without materialising every row.
// ponytail: quoted fields spanning several lines are not supported; GTFS feeds do not use them.

/** Splits one CSV line, honouring double quotes ("a, b" stays one field; "" is an escaped quote). */
export function splitCsvLine(line: string): string[] {
  if (!line.includes('"')) return line.split(",");
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted && char === '"' && line[i + 1] === '"') {
      field += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      fields.push(field);
      field = "";
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}

export interface CsvTable {
  columns: string[];
  /** Data lines, unsplit (header excluded). */
  lines: string[];
  /** Index of a column; throws if the file does not have it. */
  column(name: string): number;
}

export function csvTable(text: string): CsvTable {
  const [header = "", ...lines] = text.replace(/^﻿/, "").split(/\r?\n/).filter((line) => line.length > 0);
  const columns = splitCsvLine(header);
  return {
    columns,
    lines,
    column(name) {
      const index = columns.indexOf(name);
      if (index < 0) throw new Error(`GTFS file has no "${name}" column`);
      return index;
    },
  };
}

/** Rows as objects keyed by column name: convenient for the small GTFS files. */
export function csvRecords(text: string): Record<string, string>[] {
  const { columns, lines } = csvTable(text);
  return lines.map((line) => {
    const fields = splitCsvLine(line);
    return Object.fromEntries(columns.map((column, i) => [column, fields[i] ?? ""]));
  });
}
