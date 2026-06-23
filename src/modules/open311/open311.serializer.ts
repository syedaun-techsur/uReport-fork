import { Injectable } from '@nestjs/common';

// GeoReport v2 TypeScript interfaces from TechArch §4.2
export interface Open311ServiceDto {
  service_code: number;
  service_name: string;
  description: string;
  metadata: boolean;
  type: 'realtime';
  keywords: string;
  group: string;
}

export interface Open311ServiceAttributeDto {
  variable: boolean;
  code: string;
  datatype: 'string' | 'number' | 'datetime' | 'singlevaluelist' | 'multivaluelist';
  required: boolean;
  datatype_description: string;
  order: number;
  description: string;
  values?: Array<{ key: string; name: string }>;
}

export interface Open311ServiceDefinitionDto extends Open311ServiceDto {
  attributes: Open311ServiceAttributeDto[];
}

export interface Open311ServiceRequestDto {
  service_request_id: number;
  status: 'open' | 'closed';
  status_notes: string;
  service_name: string;
  service_code: number;
  description: string;
  agency_responsible: string;
  service_notice: string;
  requested_datetime: string;   // ISO 8601
  updated_datetime: string;     // ISO 8601
  expected_datetime: string | null; // ISO 8601 or null
  address: string;
  address_id: string;
  zipcode: string;
  lat: number | null;
  long: number | null;
  media_url: string | null;
}

export interface Open311SubmitResponseDto {
  service_request_id: number;
  token: string;
  service_notice: string;
  account_id: string;
}

export interface Open311TokenResponseDto {
  token: string;
  service_request_id: number;
}

@Injectable()
export class Open311Serializer {

  // ---- JSON serialization (default for /open311/v2/ routes) ----

  /** Serialize array of services to JSON string — GeoReport v2 services list */
  serializeServicesJson(services: Open311ServiceDto[]): string {
    return JSON.stringify(services);
  }

  /** Serialize single service definition to JSON string — wrapped in array per GeoReport v2 */
  serializeServiceDefinitionJson(def: Open311ServiceDefinitionDto): string {
    return JSON.stringify([def]);
  }

  /** Serialize requests to JSON string */
  serializeRequestsJson(requests: Open311ServiceRequestDto[]): string {
    return JSON.stringify(requests);
  }

  /** Serialize submit response to JSON string — array with one object */
  serializeSubmitResponseJson(resp: Open311SubmitResponseDto): string {
    return JSON.stringify([resp]);
  }

  /** Serialize token response to JSON string — array with one object */
  serializeTokenResponseJson(resp: Open311TokenResponseDto): string {
    return JSON.stringify([resp]);
  }

  // ---- XML serialization ----

  /** Build xml-safe CDATA string */
  private cdata(value: string | null | undefined): string {
    if (value === null || value === undefined) return '';
    // Escape CDATA end sequence
    return `<![CDATA[${String(value).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
  }

  /** Escape XML special chars for attribute values */
  private escapeXml(value: string | null | undefined): string {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Serialize services list to XML — <services><service>...</service></services> (FRD §F03.4) */
  serializeServicesXml(services: Open311ServiceDto[]): string {
    const serviceElements = services.map(s => this.serviceToXml(s)).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<services>\n${serviceElements}\n</services>`;
  }

  /** Serialize single service definition to XML — wrapped in <services> with <attributes> */
  serializeServiceDefinitionXml(def: Open311ServiceDefinitionDto): string {
    const attrs = def.attributes.map(a => this.attributeToXml(a)).join('\n');
    const serviceXml = this.serviceToXml(def) + `\n<attributes>\n${attrs}\n</attributes>`;
    return `<?xml version="1.0" encoding="UTF-8"?>\n<services>\n${serviceXml}\n</services>`;
  }

