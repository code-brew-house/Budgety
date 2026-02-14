import { Module } from '@nestjs/common';
import { FamilyService } from './family.service';
import { FamilyGuard } from './guards/family.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [FamilyService, FamilyGuard],
  exports: [FamilyService, FamilyGuard],
})
export class FamilyModule {}
