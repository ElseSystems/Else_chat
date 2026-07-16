import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { memoryStorage } from 'multer';
import { MessagesService } from './messages.service';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '@else-chat/shared';

class SendTextDto {
  @IsString()
  @MinLength(1)
  body!: string;
}

class SendMediaDto {
  @IsOptional()
  @IsString()
  caption?: string;
}

@Controller('conversations/:conversationId/messages')
export class MessagesController {
  constructor(private messages: MessagesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  list(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messages.list(user, conversationId);
  }

  @Post('text')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  sendText(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendTextDto,
  ) {
    return this.messages.sendText(user, conversationId, dto.body);
  }

  @Post('media')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  sendMedia(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SendMediaDto,
  ) {
    if (!file) throw new BadRequestException('File required');
    return this.messages.sendMedia(user, conversationId, file, dto.caption);
  }
}
