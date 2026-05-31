import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';
import { SignupUseCase } from '../application/use-cases/signup.use-case';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { LogoutUseCase } from '../application/use-cases/logout.use-case';
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token.use-case';
import { RequestResetPasswordUseCase } from '../application/use-cases/request-reset-password.use-case';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.use-case';
import { SignupRequestDto } from './dto/request/signup-request.dto';
import { LoginRequestDto } from './dto/request/login-request.dto';
import { RequestResetPasswordRequestDto } from './dto/request/request-reset-password-request.dto';
import { ResetPasswordRequestDto } from './dto/request/reset-password-request.dto';
import { SignupCommand } from '../application/dto/command/signup.command';
import { LoginCommand } from '../application/dto/command/login.command';
import { LogoutCommand } from '../application/dto/command/logout.command';
import { RefreshTokenCommand } from '../application/dto/command/refresh-token.command';
import { RequestResetPasswordCommand } from '../application/dto/command/request-reset-password.command';
import { ResetPasswordCommand } from '../application/dto/command/reset-password.command';
import { SignupResponseDto } from './dto/response/signup-response.dto';
import { LoginResponseDto } from './dto/response/login-response.dto';
import { RefreshTokenResponseDto } from './dto/response/refresh-token-response.dto';
import { BusinessException } from '../../../common/exceptions/business.exception';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly signupUseCase: SignupUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly requestResetPasswordUseCase: RequestResetPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  @Public()
  @Post('signup')
  async signup(@Body() dto: SignupRequestDto): Promise<SignupResponseDto> {
    const result = await this.signupUseCase.execute(
      new SignupCommand(dto.email, dto.password, dto.password_confirm, dto.nickname),
    );
    const response = new SignupResponseDto();
    response.userId = result.userId;
    response.email = result.email;
    response.nickname = result.nickname;
    return response;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const userAgent = req.headers['user-agent'];
    const result = await this.loginUseCase.execute(
      new LoginCommand(dto.email, dto.password, userAgent),
    );

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    const response = new LoginResponseDto();
    response.accessToken = result.accessToken;
    response.userId = result.userId;
    response.email = result.email;
    response.nickname = result.nickname;
    return response;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<null> {
    await this.logoutUseCase.execute(new LogoutCommand(BigInt(user.sub)));

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return null;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshTokenResponseDto> {
    const refreshToken = (req.cookies as Record<string, string>)['refresh_token'];
    if (!refreshToken) {
      throw new BusinessException('AUTH_004');
    }

    const userAgent = req.headers['user-agent'];
    const result = await this.refreshTokenUseCase.execute(
      new RefreshTokenCommand(refreshToken, userAgent),
    );

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    const response = new RefreshTokenResponseDto();
    response.accessToken = result.accessToken;
    return response;
  }

  @Public()
  @Post('request-reset-password')
  @HttpCode(HttpStatus.OK)
  async requestResetPassword(
    @Body() dto: RequestResetPasswordRequestDto,
  ): Promise<null> {
    await this.requestResetPasswordUseCase.execute(
      new RequestResetPasswordCommand(dto.email),
    );
    return null;
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordRequestDto): Promise<null> {
    await this.resetPasswordUseCase.execute(
      new ResetPasswordCommand(dto.resetToken, dto.newPassword, dto.confirmPassword),
    );
    return null;
  }
}
