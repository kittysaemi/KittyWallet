export class RefreshTokenResult {
  constructor(
    public readonly accessToken: string,
    public readonly refreshToken: string,
  ) {}
}
