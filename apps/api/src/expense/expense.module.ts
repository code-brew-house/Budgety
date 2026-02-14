import { Module } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { AuthModule } from '../auth/auth.module';
import { FamilyModule } from '../family/family.module';

@Module({
  imports: [AuthModule, FamilyModule],
  providers: [ExpenseService],
  exports: [ExpenseService],
})
export class ExpenseModule {}
