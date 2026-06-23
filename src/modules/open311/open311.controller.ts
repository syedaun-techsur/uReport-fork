import {
  Controller, Get, Post, Param, Body, Query, Req, Res,
  ParseIntPipe, HttpCode,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Open311Service } from './open311.service';
import { Open311Serializer } from './open311.serializer';
import { PostRequestDto } from './dto/post-request.dto';
import { GetRequestsDto } from './dto/get-requests.dto';

/** Extract negotiated format from request — default is 'json' for /open311/v2/ routes (FRD §F03.1) */
function getFormat(req: Request): 'json' | 'xml' {
  const fmt = (req as any).negotiatedFormat as string | undefined;
  if (fmt === 'xml') return 'xml';
  return 'json';
}

/** Get the caller's role from req.user (set by AuthMiddleware) */
function getRole(req: Request): string | null {
  return (req as any).user?.role ?? null;
}

@Controller('open311/v2')
export class Open311Controller {
  constructor(
    private readonly open311Service: Open311Service,
    private readonly open311Serializer: Open311Serializer,
  ) {}

  // ---- F00.1: GET /open311/v2/services[.json|.xml] ----

  @Get('services')
  async getServices(@Req() req: Request, @Res() res: Response): Promise<void> {
    const role = getRole(req);
    const services = await this.open311Service.getServices(role);

    if (getFormat(req) === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
      res.send(this.open311Serializer.serializeServicesXml(services));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.send(this.open311Serializer.serializeServicesJson(services));
    }
  }

  // ---- F00.2: GET /open311/v2/services/:id[.json|.xml] ----

  @Get('services/:id')
  async getService(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const role = getRole(req);
    const def = await this.open311Service.getService(id, role);

    if (getFormat(req) === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
      res.send(this.open311Serializer.serializeServiceDefinitionXml(def));
    } else {
      res.setHeader('Content-Type', 'application/json');
      // ServiceDefinition wrapped in array per GeoReport v2 spec
      res.send(this.open311Serializer.serializeServiceDefinitionJson(def));
    }
  }

  // ---- F00.3: POST /open311/v2/requests[.json|.xml] ----

  @Post('requests')
  @HttpCode(201)
  async postRequest(
    @Body() body: Record<string, any>,
    @Query() query: Record<string, any>,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // api_key: query param takes precedence over body param (FRD §F00.3)
    const api_key = (query.api_key ?? body.api_key ?? '') as string;

    // Extract PostRequestDto fields from body + query
    const dto: PostRequestDto = {
      api_key,
      service_code: parseInt(String(body.service_code ?? query.service_code), 10),
      lat: body.lat !== undefined ? parseFloat(String(body.lat)) : undefined,
      long: body.long !== undefined ? parseFloat(String(body.long)) : undefined,
      address_string: body.address_string ?? query.address_string,
      address_id: body.address_id ? parseInt(String(body.address_id), 10) : undefined,
      description: body.description,
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      phone: body.phone,
      device_id: body.device_id,
      media_url: body.media_url,
      jurisdiction_id: query.jurisdiction_id,
    };

    // Extract attribute[{code}] params from body (FRD §F00.3)
    const rawAttributes: Record<string, string> = {};
    for (const key of Object.keys(body)) {
      const match = key.match(/^attribute\[(.+)\]$/);
      if (match) rawAttributes[match[1]] = body[key] as string;
    }

    const result = await this.open311Service.postRequest(dto, rawAttributes);

    if (getFormat(req) === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
      res.status(201).send(this.open311Serializer.serializeSubmitResponseXml(result[0]));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.status(201).send(JSON.stringify(result));
    }
  }

  // ---- F00.4: GET /open311/v2/requests[.json|.xml] ----

  @Get('requests')
  async getRequests(
    @Query() query: GetRequestsDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const role = getRole(req);
    const requests = await this.open311Service.getRequests(query, role);

    if (getFormat(req) === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
      res.send(this.open311Serializer.serializeRequestsXml(requests));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.send(this.open311Serializer.serializeRequestsJson(requests));
    }
  }

  // ---- F00.5: GET /open311/v2/requests/:id[.json|.xml] ----

  @Get('requests/:id')
  async getRequest(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const role = getRole(req);
    const result = await this.open311Service.getRequest(id, role);  // returns array of 1

    if (getFormat(req) === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
      res.send(this.open311Serializer.serializeRequestsXml(result));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.send(this.open311Serializer.serializeRequestsJson(result));
    }
  }

  // ---- F00.6: GET /open311/v2/tokens/:token[.json|.xml] ----

  @Get('tokens/:token')
  async getToken(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.open311Service.getToken(token);  // returns array of 1

    if (getFormat(req) === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
      res.send(this.open311Serializer.serializeTokenResponseXml(result[0]));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(result));
    }
  }
}
