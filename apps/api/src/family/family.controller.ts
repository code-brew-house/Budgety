import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FamilyRole } from '@prisma/client';
import { FamilyService } from './family.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { JoinFamilyDto } from './dto/join-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { FamilyGuard } from './guards/family.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequiredFamilyRole } from './decorators/required-family-role.decorator';

@ApiTags('Family')
@ApiBearerAuth()
@Controller('families')
@UseGuards(SessionGuard)
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateFamilyDto,
  ) {
    return this.familyService.create(user.id, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: { id: string }) {
    return this.familyService.findAllByUser(user.id);
  }

  @Post('join')
  async join(@CurrentUser() user: { id: string }, @Body() dto: JoinFamilyDto) {
    return this.familyService.joinFamily(user.id, dto.code);
  }

  @Get(':familyId')
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.MEMBER)
  async findOne(@Param('familyId') familyId: string) {
    return this.familyService.findById(familyId);
  }

  @Patch(':familyId')
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.ADMIN)
  async update(
    @Param('familyId') familyId: string,
    @Body() dto: UpdateFamilyDto,
  ) {
    return this.familyService.update(familyId, dto);
  }

  @Delete(':familyId')
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.ADMIN)
  async remove(@Param('familyId') familyId: string) {
    return this.familyService.remove(familyId);
  }

  @Patch(':familyId/members/:memberId')
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.ADMIN)
  async updateMemberRole(
    @Param('familyId') familyId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.familyService.updateMemberRole(familyId, memberId, dto.role);
  }

  @Delete(':familyId/members/:memberId')
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.ADMIN)
  async removeMember(
    @Param('familyId') familyId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.familyService.removeMember(familyId, memberId);
  }

  @Post(':familyId/invites')
  @UseGuards(FamilyGuard)
  @RequiredFamilyRole(FamilyRole.ADMIN)
  async createInvite(
    @Param('familyId') familyId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.familyService.createInvite(familyId, user.id);
  }
}
