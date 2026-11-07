import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean{
    const request = context.switchToHttp().getRequest()

    const authHeader = request.headers.authoration

    if (!authHeader) {
      throw new UnauthorizedException('tokening bilan kel')
    }

    const token = authHeader.split(" ")[0]

    try {
      const payload = this.jwtService.verify(token)
      request.user = payload
      return true;
    } catch (error) {
      throw new UnauthorizedException("token xato")
    }
  }
}
