import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure your email transporter (example with Gmail)
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS, // Your email password or app password
      },
    });
  }

  async sendBookingConfirmation(
    userEmail: string,
    userName: string,
    totalSeats: number,
    seats: Array<{ rowName: string; seatNumber: number }>
  ) {
    const seatDetails = seats
      .map(seat => `Row ${seat.rowName}, Seat ${seat.seatNumber}`)
      .join('\n');

    const mailOptions = {
      from: `"Kerolos George" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: 'Booking Confirmation - Payment Received',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Booking Confirmation</h2>
          
          <p>Dear ${userName},</p>
          
          <p>We are pleased to confirm that we have received your payment and your booking is now confirmed!</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">Booking Details:</h3>
            <p><strong>Booking Name:</strong> ${userName}</p>
            <p><strong>Total Seats:</strong> ${totalSeats}</p>
            <p><strong>Seat Details:</strong></p>
            <pre style="background-color: #e9ecef; padding: 10px; border-radius: 4px;">${seatDetails}</pre>
          </div>
          
          <p>Please keep this email as your booking confirmation. You may be asked to present this when you arrive.</p>
          
          <p>Thank you for choosing our service!</p>
          
          <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
          <p style="color: #6c757d; font-size: 14px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Booking confirmation email sent to: ${userEmail}`);
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error('Failed to send email:', error);
      return { success: false, message: 'Failed to send email', error };
    }
  }
}
