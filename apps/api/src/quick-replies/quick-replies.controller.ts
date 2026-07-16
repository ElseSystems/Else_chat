import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { IsString } from 'class-validator';
import { QuickRepliesService } from './quick-replies.service';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '@else-chat/shared';

class CreateQuickReplyDto {
  @IsString()
  title!: string;

  @IsString()
  body!: string;
}

@Controller('quick-replies')
export class QuickRepliesController {
  constructor(private quickReplies: QuickRepliesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  list(@CurrentUser() user: AuthUser) {
    return this.quickReplies.list(user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateQuickReplyDto) {
    return this.quickReplies.create(user, dto.title, dto.body);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quickReplies.remove(user, id);
  }
}
