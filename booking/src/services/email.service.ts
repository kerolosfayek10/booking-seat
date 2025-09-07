import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Check if email configuration is available
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email configuration missing. EMAIL_USER and EMAIL_PASS environment variables are required.');
      console.warn('Emails will not be sent until proper configuration is provided.');
    }

    // Configure your email transporter (example with Gmail)
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS, // Your email password or app password
      },
      secure: true, // Use TLS
      logger: true, // Enable logging for debugging
      debug: false, // Set to true for detailed debugging
    });

    // Test the connection
    this.testConnection();
  }

  private async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified successfully');
    } catch (error) {
      console.error('❌ Email service connection failed:', error.message);
      console.error('Please check your EMAIL_USER and EMAIL_PASS environment variables');
      console.error('For Gmail, make sure you\'re using an App Password, not your regular password');
    }
  }

  async sendBookingConfirmation(
    userEmail: string,
    userName: string,
    totalSeats: number,
    seats: Array<{ rowName: string; seatNumber: number; rowType: string; firstName: string; lastName: string }>
  ) {
    const seatDetails = seats
      .map(seat => `<strong>${seat.rowType} - Row ${seat.rowName}, Seat ${seat.seatNumber} - ${seat.firstName} ${seat.lastName}</strong>`)
      .join('<br>');

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
            <div style="padding: 15px; background-color: #e9ecef; border-radius: 4px;">
              ${seatDetails}
            </div>
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

    // Check if email configuration is available before attempting to send
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Cannot send email: EMAIL_USER and EMAIL_PASS environment variables are not configured');
      return { 
        success: false, 
        message: 'Email configuration missing', 
        error: 'EMAIL_USER and EMAIL_PASS environment variables are required' 
      };
    }

    try {
      const info = await this.transporter.sendMail(mailOptions);;
      return { 
        success: true, 
        message: 'Email sent successfully',
        messageId: info.messageId
      };
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to send email';
      if (error.code === 'EAUTH') {
        errorMessage = 'Email authentication failed. Please check your email credentials.';
      } else if (error.code === 'ECONNECTION') {
        errorMessage = 'Cannot connect to email server. Please check your internet connection.';
      } else if (error.responseCode === 535) {
        errorMessage = 'Invalid email credentials. For Gmail, use an App Password instead of your regular password.';
      }
      
      return { 
        success: false, 
        message: errorMessage, 
        error: error.message,
        code: error.code 
      };
    }
  }
}
