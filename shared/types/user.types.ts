export interface User {
    userId: string;
    firstName: string,
    lastName: string,
    email: string,
    imageUrl: string,
    bio:string,
    hasBusiness: boolean,
    referralCode: string,
    referredByUserId: string|null,
    createdAt: string,
    updatedAt: string
}