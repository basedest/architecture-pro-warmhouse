import { Inject, Injectable } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../db/db.provider';
import { Device } from './device.entity';
import { DeviceCreateDto } from './dto/device-create.dto';

interface DeviceRow {
  id: string;
  serial_number: string;
  type_id: string;
  house_id: string;
  name: string;
  status: string;
  firmware_version: string | null;
  last_seen_at: Date | null;
  created_at: Date;
}

function toDevice(row: DeviceRow): Device {
  return {
    id: Number(row.id),
    serial_number: row.serial_number,
    type_id: Number(row.type_id),
    house_id: Number(row.house_id),
    name: row.name,
    status: row.status,
    firmware_version: row.firmware_version,
    last_seen_at: row.last_seen_at ? row.last_seen_at.toISOString() : null,
    created_at: row.created_at.toISOString(),
  };
}

@Injectable()
export class DevicesRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(dto: DeviceCreateDto): Promise<Device> {
    const result: QueryResult<DeviceRow> = await this.pool.query(
      `INSERT INTO devices (serial_number, type_id, house_id, name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [dto.serial_number, dto.type_id, dto.house_id, dto.name],
    );
    return toDevice(result.rows[0]);
  }

  async findById(id: number): Promise<Device | null> {
    const result: QueryResult<DeviceRow> = await this.pool.query(
      `SELECT * FROM devices WHERE id = $1`,
      [id],
    );
    return result.rows.length ? toDevice(result.rows[0]) : null;
  }

  async updateStatus(id: number, status: string): Promise<Device | null> {
    const result: QueryResult<DeviceRow> = await this.pool.query(
      `UPDATE devices SET status = $2, last_seen_at = now() WHERE id = $1
       RETURNING *`,
      [id, status],
    );
    return result.rows.length ? toDevice(result.rows[0]) : null;
  }

  async insertCommand(
    commandId: string,
    deviceId: number,
    command: string,
    params: Record<string, unknown> | null,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO device_commands (command_id, device_id, command, params, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
      [commandId, deviceId, command, params ? JSON.stringify(params) : null],
    );
  }
}
