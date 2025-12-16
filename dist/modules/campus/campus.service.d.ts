import { PrismaService } from '../../prisma';
import { CreateCampusDto, UpdateCampusDto } from './dto';
export declare class CampusService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createDto: CreateCampusDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        location: string | null;
        isActive: boolean;
    }>;
    findAll(activeOnly?: boolean): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        location: string | null;
        isActive: boolean;
    }[]>;
    findById(id: string): Promise<{
        _count: {
            users: number;
            products: number;
        };
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        location: string | null;
        isActive: boolean;
    }>;
    update(id: string, updateDto: UpdateCampusDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        location: string | null;
        isActive: boolean;
    }>;
    delete(id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        location: string | null;
        isActive: boolean;
    }>;
}
