import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
    user: {
      username: string;
      role: string;
    };
  };
}

@Injectable()
export class AuthService {
  // Hardcoded admin credentials
  //R8$vP3@qLm!9xZ#t
  private readonly ADMIN_USERNAME = 'admin';
  private readonly ADMIN_PASSWORD = '123456';

  constructor(private jwtService: JwtService) {}

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { username, password } = loginDto;

    try {
      // Validate admin credentials
      if (username !== this.ADMIN_USERNAME) {
        throw new UnauthorizedException('Invalid username or password');
      }

      if (password !== this.ADMIN_PASSWORD) {
        throw new UnauthorizedException('Invalid username or password');
      }

      // Generate JWT token
      const payload = { 
        username: this.ADMIN_USERNAME, 
        role: 'admin',
        sub: 'admin-user-id' // subject (user id)
      };

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: '24h', // Token expires in 24 hours
      });

      return {
        success: true,
        message: 'Login successful',
        data: {
          accessToken,
          user: {
            username: this.ADMIN_USERNAME,
            role: 'admin'
          }
        }
      };

    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      console.error('Login error:', error);
      throw new UnauthorizedException('Login failed');
    }
  }

  async validateToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token);
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async getAdminProfile(username: string): Promise<any> {
    if (username !== this.ADMIN_USERNAME) {
      throw new UnauthorizedException('Access denied');
    }

    return {
      username: this.ADMIN_USERNAME,
      role: 'admin',
      permissions: [
        'view_bookings',
        'update_payment_status',
        'manage_seat_rows',
        'view_users'
      ]
    };
  }
}
