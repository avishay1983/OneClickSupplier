import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Local types (replacing @supabase/supabase-js imports)
interface User {
  id: string;
  email?: string;
  full_name?: string;
  [key: string]: any;
}

interface Session {
  access_token: string;
  user: User;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  checkAdminStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(!!data);
    } catch (error) {
      console.error('Error in checkAdminStatus:', error);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check admin status and sync profile name when user changes
  useEffect(() => {
    const syncProfileName = async (user: User) => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
          
        if (profile && !profile.full_name) {
          const metadataName = user.user_metadata?.full_name || user.user_metadata?.name;
          // Only sync if metadata name exists and is not an email
          if (metadataName && !metadataName.includes('@')) {
            console.log('Syncing profile name from metadata:', metadataName);
            await supabase
              .from('profiles')
              .update({ full_name: metadataName })
              .eq('id', user.id);
          }
        }
      } catch (err) {
        console.error('Error syncing profile name:', err);
      }
    };

    if (user) {
      setTimeout(() => {
        checkAdminStatus();
        syncProfileName(user);
      }, 0);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isAdmin, signOut, checkAdminStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
