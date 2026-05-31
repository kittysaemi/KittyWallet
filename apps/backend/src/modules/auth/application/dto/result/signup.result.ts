export class SignupResult {
  constructor(
    public readonly userId: number,
    public readonly email: string,
    public readonly nickname: string,
  ) {}
}
