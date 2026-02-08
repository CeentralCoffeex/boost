'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Menu, X, Globe } from 'lucide-react';
import ThemeToggle from '@/components/admin/ThemeToggle';
import LogoutButton from '@/components/auth/LogoutButton';
import { Session } from 'next-auth';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminNavbarProps {
  session: Session | null;
}

export default function AdminNavbar({ session }: AdminNavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="admin-nav relative">
      <div className="admin-nav-content">
        <div className="admin-nav-left">
          <h1 className="admin-nav-title">Administration</h1>
          
          {/* Desktop Navigation */}
          <div className="admin-nav-links hidden md:flex">
            <Link href="/admin" className="admin-nav-link">
              Dashboard
            </Link>
            <Link href="/admin/projects" className="admin-nav-link">
              Projets
            </Link>
            <Link href="/admin/users" className="admin-nav-link">
              Utilisateurs
            </Link>
            <Link href="/admin/settings" className="admin-nav-link">
              Paramètres
            </Link>
          </div>
        </div>

        <div className="admin-nav-right">
          {/* Desktop User Info & Actions */}
          <div className="hidden md:flex items-center gap-4">
            <span className="admin-user-info">
              Connecté en tant que {session?.user?.email}
            </span>
            <ThemeToggle />
            <Link 
              href="/"
              className="p-2 text-admin-text hover:bg-admin-border rounded-md transition-colors"
              title="Retour au site"
            >
              <Globe size={20} />
            </Link>
            <LogoutButton className="admin-logout-link">
              Déconnexion
            </LogoutButton>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 text-admin-text hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors bg-transparent"
            onClick={toggleMobileMenu}
            aria-label="Menu"
          >
            {isMobileMenuOpen ? (
              <X size={24} />
            ) : (
              <Menu size={24} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown (Portal) */}
      {mounted && createPortal(
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000]"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              
              {/* Sidebar Menu */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="md:hidden fixed top-0 left-0 bottom-0 w-64 bg-admin-card border-r border-admin-border shadow-2xl z-[2001] overflow-y-auto"
              >
                <div className="p-4 flex flex-col h-full">
                  <div className="flex justify-end items-center mb-6">
                    <button 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-admin-text rounded-md transition-colors w-auto"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 flex-1">
                    <Link 
                      href="/admin" 
                      className="admin-nav-link block px-4 py-3 hover:bg-admin-border/50 rounded-lg text-left"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link 
                      href="/admin/projects" 
                      className="admin-nav-link block px-4 py-3 hover:bg-admin-border/50 rounded-lg text-left"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Projets
                    </Link>
                    <Link 
                      href="/admin/users" 
                      className="admin-nav-link block px-4 py-3 hover:bg-admin-border/50 rounded-lg text-left"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Utilisateurs
                    </Link>
                    <Link 
                      href="/admin/settings" 
                      className="admin-nav-link block px-4 py-3 hover:bg-admin-border/50 rounded-lg text-left"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Paramètres
                    </Link>
                  </div>
                  
                  <div className="border-t border-admin-border pt-4 mt-auto">
                    <div className="flex flex-row items-center justify-between px-2 w-full">
                      <div className="flex items-center justify-center">
                        <ThemeToggle />
                      </div>
                      <LogoutButton className="admin-logout-link text-sm whitespace-nowrap">
                        Déconnexion
                      </LogoutButton>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </nav>
  );
}
