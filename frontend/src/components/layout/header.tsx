'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Home, Linkedin, Youtube, Calendar, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { api, AuthStatus } from '@/lib/api-client';

export function Header() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ authenticated: false });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await api.checkAuthStatus();
        setAuthStatus(status);
      } catch (err) {
        console.error('Failed to check auth status:', err);
      }
    };
    checkAuth();
  }, []);

  const handleSignIn = () => {
    window.location.href = '/login/google';
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-3 sm:px-4 py-3 md:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a
            href="https://www.synapticlabs.ai"
            className="hover:opacity-80 transition-opacity flex-shrink-0"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="https://picoshare-production-7223.up.railway.app/-emRBGyJeG9"
              alt="Synaptic Labs"
              width={120}
              height={40}
              className="h-8 md:h-10 w-auto"
              unoptimized
            />
          </a>

          {/* Social Links - Desktop Only */}
          <div className="hidden md:flex items-center space-x-3">
            <Link
              href="/"
              aria-label="Return to main page"
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
            >
              <Home className="w-6 h-6" />
            </Link>

            <a
              href="https://www.linkedin.com/company/synaptic-labs"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Synaptic Labs on LinkedIn"
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
            >
              <Linkedin className="w-6 h-6" />
            </a>

            <a
              href="https://www.youtube.com/@synapticlabs"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Synaptic Labs on YouTube"
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
            >
              <Youtube className="w-6 h-6" />
            </a>

            <a
              href="https://meetings.hubspot.com/synaptic-labs/md-converter"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Book a meeting with Synaptic Labs"
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
            >
              <Calendar className="w-6 h-6" />
            </a>

            <a
              href="https://share.hsforms.com/1u3uV2jIVQna-w5LaihJi2Q3sy8k"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Subscribe to Synaptic Labs newsletter"
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
            >
              <Mail className="w-6 h-6" />
            </a>
          </div>

          {/* Authentication UI */}
          <div>
            {authStatus.authenticated && authStatus.user ? (
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10 border-2 border-[#29ABE2]">
                  <AvatarImage src={authStatus.user.picture} alt={authStatus.user.name} />
                  <AvatarFallback>
                    {authStatus.user.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#33475b]">
                    {authStatus.user.name || authStatus.user.email}
                  </span>
                  <a
                    href="/auth/logout"
                    className="text-xs text-[#29ABE2] hover:text-[#29ABE2]/80 font-medium transition-colors"
                  >
                    Sign out
                  </a>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleSignIn}
                variant="outline"
                className="inline-flex items-center px-4 py-2 border-2 border-[#29ABE2] text-[#29ABE2] font-semibold rounded-lg hover:bg-[#29ABE2] hover:text-white transition-colors duration-200"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
