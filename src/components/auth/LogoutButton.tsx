'use client';

import { signOut } from 'next-auth/react';

interface LogoutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function LogoutButton({ className, children }: LogoutButtonProps) {
  const handleLogout = async () => {
    try {
      await signOut({
        callbackUrl: '/auth/login',
        redirect: true
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className={className || 'admin-logout-link'}
      type="button"
    >
      {children || 'Déconnexion'}
    </button>
  );
}