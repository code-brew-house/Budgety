import { Module } from '@nestjs/common';
import { FamilyService } from './family.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [FamilyService],
  exports: [FamilyService],
})
export class FamilyModule {}
