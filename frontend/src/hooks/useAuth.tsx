import { useState, useEffect, useCallback, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { clearAccountCache } from "./useAccount";

const INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 minutes in milliseconds

// Helper function to check if current route is public
const isPublicRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const pathname = window.location.pathname;
  return (
    pathname === "/landing" ||
    pathname.startsWith("/group") ||
    pathname.startsWith("/payment/callback")
  );
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const handleLogout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        // Still clear user state even if signOut fails
      }
      setUser(null);
      // Clear timer on logout
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      // Clear any cached data
      localStorage.removeItem('public_group_session');
      // Clear account cache
      clearAccountCache();
    } catch (error) {
      console.error('Failed to logout:', error);
      // Force clear user state even on error
      setUser(null);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      // Clear account cache even on error
      clearAccountCache();
    }
  }, []);

  const resetInactivityTimer = useCallback(() => {
    // Don't set inactivity timer on public routes
    if (isPublicRoute()) {
      return;
    }

    lastActivityRef.current = Date.now();

    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Set new timer
    inactivityTimerRef.current = setTimeout(() => {
      // Check if user is still inactive
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        handleLogout();
      }
    }, INACTIVITY_TIMEOUT);
  }, [handleLogout]);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    // Set a timeout to ensure loading state resolves even if session check hangs
    timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('Session check timeout - resolving loading state');
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (!mounted) return;
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user && !isPublicRoute()) {
          resetInactivityTimer();
        }
      })
      .catch((error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        console.error('Failed to get session:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      
      const newUser = session?.user ?? null;
      const previousUser = user;
      
      // Clear account cache if user changed or logged out
      if (!newUser || (previousUser && newUser?.id !== previousUser.id)) {
        clearAccountCache();
      }
      
      setUser(newUser);
      setLoading(false);
      if (session?.user && !isPublicRoute()) {
        resetInactivityTimer();
      } else {
        // Clear timer if logged out
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
          inactivityTimerRef.current = null;
        }
      }
    });

    // Track user activity (only on admin routes)
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => {
      // Only track activity on admin routes
      if (isPublicRoute()) {
        return;
      }
      
      // Use ref to check user state to avoid dependency issues
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          resetInactivityTimer();
        }
      });
    };

    // Only add activity listeners on admin routes
    if (!isPublicRoute()) {
      activityEvents.forEach(event => {
        document.addEventListener(event, handleActivity);
      });
    }

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      subscription.unsubscribe();
      if (!isPublicRoute()) {
        activityEvents.forEach(event => {
          document.removeEventListener(event, handleActivity);
        });
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [resetInactivityTimer]);

  return { user, loading, logout: handleLogout };
}

