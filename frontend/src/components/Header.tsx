import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';

export default function Header() {
  const { user, clearAuth } = useAuthStore();
  const { searchQuery, setSearchQuery } = useUIStore();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <header className="bg-surface-main shadow-sm border-b border-border-light sticky top-0 z-50">
      <div className="w-full px-4 h-[56px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 w-1/4 cursor-pointer">
          <div className="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-sm cursor-pointer">
            T
          </div>
          <h1 className="text-xl font-bold text-brand-600 hidden xl:block">Transitly</h1>
        </Link>
        
        <div className="hidden md:flex flex-1 max-w-[680px] mx-auto relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <input 
            type="text" 
            placeholder="Cari lokasi, halte, stasiun, atau grup..." 
            className="w-full bg-surface-hover border-none rounded-full py-2.5 pl-10 pr-4 text-sm font-normal text-text-primary focus:ring-2 focus:ring-brand-500 focus:bg-surface-main transition-colors outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-3 w-1/4">
          <span className="text-sm font-semibold text-text-primary hidden sm:block truncate max-w-[120px]">
            {user?.fullName || user?.username}
          </span>
          <div className="relative">
            <div 
              className="w-10 h-10 rounded-full bg-surface-hover overflow-hidden border border-border-light cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center shrink-0"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="text-text-secondary w-3/5 h-3/5" strokeWidth={2} />
              )}
            </div>
            
            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-12 w-48 bg-surface-main/90 backdrop-blur-md rounded-xl shadow-xl border border-surface-hover py-1.5 z-50 overflow-hidden">
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors font-semibold flex items-center gap-2"
                  >
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    Keluar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
