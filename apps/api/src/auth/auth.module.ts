import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SessionGuard } from './guards/session.guard';

@Module({
  providers: [AuthService, SessionGuard],
  exports: [AuthService, SessionGuard],
})
export class AuthModule {}
