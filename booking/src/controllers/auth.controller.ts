import { 
  Controller, 
  Post, 
  Get,
  Body, 
  UseGuards,
  Request,
  BadRequestException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody,
  ApiBearerAuth 
} from '@nestjs/swagger';
import { AuthService, LoginDto, AuthResponse } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ 
    summary: 'Admin login',
    description: 'Authenticate admin user with hardcoded credentials and return JWT token'
  })
  @ApiBody({
    description: 'Admin login credentials',
    schema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          example: 'admin',
          description: 'Admin username'
        },
        password: {
          type: 'string',
          example: 'your-password',
          description: 'Admin password'
        }
      },
      required: ['username', 'password']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Login successful' },
        data: {
          type: 'object',
          properties: {
            accessToken: { 
              type: 'string', 
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' 
            },
            user: {
              type: 'object',
              properties: {
                username: { type: 'string', example: 'admin' },
                role: { type: 'string', example: 'admin' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Invalid credentials' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - missing username or password' 
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    // Validate request body
    if (!loginDto.username || !loginDto.password) {
      throw new BadRequestException('Username and password are required');
    }

    if (typeof loginDto.username !== 'string' || typeof loginDto.password !== 'string') {
      throw new BadRequestException('Username and password must be strings');
    }

    return await this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get admin profile',
    description: 'Get authenticated admin user profile and permissions'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Admin profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', example: 'admin' },
        role: { type: 'string', example: 'admin' },
        permissions: {
          type: 'array',
          items: { type: 'string' },
          example: ['view_bookings', 'update_payment_status', 'manage_seat_rows']
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - invalid or missing token' 
  })
  async getProfile(@Request() req: any) {
    return await this.authService.getAdminProfile(req.user.username);
  }

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Validate JWT token',
    description: 'Validate if the provided JWT token is still valid'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Token is valid',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean', example: true },
        user: {
          type: 'object',
          properties: {
            username: { type: 'string', example: 'admin' },
            role: { type: 'string', example: 'admin' }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Token is invalid or expired' 
  })
  async validateToken(@Request() req: any) {
    return {
      valid: true,
      user: {
        username: req.user.username,
        role: req.user.role
      }
    };
  }
}
