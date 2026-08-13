import React, { useState } from 'react';
import { Settings, User, Bell, Lock, Globe, Moon, Sun, ChevronRight, Trash2, LogOut } from 'lucide-react';
import { Card } from './ui/card';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { toast } from 'sonner';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { url } from '../constants/url';

interface SettingsPageProps {
  onBack?: () => void;
}

export function SettingsPage({ onBack}: SettingsPageProps) {
  const isDarkMode = useThemeStore(state => state.isDarkMode);
  const toggleTheme = useThemeStore(state => state.toggleTheme);
  const { logout, user } = useAuth(); // Assuming useAuth provides the user object
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.role);

  const onThemeToggle = (checked: boolean) => {
    toggleTheme();
  };

  const handleSignOut = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login'); // Redirect to login
  };
  
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    events: false,
    reviews: true,
  });

  const [privacy, setPrivacy] = useState({
    publicProfile: true,
    showBookmarks: false,
    showReviews: true,
  });

  const [language, setLanguage] = useState('english');
  const [timezone, setTimezone] = useState('singapore');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const bgColor = isDarkMode ? '#3a3a3a' : '#f9fafb';
  const cardBg = isDarkMode ? '#2a2a2a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#000000';

  const handleClearCache = () => {
    toast.success('Cache cleared successfully', {
      description: 'All cached data has been removed.',
    });
  };

  const handleDeleteAccount = async () => {
    try {
      const endpoint = role === 'business' ? '/api/delete-business' : '/api/user/delete-profile';
      const response = await fetch(`${url}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // You might need to include an authorization token here
        },
        body: JSON.stringify({ userId: user?.id }), // Assuming you need to send the user ID
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      toast.success('Account deleted successfully');
      logout();
      navigate('/login'); // Redirect to login
    } catch (error) {
      toast.error('Failed to delete account. Please try again.');
    } finally {
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="min-h-screen md:pl-6" style={{ backgroundColor: bgColor }}>
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="mb-3">
          <h1 className="text-3xl" style={{ color: textColor }}>Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your account settings and preferences</p>
        </div>

        <div className="space-y-3">
          {/* Account Settings */}
          <Card className="p-3" style={{ backgroundColor: cardBg, color: textColor }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-primary rounded-lg">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="language" className="text-sm">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger 
                    id="language"
                    className={`h-9 ${isDarkMode ? 'bg-[#3a3a3a] border-white/20 text-white' : 'bg-input-background'}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: cardBg, color: textColor, borderColor: isDarkMode ? '#404040' : '#e5e7eb' }}>
                    <SelectItem value="english" className={isDarkMode ? 'text-white hover:bg-[#404040] focus:bg-[#404040]' : ''}>English</SelectItem>
                    <SelectItem value="chinese" className={isDarkMode ? 'text-white hover:bg-[#404040] focus:bg-[#404040]' : ''}>中文 (Chinese)</SelectItem>
                    <SelectItem value="malay" className={isDarkMode ? 'text-white hover:bg-[#404040] focus:bg-[#404040]' : ''}>Bahasa Melayu (Malay)</SelectItem>
                    <SelectItem value="tamil" className={isDarkMode ? 'text-white hover:bg-[#404040] focus:bg-[#404040]' : ''}>தமிழ் (Tamil)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="timezone" className="text-sm">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger 
                    id="timezone"
                    className={`h-9 ${isDarkMode ? 'bg-[#3a3a3a] border-white/20 text-white' : 'bg-input-background'}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: cardBg, color: textColor, borderColor: isDarkMode ? '#404040' : '#e5e7eb' }}>
                    <SelectItem value="singapore" className={isDarkMode ? 'text-white hover:bg-[#404040] focus:bg-[#404040]' : ''}>Singapore (GMT+8)</SelectItem>
                    <SelectItem value="bangkok" className={isDarkMode ? 'text-white hover:bg-[#404040] focus:bg-[#404040]' : ''}>Bangkok (GMT+7)</SelectItem>
                    <SelectItem value="jakarta" className={isDarkMode ? 'text-white hover:bg-[#404040] focus:bg-[#404040]' : ''}>Jakarta (GMT+7)</SelectItem>
                    <SelectItem value="kuala-lumpur" className={isDarkMode ? 'text-white hover:bg-[#404040] focus:bg-[#404040]' : ''}>Kuala Lumpur (GMT+8)</SelectItem>
                    <SelectItem value="manila" className={isDarkMode ? 'text-white hover:bg-[#404040] focus:bg-[#404040]' : ''}>Manila (GMT+8)</SelectItem>
                    <SelectItem value="tokyo" className={isDarkMode ? 'text-white hover:bg-[#404040] focus:bg-[#404040]' : ''}>Tokyo (GMT+9)</SelectItem>
                    <SelectItem value="sydney" className={isDarkMode ? 'text-white hover:bg-[#404040] focus:bg-[#404040]' : ''}>Sydney (GMT+10)</SelectItem>
                    <SelectItem value="auckland" className={isDarkMode ? 'text-white hover:bg-[#404040] focus:bg-[#404040]' : ''}>Auckland (GMT+12)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="p-3" style={{ backgroundColor: cardBg, color: textColor }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-primary rounded-lg">
                {isDarkMode ? <Sun className="w-4 h-4 text-white" /> : <Moon className="w-4 h-4 text-white" />}
              </div>
              <h2 className="text-lg">Appearance</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Dark Mode</Label>
                <p className="text-xs text-muted-foreground">Toggle between light and dark theme</p>
              </div>
              <Switch
                checked={isDarkMode}
                onCheckedChange={onThemeToggle}
              />
            </div>
          </Card>

          <Card className="p-3" style={{ backgroundColor: cardBg, color: textColor }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-primary rounded-lg">
                <Bell className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg">Notification Preferences</h2>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Push Notifications</Label>
                  <p className="text-xs text-muted-foreground">Get notified about activity</p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Event Announcements</Label>
                  <p className="text-xs text-muted-foreground">Stay updated on local events</p>
                </div>
                <Switch
                  checked={notifications.events}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, events: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Review Responses</Label>
                  <p className="text-xs text-muted-foreground">Get notified when businesses respond</p>
                </div>
                <Switch
                  checked={notifications.reviews}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, reviews: checked })}
                />
              </div>
            </div>
          </Card>

          <Card className="p-3" style={{ backgroundColor: cardBg, color: textColor }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-primary rounded-lg">
                <Lock className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg">Privacy & Security</h2>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Public Profile</Label>
                  <p className="text-xs text-muted-foreground">Allow others to view your profile</p>
                </div>
                <Switch
                  checked={privacy.publicProfile}
                  onCheckedChange={(checked) => setPrivacy({ ...privacy, publicProfile: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Show Bookmarks</Label>
                  <p className="text-xs text-muted-foreground">Display your bookmarks publicly</p>
                </div>
                <Switch
                  checked={privacy.showBookmarks}
                  onCheckedChange={(checked) => setPrivacy({ ...privacy, showBookmarks: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Show Reviews</Label>
                  <p className="text-xs text-muted-foreground">Make your reviews public</p>
                </div>
                <Switch
                  checked={privacy.showReviews}
                  onCheckedChange={(checked) => setPrivacy({ ...privacy, showReviews: checked })}
                />
              </div>
            </div>
          </Card>

          <Card className="p-3" style={{ backgroundColor: cardBg, color: textColor }}>
            <h3 className="text-lg mb-2" style={{ color: textColor }}>Account Actions</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={handleSignOut}
                className={`w-full justify-between h-9 ${isDarkMode ? 'bg-[#FFA1A3]/10 text-[#FFA1A3] border-[#FFA1A3]/30 hover:bg-[#FFA1A3]/20' : 'text-[#FFA1A3] border-[#FFA1A3]/30 hover:bg-[#FFA1A3]/10'}`}
              >
                Sign Out
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          <Card className="p-3 border-destructive" style={{ backgroundColor: cardBg, color: textColor }}>
            <h3 className="text-destructive text-lg mb-2">Danger Zone</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={handleClearCache}
                className={`w-full justify-between h-9 ${isDarkMode ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20' : 'text-foreground'}`}
              >
                Clear Cache
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className={`w-full justify-between h-9 border-destructive hover:bg-destructive hover:text-white ${isDarkMode ? 'bg-destructive/10 text-destructive' : 'text-destructive'}`}
              >
                Delete Account
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent style={{ backgroundColor: cardBg, color: textColor, borderColor: isDarkMode ? '#404040' : '#e5e7eb' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2" style={{ color: textColor }}>
              <Trash2 className="w-5 h-5 text-destructive" />
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Your profile and reviews</li>
                <li>Saved bookmarks and vouchers</li>
                <li>Loyalty points and rewards</li>
                <li>Forum posts and comments</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className={isDarkMode ? 'bg-[#3a3a3a] text-white border-white/20 hover:bg-[#404040]' : ''}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

