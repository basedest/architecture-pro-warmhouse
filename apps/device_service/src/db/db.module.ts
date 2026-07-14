import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL, pgPoolProvider, SchemaInitializer } from './db.provider';

@Global()
@Module({
  providers: [
    pgPoolProvider,
    {
      provide: SchemaInitializer,
      useFactory: (pool: Pool): SchemaInitializer =>
        new SchemaInitializer(pool),
      inject: [PG_POOL],
    },
  ],
  exports: [PG_POOL],
})
export class DbModule {}
