export type UserRole = "user" | "business";

export type UserProfile = User | BusinessOwner;

export interface BusinessOwner {
    ownerId?: string; // Required by backend
    uen: string;
    businessName: string;
    role: "business_owner";
    address: string;
    latitude?: string | null; // Required by backend
    longitude?: string | null; // Required by backend
    operatingDays: string[];
    businessEmail: string;
    phone: string;
    website: string;
    socialMedia: string;
    wallpaper?: string;
    priceTier: "$" | "$$" | "$$$";
    offersDelivery: boolean;
    offersPickup: boolean;
    open247: boolean;
    paymentOptions: string[];
    category: string;
    description: string;
    openingHours: {
        // ✅ Added
        [day: string]: {
            open: string;
            close: string;
        };
    };
}

export interface AuthState {
    isAuthenticated: boolean;
    role: UserRole | null;
    userId: string | null;
    userProfile: any | null;
    avatarUrl: string | null;
}

// ✅ User interface
export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
    role: UserRole;
    createdAt?: string;
    updatedAt?: string;
}

// ✅ Basic user signup data
export interface SignupData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    operatingDays: string[];
}

// ✅ Complete business signup data (all 5 steps from SignupPage)
export interface BusinessSignupData {
    // Step 1: Basic Information
    uen: string;
    businessName: string;
    businessCategory: string;
    description: string;
    address: string;
    operatingDays: string[];

    // Step 2: Contact Information
    phoneNumber: string;
    businessEmail: string;
    websiteLink?: string;
    socialMediaLink?: string;
    wallpaper?: File | null;

    // Step 3: Operating Hours
    open247: boolean;
    openingHours: {
        [day: string]: {
            open: string;
            close: string;
        };
    };

    // Step 4: Business Details
    priceTier: "$" | "$$" | "$$$";
    offersDelivery: boolean;
    offersPickup: boolean;
    paymentOptions: string[];

    // Step 5: Account Security
    password: string;
    confirmPassword: string;

    // Auto-generated
    dateOfCreation?: string;
    role?: UserRole;
    mode?: "signup";
}

// ✅ Legacy interface - keep for backward compatibility but not actively used
export interface BusinessVerificationData {
    uen: string;
    businessName: string;
    businessCategory: string;
    description: string;
    address: string;
    open247: boolean;
    openingHours: {
        [day: string]: {
            open: string;
            close: string;
        };
    };
    email: string;
    phoneNumber: string;
    websiteLink?: string;
    socialMediaLink?: string;
    wallpaper?: File | null;
    priceTier: "$" | "$$" | "$$$";
    offersDelivery: boolean;
    offersPickup: boolean;
    paymentOptions: string[];
    dateOfCreation?: string;
}
export interface BusinessModeState {
    isBusinessMode: boolean;
    currentBusinessUen: string | null;
    currentBusinessName: string | null;
}

export interface AuthState {
    isAuthenticated: boolean;
    role: UserRole | null;
    userId: string | null;
    accessToken: string | null;
    businessMode: BusinessModeState;
}

export interface AuthActions {
    login: (userId: string, role: UserRole, token?: string) => void;
    logout: () => void;
    setRole: (role: UserRole) => void;
    enableBusinessMode: (businessUen: string, businessName: string) => void;
    disableBusinessMode: () => void;
    switchBusiness: (businessUen: string, businessName: string) => void;
    setUserProfile: (profile: any) => void;
    setAvatarUrl: (url: string) => void;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
    isAuthenticated: false,
    role: null,
    userId: null,
    accessToken: null,
    businessMode: {
        isBusinessMode: false,
        currentBusinessUen: null,
        currentBusinessName: null,
    },
};
