export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'user' | 'business'; // ✅ Add this
  memberSince?: string;
  bio?: string;
  location?: string;
}

export interface UserStats {
  vouchersCount: number;
  reviewsCount: number;
  loyaltyPoints: number;
}