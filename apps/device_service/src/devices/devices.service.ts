import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DevicesRepository } from './devices.repository';
import { CommandAccepted, Device } from './device.entity';
import { DeviceCreateDto } from './dto/device-create.dto';
import { CommandRequestDto } from './dto/command-request.dto';

// Извлекает код ошибки PostgreSQL из отклонённого промиса без небезопасного каста.
function pgErrorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = err.code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

@Injectable()
export class DevicesService {
  constructor(private readonly repository: DevicesRepository) {}

  async create(dto: DeviceCreateDto): Promise<Device> {
    try {
      return await this.repository.create(dto);
    } catch (err) {
      if (pgErrorCode(err) === '23505') {
        throw new ConflictException(
          `device with serial_number '${dto.serial_number}' already exists`,
        );
      }
      throw err;
    }
  }

  async getById(id: number): Promise<Device> {
    const device = await this.repository.findById(id);
    if (!device) {
      throw new NotFoundException(`device ${id} not found`);
    }
    return device;
  }

  async updateState(id: number, status: 'on' | 'off'): Promise<Device> {
    const device = await this.repository.updateStatus(id, status);
    if (!device) {
      throw new NotFoundException(`device ${id} not found`);
    }
    return device;
  }

  async sendCommand(
    id: number,
    dto: CommandRequestDto,
  ): Promise<CommandAccepted> {
    const device = await this.repository.findById(id);
    if (!device) {
      throw new NotFoundException(`device ${id} not found`);
    }
    const commandId = randomUUID();
    await this.repository.insertCommand(
      commandId,
      id,
      dto.command,
      dto.params ?? null,
    );
    return { command_id: commandId, status: 'pending' };
  }
}
