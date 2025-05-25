
"use client";

import type { ReactNode } from "react";
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import type { UserProfile, FirebaseUser } from "@/types";
import { doc, getDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAnonymous: boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const fetchUserProfile = async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser && !firebaseUser.isAnonymous) {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        setUserProfile({ id: firebaseUser.uid, ...userDocSnap.data() } as UserProfile);
      } else {
        setUserProfile(null); 
      }
    } else {
      setUserProfile(null); // Anonymous users or no user means no specific profile
    }
  };
  
  const refreshUserProfile = async () => {
    if (user && !user.isAnonymous) {
      await fetchUserProfile(user);
    } else if (user && user.isAnonymous) {
      setUserProfile(null); // Ensure profile is null for anonymous users on refresh
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsAnonymous(firebaseUser.isAnonymous);
        await fetchUserProfile(firebaseUser);
        setLoading(false);
      } else {
        // No user logged in, try to sign in anonymously
        try {
          const userCredential = await signInAnonymously(auth);
          // onAuthStateChanged will be called again with the new anonymous user
          // setUser(userCredential.user); // This will be handled by the next onAuthStateChanged call
          // setIsAnonymous(true);
          // setUserProfile(null); 
          // setLoading(false); // Let the subsequent onAuthStateChanged handle setting loading to false
        } catch (error) {
          console.error("Anonymous sign-in failed:", error);
          // If anonymous sign-in fails, keep user as null and stop loading
          setUser(null);
          setIsAnonymous(false);
          setUserProfile(null);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    // Full page skeleton loader
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Skeleton className="w-32 h-32 rounded-full mb-6" />
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-6 w-64 mb-2" />
        <Skeleton className="h-6 w-56" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isAnonymous, refreshUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
