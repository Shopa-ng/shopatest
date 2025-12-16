"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_1 = require("../../prisma");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                isVerified: true,
                isEmailVerified: true,
                verificationStatus: true,
                campusId: true,
                campus: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                vendor: {
                    select: {
                        id: true,
                        storeName: true,
                        verificationStatus: true,
                    },
                },
                createdAt: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async updateProfile(id, updateDto) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return this.prisma.user.update({
            where: { id },
            data: updateDto,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                campusId: true,
                updatedAt: true,
            },
        });
    }
    async uploadStudentId(id, uploadDto) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return this.prisma.user.update({
            where: { id },
            data: {
                studentIdUrl: uploadDto.studentIdUrl,
                verificationStatus: client_1.VerificationStatus.PENDING,
            },
            select: {
                id: true,
                studentIdUrl: true,
                verificationStatus: true,
            },
        });
    }
    async verifyUser(id, status) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return this.prisma.user.update({
            where: { id },
            data: {
                verificationStatus: status,
                isVerified: status === client_1.VerificationStatus.APPROVED,
            },
            select: {
                id: true,
                email: true,
                verificationStatus: true,
                isVerified: true,
            },
        });
    }
    async findPendingVerifications(campusId) {
        return this.prisma.user.findMany({
            where: {
                verificationStatus: client_1.VerificationStatus.PENDING,
                studentIdUrl: { not: null },
                ...(campusId && { campusId }),
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                studentIdUrl: true,
                campus: {
                    select: {
                        name: true,
                    },
                },
                createdAt: true,
            },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map