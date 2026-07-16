import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '@else-chat/shared';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  list(@CurrentUser() user: AuthUser) {
    return this.users.list(user);
  }

  @Get('agents')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  agents(@CurrentUser() user: AuthUser) {
    return this.users.agents(user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.users.create(user, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(user, id, dto);
  }
}
