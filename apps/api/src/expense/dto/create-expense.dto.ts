import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateExpenseDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  @Transform(({ value }) => (value != null ? Math.trunc(value * 100) / 100 : value))
  amount!: number;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsNotEmpty()
  @IsDateString()
  date!: string;

  @IsNotEmpty()
  @IsString()
  categoryId!: string;
}
