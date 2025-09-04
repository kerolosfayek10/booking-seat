import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookingController } from './controllers/booking.controller';
import { SeatRowController } from './controllers/seatrow.controller';
import { AuthController } from './controllers/auth.controller';
import { BookingService } from './services/booking.service';
import { SeatRowService } from './services/seatrow.service';
import { AuthService } from './services/auth.service';
import { PrismaService } from './services/prisma.service';
import { SupabaseService } from './services/supabase.service';
import { EmailService } from './services/email.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'booking-app-secret-key-2024',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AppController, BookingController, SeatRowController, AuthController],
  providers: [
    AppService, 
    BookingService, 
    SeatRowService, 
    AuthService,
    PrismaService, 
    SupabaseService,
    EmailService,
    JwtStrategy
  ],
})
export class AppModule {}
