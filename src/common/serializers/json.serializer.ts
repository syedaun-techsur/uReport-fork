import { Injectable } from '@nestjs/common';

@Injectable()
export class JsonSerializer {
  serialize(data: unknown): string {
    return JSON.stringify(data, (_key, value: unknown) => {
      // Dates → ISO 8601 UTC string
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
  }
}
