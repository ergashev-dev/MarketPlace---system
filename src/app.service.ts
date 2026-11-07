import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AppService {
  constructor(private jwtService: JwtService) {}

  generateToken(user: {id: number, email: string}) {
    const token = this.jwtService.sign({
      id: user.id,
      email: user.email
    })
  return token
  }
}
