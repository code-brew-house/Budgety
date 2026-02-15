import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateExpenseDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Transform(({ value }) =>
    value != null ? Math.trunc(value * 100) / 100 : value,
  )
  amount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
