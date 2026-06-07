import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface SendPasswordResetMailParams {
  to: string;
  resetToken: string;
}

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  async sendPasswordResetMail(params: SendPasswordResetMailParams): Promise<void> {
    const resetUrl = this.buildPasswordResetUrl(params.resetToken);
    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: Number(this.configService.get<string>('SMTP_PORT') ?? 587),
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      auth: this.getAuth(),
    });

    await transporter.sendMail({
      from: this.configService.get<string>('SMTP_FROM') ?? 'no-reply@kittywallet.local',
      to: params.to,
      subject: '[KittyWallet] 비밀번호 재설정 안내',
      text: [
        '비밀번호 재설정을 요청하셨습니다.',
        '아래 링크에서 30분 이내에 새 비밀번호를 설정해주세요.',
        resetUrl,
      ].join('\n\n'),
      html: [
        '<p>비밀번호 재설정을 요청하셨습니다.</p>',
        '<p>아래 링크에서 30분 이내에 새 비밀번호를 설정해주세요.</p>',
        `<p><a href="${resetUrl}">비밀번호 재설정하기</a></p>`,
      ].join(''),
    });
  }

  private getAuth(): { user: string; pass: string } | undefined {
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');

    if (!user || !pass) {
      return undefined;
    }

    return { user, pass };
  }

  private buildPasswordResetUrl(resetToken: string): string {
    const baseUrl =
      this.configService.get<string>('PASSWORD_RESET_URL') ??
      `${this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173'}/reset-password`;

    const url = new URL(baseUrl);
    url.searchParams.set('token', resetToken);
    return url.toString();
  }
}
