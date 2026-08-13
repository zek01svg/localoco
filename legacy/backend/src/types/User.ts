export interface User {
    firstName: string,
    lastName: string,
    email: string,
    imageUrl: string,
    bio:string,
    hasBusiness: boolean,
    referralCode: string,
    referredByUserID: string|null,
    createdAt: string,
    updatedAt: string
}

export interface UpdateProfileData {
    name?: string,
    email?:string,
    imageUrl?:string,
    bio?: string,
    hasBusiness?:boolean,
    updatedAt:string
}