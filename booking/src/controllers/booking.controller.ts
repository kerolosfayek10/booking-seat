import { 
  Controller, 
  Post, 
  Get, 
  Patch,
  Delete,
  Body, 
  Param, 
  Query,
  UseInterceptors, 
  UseGuards,
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
  ApiParam,
  ApiQuery,
  ApiBearerAuth
} from '@nestjs/swagger';
import { BookingService } from '../services/booking.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { PrismaService } from '../services/prisma.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
// 
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
          example: '[{"seatRowId":"clp1234567890","seatNumber":1,"firstName":"Ahmed","lastName":"Mohamed"},{"seatRowId":"clp1234567890","seatNumber":2,"firstName":"Sara","lastName":"Ali"}]'
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
      console.log('Controller received booking request for email:', body.email);
      
      console.log('Raw body received:', body);
      console.log('Raw seats data received:', body.seats);
      
      // Validate required form fields
      if (!body.name || !body.email) {
        throw new BadRequestException('Name and email are required');
      }
      
      // Parse seats from JSON string (needed for multipart/form-data)
      let seats;
      try {
        seats = typeof body.seats === 'string' 
          ? JSON.parse(body.seats) 
          : body.seats;
      } catch (parseError) {
        console.error('Failed to parse seats JSON:', parseError);
        throw new BadRequestException('Invalid seats data format');
      }
        
      console.log('Parsed seats data:', seats);
      
      // Validate seats array
      if (!Array.isArray(seats) || seats.length === 0) {
        throw new BadRequestException('Seats must be a non-empty array');
      }
      
      // Validate each seat object
      for (const seat of seats) {
        if (!seat.seatRowId || !seat.seatNumber || !seat.firstName || !seat.lastName) {
          throw new BadRequestException('Each seat must have seatRowId, seatNumber, firstName, and lastName');
        }
      }

      // Quick validation: check if seats are already booked
      // Note: Detailed seat validation is done in the service layer
      // await this.checkSeatsAvailability(seats);

      const createBookingDto: CreateBookingDto = {
        name: body.name,
        email: body.email,
        phone: body.phone,
        seats: seats
      };

      console.log('Controller calling service with DTO:', { 
        name: createBookingDto.name, 
        email: createBookingDto.email, 
        seatsCount: createBookingDto.seats.length,
        seats: createBookingDto.seats
      });

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
      
      console.error('Controller booking creation error:', error);
      console.error('Controller error type:', error.constructor.name);
      console.error('Controller error message:', error.message);
      
      // Pass through BadRequestException errors with their original messages
      if (error instanceof BadRequestException) {
        console.log('Controller passing through BadRequestException:', error.message);
        throw error;
      } else {
        // For unexpected errors, use a generic message
        console.log('Controller converting unknown error to generic message');
        throw new BadRequestException('An unexpected error occurred. Please try again.');
      }
    }
  }

  private async checkSeatsAvailability(seats: Array<{ seatRowId: string; seatNumber: number }>) {
    if (!seats || !Array.isArray(seats)) {
      throw new BadRequestException('Seats array is required');
    }

    // Seat availability check - no booking limit imposed

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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get all bookings with pagination',
    description: 'Retrieve all bookings with user data and formatted seat information, paginated results'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 5)',
    example: 5
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Paginated list of bookings with user data and seat details',
    schema: {
      type: 'object',
      properties: {
        bookings: {
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
        },
        pagination: {
          type: 'object',
          properties: {
            currentPage: { type: 'number', example: 1 },
            totalPages: { type: 'number', example: 3 },
            totalItems: { type: 'number', example: 15 },
            itemsPerPage: { type: 'number', example: 5 },
            hasNextPage: { type: 'boolean', example: true },
            hasPreviousPage: { type: 'boolean', example: false }
          }
        }
      }
    }
  })
  async getAllBookings(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 5;
    
    // Validate pagination parameters
    if (pageNum < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }
    if (limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }
    
    return await this.bookingService.getAllBookings(pageNum, limitNum);
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
    console.log(`Payment update request for booking ${bookingId}, isPaid: ${body.isPaid}`);
    try {
      const result = await this.bookingService.updatePaymentStatusByBookingId(bookingId, body.isPaid);
      console.log('Payment update successful:', result);
      return result;
    } catch (error) {
      console.error('Payment update failed:', error);
      throw error;
    }
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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

  @Post('test-email')
  @ApiOperation({ 
    summary: 'Test email configuration',
    description: 'Send a test email to verify email service is working'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          example: 'test@example.com',
          description: 'Email address to send test email to'
        }
      },
      required: ['email']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Test email sent or error details returned' 
  })
  async testEmail(@Body() body: { email: string }) {
    try {
      const { EmailService } = await import('../services/email.service');
      const emailService = new EmailService();
      
      const result = await emailService.sendBookingConfirmation(
        body.email,
        'Test User',
        2,
        [
          { rowName: 'A', seatNumber: 1, rowType: 'Ground', firstName: 'Ahmed', lastName: 'Mohamed' },
          { rowName: 'A', seatNumber: 2, rowType: 'Ground', firstName: 'Sara', lastName: 'Ali' }
        ]
      );
      
      return {
        success: true,
        message: 'Test email sent',
        emailResult: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Test email failed',
        error: error.message
      };
    }
  }
}
