import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './notifications.gateway';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') ?? 'fallback_secret',
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [NotificationsGateway],
  exports: [NotificationsGateway],
})
export class WebsocketModule {}