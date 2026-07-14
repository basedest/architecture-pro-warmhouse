import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { CommandAccepted, Device } from './device.entity';
import { DeviceCreateDto } from './dto/device-create.dto';
import { DeviceStateUpdateDto } from './dto/device-state-update.dto';
import { CommandRequestDto } from './dto/command-request.dto';

@Controller('devices')
export class DevicesController {
  constructor(private readonly service: DevicesService) {}

  @Post()
  create(@Body() dto: DeviceCreateDto): Promise<Device> {
    return this.service.create(dto);
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number): Promise<Device> {
    return this.service.getById(id);
  }

  @Patch(':id/state')
  updateState(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeviceStateUpdateDto,
  ): Promise<Device> {
    return this.service.updateState(id, dto.status);
  }

  @Post(':id/commands')
  @HttpCode(202)
  sendCommand(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CommandRequestDto,
  ): Promise<CommandAccepted> {
    return this.service.sendCommand(id, dto);
  }
}
