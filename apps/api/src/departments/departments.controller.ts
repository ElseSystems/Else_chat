import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { IsString } from 'class-validator';
import { DepartmentsService } from './departments.service';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '@else-chat/shared';

class CreateDepartmentDto {
  @IsString()
  name!: string;
}

@Controller('departments')
export class DepartmentsController {
  constructor(private departments: DepartmentsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  list(@CurrentUser() user: AuthUser) {
    return this.departments.list(user);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDepartmentDto) {
    return this.departments.create(user, dto.name);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.departments.remove(user, id);
  }
}
