import { IsIn, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryExpensesDto {
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => value || 1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => value || 20)
  limit?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  createdById?: string;

  @IsOptional()
  @IsIn(['date', 'createdAt'])
  sort?: 'date' | 'createdAt';
}
