import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../../../supabase/supabase";
import { LoadingScreen } from "@/components/ui/loading-spinner";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, fullName: string) => Promise<any>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Check if Supabase client is available
    if (!supabase) {
      console.error("Supabase client is not initialized!");
      setLoading(false);
      return;
    }

    const initializeAuth = async () => {
      try {
        // Check active sessions and sets the user
        const { data } = await supabase.auth.getSession();
        setUser(data.session?.user ?? null);

        // Listen for changes on auth state (signed in, signed out, etc.)
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      console.log("Starting signup process for:", email);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: window.location.origin + "/login",
        },
      });

      if (error) {
        console.error("Signup error:", error);
        throw error;
      }

      console.log(
        "Signup successful, user data:",
        data.user ? "User created" : "No user data",
      );

      // Create a user record in the public.users table
      if (data.user) {
        try {
          const { error: profileError } = await supabase.from("users").upsert(
            {
              id: data.user.id,
              email: email,
              full_name: fullName,
              token_identifier: data.user.id,
            },
            { onConflict: "id" },
          );

          if (profileError) {
            console.error("Error creating user profile:", profileError);
          } else {
            console.log("User profile created successfully");
          }
        } catch (profileError) {
          console.error("Exception creating user profile:", profileError);
          // Don't throw here, as the auth signup was successful
        }
      }

      return data;
    } catch (error) {
      console.error("Error during signup:", error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log("Starting signin process for:", email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Signin error:", error);
        throw error;
      }

      console.log(
        "Signin successful",
        data.session ? "Session created" : "No session data",
      );
      return data;
    } catch (error) {
      console.error("Error during signin:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Signout error:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error during signout:", error);
      throw error;
    }
  };

  if (!initialized && loading) {
    return <LoadingScreen text="Initializing authentication..." />;
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
