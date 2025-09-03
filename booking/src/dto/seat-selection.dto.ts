import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsNotEmpty } from 'class-validator';

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
}
