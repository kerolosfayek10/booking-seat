import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateSeatRowDto, SeatRowType } from '../dto/create-seatrow.dto';

@Injectable()
export class SeatRowService {
  constructor(private prisma: PrismaService) {}

  async createSeatRow(createSeatRowDto: CreateSeatRowDto) {
    const { name, seats, type } = createSeatRowDto;

    // Check if seat row with this name already exists
    const existingSeatRow = await this.prisma.seatRow.findFirst({
      where: { name }
    });

    if (existingSeatRow) {
      throw new BadRequestException(`Seat row with name '${name}' already exists`);
    }

    return await this.prisma.seatRow.create({
      data: {
        name,
        seats
      }
    });
  }

  async getAllSeatRows(type?: SeatRowType, includeHidden?: boolean) {
    const whereClause: any = {};
    
    if (type) {
      whereClause.type = type;
    }
    
    // For frontend, only show visible rows. For admin, show all.
    if (!includeHidden) {
      whereClause.visible = true;
    }
    
    return await this.prisma.seatRow.findMany({
      where: whereClause,
      orderBy: {
        name: 'asc'
      }
    });
  }

  async getSeatRowById(id: string) {
    const seatRow = await this.prisma.seatRow.findUnique({
      where: { id }
    });

    if (!seatRow) {
      throw new BadRequestException('Seat row not found');
    }

    return seatRow;
  }

  async getAvailableSeats(id: string) {
    const seatRow = await this.prisma.seatRow.findUnique({
      where: { id },
      include: {
        seatBookings: {
          include: {
            booking: true
          }
        }
      }
    });

    if (!seatRow) {
      throw new BadRequestException('Seat row not found');
    }

    // Get booked seat numbers
    const bookedSeats = seatRow.seatBookings
      .filter(booking => booking.booking.isPaid)
      .map(booking => booking.seatNumber);

    // Return available seats (seats that are not booked)
    const availableSeats = seatRow.seats.filter(seat => !bookedSeats.includes(seat));

    return {
      id: seatRow.id,
      name: seatRow.name,
      totalSeats: seatRow.seats,
      availableSeats,
      bookedSeats,
      createdAt: seatRow.createdAt
    };
  }

  async removeSeatFromRow(seatRowId: string, seatNumber: number) {
    const seatRow = await this.getSeatRowById(seatRowId);
    
    if (!seatRow.seats.includes(seatNumber)) {
      throw new BadRequestException(`Seat ${seatNumber} does not exist in row ${seatRow.name}`);
    }

    const updatedSeats = seatRow.seats.filter(seat => seat !== seatNumber);

    return await this.prisma.seatRow.update({
      where: { id: seatRowId },
      data: {
        seats: updatedSeats
      }
    });
  }

  async addSeatToRow(seatRowId: string, seatNumber: number) {
    try {
      // Get the seat row to check if it exists
      const seatRow = await this.getSeatRowById(seatRowId);
      
      // Check if the seat number already exists in the row
      if (seatRow.seats.includes(seatNumber)) {
        throw new BadRequestException(`Seat ${seatNumber} already exists in row ${seatRow.name}`);
      }

      // Add the new seat number to the array and sort it
      const updatedSeats = [...seatRow.seats, seatNumber].sort((a, b) => a - b);

      // Update the seat row with the new seat
      const updatedSeatRow = await this.prisma.seatRow.update({
        where: { id: seatRowId },
        data: {
          seats: updatedSeats
        }
      });

      return {
        success: true,
        message: `Seat ${seatNumber} added successfully to row ${seatRow.name}`,
        data: {
          id: updatedSeatRow.id,
          name: updatedSeatRow.name,
          seats: updatedSeatRow.seats,
          totalSeats: updatedSeatRow.seats.length,
          addedSeat: seatNumber
        }
      };

    } catch (error) {
      console.error('Add seat failed:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to add seat to row');
    }
  }
}
