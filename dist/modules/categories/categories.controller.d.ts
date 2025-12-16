import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    findAll(activeOnly?: boolean): Promise<({
        _count: {
            products: number;
        };
    } & {
        id: string;
        name: string;
        description: string | null;
        icon: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    findById(id: string): Promise<{
        _count: {
            products: number;
        };
    } & {
        id: string;
        name: string;
        description: string | null;
        icon: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    create(createDto: CreateCategoryDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        icon: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, updateDto: UpdateCategoryDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        icon: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    delete(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        icon: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
