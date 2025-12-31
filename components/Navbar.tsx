// components/Navbar.tsx - COMPLETE UPDATED VERSION WITH NOTIFICATIONS
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Theme, Notification } from '../types';
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
  Menu,
  X,
  ClipboardList,
  Zap,
  Users,
  Shield,
  User as UserIcon,
  CheckCircle,
  AlertCircle,
  Info,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { DEFAULT_THEME } from '../constants';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/storageService';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  toggleSidebar: () => void;
  notifications: number;
  onOpenAuth: () => void;
  currentTheme?: Theme;
  onToggleMobileMenu?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  toggleSidebar,
  notifications: propNotifications,
  onOpenAuth,
  currentTheme = DEFAULT_THEME,
  onToggleMobileMenu
}) => {
  const [soundOn, setSoundOn] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userNotifications, setUserNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

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

  // Load notifications
  useEffect(() => {
    if (user?.username) {
      loadNotifications();
      
      // Refresh notifications every 30 seconds
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.username]);

  const loadNotifications = async () => {
    if (!user?.username) return;
    
    try {
      const notifications = await getUserNotifications(user.username);
      setUserNotifications(notifications);
      setUnreadCount(notifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Update local state
      setUserNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
    }
    
    // Navigate if action URL exists
    if (notification.metadata?.actionUrl) {
      navigate(notification.metadata.actionUrl);
    }
    
    setShowNotifications(false);
  };

  const markAllAsRead = async () => {
    if (!user?.username) return;
    
    try {
      await markAllNotificationsAsRead(user.username);
      setUserNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const currentConfig = themeConfig[currentTheme];

  return (
    <nav
      className={`w-full h-16 border-b flex items-center justify-between px-4 md:px-6 sticky top-0 z-50 transition-all duration-300 ${
        currentTheme === 'Cosmic'
          ? 'bg-black/20 border-white/10'
          : 'bg-black/30 border-green-500/20 cyber-box-glow'
      }`}
    >
      {/* Left: Logo + Mobile Menu */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Mobile menu button - only show when user is logged in */}
        {user && (
          <button
            onClick={onToggleMobileMenu}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              currentTheme === 'Cosmic'
                ? 'text-white hover:bg-white/10'
                : 'text-green-400 hover:bg-green-500/20 cyber-box-glow'
            }`}
            aria-label="Open mobile menu"
          >
            <Menu size={24} />
          </button>
        )}
        
        {/* Sidebar toggle for desktop */}
        {user && (
          <button
            onClick={toggleSidebar}
            className={`hidden md:flex p-2 rounded-lg transition-colors ${
              currentTheme === 'Cosmic'
                ? 'text-white hover:bg-white/10'
                : 'text-green-400 hover:bg-green-500/20 cyber-box-glow'
            }`}
            aria-label="Open sidebar"
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

        <Link
          to="/"
          className="text-2xl md:text-3xl font-bold cursor-pointer hover:opacity-80 transition-opacity"
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
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 md:space-x-4">
        {/* Mobile courses button for students/teachers */}
        {user && user.role !== 'admin' && (
          <Link
            to="/courses"
            className={`md:hidden flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
              currentTheme === 'Cosmic'
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-green-600/20 text-green-300 border border-green-500/30'
            }`}
          >
            <BookOpen size={14} />
            <span>Courses</span>
          </Link>
        )}

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
                to={user.role === 'admin' ? '/admin' : 
                     user.role === 'teacher' ? '/teacher-dashboard' : 
                     '/student-dashboard'}
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
            <div className="flex items-center gap-3 md:gap-4">
              <button
                onClick={() => setSoundOn(!soundOn)}
                className={`transition-colors hidden md:block ${
                  currentTheme === 'Cosmic'
                    ? 'text-white/60 hover:text-white'
                    : 'text-green-400/60 hover:text-green-300'
                }`}
              >
                {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>

              {/* Notifications Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative p-2 rounded-lg transition-colors ${
                    currentTheme === 'Cosmic'
                      ? 'text-white/60 hover:text-cyan-400'
                      : 'text-green-400/60 hover:text-green-300 cyber-text-glow'
                  }`}
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                
                {/* Notifications Dropdown Menu */}
                {showNotifications && (
                  <div className={`absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl shadow-2xl z-50 ${
                    currentTheme === 'Cyber-Dystopian' 
                      ? 'cyber-box-glow bg-black border-green-500/30' 
                      : 'bg-slate-900 border border-white/10 backdrop-blur-lg'
                  }`}>
                    <div className="p-4 border-b border-white/10">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-white">Notifications</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-cyan-400 hover:text-cyan-300"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="max-h-72 overflow-y-auto">
                      {userNotifications.length === 0 ? (
                        <div className="p-4 text-center text-white/50">
                          <Bell size={24} className="mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No notifications</p>
                        </div>
                      ) : (
                        userNotifications.slice(0, 10).map(notification => (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-4 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5 ${notification.read ? 'opacity-70' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-full ${
                                notification.type === 'success' ? 'bg-green-500/20 text-green-400' : 
                                notification.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                                notification.type === 'alert' ? 'bg-red-500/20 text-red-400' :
                                'bg-cyan-500/20 text-cyan-400'
                              }`}>
                                {notification.type === 'success' && <CheckCircle size={14} />}
                                {notification.type === 'warning' && <AlertCircle size={14} />}
                                {notification.type === 'alert' && <Bell size={14} />}
                                {notification.type === 'info' && <Info size={14} />}
                              </div>
                              <div className="flex-1">
                                <p className={`text-sm ${notification.read ? 'text-white/80' : 'text-white font-medium'}`}>
                                  {notification.text}
                                </p>
                                <p className="text-xs text-white/40 mt-1">
                                  {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-cyan-500 rounded-full mt-2"></div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="p-3 border-t border-white/10">
                      <Link
                        to="/notifications"
                        className="block text-center text-sm text-cyan-400 hover:text-cyan-300"
                        onClick={() => setShowNotifications(false)}
                      >
                        View all notifications
                      </Link>
                    </div>
                  </div>
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

              {/* Mobile logout button */}
              <button
                onClick={onLogout}
                className={`md:hidden p-2 rounded-lg ${
                  currentTheme === 'Cosmic'
                    ? 'text-red-300 hover:bg-red-500/20'
                    : 'text-red-400 hover:bg-red-900/30'
                }`}
              >
                <LogOut size={20} />
              </button>

              {/* Desktop logout button */}
              <button
                onClick={onLogout}
                className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
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
            className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              currentTheme === 'Cosmic'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 text-black cyber-box-glow'
            }`}
          >
            <LogIn size={16} />
            <span className="hidden md:inline">Login</span>
            <span className="md:hidden">Login</span>
          </button>
        )}
      </div>

      {/* Click outside to close notifications */}
      {showNotifications && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowNotifications(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;