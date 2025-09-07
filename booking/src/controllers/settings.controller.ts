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
import { PrismaService } from '../services/prisma.service';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

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
  async getBalconyVisibility() {
    // Check if any balcony seat rows are visible
    const visibleBalconyRows = await this.prisma.seatRow.findMany({
      where: {
        type: 'Balcony',
        visible: true
      }
    });
    
    return { visible: visibleBalconyRows.length > 0 };
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
        visible: { type: 'boolean' },
        updatedRows: { type: 'number' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request' 
  })
  async setBalconyVisibility(@Body() body: { visible: boolean }) {
    if (typeof body.visible !== 'boolean') {
      throw new BadRequestException('visible must be a boolean value');
    }

    try {
      // Update all balcony seat rows visibility
      const updateResult = await this.prisma.seatRow.updateMany({
        where: {
          type: 'Balcony'
        },
        data: {
          visible: body.visible
        }
      });

      console.log(`Updated ${updateResult.count} balcony rows visibility to: ${body.visible}`);
      
      return {
        success: true,
        message: `Balcony visibility ${body.visible ? 'enabled' : 'disabled'} successfully`,
        visible: body.visible,
        updatedRows: updateResult.count
      };
    } catch (error) {
      console.error('Failed to update balcony visibility:', error);
      throw new BadRequestException('Failed to update balcony visibility');
    }
  }
}
