export class LoginResult {
  constructor(
    public readonly accessToken: string,
    public readonly refreshToken: string,
    public readonly userId: number,
    public readonly email: string,
    public readonly nickname: string,
  ) {}
}
