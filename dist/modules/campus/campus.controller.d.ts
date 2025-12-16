import { CampusService } from './campus.service';
import { CreateCampusDto, UpdateCampusDto } from './dto';
export declare class CampusController {
    private readonly campusService;
    constructor(campusService: CampusService);
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
    create(createDto: CreateCampusDto): Promise<{
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
