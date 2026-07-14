import { IsIn } from 'class-validator';

export class DeviceStateUpdateDto {
  @IsIn(['on', 'off'], { message: 'status must be one of: on, off' })
  status!: 'on' | 'off';
}
