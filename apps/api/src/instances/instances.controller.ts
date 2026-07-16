import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { IsString } from 'class-validator';
import { InstancesService } from './instances.service';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '@else-chat/shared';

class CreateInstanceDto {
  @IsString()
  name!: string;
}

@Controller('instances')
export class InstancesController {
  constructor(private instances: InstancesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  list(@CurrentUser() user: AuthUser) {
    return this.instances.list(user);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInstanceDto) {
    return this.instances.create(user, dto.name);
  }

  @Get(':id/qr')
  @Roles(UserRole.ADMIN)
  qr(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.instances.qr(user, id);
  }

  @Get(':id/status')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  status(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.instances.status(user, id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.instances.remove(user, id);
  }
}
