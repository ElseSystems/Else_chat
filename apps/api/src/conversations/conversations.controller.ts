import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';
import { ConversationsService } from './conversations.service';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '@else-chat/shared';

class TransferDto {
  @IsOptional()
  @IsString()
  toUserId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}

class NoteDto {
  @IsString()
  body!: string;
}

@Controller('conversations')
export class ConversationsController {
  constructor(private conversations: ConversationsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  list(
    @CurrentUser() user: AuthUser,
    @Query('tab') tab?: 'waiting' | 'mine' | 'all',
  ) {
    return this.conversations.list(user, tab || 'mine');
  }

  @Get('metrics')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  metrics(@CurrentUser() user: AuthUser) {
    return this.conversations.metrics(user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.conversations.get(user, id);
  }

  @Post(':id/claim')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  claim(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.conversations.claim(user, id);
  }

  @Post(':id/transfer')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  transfer(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: TransferDto,
  ) {
    return this.conversations.transfer(user, id, dto);
  }

  @Post(':id/resolve')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  resolve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.conversations.resolve(user, id);
  }

  @Post(':id/notes')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  note(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: NoteDto,
  ) {
    return this.conversations.addNote(user, id, dto.body);
  }
}
