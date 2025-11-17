import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUser } from '../hooks/useUser';
import { useTheme } from '../hooks/useTheme';
import { useBusinessByUen } from '../hooks/useBusinessByUen';
import { useAuthStore } from '../store/authStore';
import { ProfilePage } from './pages/ProfilePage';
import { BusinessProfilePage } from './pages/BusinessProfilePage';
import { ROUTES } from '../constants/routes';
import { Business } from '../types/business';
import { useState, useEffect } from 'react';
import { useUserPointsStore } from '../store/userStore';
import { toast } from 'sonner';
import { BusinessVerificationData } from '../types/auth.store.types';
import { useBookmarks } from '../hooks/useBookmarks'; 
import { url } from '../constants/url';
import { BusinessOwner } from '../types/auth.store.types';

const API_BASE_URL = url;

const uploadWallpaper = async (file: File): Promise<string> => {
    const toastId = toast.loading('Uploading image...');

    try {
      const sasResponse = await fetch(
        `${API_BASE_URL}/api/url-generator?filename=${encodeURIComponent(file.name)}`
      );

      if (!sasResponse.ok) {
        throw new Error('Failed to generate upload URL');
      }

      const sasData = await sasResponse.json();

      const uploadResponse = await fetch(sasData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          'x-ms-blob-type': 'BlockBlob'
        },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error(`Image upload failed with status ${uploadResponse.status}`);
      }

      const wallpaperUrl = `https://localoco.blob.core.windows.net/images/${sasData.blobName}`;
      toast.success('Image uploaded successfully!', { id: toastId });
      return wallpaperUrl;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast.error(`Upload error: ${errorMessage}`, { id: toastId });
      throw error;
    }
  };



