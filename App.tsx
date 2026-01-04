import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';
import { AdminDashboard, StudentDashboard, TeacherDashboard } from './components/Dashboards';
import {
  StudentCourseList,
  CourseManager,
  AssessmentManager,
  StudentAssessmentList,
  TopicDetail
} from './components/CourseSystem';
import { TeacherAssessmentReview } from './components/TeacherAssessmentReview';
import { SprintChallenge, LeaderboardView } from './components/Gamification';
import AITutorChat from './components/AITutorChat';
import { ImageOptimizer } from './components/ImageOptimizer';
import { User, Theme, AuthState } from './types';
import { DEFAULT_THEME } from './constants';
import { initializeSupabase, sessionService } from './services/supabaseService';

// IMPORT MOBILE CSS FIRST
import './mobile.css';

// Icons - FIXED: User icon aliased to UserIcon
import { 
  Rocket, Brain, Zap, Target, Clock, Users, BookOpen, 
  MessageSquare, CheckCircle, Star, Award, Globe,
  Mail, ExternalLink, Sparkles, Cpu, Shield, TrendingUp,
  ClipboardList,
  LogIn,
  LogOut,
  Trophy,
  X,
  User as UserIcon // Aliased to avoid conflict with User type
} from 'lucide-react';

// Declare ThemeManager from index.html
declare global {
  interface Window {
    ThemeManager?: {
      setTheme: (theme: string) => void;
    };
    neuroscienceFacts?: string[];
  }
}

/* ------------------------------------
   Route Guard
------------------------------------ */
interface RequireAuthProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  user: User | null;
  loggedIn: boolean;
}

const RequireAuth: React.FC<RequireAuthProps> = ({
  children,
  allowedRoles,
  user,
  loggedIn
}) => {
  if (!loggedIn || !user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="p-10 text-center text-red-500 text-2xl font-bold">
        Access Denied — Required role: {allowedRoles.join(', ')}
      </div>
    );
  }

  return <>{children}</>;
};

/* ------------------------------------
   Homepage Component
------------------------------------ */
interface HomepageProps {
  theme: Theme;
  onOpenAuth: () => void;
}

