import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class SetOverallBudgetDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    value != null ? Math.trunc(value * 100) / 100 : value,
  )
  monthlyBudget!: number;
}
