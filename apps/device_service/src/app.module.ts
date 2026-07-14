import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { DevicesModule } from './devices/devices.module';
import { HealthController } from './health.controller';

@Module({
  imports: [DbModule, DevicesModule],
  controllers: [HealthController],
})
export class AppModule {}
