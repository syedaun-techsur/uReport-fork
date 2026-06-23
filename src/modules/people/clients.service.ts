import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.clients.findMany({
      include: { contactPerson: true },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.clients.findUnique({
      where: { id },
      include: { contactPerson: true },
    });
    if (!record) throw new NotFoundException('Client not found');
    return record;
  }

  /**
   * FRD F11.7 + F00.3: api_key lookup for Open311 POST /requests.
   * Only active clients can authenticate — inactive clients are "revoked".
   * Returns null (not 403) so the calling service can issue the correct error.
   */
  async findByApiKey(apiKey: string) {
    return this.prisma.clients.findFirst({
      where: { api_key: apiKey, active: true },
    });
  }

  async create(dto: CreateClientDto) {
    // api_key uniqueness (FRD F11.7)
    const existingKey = await this.prisma.clients.findUnique({ where: { api_key: dto.api_key } });
    if (existingKey) throw new ConflictException('API key already in use');

    // contactPerson must exist (FRD F11.7)
    const person = await this.prisma.people.findUnique({ where: { id: dto.contactPerson_id } });
    if (!person) throw new NotFoundException('Contact person not found');

    return this.prisma.clients.create({
      data: {
        name: dto.name,
        url: dto.url ?? null,
        api_key: dto.api_key,
        contactPerson_id: dto.contactPerson_id,
        contactMethod_id: dto.contactMethod_id ?? null,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: number, dto: UpdateClientDto) {
    await this.findOne(id);
    // api_key uniqueness on update
    if (dto.api_key) {
      const existing = await this.prisma.clients.findFirst({
        where: { api_key: dto.api_key, NOT: { id } },
      });
      if (existing) throw new ConflictException('API key already in use');
    }
    // contactPerson validation on update
    if (dto.contactPerson_id !== undefined) {
      const person = await this.prisma.people.findUnique({ where: { id: dto.contactPerson_id } });
      if (!person) throw new NotFoundException('Contact person not found');
    }
    return this.prisma.clients.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    // FK delete constraint: tickets.client_id (FRD F11.7)
    const ticketRef = await this.prisma.tickets.findFirst({
      where: { client_id: id },
      select: { id: true },
    });
    if (ticketRef) {
      throw new ConflictException(
        'Client cannot be deleted — referenced by tickets. Set active = false to revoke access.',
      );
    }
    return this.prisma.clients.delete({ where: { id } });
  }
}
