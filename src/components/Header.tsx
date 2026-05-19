"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setCurrentUser(null);
    router.refresh();
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent cursor-pointer">
            EventTicketing
          </h1>
        </Link>
        <nav className="space-x-4 flex items-center">
          {currentUser?.role === 'ADMIN' ? (
            <Link href="/admin-dashboard" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
              Admin Dashboard
            </Link>
          ) : (
            <>
              <Link href="/organizer-dashboard" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
                Organizer
              </Link>
              <Link href="/tickets" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
                My Tickets
              </Link>
            </>
          )}

          {currentUser ? (
            <div className="flex items-center gap-4 ml-4">
              <span className="text-sm font-bold text-gray-700">Hi, {currentUser.name}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-full transition-colors border border-red-200"
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                Log in
              </Link>
              <Link href="/register" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
