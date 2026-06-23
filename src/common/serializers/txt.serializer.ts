import { Injectable } from '@nestjs/common';

@Injectable()
export class TxtSerializer {
  serialize(data: unknown): string {
    const rows = Array.isArray(data) ? data : [data];
    return rows.map(row => this.rowToLine(row as Record<string, unknown>)).join('\n');
  }

  private rowToLine(row: Record<string, unknown>): string {
    return Object.values(row)
      .map(v => this.fieldToString(v))
      .join('\t');
  }

  private fieldToString(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'boolean') return value ? '1' : '0';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}
