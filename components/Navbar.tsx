import React, { useState } from 'react';
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
  Cpu
} from 'lucide-react';
import { DEFAULT_THEME } from '../constants';

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

  const themeConfig = {
    Cosmic: {
      icon: Star,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30',
      label: 'Cosmic',
      iconColor: 'text-cyan-300',
      font: ''
    },
    'Cyber-Dystopian': {
      icon: Cpu,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      label: 'Cyber',
      iconColor: 'text-green-300',
      font: 'font-mono'
    }
  };

  const currentConfig = themeConfig[currentTheme];

  return (
    <nav
      className={`w-full h-16 border-b flex items-center justify-between px-6 sticky top-0 z-50 transition-all duration-300 ${
        currentTheme === 'Cosmic'
          ? 'bg-black/20 border-white/10'
          : 'bg-black/30 border-green-500/20 cyber-box-glow'
      }`}
    >
      {/* Left: Logo + Mobile Menu */}
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="text-3xl font-bold cursor-pointer hover:opacity-80 transition-opacity"
        >
          <span
            style={{ fontFamily: "'Pacifico', cursive" }}
            className={`bg-clip-text text-transparent ${
              currentTheme === 'Cosmic'
                ? 'bg-gradient-to-r from-cyan-400 to-purple-400'
                : 'bg-gradient-to-r from-green-400 to-emerald-400 cyber-text-glow'
            }`}
          >
            The Newel
          </span>
        </Link>

        {/* Mobile menu button */}
        {user && (
          <button
            onClick={toggleSidebar}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              currentTheme === 'Cosmic'
                ? 'text-white hover:bg-white/10'
                : 'text-green-400 hover:bg-green-500/20 cyber-box-glow'
            }`}
            aria-label="Open menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-4">
        {/* Theme indicator */}
        {user && (
          <div
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg ${currentConfig.bgColor} border ${currentConfig.borderColor} backdrop-blur-sm`}
          >
            <currentConfig.icon
              className={currentConfig.iconColor}
              size={16}
            />
            <span
              className={`text-sm font-medium ${currentConfig.color} ${currentConfig.font}`}
            >
              {currentConfig.label}
            </span>
          </div>
        )}

        {user ? (
          <>
            {/* MAIN NAV LINKS — hidden on mobile */}
            <div className="hidden md:flex space-x-4 md:space-x-6 text-sm font-medium">
              <Link
                to="/"
                className={`flex items-center gap-2 transition-colors ${
                  currentTheme === 'Cosmic'
                    ? 'text-white/80 hover:text-cyan-400'
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
                      currentTheme === 'Cosmic'
                        ? 'text-white/80 hover:text-cyan-400'
                        : 'text-green-300/80 hover:text-green-400 cyber-text-glow'
                    }`}
                  >
                    <BookOpen size={16} />
                    Courses
                  </Link>

                  <Link
                    to="/leaderboard"
                    className={`flex items-center gap-2 transition-colors ${
                      currentTheme === 'Cosmic'
                        ? 'text-white/80 hover:text-cyan-400'
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
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSoundOn(!soundOn)}
                className={`transition-colors ${
                  currentTheme === 'Cosmic'
                    ? 'text-white/60 hover:text-white'
                    : 'text-green-400/60 hover:text-green-300'
                }`}
              >
                {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>

              <div
                className={`relative cursor-pointer transition-colors ${
                  currentTheme === 'Cosmic'
                    ? 'text-white/60 hover:text-cyan-400'
                    : 'text-green-400/60 hover:text-green-300 cyber-text-glow'
                }`}
              >
                <Bell size={18} />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>

              {/* Desktop settings */}
              <button
                onClick={toggleSidebar}
                className={`hidden md:flex p-2 rounded-full transition-colors ${
                  currentTheme === 'Cosmic'
                    ? 'text-white hover:bg-white/10'
                    : 'text-green-400 hover:bg-green-500/20 cyber-box-glow'
                }`}
              >
                <Settings size={20} />
              </button>

              <button
                onClick={onLogout}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                  currentTheme === 'Cosmic'
                    ? 'bg-red-500/20 hover:bg-red-500/40 text-red-300 border-red-500/30'
                    : 'bg-red-900/30 hover:bg-red-900/50 text-red-400 border-red-700/50'
                }`}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={onOpenAuth}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              currentTheme === 'Cosmic'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 text-black cyber-box-glow'
            }`}
          >
            <LogIn size={16} />
            Login
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
