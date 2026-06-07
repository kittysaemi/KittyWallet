import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException } from '../../../common/exceptions/app.exception';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { LogoutUseCase } from '../application/use-cases/logout.use-case';
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token.use-case';
import { RequestResetPasswordUseCase } from '../application/use-cases/request-reset-password.use-case';
import { SignupUseCase } from '../application/use-cases/signup.use-case';
import { LoginRequestDto } from './dto/request/login-request.dto';
import { RequestResetPasswordRequestDto } from './dto/request/request-reset-password-request.dto';
import { SignupRequestDto } from './dto/request/signup-request.dto';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly signupUseCase: SignupUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly requestResetPasswordUseCase: RequestResetPasswordUseCase,
  ) {}

  @Public()
  @Post('signup')
  async signup(@Body() dto: SignupRequestDto) {
    return this.signupUseCase.execute({
      email: dto.email,
      password: dto.password,
      passwordConfirm: dto.password_confirm,
      nickname: dto.nickname,
    });
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.loginUseCase.execute({
      email: dto.email,
      password: dto.password,
      userAgent: req.headers['user-agent'],
    });

    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
      path: '/',
    });

    return {
      access_token: result.accessToken,
      user: { user_id: result.user.userId, nickname: result.user.nickname },
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    if (!rawRefreshToken) {
      throw new AppException('AUTH_004', 'Refresh Token이 없습니다.', HttpStatus.UNAUTHORIZED);
    }

    const result = await this.refreshTokenUseCase.execute({
      rawRefreshToken,
      userAgent: req.headers['user-agent'],
    });

    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
      path: '/',
    });

    return { access_token: result.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.logoutUseCase.execute(BigInt(user.sub));

    res.cookie(REFRESH_TOKEN_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return null;
  }

  @Public()
  @Post('request-reset-password')
  @HttpCode(HttpStatus.OK)
  async requestResetPassword(@Body() dto: RequestResetPasswordRequestDto) {
    return this.requestResetPasswordUseCase.execute({ email: dto.email });
  }
}
