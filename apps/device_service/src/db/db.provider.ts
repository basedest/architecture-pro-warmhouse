import { Provider, OnModuleInit, Logger } from '@nestjs/common';
import { Pool } from 'pg';

export const PG_POOL = 'PG_POOL';

const SCHEMA_DDL = `
  CREATE TABLE IF NOT EXISTS devices (
    id BIGSERIAL PRIMARY KEY,
    serial_number TEXT NOT NULL UNIQUE,
    type_id BIGINT NOT NULL,
    house_id BIGINT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'off',
    firmware_version TEXT NOT NULL DEFAULT '1.0.0',
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS device_commands (
    command_id UUID PRIMARY KEY,
    device_id BIGINT NOT NULL REFERENCES devices(id),
    command TEXT NOT NULL,
    params JSONB,
    status TEXT NOT NULL DEFAULT 'pending',
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

export const pgPoolProvider: Provider = {
  provide: PG_POOL,
  useFactory: (): Pool =>
    new Pool({ connectionString: process.env.DATABASE_URL }),
};

// Выполняет DDL при старте модуля (CREATE TABLE IF NOT EXISTS — идемпотентно).
export class SchemaInitializer implements OnModuleInit {
  private readonly logger = new Logger(SchemaInitializer.name);

  constructor(private readonly pool: Pool) {}

  async onModuleInit(): Promise<void> {
    await this.pool.query(SCHEMA_DDL);
    this.logger.log('Схема device_service инициализирована');
  }
}
