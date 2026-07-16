import { Body, Controller, Logger, Post } from '@nestjs/common';
import { Public } from '../common/decorators';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private webhooks: WebhooksService) {}

  @Public()
  @Post('evolution')
  async evolution(@Body() body: unknown) {
    try {
      await this.webhooks.handleEvolution(body);
    } catch (err) {
      this.logger.error(`Webhook error: ${(err as Error).message}`);
    }
    return { received: true };
  }
}
