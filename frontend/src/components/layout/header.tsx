'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Home, Linkedin, Youtube, Calendar, Mail, Github } from 'lucide-react';
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

            <a
              href="https://github.com/ProfSynapse/doc-converter"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source code on GitHub"
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
            >
              <Github className="w-6 h-6" />
            </a>
          </div>

          {/* Authentication UI - Only show when logged in */}
          {authStatus.authenticated && authStatus.user && (
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
          )}
        </div>
      </div>
    </header>
  );
}
