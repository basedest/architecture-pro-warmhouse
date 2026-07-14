import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class DeviceCreateDto {
  @IsString()
  @IsNotEmpty()
  serial_number!: string;

  @IsInt()
  type_id!: number;

  @IsInt()
  house_id!: number;

  @IsString()
  @IsNotEmpty()
  name!: string;
}
