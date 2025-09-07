import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  UseGuards,
  BadRequestException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody,
  ApiBearerAuth
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

// Simple in-memory storage for balcony visibility
let balconyVisible = true;

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {

  @Get('balcony-visibility')
  @ApiOperation({ 
    summary: 'Get balcony visibility setting',
    description: 'Check if balcony seating is visible in the frontend'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Balcony visibility status',
    schema: {
      type: 'object',
      properties: {
        visible: { type: 'boolean' }
      }
    }
  })
  getBalconyVisibility() {
    return { visible: balconyVisible };
  }

  @Post('balcony-visibility')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Set balcony visibility',
    description: 'Control whether balcony seating is visible in the frontend'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        visible: { 
          type: 'boolean', 
          example: true,
          description: 'Whether balcony seating should be visible'
        }
      },
      required: ['visible']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Balcony visibility updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        visible: { type: 'boolean' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request' 
  })
  setBalconyVisibility(@Body() body: { visible: boolean }) {
    if (typeof body.visible !== 'boolean') {
      throw new BadRequestException('visible must be a boolean value');
    }

    balconyVisible = body.visible;
    console.log(`Balcony visibility set to: ${balconyVisible}`);
    
    return {
      success: true,
      message: `Balcony visibility ${body.visible ? 'enabled' : 'disabled'} successfully`,
      visible: body.visible
    };
  }
}
