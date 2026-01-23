import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { userApi, UserProfile } from "@/services/user.api";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Camera, Trash2, LogOut, KeyRound, Loader2, CheckCircle2, XCircle, Mail, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";

export default function UserProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [phoneSending, setPhoneSending] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadProfileImage();
      setEmail(user.email || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const userProfile = await userApi.getProfile();
      setProfile(userProfile);
      setName(userProfile.full_name || "");
      setEmail(user?.email || "");
      setPhone(user?.phone || "");
    } catch (error) {
      console.error("Failed to load profile:", error);
      toast({
        title: "Error",
        description: "Failed to load user profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProfileImage = async () => {
    if (!user) return;
    
    try {
      // Check if profile image exists in user metadata
      const profileImageUrl = user.user_metadata?.profile_image_url;
      if (profileImageUrl) {
        setProfileImage(profileImageUrl);
      }
    } catch (error) {
      console.error("Failed to load profile image:", error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadProfileImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;

    try {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `profile-images/${user.id}/${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from("user-profiles")
        .upload(fileName, imageFile, {
          cacheControl: "31536000", // 1 year cache
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("user-profiles")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error("Error uploading profile image:", err);
      throw err;
    }
  };

  const handleSaveImage = async () => {
    if (!user) return;

    try {
      setUploadingImage(true);

      let imageUrl: string | null = null;

      if (imageFile) {
        // Upload new image
        imageUrl = await uploadProfileImage();
      } else if (imagePreview === null && profileImage) {
        // User wants to remove image
        imageUrl = null;
      } else {
        // No changes
        return;
      }

      // Update user metadata with profile image URL
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          profile_image_url: imageUrl,
        },
      });

      if (updateError) {
        throw updateError;
      }

      setProfileImage(imageUrl);
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast({
        title: "Success",
        description: imageUrl ? "Profile image updated" : "Profile image removed",
      });

      // Reload user to get updated metadata
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      if (updatedUser) {
        window.location.reload(); // Simple way to refresh user data
      }
    } catch (error) {
      console.error("Error saving profile image:", error);
      toast({
        title: "Error",
        description: "Failed to update profile image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "Email not found",
        variant: "destructive",
      });
      return;
    }

    try {
      setResettingPassword(true);
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for password reset instructions",
      });
    } catch (error) {
      console.error("Error sending password reset:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send password reset email",
        variant: "destructive",
      });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/signin", { replace: true });
  };

  const handleSaveName = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdating(true);
      const updatedProfile = await userApi.updateProfile({ full_name: name.trim() });
      setProfile(updatedProfile);
      toast({
        title: "Success",
        description: "Name updated successfully",
      });
    } catch (error) {
      console.error("Failed to update name:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update name",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Email cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      setEmailSending(true);
      
      // If user already has an email and it's different, update it
      if (user?.email && user.email !== email.trim()) {
        const { error } = await supabase.auth.updateUser({ email: email.trim() });
        
        if (error) {
          throw error;
        }

        toast({
          title: "Verification Email Sent",
          description: "Please check your new email and click the confirmation link to verify",
        });
      } else if (user?.email && !user.email_verified) {
        // Resend verification email for existing unverified email
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: user.email,
        });

        if (error) {
          throw error;
        }

        toast({
          title: "Verification Email Sent",
          description: "Please check your email and click the confirmation link to verify",
        });
      } else {
        // For users without email, we can't add it via updateUser
        // This would typically be done during signup
        toast({
          title: "Info",
          description: "Email is typically set during account creation. Please contact support if you need to add an email.",
        });
      }
    } catch (error) {
      console.error("Failed to update email:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update email",
        variant: "destructive",
      });
    } finally {
      setEmailSending(false);
    }
  };

  const handleUpdatePhone = async () => {
    if (!phone.trim()) {
      toast({
        title: "Error",
        description: "Phone number cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      setPhoneSending(true);
      const { error } = await supabase.auth.updateUser({ phone: phone.trim() });
      
      if (error) {
        throw error;
      }

      setPhoneOtpSent(true);
      toast({
        title: "Verification SMS Sent",
        description: "Please check your phone for the verification code",
      });
    } catch (error) {
      console.error("Failed to update phone:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update phone",
        variant: "destructive",
      });
    } finally {
      setPhoneSending(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp.trim() || phoneOtp.length < 6) {
      toast({
        title: "Error",
        description: "Please enter a valid OTP code",
        variant: "destructive",
      });
      return;
    }

    try {
      setPhoneVerifying(true);
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone.trim(),
        token: phoneOtp.trim(),
        type: 'phone_change',
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        setPhoneOtpSent(false);
        setPhoneOtp("");
        toast({
          title: "Phone Verified",
          description: "Your phone number has been updated and verified",
        });
        // Reload user to get updated phone
        const { data: { user: updatedUser } } = await supabase.auth.getUser();
        if (updatedUser) {
          setPhone(updatedUser.phone || "");
        }
      }
    } catch (error) {
      console.error("Failed to verify phone OTP:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify phone",
        variant: "destructive",
      });
    } finally {
      setPhoneVerifying(false);
    }
  };

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const displayImage = imagePreview || profileImage;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your profile information and settings</p>
        </div>

        {/* Profile Image Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Image</CardTitle>
            <CardDescription>Upload or change your profile picture</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={displayImage || undefined} alt="Profile" />
                <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {displayImage ? "Change" : "Upload"}
                  </Button>
                  {displayImage && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveImage}
                      disabled={uploadingImage}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                {(imageFile || imagePreview) && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveImage}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Image"
                    )}
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <Label>Name</Label>
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  disabled={updating}
                />
                <Button
                  onClick={handleSaveName}
                  disabled={updating || name.trim() === (profile?.full_name || "")}
                  size="sm"
                >
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Email Field */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Email</Label>
                {user?.email_verified && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {user?.email && !user?.email_verified && (
                  <XCircle className="h-4 w-4 text-yellow-500" />
                )}
              </div>
              <div className="space-y-2">
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={emailSending}
                  type="email"
                />
                <Button
                  onClick={handleUpdateEmail}
                  disabled={emailSending || !email.trim() || (user?.email && email === user.email && user.email_verified)}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  {emailSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      {!user?.email ? "Add Email" : user.email_verified && email === user.email ? "Email Verified" : email !== user.email ? "Update Email" : "Resend Verification"}
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Phone Field */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Phone Number</Label>
                {user?.phone_verified && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {user?.phone && !user?.phone_verified && (
                  <XCircle className="h-4 w-4 text-yellow-500" />
                )}
              </div>
              <div className="space-y-2">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  disabled={phoneSending || phoneVerifying || phoneOtpSent}
                  type="tel"
                />
                {!phoneOtpSent ? (
                  <Button
                    onClick={handleUpdatePhone}
                    disabled={phoneSending || !phone.trim() || phone === (user?.phone || "")}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    {phoneSending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Phone className="h-4 w-4 mr-2" />
                        {user?.phone ? "Update Phone" : "Add Phone"}
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Input
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value)}
                      placeholder="Enter verification code"
                      disabled={phoneVerifying}
                      maxLength={6}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleVerifyPhoneOtp}
                        disabled={phoneVerifying || !phoneOtp.trim()}
                        size="sm"
                        className="flex-1"
                      >
                        {phoneVerifying ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          "Verify"
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          setPhoneOtpSent(false);
                          setPhoneOtp("");
                        }}
                        variant="outline"
                        size="sm"
                        disabled={phoneVerifying}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              onClick={handleResetPassword}
              disabled={resettingPassword}
              className="w-full sm:w-auto"
            >
              {resettingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4 mr-2" />
                  Reset Password
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full sm:w-auto"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
