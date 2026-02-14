import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

class CategoryBudgetItem {
  @IsNotEmpty()
  @IsString()
  categoryId!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    value != null ? Math.trunc(value * 100) / 100 : value,
  )
  amount!: number;
}

export class UpsertCategoryBudgetsDto {
  @IsNotEmpty()
  @IsString()
  month!: string; // "YYYY-MM"

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryBudgetItem)
  budgets!: CategoryBudgetItem[];
}
