import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { CreateEmailDto } from './dto/create-email.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { CreatePhoneDto } from './dto/create-phone.dto';
import { UpdatePhoneDto } from './dto/update-phone.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- People CRUD (FRD F11.1) ----

  async findAll() {
    return this.prisma.people.findMany({
      include: { peopleEmails: true, peoplePhones: true, peopleAddresses: true },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.people.findUnique({
      where: { id },
      include: { peopleEmails: true, peoplePhones: true, peopleAddresses: true },
    });
    if (!record) throw new NotFoundException('Person not found');
    return record;
  }

  async create(dto: CreatePersonDto) {
    // Unique username constraint (FRD F11.1)
    if (dto.username) {
      const existing = await this.prisma.people.findUnique({ where: { username: dto.username } });
      if (existing) throw new ConflictException('Username already in use');
    }
    // Validate department_id if provided (FRD F11.1)
    if (dto.department_id) {
      const dept = await this.prisma.departments.findUnique({ where: { id: dto.department_id } });
      if (!dept) throw new NotFoundException('Department not found');
    }
    return this.prisma.people.create({ data: dto });
  }

  async update(id: number, dto: UpdatePersonDto) {
    await this.findOne(id);
    if (dto.username) {
      const existing = await this.prisma.people.findFirst({
        where: { username: dto.username, NOT: { id } },
      });
      if (existing) throw new ConflictException('Username already in use');
    }
    if (dto.department_id) {
      const dept = await this.prisma.departments.findUnique({ where: { id: dto.department_id } });
      if (!dept) throw new NotFoundException('Department not found');
    }
    return this.prisma.people.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    // FK delete constraint: tickets (FRD F11.1)
    const ticketRef = await this.prisma.tickets.findFirst({
      where: {
        OR: [
          { enteredByPerson_id: id },
          { reportedByPerson_id: id },
          { assignedPerson_id: id },
        ],
      },
      select: { id: true },
    });
    if (ticketRef) {
      throw new ConflictException('Person cannot be deleted — referenced by tickets');
    }
    // FK delete constraint: clients
    const clientRef = await this.prisma.clients.findFirst({
      where: { contactPerson_id: id },
      select: { id: true },
    });
    if (clientRef) {
      throw new ConflictException('Person cannot be deleted — referenced by clients');
    }
    // FK delete constraint: bookmarks
    const bookmarkRef = await this.prisma.bookmarks.findFirst({
      where: { person_id: id },
      select: { id: true },
    });
    if (bookmarkRef) {
      throw new ConflictException('Person cannot be deleted — referenced by bookmarks');
    }
    return this.prisma.people.delete({ where: { id } });
  }

  // ---- Person Search (FRD F11.5) ----

  async search(q: string, role?: string | null, department_id?: number) {
    if (!q || q.length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters');
    }
    const where: Record<string, unknown> = {
      OR: [
        { firstname: { contains: q, mode: 'insensitive' } },
        { lastname: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
        {
          peopleEmails: {
            some: { email: { contains: q, mode: 'insensitive' } },
          },
        },
      ],
    };
    if (role !== undefined) where['role'] = role;
    if (department_id !== undefined) where['department_id'] = department_id;

    return this.prisma.people.findMany({
      where,
      select: {
        id: true, firstname: true, lastname: true,
        organization: true, username: true, role: true,
      },
      take: 50,
    });
  }

  // ---- Staff Users List (FRD F11.6) ----

  async findStaffUsers() {
    return this.prisma.people.findMany({
      where: { role: 'staff' },
      include: {
        peopleEmails: true,
        department: true,
      },
      orderBy: [{ lastname: 'asc' }, { firstname: 'asc' }],
    });
  }

  // ---- People Emails (FRD F11.2) ----

  async addEmail(personId: number, dto: CreateEmailDto) {
    await this.findOne(personId);
    // Duplicate email for same person → 409
    const existing = await this.prisma.peopleEmails.findFirst({
      where: { person_id: personId, email: dto.email },
    });
    if (existing) throw new ConflictException('Email address already exists for this person');
    return this.prisma.peopleEmails.create({
      data: {
        person_id: personId,
        email: dto.email,
        label: dto.label ?? 'Other',
        usedForNotifications: dto.usedForNotifications ?? false,
      },
    });
  }

  async updateEmail(personId: number, emailId: number, dto: UpdateEmailDto) {
    const record = await this.prisma.peopleEmails.findFirst({
      where: { id: emailId, person_id: personId },
    });
    if (!record) throw new NotFoundException('Email record not found');
    if (dto.email && dto.email !== record.email) {
      const existing = await this.prisma.peopleEmails.findFirst({
        where: { person_id: personId, email: dto.email, NOT: { id: emailId } },
      });
      if (existing) throw new ConflictException('Email address already exists for this person');
    }
    return this.prisma.peopleEmails.update({ where: { id: emailId }, data: dto });
  }

  async removeEmail(personId: number, emailId: number) {
    const record = await this.prisma.peopleEmails.findFirst({
      where: { id: emailId, person_id: personId },
    });
    if (!record) throw new NotFoundException('Email record not found');
    return this.prisma.peopleEmails.delete({ where: { id: emailId } });
  }

  // ---- People Phones (FRD F11.3) ----

  async addPhone(personId: number, dto: CreatePhoneDto) {
    await this.findOne(personId);
    return this.prisma.peoplePhones.create({
      data: {
        person_id: personId,
        number: dto.number ?? null,
        label: dto.label ?? 'Other',
      },
    });
  }

  async updatePhone(personId: number, phoneId: number, dto: UpdatePhoneDto) {
    const record = await this.prisma.peoplePhones.findFirst({
      where: { id: phoneId, person_id: personId },
    });
    if (!record) throw new NotFoundException('Phone record not found');
    return this.prisma.peoplePhones.update({ where: { id: phoneId }, data: dto });
  }

  async removePhone(personId: number, phoneId: number) {
    const record = await this.prisma.peoplePhones.findFirst({
      where: { id: phoneId, person_id: personId },
    });
    if (!record) throw new NotFoundException('Phone record not found');
    return this.prisma.peoplePhones.delete({ where: { id: phoneId } });
  }

  // ---- People Addresses (FRD F11.4) ----

  async addAddress(personId: number, dto: CreateAddressDto) {
    await this.findOne(personId);
    return this.prisma.peopleAddresses.create({
      data: {
        person_id: personId,
        address: dto.address,
        city: dto.city ?? null,
        state: dto.state ?? null,
        zip: dto.zip ?? null,
        label: dto.label ?? 'Home',
      },
    });
  }

  async updateAddress(personId: number, addrId: number, dto: UpdateAddressDto) {
    const record = await this.prisma.peopleAddresses.findFirst({
      where: { id: addrId, person_id: personId },
    });
    if (!record) throw new NotFoundException('Address record not found');
    return this.prisma.peopleAddresses.update({ where: { id: addrId }, data: dto });
  }

  async removeAddress(personId: number, addrId: number) {
    const record = await this.prisma.peopleAddresses.findFirst({
      where: { id: addrId, person_id: personId },
    });
    if (!record) throw new NotFoundException('Address record not found');
    return this.prisma.peopleAddresses.delete({ where: { id: addrId } });
  }
}
