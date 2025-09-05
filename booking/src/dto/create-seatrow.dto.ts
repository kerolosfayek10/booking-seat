import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsInt, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum SeatRowType {
  Ground = 'Ground',
  Balcony = 'Balcony'
}

export class CreateSeatRowDto {
  @ApiProperty({
    description: 'Name of the seat row (e.g., A, B, C)',
    example: 'A'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Type of seat row',
    enum: SeatRowType,
    example: SeatRowType.Ground
  })
  @IsEnum(SeatRowType)
  @IsOptional()
  type?: SeatRowType;

  @ApiProperty({
    description: 'Array of available seat numbers',
    example: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  })
  @IsArray()
  @IsInt({ each: true })
  seats: number[];
}
