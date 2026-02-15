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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FamilyRole } from '@prisma/client';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { FamilyGuard } from '../family/guards/family.guard';
import { RequiredFamilyRole } from '../family/decorators/required-family-role.decorator';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('families/:familyId/categories')
@UseGuards(SessionGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.MEMBER)
  async findAll(@Param('familyId') familyId: string) {
    return this.categoryService.findAll(familyId);
  }

  @Post()
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.ADMIN)
  async create(
    @Param('familyId') familyId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoryService.create(familyId, dto);
  }

  @Patch(':id')
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.ADMIN)
  async update(
    @Param('familyId') familyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, familyId, dto);
  }

  @Delete(':id')
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.ADMIN)
  async remove(@Param('familyId') familyId: string, @Param('id') id: string) {
    return this.categoryService.remove(id, familyId);
  }
}
