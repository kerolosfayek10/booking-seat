import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { SeatRowService } from '../services/seatrow.service';
import { CreateSeatRowDto, SeatRowType } from '../dto/create-seatrow.dto';

@ApiTags('Seat Rows')
@Controller('seat-rows')
export class SeatRowController {
  constructor(private readonly seatRowService: SeatRowService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new seat row',
    description: 'Create a seat row with name and available seat numbers'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Seat row created successfully' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - seat row with this name already exists' 
  })
  async createSeatRow(@Body() createSeatRowDto: CreateSeatRowDto) {
    return await this.seatRowService.createSeatRow(createSeatRowDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all seat rows',
    description: 'Retrieve all seat rows with their names, optionally filtered by type'
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: SeatRowType,
    description: 'Filter by seat row type (Ground or Balcony)'
  })
  @ApiQuery({
    name: 'includeHidden',
    required: false,
    type: Boolean,
    description: 'Include hidden seat rows (admin only)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all seat rows',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['Ground', 'Balcony'] },
          seats: { 
            type: 'array',
            items: { type: 'number' }
          },
          visible: { type: 'boolean' },
          createdAt: { type: 'string' }
        }
      }
    }
  })
  async getAllSeatRows(
    @Query('type') type?: SeatRowType,
    @Query('includeHidden') includeHidden?: string
  ) {
    const showHidden = includeHidden === 'true';
    return await this.seatRowService.getAllSeatRows(type, showHidden);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get seat row by ID',
    description: 'Retrieve a specific seat row with all details'
  })
  @ApiParam({
    name: 'id',
    description: 'Seat row ID',
    example: 'clp1234567890'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Seat row details' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Seat row not found' 
  })
  async getSeatRowById(@Param('id') id: string) {
    return await this.seatRowService.getSeatRowById(id);
  }

  @Get(':id/available-seats')
  @ApiOperation({ 
    summary: 'Get available seats in a seat row',
    description: 'Retrieve available and booked seats for a specific seat row'
  })
  @ApiParam({
    name: 'id',
    description: 'Seat row ID',
    example: 'clp1234567890'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Available and booked seats information',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        totalSeats: { 
          type: 'array',
          items: { type: 'number' }
        },
        availableSeats: { 
          type: 'array',
          items: { type: 'number' }
        },
        bookedSeats: { 
          type: 'array',
          items: { type: 'number' }
        },
        createdAt: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Seat row not found' 
  })
  async getAvailableSeats(@Param('id') id: string) {
    return await this.seatRowService.getAvailableSeats(id);
  }

  @Patch(':id/add-seat')
  @ApiOperation({ 
    summary: 'Add a new seat to a seat row',
    description: 'Add a new seat number to an existing seat row with validation to prevent duplicates'
  })
  @ApiParam({
    name: 'id',
    description: 'Seat row ID',
    example: 'clp1234567890'
  })
  @ApiBody({
    description: 'Seat number to add',
    schema: {
      type: 'object',
      properties: {
        seatNumber: { 
          type: 'number', 
          example: 15,
          description: 'The seat number to add to the row'
        }
      },
      required: ['seatNumber']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Seat added successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            seats: { 
              type: 'array',
              items: { type: 'number' }
            },
            totalSeats: { type: 'number' },
            addedSeat: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Seat row not found or seat number already exists' 
  })
  async addSeatToRow(
    @Param('id') id: string,
    @Body() body: { seatNumber: number }
  ) {
    return await this.seatRowService.addSeatToRow(id, body.seatNumber);
  }
}
