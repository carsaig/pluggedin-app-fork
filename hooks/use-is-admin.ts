'use client';

import { useAuth } from './use-auth';

/**
 * Hook to check if the current user is an admin
 * Admins are defined by the ADMIN_USERS environment variable
 */
export function useIsAdmin(): boolean {
  const { session } = useAuth();
  
  if (!session?.user?.email) {
    return false;
  }

  // Get admin emails from environment variable
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_USERS?.split(',').map(email => email.trim()) || [];
  
  return adminEmails.includes(session.user.email);
}