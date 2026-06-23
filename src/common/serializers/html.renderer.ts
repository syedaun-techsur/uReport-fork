import { Injectable } from '@nestjs/common';
import * as nunjucks from 'nunjucks';
import * as path from 'path';

@Injectable()
export class HtmlRenderer {
  private readonly env: nunjucks.Environment;

  constructor() {
    // Templates live in src/views/ (created per feature module in later waves)
    const viewsDir = path.join(process.cwd(), 'src', 'views');
    this.env = new nunjucks.Environment(
      new nunjucks.FileSystemLoader(viewsDir, { noCache: process.env['NODE_ENV'] !== 'production' }),
      { autoescape: true },
    );
  }

  async render(template: string, data: unknown): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.env.render(template, { data } as Record<string, unknown>, (err, result) => {
        if (err || result === null) {
          // Fallback: JSON dump in pre — used during development before full templates exist
          resolve(`<html><body><pre>${JSON.stringify(data, null, 2)}</pre></body></html>`);
          return;
        }
        resolve(result);
      });
    });
  }
}
