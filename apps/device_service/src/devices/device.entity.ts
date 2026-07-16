// Форма ответа согласно OpenAPI-схеме Device.
export interface Device {
  id: number;
  serial_number: string;
  type_id: number;
  house_id: number;
  name: string;
  status: string;
  firmware_version: string | null;
  last_seen_at: string | null;
  created_at: string;
}

export interface CommandAccepted {
  command_id: string;
  status: 'pending';
}
