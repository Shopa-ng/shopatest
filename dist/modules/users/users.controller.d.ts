import { VerificationStatus } from '@prisma/client';
import { UpdateUserDto, UploadStudentIdDto } from './dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMe(userId: string): Promise<{
        campus: {
            name: string;
            id: string;
            code: string;
        } | null;
        vendor: {
            id: string;
            verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
            storeName: string;
        } | null;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        campusId: string | null;
        id: string;
        role: import(".prisma/client").$Enums.UserRole;
        isVerified: boolean;
        isEmailVerified: boolean;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
        createdAt: Date;
    }>;
    updateMe(userId: string, updateDto: UpdateUserDto): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        campusId: string | null;
        id: string;
        role: import(".prisma/client").$Enums.UserRole;
        updatedAt: Date;
    }>;
    uploadStudentId(userId: string, uploadDto: UploadStudentIdDto): Promise<{
        id: string;
        studentIdUrl: string | null;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
    }>;
    getPendingVerifications(campusId?: string): Promise<{
        campus: {
            name: string;
        } | null;
        email: string;
        firstName: string;
        lastName: string;
        id: string;
        studentIdUrl: string | null;
        createdAt: Date;
    }[]>;
    verifyUser(id: string, status: VerificationStatus): Promise<{
        email: string;
        id: string;
        isVerified: boolean;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
    }>;
}
