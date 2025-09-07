import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookingController } from './controllers/booking.controller';
import { SeatRowController } from './controllers/seatrow.controller';
import { AuthController } from './controllers/auth.controller';
import { SettingsController } from './controllers/settings.controller';
import { BookingService } from './services/booking.service';
import { SeatRowService } from './services/seatrow.service';
import { AuthService } from './services/auth.service';
import { PrismaService } from './services/prisma.service';
import { SupabaseService } from './services/supabase.service';
import { EmailService } from './services/email.service';
import { EmailProcessor } from './queues/email.processor';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'booking-app-secret-key-2024',
      signOptions: { expiresIn: '24h' },
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port:  6379,
      },
    }),
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  controllers: [AppController, BookingController, SeatRowController, AuthController, SettingsController],
  providers: [
    AppService, 
    BookingService, 
    SeatRowService, 
    AuthService,
    PrismaService, 
    SupabaseService,
    EmailService,
    EmailProcessor,
    JwtStrategy
  ],
})
export class AppModule {}
