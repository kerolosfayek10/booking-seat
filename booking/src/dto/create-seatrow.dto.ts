import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsInt, IsNotEmpty } from 'class-validator';

export class CreateSeatRowDto {
  @ApiProperty({
    description: 'Name of the seat row (e.g., A, B, C)',
    example: 'A'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Array of available seat numbers',
    example: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  })
  @IsArray()
  @IsInt({ each: true })
  seats: number[];
}
