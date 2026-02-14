import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const categorySelect = {
  id: true,
  name: true,
  icon: true,
  isDefault: true,
  familyId: true,
} satisfies Prisma.CategorySelect;

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(familyId: string) {
    return this.prisma.category.findMany({
      where: {
        OR: [
          { isDefault: true, familyId: null },
          { familyId },
        ],
      },
      select: categorySelect,
      orderBy: { name: 'asc' },
    });
  }

  async create(familyId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        icon: dto.icon,
        isDefault: false,
        familyId,
      },
      select: categorySelect,
    });
  }

  async update(id: string, familyId: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category || category.familyId !== familyId) {
      throw new NotFoundException('Category not found');
    }

    return this.prisma.category.update({
      where: { id },
      data: dto,
      select: categorySelect,
    });
  }

  async remove(id: string, familyId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category || category.familyId !== familyId || category.isDefault) {
      throw new NotFoundException('Category not found');
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
