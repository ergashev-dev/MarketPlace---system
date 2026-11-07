import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { updateUserDTO } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    async getMe(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: {id: userId},
            select: {
                id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
            }
            
        })
        if(!user) {
            throw new NotFoundException('User topilmadi')
        }
        return user
    }

    async updateMe(userId: number, data: updateUserDTO) {
        const user = await this.prisma.user.update({
            where: {id: userId},
            data,
            select: {
                id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
            }
        })
        return user
    }
}
