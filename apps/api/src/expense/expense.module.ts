import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './expense.service';
import { RecurringExpenseController } from './recurring-expense.controller';
import { RecurringExpenseService } from './recurring-expense.service';
import { AuthModule } from '../auth/auth.module';
import { FamilyModule } from '../family/family.module';

@Module({
  imports: [AuthModule, FamilyModule, ScheduleModule.forRoot()],
  controllers: [ExpenseController, RecurringExpenseController],
  providers: [ExpenseService, RecurringExpenseService],
  exports: [ExpenseService],
})
export class ExpenseModule {}
