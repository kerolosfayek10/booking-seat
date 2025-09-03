import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'booking-app-secret-key-2024', // Fallback secret
    });
  }

  async validate(payload: any) {
    // Validate the payload from JWT token
    if (!payload.username || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Return user object that will be attached to the request
    return { 
      userId: payload.sub,
      username: payload.username, 
      role: payload.role 
    };
  }
}
