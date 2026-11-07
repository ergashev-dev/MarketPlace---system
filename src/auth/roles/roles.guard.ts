import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
  ) { }
  canActivate(
    context: ExecutionContext,
  ): boolean {
    const roles =
      this.reflector.getAllAndOverride<string[]>(
        'roles',
        [
          context.getHandler(),
          context.getClass(),
        ],
      );
    if (!roles) {
      return true;
    }
    const request =
      context.switchToHttp().getRequest();
    const user =
      request.user;
    if (!user) {
      throw new ForbiddenException(
        'User not found',
      );
    }
    const hasRole =
      roles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        'You do not have permission',
      );
    }
    return true;
  }
}