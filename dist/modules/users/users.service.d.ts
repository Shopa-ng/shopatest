import { PrismaService } from '../../prisma';
import { UpdateUserDto, UploadStudentIdDto } from './dto';
import { VerificationStatus } from '@prisma/client';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findById(id: string): Promise<{
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
    updateProfile(id: string, updateDto: UpdateUserDto): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        campusId: string | null;
        id: string;
        role: import(".prisma/client").$Enums.UserRole;
        updatedAt: Date;
    }>;
    uploadStudentId(id: string, uploadDto: UploadStudentIdDto): Promise<{
        id: string;
        studentIdUrl: string | null;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
    }>;
    verifyUser(id: string, status: VerificationStatus): Promise<{
        email: string;
        id: string;
        isVerified: boolean;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
    }>;
    findPendingVerifications(campusId?: string): Promise<{
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
}
