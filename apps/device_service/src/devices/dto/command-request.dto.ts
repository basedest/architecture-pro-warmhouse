import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CommandRequestDto {
  @IsString()
  @IsNotEmpty()
  command!: string;

  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;
}
