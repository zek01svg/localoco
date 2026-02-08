export interface User {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    image: string; // follow better-auth naming (stick with image, dont force imageUrl)
    bio: string;
    hasBusiness: boolean;
    referralCode: string;
    referredByUserId: string;
    createdAt: Date;
    updatedAt: Date;
}
