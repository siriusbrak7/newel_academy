import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Theme } from '../types';
import {
  LogOut,
  BookOpen,
  LayoutDashboard,
  Trophy,
  Settings,
  Bell,
  Volume2,
  VolumeX,
  LogIn,
  Star,
  Cpu,
  Menu
} from 'lucide-react';
import { DEFAULT_THEME, THEME_CONFIGS } from '../constants';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  toggleSidebar: () => void;
  notifications: number;
  onOpenAuth: () => void;
  currentTheme?: Theme;
}

const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  toggleSidebar,
  notifications,
  onOpenAuth,
  currentTheme = DEFAULT_THEME
}) => {
  const [soundOn, setSoundOn] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Safe theme check
  const isCosmic = currentTheme === 'Cosmic';
  const isCyber = currentTheme === 'Cyber-Dystopian' as string;
  const themeConfig = THEME_CONFIGS[currentTheme] || THEME_CONFIGS[DEFAULT_THEME];

  // Get icon component based on theme
  const ThemeIcon = isCyber ? Cpu : Star;

  return (
    <nav
      className={`w-full h-16 border-b flex items-center justify-between px-4 md:px-6 sticky top-0 z-50 transition-all duration-300 backdrop-blur-xl ${
        isCosmic
          ? 'cosmic-theme bg-[#1e1b4b]/80 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
          : 'cyber-theme bg-black/90 border-green-500/30 shadow-none'
      }`}
    >
      {/* Left: Logo + Mobile Menu */}
      <div className="flex items-center gap-3 md:gap-4">
        {user && (
          <button
            onClick={toggleSidebar}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              isCosmic
                ? 'text-white hover:bg-white/10'
                : 'text-green-500 hover:bg-green-900/30 hover:text-green-400'
            }`}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        )}

        <Link
          to="/"
          className="text-xl md:text-2xl lg:text-3xl font-bold cursor-pointer hover:opacity-90 transition-opacity"
        >
          <span
            className={`bg-clip-text text-transparent ${
              isCosmic
                ? 'font-brand bg-gradient-to-r from-cyan-400 to-purple-400 drop-shadow-sm'
                : 'font-data bg-green-500 uppercase tracking-widest'
            }`}
          >
            The Newel
          </span>
        </Link>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-2 md:space-x-3 lg:space-x-4">
        {/* Theme indicator (Desktop) */}
        {user && isMounted && (
          <div
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border backdrop-blur-sm transition-all ${
              isCosmic
                ? 'bg-cyan-900/20 border-cyan-500/30'
                : 'bg-black border-green-500 text-green-500'
            }`}
          >
            <ThemeIcon
              className={isCosmic ? 'text-cyan-400' : 'text-green-500'}
              size={16}
            />
            <span
              className={`text-sm font-medium ${
                isCosmic ? 'font-body text-cyan-100' : 'font-data text-green-500'
              }`}
            >
              {isCosmic ? 'Cosmic Mode' : 'CYBER_CORE'}
            </span>
          </div>
        )}

        {user ? (
          <>
            {/* MAIN NAV LINKS — hidden on mobile */}
            <div className="hidden md:flex space-x-3 lg:space-x-6 text-sm font-medium">
              <Link
                to="/"
                className={`flex items-center gap-2 transition-colors ${
                  isCosmic
                    ? 'text-slate-200 hover:text-cyan-400'
                    : 'font-data text-green-700 hover:text-green-400'
                }`}
              >
                <LayoutDashboard size={16} />
                Dashboard
              </Link>

              {user.role !== 'admin' && (
                <>
                  <Link
                    to="/courses"
                    className={`flex items-center gap-2 transition-colors ${
                      isCosmic
                        ? 'text-slate-200 hover:text-cyan-400'
                        : 'font-data text-green-700 hover:text-green-400'
                    }`}
                  >
                    <BookOpen size={16} />
                    Courses
                  </Link>

                  <Link
                    to="/leaderboard"
                    className={`flex items-center gap-2 transition-colors ${
                      isCosmic
                        ? 'text-slate-200 hover:text-cyan-400'
                        : 'font-data text-green-700 hover:text-green-400'
                    }`}
                  >
                    <Trophy size={16} />
                    Leaderboard
                  </Link>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => setSoundOn(!soundOn)}
                className={`hidden sm:block transition-colors ${
                  isCosmic
                    ? 'text-slate-400 hover:text-white'
                    : 'text-green-800 hover:text-green-500'
                }`}
                aria-label={soundOn ? 'Mute sound' : 'Unmute sound'}
              >
                {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>

              <div className="relative">
                <button
                  className={`transition-colors ${
                    isCosmic
                      ? 'text-slate-400 hover:text-cyan-400'
                      : 'text-green-800 hover:text-green-500'
                  }`}
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                </button>
                {notifications > 0 && (
                  <span 
                    className={`absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse ${
                      isCosmic ? 'bg-pink-500 shadow-[0_0_5px_#ec4899]' : 'bg-green-500 shadow-[0_0_5px_#00ff00]'
                    }`}
                  />
                )}
              </div>

              {/* Desktop settings */}
              <button
                onClick={toggleSidebar}
                className={`hidden md:flex p-2 rounded-full transition-colors ${
                  isCosmic
                    ? 'text-white hover:bg-white/10'
                    : 'text-green-500 hover:bg-green-900/30'
                }`}
                aria-label="Settings"
              >
                <Settings size={20} />
              </button>

              <button
                onClick={onLogout}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                  isCosmic
                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/20'
                    : 'bg-black hover:bg-red-900/20 text-red-500 border-red-900 font-data'
                }`}
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={onOpenAuth}
            className={`neon-button px-4 md:px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2`}
          >
            <LogIn size={16} />
            <span className="hidden sm:inline">
              {isCyber ? 'ACCESS_TERMINAL' : 'Login'}
            </span>
            <span className="sm:hidden">Login</span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;