const Homepage: React.FC<HomepageProps> = ({ theme, onOpenAuth }) => {
  const [floatingIcons, setFloatingIcons] = useState<Array<{ id: number; x: number; y: number; icon: string; delay: number }>>([]);

  useEffect(() => {
    // Create floating icons for cosmic theme
    if (theme === 'Cosmic') {
      const icons = ['🚀', '🛰️', '⭐', '🌌', '🪐', '☄️', '💫', '🔭'];
      const newIcons = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        icon: icons[Math.floor(Math.random() * icons.length)],
        delay: Math.random() * 5
      }));
      setFloatingIcons(newIcons);
    }
  }, [theme]);

  // App features with icons
  const appFeatures = [
    {
      icon: <Brain className="w-10 h-10" />,
      title: "Enhanced Learning",
      description: "Adaptive lessons that adjust to your pace and understanding",
      gradient: "from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-400"
    },
    {
      icon: <BookOpen className="w-10 h-10" />,
      title: "Comprehensive Courses",
      description: "Complete Biology, Chemistry & Physics syllabi coverage",
      gradient: "from-cyan-500/20 to-blue-500/20",
      iconColor: "text-cyan-400"
    },
    {
      icon: <Target className="w-10 h-10" />,
      title: "Progress Tracking",
      description: "Detailed analytics and performance insights",
      gradient: "from-green-500/20 to-emerald-500/20",
      iconColor: "text-green-400"
    },
    {
      icon: <Zap className="w-10 h-10" />,
      title: "Quick Challenges",
      description: "222-second sprints to test knowledge retention",
      gradient: "from-yellow-500/20 to-orange-500/20",
      iconColor: "text-yellow-400"
    },
    {
      icon: <Users className="w-10 h-10" />,
      title: "Expert Support",
      description: "24/7 tutor access from your personal learning assistants",
      gradient: "from-red-500/20 to-rose-500/20",
      iconColor: "text-red-400"
    },
    {
      icon: <TrendingUp className="w-10 h-10" />,
      title: "Performance Analytics",
      description: "Personalized insights to optimize your learning",
      gradient: "from-indigo-500/20 to-violet-500/20",
      iconColor: "text-indigo-400"
    }
  ];

  // Add this useEffect to handle body scroll lock


  return (
    <div className="min-h-[80vh] flex flex-col items-center text-center px-4 relative overflow-hidden">
      {/* Floating Icons for Cosmic Theme */}
      {theme === 'Cosmic' && floatingIcons.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-0">
          {floatingIcons.map((icon) => (
            <div
              key={icon.id}
              className="absolute animate-float text-2xl"
              style={{
                left: `${icon.x}%`,
                top: `${icon.y}%`,
                animationDuration: `${8 + Math.random() * 8}s`,
                animationDelay: `${icon.delay}s`,
                opacity: 0.4 + Math.random() * 0.3
              }}
            >
              {icon.icon}
            </div>
          ))}
        </div>
      )}

      {/* Cyber Theme Grid */}
      {theme === 'Cyber-Dystopian' && (
        <div className="absolute inset-0 pointer-events-none opacity-10 z-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(to right, #00ff00 1px, transparent 1px),
                               linear-gradient(to bottom, #00ff00 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto w-full pt-12 pb-20">
        {/* Hero Section */}
        <div className="mb-16">
          <div className="inline-block mb-6 animate-fade-in">
            <div
              className={`px-6 py-2 rounded-full mb-4 ${
                theme === 'Cyber-Dystopian'
                  ? 'cyber-box-glow bg-black text-green-400'
                  : 'bg-gradient-to-r from-cyan-900/30 to-purple-900/30 text-cyan-300 border border-cyan-500/30'
              }`}
            >
              <span className="text-sm font-bold uppercase tracking-widest">Next-Gen Science Learning</span>
            </div>
          </div>

          <h1
            className={`text-5xl md:text-6xl lg:text-7xl font-bold mb-6 font-['Poppins'] animate-fade-in-up ${
              theme === 'Cyber-Dystopian'
                ? 'cyber-text-glow text-green-400'
                : 'bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent'
            }`}
          >
            Master Scientific Concepts
            <br />
            <span className="text-4xl md:text-5xl lg:text-6xl block mt-2 font-normal">
              With your personal learning assistant...
            </span>
          </h1>

          <p className={`text-xl md:text-2xl mb-8 max-w-3xl mx-auto font-light leading-relaxed animate-fade-in-up ${theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white/90'}`}>
            Enhanced learning platform with comprehensive courses, and real-time progress tracking...
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fade-in-up">
            <button
              onClick={onOpenAuth}
              className={`px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 font-['Poppins'] animate-pulse ${
                theme === 'Cyber-Dystopian'
                  ? 'cyber-box-glow bg-black text-green-400 hover:bg-green-950 cyber-glitch'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:shadow-2xl hover:shadow-cyan-500/30 text-white'
              }`}
            >
              <span className="flex items-center justify-center gap-3">
                <Rocket className="w-6 h-6" />
                Explore Science...
              </span>
            </button>
            
            
          </div>
        </div>

        {/* App Features Grid */}
        <div className="mb-20 animate-fade-in-up">
          <h2 className={`text-3xl font-bold mb-12 font-['Poppins'] ${theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}`}>
            Platform Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {appFeatures.map((feature, index) => (
              <div
                key={index}
                className={`group bg-gradient-to-br ${feature.gradient} backdrop-blur-sm border border-white/10 p-6 rounded-2xl hover:scale-[1.02] transition-all duration-300 hover:shadow-xl ${
                  theme === 'Cyber-Dystopian' ? 'cyber-box-glow' : 'hover:shadow-purple-500/20'
                }`}
              >
                <div className={`mb-4 bg-white/5 w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${feature.iconColor}`}>
                  {feature.icon}
                </div>
                <h3 className={`text-xl font-bold mb-3 font-['Poppins'] ${theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}`}>
                  {feature.title}
                </h3>
                <p className={`text-sm leading-relaxed ${theme === 'Cyber-Dystopian' ? 'text-green-300/70' : 'text-white/70'}`}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Ethics Section - Updated with pointing to words */}
        <div className={`p-10 rounded-2xl backdrop-blur-sm border mb-20 animate-fade-in ${
          theme === 'Cyber-Dystopian'
            ? 'cyber-box-glow bg-black/70 border-green-500/30'
            : 'bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-white/20'
        }`}>
          <h2 className={`text-3xl font-bold mb-8 text-center font-['Poppins'] ${theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}`}>
            👉 Ethical AI Learning Guide
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="space-y-4">
              <div className={`text-lg p-4 rounded-xl flex items-start gap-3 ${theme === 'Cyber-Dystopian' ? 'bg-black/50 border border-green-500/20' : 'bg-white/5 border border-white/10'}`}>
                <span className="text-2xl mt-1">👉</span>
                <div>
                  <p className={`font-bold mb-1 ${theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}`}>Enhance Understanding</p>
                  <p className={theme === 'Cyber-Dystopian' ? 'text-green-300/70' : 'text-white/70'}>Use AI to <span className="font-bold">enhance</span> understanding, not replace thinking</p>
                </div>
              </div>
              <div className={`text-lg p-4 rounded-xl flex items-start gap-3 ${theme === 'Cyber-Dystopian' ? 'bg-black/50 border border-green-500/20' : 'bg-white/5 border border-white/10'}`}>
                <span className="text-2xl mt-1">👉</span>
                <div>
                  <p className={`font-bold mb-1 ${theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}`}>Verify Sources</p>
                  <p className={theme === 'Cyber-Dystopian' ? 'text-green-300/70' : 'text-white/70'}>Always <span className="font-bold">verify</span> with trusted textbooks and sources</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className={`text-lg p-4 rounded-xl flex items-start gap-3 ${theme === 'Cyber-Dystopian' ? 'bg-black/50 border border-green-500/20' : 'bg-white/5 border border-white/10'}`}>
                <span className="text-2xl mt-1">👉</span>
                <div>
                  <p className={`font-bold mb-1 ${theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}`}>Develop Explanations</p>
                  <p className={theme === 'Cyber-Dystopian' ? 'text-green-300/70' : 'text-white/70'}>Create <span className="font-bold">your own</span> explanations and answers</p>
                </div>
              </div>
              <div className={`text-lg p-4 rounded-xl flex items-start gap-3 ${theme === 'Cyber-Dystopian' ? 'bg-black/50 border border-green-500/20' : 'bg-white/5 border border-white/10'}`}>
                <span className="text-2xl mt-1">👉</span>
                <div>
                  <p className={`font-bold mb-1 ${theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}`}>Maintain Integrity</p>
                  <p className={theme === 'Cyber-Dystopian' ? 'text-green-300/70' : 'text-white/70'}>Be transparent about AI assistance while maintaining <span className="font-bold">academic integrity</span></p>
                </div>
              </div>
            </div>
          </div>
          
          <p className={`mt-8 text-center text-sm ${theme === 'Cyber-Dystopian' ? 'text-green-300/60' : 'text-white/60'}`}>
            AI accelerates learning when used as a <span className="font-bold">thought partner</span>, not a crutch
          </p>
        </div>

        {/* How to Use Platform - Simple Guide */}
        <div className={`mb-16 p-6 rounded-2xl border ${theme === 'Cyber-Dystopian' ? 'cyber-box-glow bg-black/40 border-green-500/20' : 'bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/20'}`}>
          <h2 className={`text-2xl font-bold mb-4 text-center ${theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}`}>
            🚀 How to Get Started
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${theme === 'Cyber-Dystopian' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>1</div>
                <div>
                  <p className={`font-medium ${theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}`}>Register & Get Approved</p>
                  <p className="text-sm opacity-70">Sign up and wait for admin approval</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${theme === 'Cyber-Dystopian' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>2</div>
                <div>
                  <p className={`font-medium ${theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}`}>Study Materials</p>
                  <p className="text-sm opacity-70">Access videos, PDFs, and interactive content</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${theme === 'Cyber-Dystopian' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>3</div>
                <div>
                  <p className={`font-medium ${theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}`}>Complete Checkpoints</p>
                  <p className="text-sm opacity-70">Test your understanding after each section</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${theme === 'Cyber-Dystopian' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>4</div>
                <div>
                  <p className={`font-medium ${theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}`}>Ask Newel</p>
                  <p className="text-sm opacity-70">Get instant help with difficult concepts</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${theme === 'Cyber-Dystopian' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>5</div>
                <div>
                  <p className={`font-medium ${theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}`}>222-Sprint Challenge</p>
                  <p className="text-sm opacity-70">Test speed & accuracy on the leaderboard</p>
                </div>
              </div>
        
        <div className="flex items-start gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${theme === 'Cyber-Dystopian' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>6</div>
          <div>
            <p className={`font-medium ${theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}`}>Track Progress</p>
            <p className="text-sm opacity-70">Use dashboard analytics to improve</p>
          </div>
        </div>
      </div>
    </div>
    
    <div className={`text-center text-sm mt-4 pt-4 border-t ${theme === 'Cyber-Dystopian' ? 'border-green-500/20 text-green-300/60' : 'border-white/10 text-white/60'}`}>
      Need personalized help? <a href="mailto:bbrak1235@gmail.com" className={`underline ${theme === 'Cyber-Dystopian' ? 'text-green-400' : 'text-cyan-400'}`}>Contact Admin</a>
    </div>
  </div>

        

        {/* Final CTA */}
        <div
          className={`rounded-3xl p-10 md:p-16 text-center my-20 animate-fade-in ${
            theme === 'Cyber-Dystopian'
              ? 'cyber-box-glow bg-black border-2 border-green-500/30'
              : 'bg-gradient-to-br from-cyan-900/20 via-purple-900/20 to-pink-900/20 border border-white/20 backdrop-blur-xl'
          }`}
        >
          <div className="inline-block mb-6">
            <div
              className={`px-6 py-2 rounded-full mb-4 ${
                theme === 'Cyber-Dystopian'
                  ? 'cyber-box-glow bg-green-900/50 text-green-400'
                  : 'bg-gradient-to-r from-cyan-900/30 to-purple-900/30 text-cyan-300 border border-cyan-500/30'
              }`}
            >
              <span className="text-sm font-bold uppercase tracking-widest">Ready to Transform Your Learning?</span>
            </div>
          </div>

          <h2 className={`text-4xl font-bold mb-6 font-['Poppins'] ${theme === 'Cyber-Dystopian' ? 'text-green-400' : 'text-white'}`}>
            Join Students Who Are Mastering Science
          </h2>

          <p className={`text-xl mb-8 max-w-2xl mx-auto ${theme === 'Cyber-Dystopian' ? 'text-green-300/70' : 'text-white/70'}`}>
            Get started in 30 seconds. No credit card required.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-8">
            <button
              onClick={onOpenAuth}
              className={`px-12 py-6 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 font-['Poppins'] ${
                theme === 'Cyber-Dystopian'
                  ? 'cyber-box-glow bg-green-600 text-black hover:bg-green-500'
                  : 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:shadow-2xl hover:shadow-purple-500/40 text-white'
              }`}
            >
              <span className="flex items-center justify-center gap-3">
                <Sparkles className="w-6 h-6" />
                Start Free Trial
              </span>
            </button>
            
            <a
              href="mailto:bbrak1235@gmail.com"
              className={`px-8 py-6 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 font-['Poppins'] flex items-center gap-3 ${
                theme === 'Cyber-Dystopian'
                  ? 'border-2 border-green-500/50 text-green-400 hover:bg-green-500/10'
                  : 'border-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10'
              }`}
            >
              <Mail className="w-5 h-5" />
              Contact Admin
            </a>
          </div>

          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 ${theme === 'Cyber-Dystopian' ? 'text-green-300/60' : 'text-white/60'}`}>
            <div className="text-center">
              <div className="text-2xl font-bold">24/7</div>
              <div className="text-sm">Personal Learning Assistants Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">100%</div>
              <div className="text-sm">Syllabus Coverage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">222s</div>
              <div className="text-sm">Sprint Challenges</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">✓</div>
              <div className="text-sm">Progress Tracking</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------
   Main App
------------------------------------ */
const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({ loggedIn: false, user: null });
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const init = async () => {
      try {
        await initializeSupabase();
        const storedUser = sessionService.getSession();

        if (storedUser) {
          try {
            const validated = await sessionService.validateSession();
            if (validated) setAuth({ loggedIn: true, user: validated });
            else sessionService.clearSession();
          } catch {
            setAuth({ loggedIn: true, user: storedUser });
          }
        }

        setTheme(DEFAULT_THEME);
      } finally {
        setInitializing(false);
      }
    };

    init();
    document.title = 'The Newel • Ace Scientific Concepts....';
  }, []);

  // Theme sync with index.html ThemeManager
  useEffect(() => {
    if (initializing) return;
    window.ThemeManager?.setTheme(theme);
  }, [theme, initializing]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogin = (user: User) => {
    const now = Date.now();
    const updatedUser: User = {
      ...user,
      lastLogin: now,
      loginHistory: [...(user.loginHistory || []), now]
    };
    sessionService.saveSession(updatedUser);
    setAuth({ loggedIn: true, user: updatedUser });
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    sessionService.clearSession();
    setAuth({ loggedIn: false, user: null });
    setSidebarOpen(false);
    setMobileMenuOpen(false);
  };

      useEffect(() => {
      if (mobileMenuOpen) {
        document.body.classList.add('mobile-menu-open');
      } else {
        document.body.classList.remove('mobile-menu-open');
      }
      
      return () => {
        document.body.classList.remove('mobile-menu-open');
      };
    }, [mobileMenuOpen]);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-cyan-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold">Initializing The Newel....</h2>
          <p className="text-white/60 mt-2">Loading your premium science learning platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        user={auth.user}
        onLogout={handleLogout}
        toggleSidebar={() => setSidebarOpen(true)}
        notifications={2}
        onOpenAuth={() => setShowAuthModal(true)}
        currentTheme={theme}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} currentTheme={theme} setTheme={setTheme} />

      

      {/* Mobile Navigation Menu - FIXED VERSION */}
      <div className={`mobile-nav-container ${mobileMenuOpen ? 'active' : ''} ${theme === 'Cyber-Dystopian' ? 'cyber-bg' : ''}`}>
        <div className="flex justify-between items-center mb-8 p-4">
          <h2 className={`text-xl font-bold ${theme === 'Cyber-Dystopian' ? 'text-green-400' : 'text-white'}`}>
            Menu
          </h2>
          <button 
            className={`close-mobile-menu p-2 rounded-lg ${theme === 'Cyber-Dystopian' ? 'text-green-400 hover:bg-green-500/20' : 'text-white hover:bg-white/10'}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 space-y-2">
          <Link 
            to="/courses" 
            className={`mobile-nav-item ${theme === 'Cyber-Dystopian' ? 'cyber-box-glow border-green-500/30' : 'border-white/10'}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <BookOpen size={20} />
            <span className={theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}>Courses</span>
          </Link>
          
          <Link 
            to="/leaderboard" 
            className={`mobile-nav-item ${theme === 'Cyber-Dystopian' ? 'cyber-box-glow border-green-500/30' : 'border-white/10'}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Trophy size={20} />
            <span className={theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}>Leaderboard</span>
          </Link>
          
          <Link 
            to="/assessments" 
            className={`mobile-nav-item ${theme === 'Cyber-Dystopian' ? 'cyber-box-glow border-green-500/30' : 'border-white/10'}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <ClipboardList size={20} />
            <span className={theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}>Assessments</span>
          </Link>
          
          <Link 
            to="/sprint-challenge" 
            className={`mobile-nav-item ${theme === 'Cyber-Dystopian' ? 'cyber-box-glow border-green-500/30' : 'border-white/10'}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Zap size={20} />
            <span className={theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}>222-Sprint</span>
          </Link>
          
          {auth.loggedIn && auth.user?.role === 'teacher' && (
            <Link 
              to="/teacher-dashboard" 
              className={`mobile-nav-item ${theme === 'Cyber-Dystopian' ? 'cyber-box-glow border-green-500/30' : 'border-white/10'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Users size={20} />
              <span className={theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}>Teacher Dashboard</span>
            </Link>
          )}
          
          {auth.loggedIn && auth.user?.role === 'student' && (
            <Link 
              to="/student-dashboard" 
              className={`mobile-nav-item ${theme === 'Cyber-Dystopian' ? 'cyber-box-glow border-green-500/30' : 'border-white/10'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <UserIcon size={20} />
              <span className={theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}>My Dashboard</span>
            </Link>
          )}
          
          {auth.loggedIn && auth.user?.role === 'admin' && (
            <Link 
              to="/admin" 
              className={`mobile-nav-item ${theme === 'Cyber-Dystopian' ? 'cyber-box-glow border-green-500/30' : 'border-white/10'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Shield size={20} />
              <span className={theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}>Admin Panel</span>
            </Link>
          )}
          
          {!auth.loggedIn && (
            <button 
              className={`mobile-nav-item text-left w-full ${theme === 'Cyber-Dystopian' ? 'cyber-box-glow border-green-500/30' : 'border-white/10'}`}
              onClick={() => {
                setMobileMenuOpen(false);
                setShowAuthModal(true);
              }}
            >
              <LogIn size={20} />
              <span className={theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}>Login / Register</span>
            </button>
          )}
          
          {auth.loggedIn && (
            <button 
              className={`mobile-nav-item text-left w-full text-red-400 ${theme === 'Cyber-Dystopian' ? 'cyber-box-glow border-red-500/30' : 'border-white/10'}`}
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>

      {showAuthModal && !auth.loggedIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <AuthModal onLogin={handleLogin} onClose={() => setShowAuthModal(false)} />
        </div>
      )}

      <main className="flex-grow container mx-auto px-4 py-8">
        <Routes>
          <Route
            path="/"
            element={
              auth.loggedIn && auth.user ? (
                <Navigate
                  to={
                    auth.user.role === 'admin'
                      ? '/admin'
                      : auth.user.role === 'teacher'
                      ? '/teacher-dashboard'
                      : '/student-dashboard'
                  }
                  replace
                />
              ) : (
                <Homepage theme={theme} onOpenAuth={() => setShowAuthModal(true)} />
              )
            }
          />

          <Route path="/admin" element={<RequireAuth allowedRoles={['admin']} user={auth.user} loggedIn={auth.loggedIn}><AdminDashboard /></RequireAuth>} />
          <Route path="/teacher-dashboard" element={<RequireAuth allowedRoles={['teacher']} user={auth.user} loggedIn={auth.loggedIn}><TeacherDashboard user={auth.user!} /></RequireAuth>} />
          <Route path="/student-dashboard" element={<RequireAuth allowedRoles={['student']} user={auth.user} loggedIn={auth.loggedIn}><StudentDashboard user={auth.user!} /></RequireAuth>} />

          <Route
            path="/courses"
            element={
              <RequireAuth allowedRoles={['teacher', 'student']} user={auth.user} loggedIn={auth.loggedIn}>
                {auth.user?.role === 'teacher' 
                  ? <CourseManager />
                  : <StudentCourseList user={auth.user!} />}
                </RequireAuth>
              }
            />  
          <Route path="/topic/:subject/:topicId" element={<RequireAuth allowedRoles={['student', 'teacher']} user={auth.user} loggedIn={auth.loggedIn}><TopicDetail /></RequireAuth>} />

          <Route
            path="/assessments"
            element={
              <RequireAuth allowedRoles={['teacher', 'student', 'admin']} user={auth.user} loggedIn={auth.loggedIn}>
                {auth.user?.role === 'teacher' || auth.user?.role === 'admin' ? <AssessmentManager /> : <StudentAssessmentList user={auth.user!} />}
              </RequireAuth>
            }
          />

          <Route path="/teacher-assessments" element={<RequireAuth allowedRoles={['teacher', 'admin']} user={auth.user} loggedIn={auth.loggedIn}><TeacherAssessmentReview /></RequireAuth>} />
          <Route path="/sprint-challenge" element={<RequireAuth allowedRoles={['student']} user={auth.user} loggedIn={auth.loggedIn}><SprintChallenge /></RequireAuth>} />
          <Route path="/leaderboard" element={<RequireAuth allowedRoles={['student', 'teacher', 'admin']} user={auth.user} loggedIn={auth.loggedIn}><LeaderboardView /></RequireAuth>} />

          <Route
            path="*"
            element={
              <div className="min-h-screen flex flex-col items-center justify-center">
                <h1 className={`text-6xl font-bold mb-4 font-['Poppins'] ${theme === 'Cyber-Dystopian' ? 'cyber-text-glow text-green-400' : 'text-white'}`}>404</h1>
                <p className={`text-xl mb-8 ${theme === 'Cyber-Dystopian' ? 'text-green-300/60' : 'text-white/60'}`}>Page not found</p>
                <Link to="/" className={`text-xl hover:underline ${theme === 'Cyber-Dystopian' ? 'text-green-400' : 'text-cyan-400'}`}>
                  ← Return to Home
                </Link>
              </div>
            }
          />
        </Routes>
      </main>

      <footer className={`text-center py-8 border-t backdrop-blur-sm ${theme === 'Cyber-Dystopian' ? 'text-green-300/30 border-green-500/10 bg-black/50' : 'text-white/30 border-white/10 bg-black/20'}`}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <div className="mb-4 md:mb-0">
              <div className={`text-2xl font-bold mb-2 font-['Poppins'] ${theme === 'Cyber-Dystopian' ? 'text-green-400' : 'text-cyan-400'}`}>
                The Newel
              </div>
              <p className="text-sm">Next Gen Science Learning Platform</p>
            </div>
            <div className="flex gap-6 text-sm">
              <Link to="/" className="hover:underline">Home</Link>
              <Link to="/courses" className="hover:underline">Courses</Link>
              <a href="mailto:bbrak1235@gmail.com" className="hover:underline">Contact</a>
              <button onClick={() => setShowAuthModal(true)} className="hover:underline">Register</button>
            </div>
          </div>
          <p className="text-sm">© 2025 The Newel • Next Gen Science Learning Platform</p>
        </div>
      </footer>

      {auth.loggedIn && auth.user?.role === 'student' && <AITutorChat />}
    </div>
  );
};

export default App;