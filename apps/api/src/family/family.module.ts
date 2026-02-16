import { Module } from '@nestjs/common';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';
import { FamilyGuard } from './guards/family.guard';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [AuthModule, NotificationModule],
  controllers: [FamilyController],
  providers: [FamilyService, FamilyGuard],
  exports: [FamilyService, FamilyGuard],
})
export class FamilyModule {}
