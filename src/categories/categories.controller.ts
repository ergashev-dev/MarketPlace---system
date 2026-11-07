import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDTO } from './dto/create-category.dto.js';
import { UpdateCategoryDTO } from './dto/update-category.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles/roles.guard.js';
import { Roles } from '../auth/roles/roles.decorator.js';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  getCategories() {
    return this.categoriesService.getCategories();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  createCategory(@Body() body: CreateCategoryDTO) {
    return this.categoriesService.createCategory(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  updateCategory(@Param('id') id: number, @Body() body: UpdateCategoryDTO) {
    return this.categoriesService.updateCategory(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  deleteCategory(@Param('id') id: number) {
    return this.categoriesService.deleteCategory(id);
  }
}