export function ProfilePageDisplay() {
  const navigate = useNavigate();
  const { userId, role } = useAuth();
  const { isDarkMode } = useTheme();
  const { setPoints } = useUserPointsStore();
  const {bookmarkedBusinesses, toggleBookmark} = useBookmarks();
  
  const businessMode = useAuthStore((state) => state.businessMode);
  const setAvatarUrl = useAuthStore((state) => state.setAvatarUrl);
  const enableBusinessMode = useAuthStore((state) => state.enableBusinessMode);

  console.log('🔍 ProfilePageDisplay render - businessMode:', businessMode);
  console.log('🔍 ProfilePageDisplay render - role:', role);

  const { user, stats, updateUser, mutate: mutateUser } = useUser(userId);

  const { business, loading: businessLoading } = useBusinessByUen(
    businessMode.isBusinessMode ? businessMode.currentBusinessUen : null
  );

  console.log('════════════════════════════════════');
  console.log('📊 ProfilePageDisplay Debug Info:');
  console.log('userId:', userId);
  console.log('role:', role);
  console.log('user:', user);
  console.log('user type check:');
  console.log('  - has businessName?', user && 'businessName' in user);
  console.log('  - has name?', user && 'name' in user);
  console.log('  - has phone?', user && 'phone' in user);
  console.log('  - has operatingDays?', user && 'operatingDays' in user);
  console.log('════════════════════════════════════');

  useEffect(() => {
    if (stats?.loyaltyPoints !== undefined) {
      setPoints(stats.loyaltyPoints);
    }
  }, [stats?.loyaltyPoints, setPoints]);

  useEffect(() => {
    if (business?.image) {
      setAvatarUrl(business.image);
    }
  }, [business?.image, setAvatarUrl]);

  const handleBack = () => navigate(ROUTES.BUSINESSES);
  const handleViewBusinessDetails = (business: Business) => navigate(`${ROUTES.BUSINESSES}/${business.uen}`);
  const handleNavigateToVouchers = () => navigate(ROUTES.VOUCHERS);

  const handleAddBusiness = async (data: BusinessVerificationData) => {
    const toastId = toast.loading('Registering your business...');

    try {
      let wallpaperUrl = '';

      if (data.wallpaper && data.wallpaper instanceof File) {
        wallpaperUrl = await uploadWallpaper(data.wallpaper);
      }

      const priceTierMap: Record<string, 'low' | 'medium' | 'high'> = {
        '$': 'low',
        '$$': 'medium',
        '$$$': 'high',
      };
      const derivedOperatingDays = Object.keys(data.openingHours || {});


      const payload = {
        ...data,
        uen: data.uen ?? '',
        businessName: data.businessName ?? '',
        businessCategory: data.businessCategory ?? '',
        description: data.description ?? '',
        address: data.address ?? '',
        email: data.email ?? '',
        phoneNumber: data.phoneNumber ?? '',
        websiteLink: data.websiteLink ?? '',
        socialMediaLink: data.socialMediaLink ?? '',
        wallpaper: wallpaperUrl || '',
        dateOfCreation: data.dateOfCreation ?? null,
        priceTier: priceTierMap[data.priceTier] || 'medium',
        offersDelivery: data.offersDelivery ? 1 : 0,
        offersPickup: data.offersPickup ? 1 : 0,
        ownerId: userId,
        latitude: 0,
        longitude: 0,
        open247: data.open247 ? 1 : 0,
        operatingDays: derivedOperatingDays,

      }
      delete (payload as any).website;
      delete (payload as any).socialMedia;

      const response = await fetch(`${API_BASE_URL}/api/register-business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const result = await response.json();
      toast.success('Business registered successfully! Refreshing...', { id: toastId });

      setTimeout(() => window.location.reload(), 800);
    } catch (error: any) {
      console.error('Error registering business:', error);
      toast.error(error.message || 'Failed to register business', { id: toastId });
    }
  };

  if (!userId || !user) {
    console.log('⏳ Showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: isDarkMode ? '#3a3a3a' : '#f9fafb' }}>
        <div style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Loading profile...</div>
      </div>
    );
  }

  if (role === 'business' && businessMode.isBusinessMode) {
    console.log('🏢 Business mode active');
    console.log('🏢 Current business UEN:', businessMode.currentBusinessUen);
    console.log('🏢 Business data:', business);

    if (businessLoading || !business) {
      console.log('⏳ Loading business data...');
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: isDarkMode ? '#3a3a3a' : '#f9fafb' }}>
          <div style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Loading business profile...</div>
        </div>
      );
    }

    const businessOwner: BusinessOwner = {
      ownerId: userId || '', // ✅ Change 'id' to 'ownerId'
      role: 'business_owner',
      businessName: business.businessName,
      address: business.address || '',
      operatingDays: business.operatingDays || [],
      businessEmail: business.email || '',
      phone: business.phoneNumber || '',
      website: business.websiteLink || '',
      socialMedia: business.socialMediaLink || '',
      wallpaper: business.wallpaper,
      priceTier: (business.priceTier || '') as any,
      offersDelivery: business.offersDelivery || false,
      offersPickup: business.offersPickup || false,
      paymentOptions: business.paymentOptions || [],
      category: business.businessCategory || '',
      description: business.description || '',
      open247: !!business.open247, // Use !! to handle 1/0 from backend
      openingHours: business.openingHours || {},
    };

    console.log('🏢 Rendering BusinessProfilePage with:', businessOwner);

    return (
      <BusinessProfilePage
        businessOwner={businessOwner}
        onBack={handleBack}
        // Don't pass updateUser - business is already updated via /api/update-business
      />
    );
  }

  console.log('👤 Rendering regular ProfilePage');
  return (
    <ProfilePage
      user={user as any}
      stats={stats}
      bookmarkedBusinesses={bookmarkedBusinesses}
      onBack={handleBack}
      onUpdateUser={updateUser}
      onAddBusiness={handleAddBusiness}
      onViewBusinessDetails={handleViewBusinessDetails}
      onBookmarkToggle={toggleBookmark}
      onNavigateToVouchers={handleNavigateToVouchers}
    />
  );
}
