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
exports.CampusService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../prisma");
let CampusService = class CampusService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createDto) {
        const existing = await this.prisma.campus.findFirst({
            where: {
                OR: [{ name: createDto.name }, { code: createDto.code }],
            },
        });
        if (existing) {
            throw new common_1.ConflictException('Campus with this name or code already exists');
        }
        return this.prisma.campus.create({
            data: createDto,
        });
    }
    async findAll(activeOnly = true) {
        return this.prisma.campus.findMany({
            where: activeOnly ? { isActive: true } : undefined,
            orderBy: { name: 'asc' },
        });
    }
    async findById(id) {
        const campus = await this.prisma.campus.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        users: true,
                        products: true,
                    },
                },
            },
        });
        if (!campus) {
            throw new common_1.NotFoundException('Campus not found');
        }
        return campus;
    }
    async update(id, updateDto) {
        const campus = await this.prisma.campus.findUnique({ where: { id } });
        if (!campus) {
            throw new common_1.NotFoundException('Campus not found');
        }
        return this.prisma.campus.update({
            where: { id },
            data: updateDto,
        });
    }
    async delete(id) {
        const campus = await this.prisma.campus.findUnique({ where: { id } });
        if (!campus) {
            throw new common_1.NotFoundException('Campus not found');
        }
        return this.prisma.campus.update({
            where: { id },
            data: { isActive: false },
        });
    }
};
exports.CampusService = CampusService;
exports.CampusService = CampusService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], CampusService);
//# sourceMappingURL=campus.service.js.map