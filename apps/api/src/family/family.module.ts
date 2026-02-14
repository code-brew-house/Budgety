import { Module } from '@nestjs/common';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';
import { FamilyGuard } from './guards/family.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [FamilyController],
  providers: [FamilyService, FamilyGuard],
  exports: [FamilyService, FamilyGuard],
})
export class FamilyModule {}
