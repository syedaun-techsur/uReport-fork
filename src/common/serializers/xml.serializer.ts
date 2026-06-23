import { Injectable } from '@nestjs/common';

// Fields that must be wrapped in CDATA (from FRD F03.4 + legacy PHP behavior)
const CDATA_FIELDS = new Set(['description', 'notes', 'template', 'full_message', 'short_message']);

@Injectable()
export class XmlSerializer {
  serialize(data: unknown, rootElement = 'response'): string {
    const body = this.valueToXml(data, rootElement);
    return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
  }

  private valueToXml(value: unknown, tag: string): string {
    if (value === null || value === undefined) {
      return `<${tag}/>`;
    }
    if (Array.isArray(value)) {
      // Array items use the singular form of the tag (strip trailing 's' for simple plurals)
      // For Open311 envelopes the caller passes the correct wrapper; items use 'item' by default.
      const items = value.map(item => this.valueToXml(item, this.singularize(tag))).join('');
      return `<${tag}>${items}</${tag}>`;
    }
    if (value instanceof Date) {
      return `<${tag}>${value.toISOString()}</${tag}>`;
    }
    if (typeof value === 'object') {
      const children = Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => this.valueToXml(v, k))
        .join('');
      return `<${tag}>${children}</${tag}>`;
    }
    if (typeof value === 'boolean') {
      return `<${tag}>${value ? 'true' : 'false'}</${tag}>`;
    }
    // String — check CDATA
    const strVal = String(value);
    if (CDATA_FIELDS.has(tag.toLowerCase())) {
      return `<${tag}><![CDATA[${strVal}]]></${tag}>`;
    }
    return `<${tag}>${this.escapeXml(strVal)}</${tag}>`;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private singularize(tag: string): string {
    // Simple singularization for common plural wrappers used in Open311/legacy output
    if (tag === 'services') return 'service';
    if (tag === 'service_requests') return 'request';
    if (tag === 'tickets') return 'ticket';
    if (tag === 'results') return 'result';
    if (tag === 'items') return 'item';
    if (tag.endsWith('s')) return tag.slice(0, -1);
    return tag;
  }
}
