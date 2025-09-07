import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { EmailService } from '../services/email.service';

export interface EmailJobData {
  userEmail: string;
  userName: string;
  totalSeats: number;
  seats: Array<{ 
    rowName: string; 
    seatNumber: number; 
    rowType: string;
    firstName: string;
    lastName: string;
  }>;
}

@Processor('email')
export class EmailProcessor {
  constructor(private readonly emailService: EmailService) {}

  @Process('booking-confirmation')
  async handleBookingConfirmation(job: Job<EmailJobData>) {
    const { userEmail, userName, totalSeats, seats } = job.data;
    
    console.log(`Processing booking confirmation email for: ${userEmail}`);
    
    try {
      const result = await this.emailService.sendBookingConfirmation(
        userEmail,
        userName,
        totalSeats,
        seats
      );
      
      console.log(`Email job completed for ${userEmail}:`, result);
      return result;
    } catch (error) {
      console.error(`Email job failed for ${userEmail}:`, error);
      throw error;
    }
  }
}