  private serviceToXml(s: Open311ServiceDto): string {
    return [
      '<service>',
      `  <service_code>${s.service_code}</service_code>`,
      `  <service_name>${this.cdata(s.service_name)}</service_name>`,
      `  <description>${this.cdata(s.description)}</description>`,
      `  <metadata>${s.metadata}</metadata>`,
      `  <type>${this.escapeXml(s.type)}</type>`,
      `  <keywords>${this.cdata(s.keywords)}</keywords>`,
      `  <group>${this.cdata(s.group)}</group>`,
      '</service>',
    ].join('\n');
  }

  private attributeToXml(a: Open311ServiceAttributeDto): string {
    const valuesXml = a.values
      ? a.values.map(v => `    <value><key>${this.escapeXml(v.key)}</key><name>${this.cdata(v.name)}</name></value>`).join('\n')
      : '';
    return [
      '<attribute>',
      `  <variable>${a.variable}</variable>`,
      `  <code>${this.escapeXml(a.code)}</code>`,
      `  <datatype>${this.escapeXml(a.datatype)}</datatype>`,
      `  <required>${a.required}</required>`,
      `  <datatype_description>${this.cdata(a.datatype_description)}</datatype_description>`,
      `  <order>${a.order}</order>`,
      `  <description>${this.cdata(a.description)}</description>`,
      valuesXml ? `  <values>\n${valuesXml}\n  </values>` : '',
      '</attribute>',
    ].filter(Boolean).join('\n');
  }

  /** Serialize requests to XML — <service_requests><request>...</request></service_requests> */
  serializeRequestsXml(requests: Open311ServiceRequestDto[]): string {
    const elements = requests.map(r => this.requestToXml(r)).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<service_requests>\n${elements}\n</service_requests>`;
  }

  private requestToXml(r: Open311ServiceRequestDto): string {
    return [
      '<request>',
      `  <service_request_id>${r.service_request_id}</service_request_id>`,
      `  <status>${this.escapeXml(r.status)}</status>`,
      `  <status_notes>${this.cdata(r.status_notes)}</status_notes>`,
      `  <service_name>${this.cdata(r.service_name)}</service_name>`,
      `  <service_code>${r.service_code}</service_code>`,
      `  <description>${this.cdata(r.description)}</description>`,
      `  <agency_responsible>${this.cdata(r.agency_responsible)}</agency_responsible>`,
      `  <service_notice>${this.cdata(r.service_notice)}</service_notice>`,
      `  <requested_datetime>${this.escapeXml(r.requested_datetime)}</requested_datetime>`,
      `  <updated_datetime>${this.escapeXml(r.updated_datetime)}</updated_datetime>`,
      `  <expected_datetime>${r.expected_datetime ? this.escapeXml(r.expected_datetime) : ''}</expected_datetime>`,
      `  <address>${this.cdata(r.address)}</address>`,
      `  <address_id>${this.escapeXml(r.address_id)}</address_id>`,
      `  <zipcode>${this.escapeXml(r.zipcode)}</zipcode>`,
      `  <lat>${r.lat !== null && r.lat !== undefined ? r.lat : ''}</lat>`,
      `  <long>${r.long !== null && r.long !== undefined ? r.long : ''}</long>`,
      `  <media_url>${r.media_url ? this.escapeXml(r.media_url) : ''}</media_url>`,
      '</request>',
    ].join('\n');
  }

  serializeSubmitResponseXml(resp: Open311SubmitResponseDto): string {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<service_requests>',
      '<request>',
      `  <service_request_id>${resp.service_request_id}</service_request_id>`,
      `  <token>${this.escapeXml(resp.token)}</token>`,
      `  <service_notice></service_notice>`,
      `  <account_id></account_id>`,
      '</request>',
      '</service_requests>',
    ].join('\n');
  }

  serializeTokenResponseXml(resp: Open311TokenResponseDto): string {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<tokens>',
      '<token>',
      `  <token>${this.escapeXml(resp.token)}</token>`,
      `  <service_request_id>${resp.service_request_id}</service_request_id>`,
      '</token>',
      '</tokens>',
    ].join('\n');
  }
}
