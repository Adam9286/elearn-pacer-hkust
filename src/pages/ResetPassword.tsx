import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { externalSupabase } from "@/lib/externalSupabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";
import { Loader2, ArrowLeft, KeyRound } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const handleRecoveryToken = async () => {
      // DEBUG: Log what we receive
      console.log('Password Reset - Full URL:', window.location.href);
      console.log('Password Reset - Hash:', window.location.hash);
      console.log('Password Reset - Search:', window.location.search);
      
      // Check URL hash for recovery tokens (Supabase sends them in the hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      // ALSO check query params (some Supabase flows use these)
      const queryParams = new URLSearchParams(window.location.search);
      
      const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
      const type = hashParams.get('type') || queryParams.get('type');
      const errorCode = hashParams.get('error_code') || queryParams.get('error_code');
      const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
      
      console.log('Password Reset - Tokens found:', { accessToken: !!accessToken, type, errorCode });
      
      // Check for Supabase error responses
      if (errorCode) {
        console.error('Supabase error:', errorCode, errorDescription);
        setChecking(false);
        return;
      }
      
      if (accessToken && type === 'recovery') {
        // Set session from recovery tokens
        const { error } = await externalSupabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });
        
        if (!error) {
          setIsValidSession(true);
          // Clear hash from URL for cleaner experience
          window.history.replaceState(null, '', '/reset-password');
        } else {
          console.error('Failed to set session:', error.message);
        }
        setChecking(false);
        return;
      }
      
      // Fallback: check for existing session
      const { data: { session } } = await externalSupabase.auth.getSession();
      if (session) {
        setIsValidSession(true);
      }
      setChecking(false);
    };
    
    handleRecoveryToken();

    // Also listen for PASSWORD_RECOVERY event as fallback
    const { data: { subscription } } = externalSupabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
        setChecking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    const { error } = await externalSupabase.auth.updateUser({ password });

    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      navigate("/auth");
    }
  };

  if (checking) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </ThemeProvider>
    );
  }

  if (!isValidSession) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>
          <Card className="glass-card w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-destructive">
                Invalid or Expired Link
              </CardTitle>
              <CardDescription>
                This password reset link is invalid or has expired. Please request a new one.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full">
                <Link to="/auth">Request New Reset Link</Link>
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Reset links are single-use and expire after 24 hours.
                <br />
                Check browser console for debug info.
              </p>
            </CardContent>
          </Card>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute top-4 left-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Link>
          </Button>
        </div>
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
        <div className="w-full max-w-md">
          <Card className="glass-card">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <KeyRound className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Set New Password
              </CardTitle>
              <CardDescription>
                Enter your new password below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default ResetPassword;
