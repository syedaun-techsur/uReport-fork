import { Injectable } from '@nestjs/common';

@Injectable()
export class CsvSerializer {
  /** UTF-8 BOM prepended for Excel compatibility (FRD F03.5) */
  static readonly BOM = '\xEF\xBB\xBF';

  serialize(data: unknown, headers?: string[]): string {
    const rows = Array.isArray(data) ? data : [data];
    if (rows.length === 0) {
      return CsvSerializer.BOM;
    }

    // Derive column order from first row keys, or from explicit headers
    const firstRow = rows[0] as Record<string, unknown>;
    const cols: string[] = headers ?? Object.keys(firstRow);

    const headerRow = cols.map(h => this.quoteField(h)).join(',');
    const dataRows = rows.map(row => {
      const r = row as Record<string, unknown>;
      return cols.map(col => this.formatField(r[col])).join(',');
    });

    return CsvSerializer.BOM + [headerRow, ...dataRows].join('\r\n');
  }

  private formatField(value: unknown): string {
    if (value === null || value === undefined) return '""';
    if (value instanceof Date) return this.quoteField(value.toISOString());
    if (typeof value === 'boolean') return value ? '1' : '0';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') return this.quoteField(JSON.stringify(value));
    // String — double-quote, escape internal quotes, encode newlines
    return this.quoteField(String(value));
  }

  private quoteField(str: string): string {
    // Escape embedded double-quotes by doubling them; encode newlines as \n literal
    const escaped = str.replace(/"/g, '""').replace(/\r?\n/g, '\\n');
    return `"${escaped}"`;
  }
}
