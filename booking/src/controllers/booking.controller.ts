import { 
  Controller, 
  Post, 
  Get, 
  Patch,
  Delete,
  Body, 
  Param, 
  UseInterceptors, 
  UploadedFile,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiConsumes, 
  ApiBody,
  ApiParam
} from '@nestjs/swagger';
import { BookingService } from '../services/booking.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { PrismaService } from '../services/prisma.service';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly prisma: PrismaService
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('receipt'))
  @ApiOperation({ 
    summary: 'Create a new booking',
    description: 'Create a booking with user details, seat selection, and optional receipt upload'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Booking form data with receipt file upload',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          example: 'Ahmed Mohamed'
        },
        email: {
          type: 'string',
          example: 'ahmed@example.com'
        },
        phone: {
          type: 'string',
          example: '+201234567890'
        },
        seats: {
          type: 'string',
          description: 'JSON string of seat array',
          example: '[{"seatRowId":"clp1234567890","seatNumber":1},{"seatRowId":"clp1234567890","seatNumber":2}]'
        },
        receipt: {
          type: 'string',
          format: 'binary',
          description: 'Receipt image file'
        }
      },
      required: ['name', 'email', 'seats']
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Booking created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            bookingId: { type: 'string' },
            user: { type: 'object' },
            seats: { type: 'array' },
            totalPrice: { type: 'number' },
            isPaid: { type: 'boolean' },
            receiptUrl: { type: 'string' },
            createdAt: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - validation error or seats already reserved' 
  })
  async createBooking(
    @Body() body: any,
    @UploadedFile() receipt?: Express.Multer.File
  ) {
    try {
      // Parse seats from JSON string (needed for multipart/form-data)
      const seats = typeof body.seats === 'string' 
        ? JSON.parse(body.seats) 
        : body.seats;

      // Quick validation: check if seats are already booked
      await this.checkSeatsAvailability(seats);

      const createBookingDto: CreateBookingDto = {
        name: body.name,
        email: body.email,
        phone: body.phone,
        seats: seats
      };

      return await this.bookingService.createBooking(createBookingDto, receipt);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadRequestException('Invalid seats JSON format');
      }
      
      // Handle file upload specific errors
      if (error.message?.includes('File size exceeds')) {
        throw new BadRequestException('Receipt file is too large. Maximum size is 10MB.');
      }
      
      if (error.message?.includes('File type not supported')) {
        throw new BadRequestException('Receipt file type not supported. Please use JPG, PNG, GIF, or PDF.');
      }
      
      if (error.message?.includes('Upload failed after')) {
        throw new BadRequestException('Receipt upload failed. Please check your connection and try again.');
      }
      
      console.error('Booking creation error:', error);
      throw error;
    }
  }

  private async checkSeatsAvailability(seats: Array<{ seatRowId: string; seatNumber: number }>) {
    if (!seats || !Array.isArray(seats)) {
      throw new BadRequestException('Seats array is required');
    }

    // Check seat limit: maximum 5 seats per booking
    if (seats.length > 5) {
      throw new BadRequestException('Cannot book more than 5 seats at once');
    }

    // Quick check: only verify if seats are already booked
    const bookedSeats: Array<{
      seatRowName: string;
      seatNumber: number;
    }> = [];

    for (const seat of seats) {
      // Check if seat is already booked using a simple query
      const existingBooking = await this.prisma.seatBooking.findFirst({
        where: {
          seatRowId: seat.seatRowId,
          seatNumber: seat.seatNumber
        },
        include: {
          seatRow: {
            select: { name: true }
          }
        }
      });

      if (existingBooking) {
        bookedSeats.push({
          seatRowName: existingBooking.seatRow.name,
          seatNumber: seat.seatNumber
        });
      }
    }

    if (bookedSeats.length > 0) {
      const errorMessage = bookedSeats
        .map(seat => `Row ${seat.seatRowName}, Seat ${seat.seatNumber} is already booked`)
        .join('; ');
      
      throw new BadRequestException(`Booking failed: ${errorMessage}`);
    }
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all bookings',
    description: 'Retrieve all bookings with user data and formatted seat information'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all bookings with user data and seat details',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'clp1234567890' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string', example: 'Ahmed Mohamed' },
              email: { type: 'string', example: 'ahmed@example.com' },
              phone: { type: 'string', example: '+201234567890' }
            }
          },
          seats: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                rowName: { type: 'string', example: 'Row A' },
                seatNumber: { type: 'number', example: 1 }
              }
            }
          },
          totalSeats: { type: 'number', example: 2, description: 'Total number of seats booked' },
          totalPrice: { type: 'number', example: 100.0 },
          isPaid: { type: 'boolean', example: false },
          receiptUrl: { type: 'string', nullable: true, example: 'https://storage.url/receipt.jpg' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  })
  async getAllBookings() {
    return await this.bookingService.getAllBookings();
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get booking by ID',
    description: 'Retrieve a specific booking with all details'
  })
  @ApiParam({
    name: 'id',
    description: 'Booking ID',
    example: 'clp1234567890'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Booking details' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Booking not found' 
  })
  async getBookingById(@Param('id') id: string) {
    return await this.bookingService.getBookingById(id);
  }

  @Patch(':bookingId/payment')
  @ApiOperation({ 
    summary: 'Update payment status by booking ID',
    description: 'Update the isPaid status for a specific booking and trigger email confirmation'
  })
  @ApiParam({
    name: 'bookingId',
    description: 'Booking ID',
    example: 'clp1234567890'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isPaid: { 
          type: 'boolean', 
          example: true,
          description: 'Payment status to set'
        }
      },
      required: ['isPaid']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Payment status updated successfully' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Booking not found' 
  })
  async updatePaymentStatus(
    @Param('bookingId') bookingId: string,
    @Body() body: { isPaid: boolean }
  ) {
    return await this.bookingService.updatePaymentStatusByBookingId(bookingId, body.isPaid);
  }

  @Patch(':bookingId/receipt')
  @UseInterceptors(FileInterceptor('receipt'))
  @ApiOperation({ 
    summary: 'Update receipt URL for a booking',
    description: 'Upload a new receipt file and update the receipt URL for a specific booking'
  })
  @ApiParam({
    name: 'bookingId',
    description: 'Booking ID',
    example: 'clp1234567890'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Receipt file upload',
    schema: {
      type: 'object',
      properties: {
        receipt: {
          type: 'string',
          format: 'binary',
          description: 'Receipt image file'
        }
      },
      required: ['receipt']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Receipt URL updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            bookingId: { type: 'string' },
            receiptUrl: { type: 'string' },
            updatedAt: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Booking not found or file upload failed' 
  })
  async updateReceiptUrl(
    @Param('bookingId') bookingId: string,
    @UploadedFile() receipt: Express.Multer.File
  ) {
    if (!receipt) {
      throw new BadRequestException('Receipt file is required');
    }
    return await this.bookingService.updateReceiptUrl(bookingId, receipt);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete booking by ID',
    description: 'Delete a booking and all associated seat bookings, returning seats to available pool'
  })
  @ApiParam({
    name: 'id',
    description: 'Booking ID',
    example: 'clp1234567890'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Booking deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            bookingId: { type: 'string' },
            deletedSeats: { type: 'number' },
            returnedSeats: { 
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  rowName: { type: 'string' },
                  seatNumber: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Booking not found' 
  })
  async deleteBooking(@Param('id') id: string) {
    return await this.bookingService.deleteBooking(id);
  }
}
