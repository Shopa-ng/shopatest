import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators';
import { JwtAuthGuard } from 'src/modules/identity/auth/guards';
import { CreateReviewDto, UpdateReviewDto } from './dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('product/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get reviews for a product' })
  async getProductReviews(@Param('productId') productId: string) {
    return this.reviewsService.findByProduct(productId);
  }

  @Get('vendor/:vendorId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get reviews for a vendor' })
  async getVendorReviews(@Param('vendorId') vendorId: string) {
    return this.reviewsService.findByVendor(vendorId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createDto: CreateReviewDto,
  ) {
    return this.reviewsService.create(userId, createDto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a review' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() updateDto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, userId, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.reviewsService.delete(id, userId);
  }
}
