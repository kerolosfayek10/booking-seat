import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsArray, ValidateNested, ArrayMinSize, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { SeatSelectionDto } from './seat-selection.dto';

export class CreateBookingDto {
  @ApiProperty({
    description: 'User full name',
    example: 'Ahmed Mohamed'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'ahmed@example.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+201234567890',
    required: false
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'Array of seats to reserve',
    type: [SeatSelectionDto],
    example: [
      { seatRowId: 'clp1234567890', seatNumber: 1 },
      { seatRowId: 'clp1234567890', seatNumber: 2 }
    ]
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one seat must be selected' })
  @ValidateNested({ each: true })
  @Type(() => SeatSelectionDto)
  seats: SeatSelectionDto[];

  @ApiProperty({
    description: 'Receipt image file',
    type: 'string',
    format: 'binary',
    required: false
  })
  @IsOptional()
  receipt?: any;
}
