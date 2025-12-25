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
    // Apply theme classes to body when component mounts or theme changes
    if (typeof window !== 'undefined' && window.ThemeManager) {
      window.ThemeManager.applyThemeClasses(document.body, currentTheme);
    }
  }, [currentTheme]);

  const getThemeConfig = () => {
    return THEME_CONFIGS[currentTheme] || THEME_CONFIGS[DEFAULT_THEME];
  };

  const themeConfig = getThemeConfig();
  const isCosmic = currentTheme === 'Cosmic';
 const isCyber = currentTheme === 'Cyber-Dystopian' as string;

  // Get icon component based on theme
  const ThemeIcon = currentTheme.includes('Cyber') ? Cpu : Star;

  return (
    <nav
      className={`w-full h-16 backdrop-blur-xl border-b flex items-center justify-between px-4 md:px-6 sticky top-0 z-50 transition-all duration-300 ${
        isCosmic
          ? 'cosmic-box-glow border-white/10'
          : 'cyber-box-glow border-green-500/20'
      } ${themeConfig.bgClass || ''}`}
      style={{
        background: isCosmic 
          ? 'rgba(15, 23, 42, 0.8)' 
          : 'rgba(0, 8, 20, 0.8)',
        backdropFilter: 'blur(20px)'
      }}
    >
      {/* Left: Logo + Mobile Menu */}
      <div className="flex items-center gap-3 md:gap-4">
        {user && (
          <button
            onClick={toggleSidebar}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              isCosmic
                ? 'text-white hover:bg-white/10'
                : 'text-green-400 hover:bg-green-500/20'
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
            style={{ fontFamily: "'Pacifico', cursive" }}
            className={`bg-clip-text text-transparent ${
              isCosmic
                ? 'bg-gradient-to-r from-cyan-400 to-purple-400 cosmic-text-glow'
                : 'bg-gradient-to-r from-green-400 to-emerald-400 cyber-text-glow'
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
                ? 'bg-cyan-500/10 border-cyan-500/30'
                : 'bg-green-500/10 border-green-500/30'
            }`}
          >
            <ThemeIcon
              className={isCosmic ? 'text-cyan-300' : 'text-green-300'}
              size={16}
            />
            <span
              className={`text-sm font-medium ${themeConfig.textClass} ${
                themeConfig.fontClass || ''
              }`}
            >
              {themeConfig.name.includes(' ') 
                ? themeConfig.name.split(' ')[0] 
                : themeConfig.name}
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
                    ? 'text-white/80 hover:text-cyan-400 cosmic-text-glow'
                    : 'text-green-300/80 hover:text-green-400 cyber-text-glow'
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
                        ? 'text-white/80 hover:text-cyan-400 cosmic-text-glow'
                        : 'text-green-300/80 hover:text-green-400 cyber-text-glow'
                    }`}
                  >
                    <BookOpen size={16} />
                    Courses
                  </Link>

                  <Link
                    to="/leaderboard"
                    className={`flex items-center gap-2 transition-colors ${
                      isCosmic
                        ? 'text-white/80 hover:text-cyan-400 cosmic-text-glow'
                        : 'text-green-300/80 hover:text-green-400 cyber-text-glow'
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
                    ? 'text-white/60 hover:text-white cosmic-text-glow'
                    : 'text-green-400/60 hover:text-green-300 cyber-text-glow'
                }`}
                aria-label={soundOn ? 'Mute sound' : 'Unmute sound'}
              >
                {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>

              <div className="relative">
                <button
                  className={`transition-colors ${
                    isCosmic
                      ? 'text-white/60 hover:text-cyan-400 cosmic-text-glow'
                      : 'text-green-400/60 hover:text-green-300 cyber-text-glow'
                  }`}
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                </button>
                {notifications > 0 && (
                  <span 
                    className={`absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse ${
                      isCosmic ? 'bg-red-500' : 'bg-red-400'
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
                    : 'text-green-400 hover:bg-green-500/20 cyber-box-glow'
                }`}
                aria-label="Settings"
              >
                <Settings size={20} />
              </button>

              <button
                onClick={onLogout}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                  isCosmic
                    ? 'bg-red-500/20 hover:bg-red-500/40 text-red-300 border-red-500/30 cosmic-box-glow'
                    : 'bg-red-900/30 hover:bg-red-900/50 text-red-400 border-red-700/50 cyber-box-glow'
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
            className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-lg ${
              isCosmic
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white cosmic-box-glow'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white cyber-box-glow'
            }`}
          >
            <LogIn size={16} />
            <span className="hidden sm:inline">Login</span>
            <span className="sm:hidden">Login</span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;