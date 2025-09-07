import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class SeatSelectionDto {
  @ApiProperty({
    description: 'Seat row ID',
    example: 'clp1234567890'
  })
  @IsString()
  @IsNotEmpty()
  seatRowId: string;

  @ApiProperty({
    description: 'Seat number in the row',
    example: 1
  })
  @IsInt()
  seatNumber: number;

  @ApiProperty({
    description: 'Seat row type (Ground or Balcony)',
    example: 'Ground',
    required: false
  })
  @IsString()
  @IsOptional()
  rowType?: string;

  @ApiProperty({
    description: 'First name of the person for this seat',
    example: 'Ahmed',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Last name of the person for this seat',
    example: 'Mohamed',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;
}
