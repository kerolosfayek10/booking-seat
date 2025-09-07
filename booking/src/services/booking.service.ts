import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from './prisma.service';
import { SupabaseService } from './supabase.service';
import { SeatRowService } from './seatrow.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { EmailJobData } from '../queues/email.processor';

@Injectable()
export class BookingService {
  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
    private seatRowService: SeatRowService,
    @InjectQueue('email') private emailQueue: Queue<EmailJobData>
  ) {}

  async createBooking(createBookingDto: CreateBookingDto, receiptFile?: Express.Multer.File) {
    const { name, email, phone, seats } = createBookingDto;

    try {
      // Calculate total price (you can adjust this logic)
      const pricePerSeat = 50; // Example price
      const totalPrice = seats.length * pricePerSeat;

      // Create or find user
      let user = await this.prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            name,
            email,
            phone
          }
        });
      }

      // Check seat availability first (before checking user duplicates)
      // This prevents the transaction from failing due to seat issues
      for (const seat of seats) {
        const seatRow = await this.seatRowService.getSeatRowById(seat.seatRowId);
        if (!seatRow.seats.includes(seat.seatNumber)) {
          throw new BadRequestException(`Seat ${seat.seatNumber} is not available in row ${seatRow.name}. Please refresh and try again.`);
        }
      }

      // Removed duplicate booking check to allow multiple bookings per user

      // Upload receipt if provided
      let receiptUrl: string | null = null;
      if (receiptFile) {
        try {
          console.log('Starting receipt upload for user:', user.id);
          receiptUrl = await this.supabaseService.uploadReceipt(receiptFile, user.id);
          console.log('Receipt upload completed:', receiptUrl);
        } catch (uploadError) {
          console.error('Receipt upload failed:', uploadError);
          // Don't fail the entire booking if just the receipt upload fails
          // We'll continue with the booking but set receiptUrl to null
          receiptUrl = null;
        }
      }

      // Log seats data received by service
      console.log('Seats data received by service:', seats);
      seats.forEach((seat, index) => {
        console.log(`Seat ${index + 1} details:`, {
          seatRowId: seat.seatRowId,
          seatNumber: seat.seatNumber,
          firstName: seat.firstName,
          lastName: seat.lastName
        });
      });
      
      // Remove seats from SeatRow and create booking
      const booking = await this.prisma.$transaction(async (tx) => {
        // Remove seats from SeatRow
        for (const seat of seats) {
          await this.seatRowService.removeSeatFromRow(seat.seatRowId, seat.seatNumber);
        }

        // Create booking with seats
        return await tx.booking.create({
          data: {
            userId: user.id,
            totalPrice,
            isPaid: false, // Always false by default
            receiptUrl: receiptUrl, // Store receipt URL in booking table
            seats: {
              create: seats.map(seat => ({
                seatRowId: seat.seatRowId,
                seatNumber: seat.seatNumber,
                firstName: seat.firstName.trim(),
                lastName: seat.lastName.trim()
              }))
            }
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            },
            seats: {
              include: {
                seatRow: {
                  select: {
                    name: true,
                    type: true
                  }
                }
              }
            }
          }
        });
      });

      // Format seats with row type from the request
      const formattedSeats = booking.seats.map(seat => {
        const originalSeat = seats.find(s => s.seatRowId === seat.seatRowId && s.seatNumber === seat.seatNumber);
        return {
          ...seat,
          rowType: originalSeat?.rowType || 'Ground' // fallback to Ground if not provided
        };
      });

      return {
        success: true,
        message: 'Booking created successfully',
        data: {
          bookingId: booking.id,
          user: booking.user,
          seats: formattedSeats,
          totalPrice: booking.totalPrice,
          isPaid: booking.isPaid,
          receiptUrl: booking.receiptUrl,
          createdAt: booking.createdAt
        }
      };

    } catch (error) {
      console.error('Booking creation failed:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      
      // If it's already a BadRequestException, pass it through to preserve the original message
      if (error instanceof BadRequestException) {
        console.log('Passing through BadRequestException with message:', error.message);
        throw error;
      } else {
        // For other errors, use a generic message
        console.log('Converting unknown error to generic BadRequestException');
        throw new BadRequestException('Failed to create booking. Please try again.');
      }
    }
  }

  async getBookingById(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        seats: {
          include: {
            seatRow: true
          }
        }
      }
    });

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    return booking;
  }

  async getAllBookings(page: number = 1, limit: number = 5) {
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalBookings = await this.prisma.booking.count();
    const totalPages = Math.ceil(totalBookings / limit);

    const bookings = await this.prisma.booking.findMany({
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        seats: {
          include: {
            seatRow: {
              select: {
                name: true,
                type: true
              }
            }
          }
        }
      },
      orderBy: [
        {
          isPaid: 'asc' // false (0) comes before true (1), so unpaid bookings first
        },
        {
          createdAt: 'desc' // then sort by creation date for bookings with same payment status
        }
      ]
    });

    // Format the response with user data and formatted seats array
    const formattedBookings = bookings.map(booking => ({
      id: booking.id,
      user: booking.user,
      seats: booking.seats.map(seat => ({
        rowName: seat.seatRow.name,
        seatNumber: seat.seatNumber,
        rowType: seat.seatRow.type,
        firstName: seat.firstName || null,
        lastName: seat.lastName || null
      })),
      totalSeats: booking.seats.length,
      totalPrice: booking.totalPrice,
      isPaid: booking.isPaid,
      receiptUrl: booking.receiptUrl,
      createdAt: booking.createdAt
    }));

    return {
      bookings: formattedBookings,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalBookings,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  }

  async updatePaymentStatusByBookingId(bookingId: string, isPaid: boolean) {
    try {
      // Get the specific booking with seat details
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          seats: {
            include: {
              seatRow: {
                select: { name: true, type: true }
              }
            }
          }
        }
      });

      if (!booking) {
        throw new BadRequestException('Booking not found');
      }

      // Update the specific booking
      const updatedBooking = await this.prisma.booking.update({
        where: { id: bookingId },
        data: { isPaid }
      });

      // If payment is marked as true, send confirmation email
      if (isPaid) {
        // For email, we need to get the seat row information to send proper row types
        const emailSeats: Array<{
          rowName: string;
          seatNumber: number;
          rowType: string;
          firstName: string;
          lastName: string;
        }> = [];
        
        for (const seat of booking.seats) {
          const seatRowInfo = await this.prisma.seatRow.findUnique({
            where: { id: seat.seatRowId },
            select: { name: true, type: true }
          });
          emailSeats.push({
            rowName: seatRowInfo?.name || 'Unknown',
            seatNumber: seat.seatNumber,
            rowType: String(seatRowInfo?.type || 'Ground'),
            firstName: seat.firstName,
            lastName: seat.lastName
          });
        }

        const emailData: EmailJobData = {
          userEmail: booking.user.email,
          userName: booking.user.name,
          totalSeats: booking.seats.length,
          seats: emailSeats
        };

        try {
          // Try to add email job to queue
          await this.emailQueue.add('booking-confirmation', emailData, {
            delay: 1000, // Send email after 1 second delay
            attempts: 3, // Retry up to 3 times if failed
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          });

          console.log(`Email job queued for booking ${bookingId} to ${booking.user.email}`);
        } catch (queueError) {
          console.error('Failed to queue email job:', queueError);
          console.log('Attempting to send email directly...');
          
          // Fallback: Try to send email directly without queue
          try {
            const emailService = new (await import('./email.service')).EmailService();
            const result = await emailService.sendBookingConfirmation(
              emailData.userEmail,
              emailData.userName,
              emailData.totalSeats,
              emailData.seats
            );
            console.log('Direct email send result:', result);
          } catch (directEmailError) {
            console.error('Direct email send also failed:', directEmailError);
            // Continue with the response even if email fails
            // The booking status is still updated
          }
        }
      }

      return {
        success: true,
        message: `Payment status updated to ${isPaid ? 'paid' : 'unpaid'} for booking ${bookingId}`,
        data: {
          bookingId,
          userId: booking.user.id,
          userName: booking.user.name,
          isPaid: updatedBooking.isPaid,
          emailQueued: isPaid
        }
      };

    } catch (error) {
      console.error('Update payment status failed:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update payment status');
    }
  }

  async updateReceiptUrl(bookingId: string, receiptFile: Express.Multer.File) {
    try {
      // Get the booking to verify it exists and get user info
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!booking) {
        throw new BadRequestException('Booking not found');
      }

      // Upload the new receipt file
      const receiptUrl = await this.supabaseService.uploadReceipt(receiptFile, booking.user.id);

      // Update the booking with the new receipt URL
      const updatedBooking = await this.prisma.booking.update({
        where: { id: bookingId },
        data: { receiptUrl }
      });

      return {
        success: true,
        message: 'Receipt URL updated successfully',
        data: {
          bookingId: updatedBooking.id,
          receiptUrl: updatedBooking.receiptUrl,
          updatedAt: new Date()
        }
      };

    } catch (error) {
      console.error('Update receipt URL failed:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update receipt URL');
    }
  }

  async deleteBooking(bookingId: string) {
    try {
      // Fetch the booking with all related seats first
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: { seats: true }, // get all seat bookings
      });
  
      if (!booking) {
        throw new BadRequestException('Booking not found');
      }

      // Delete the booking (seat bookings will be deleted automatically due to cascade)
      await this.prisma.booking.delete({
        where: { id: bookingId },
      });

      // Return seats back to the available pool
      for (const seat of booking.seats) {
        await this.seatRowService.addSeatToRow(seat.seatRowId, seat.seatNumber);
      }
  
      return { 
        success: true, 
        message: `Booking deleted successfully. ${booking.seats.length} seats returned to available pool.`,
        data: {
          bookingId,
          deletedSeats: booking.seats.length
        }
      };
    } catch (error) {
      console.error('Delete booking failed:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete booking');
    }
  }
  
}
