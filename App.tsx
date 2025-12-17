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
  StudentAssessmentList
} from './components/CourseSystem';
import { TeacherAssessmentReview } from './components/TeacherAssessmentReview';
import { SprintChallenge, LeaderboardView } from './components/Gamification';
import AITutorChat from './components/AITutorChat';
import { User, Theme, AuthState } from './types';
import { DEFAULT_THEME } from './constants';
import { initializeSupabase, sessionService } from './services/supabaseService';
import { TopicDetail } from './components/CourseSystem';

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
        Access Denied â€” Required role: {allowedRoles.join(', ')}
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
  const [particles, setParticles] = useState<Array<{ x: number; y: number; size: number; speed: number }>>([]);

  useEffect(() => {
    // Initialize floating particles
    const newParticles = Array.from({ length: theme === 'Cosmic' ? 150 : 100 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 2 + 0.5
    }));
    setParticles(newParticles);
  }, [theme]);

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center text-center px-4 relative overflow-hidden">
      {/* Background Effects */}
      {theme === 'Cosmic' && (
        <>
          {/* Star particles */}
          <div className="absolute inset-0 pointer-events-none">
            {particles.map((p, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white/30 animate-pulse"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  animationDuration: `${p.speed}s`,
                  animationDelay: `${Math.random() * 5}s`
                }}
              />
            ))}
          </div>
          
          {/* Orbiting planets */}
          <div className="absolute top-1/4 left-1/4 w-32 h-32">
            <div className="absolute w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-float"></div>
          </div>
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24">
            <div className="absolute w-6 h-6 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 animate-float" 
                 style={{ animationDelay: '1s' }}></div>
          </div>
        </>
      )}

      {theme === 'Cyber-Dystopian' && (
        <>
          {/* Grid lines */}
          <div className="absolute inset-0 pointer-events-none opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `linear-gradient(to right, #00ff00 1px, transparent 1px),
                               linear-gradient(to bottom, #00ff00 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }}></div>
          </div>
          
          {/* Scanning line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-scan"></div>
          
          {/* Digital particles */}
          <div className="absolute inset-0 pointer-events-none">
            {particles.map((p, i) => (
              <div
                key={i}
                className="absolute text-green-400 font-mono text-xs"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  animation: `digitalFloat ${p.speed * 3}s linear infinite`,
                  animationDelay: `${Math.random() * 10}s`
                }}
              >
                {Math.random() > 0.5 ? '1' : '0'}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="mb-16">
          <div className="inline-block mb-6">
            <div className={`px-6 py-2 rounded-full mb-4 ${
              theme === 'Cyber-Dystopian'
                ? 'cyber-box-glow bg-black text-green-400'
                : 'bg-gradient-to-r from-cyan-900/30 to-purple-900/30 text-cyan-300 border border-cyan-500/30'
            }`}>
              <span className="text-sm font-bold uppercase tracking-widest">AI-Powered Science Learning</span>
            </div>
          </div>
          
          <h1 className={`text-6xl md:text-7xl lg:text-8xl font-bold mb-6 relative ${
            theme === 'Cyber-Dystopian' 
              ? 'cyber-text-glow text-green-400'
              : 'bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent'
          }`}>
            Newel Academy
            <div className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-yellow-400 animate-ping opacity-50"></div>
          </h1>
          
          <p className={`text-2xl md:text-3xl mb-8 max-w-3xl mx-auto font-light ${
            theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white/90'
          }`}>
            Master Scientific Concepts at Warp Speed with Your 24/7 AI Science Wingman
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button
              onClick={onOpenAuth}
              className={`px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 ${
                theme === 'Cyber-Dystopian'
                  ? 'cyber-box-glow bg-black text-green-400 hover:bg-green-950 cyber-glitch'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:shadow-2xl hover:shadow-cyan-500/30 text-white'
              }`}
            >
              <span className="flex items-center justify-center gap-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Start Learning Free
              </span>
            </button>
            
            <Link
              to="/leaderboard"
              className={`px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 ${
                theme === 'Cyber-Dystopian'
                  ? 'bg-black border-2 border-green-500/50 text-green-400 hover:bg-green-950 hover:border-green-400'
                  : 'bg-white/10 border-2 border-white/20 hover:bg-white/20 hover:border-white/40 text-white'
              }`}
            >
              View Leaderboard
            </Link>
          </div>
        </div>

        {/* Stats Section */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 ${
          theme === 'Cyber-Dystopian' ? 'cyber-box-glow' : ''
        } p-6 rounded-2xl bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm`}>
          {[
            { value: '10K+', label: 'Active Students' },
            { value: '95%', label: 'Pass Rate' },
            { value: '24/7', label: 'AI Tutor Access' },
            { value: '3.2x', label: 'Faster Learning' }
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className={`text-4xl font-bold mb-2 ${
                theme === 'Cyber-Dystopian' ? 'text-green-400' : 'text-cyan-400'
              }`}>
                {stat.value}
              </div>
              <div className={`text-sm uppercase tracking-wider ${
                theme === 'Cyber-Dystopian' ? 'text-green-300/70' : 'text-white/60'
              }`}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <h2 className={`text-4xl font-bold mb-12 text-center ${
            theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'
          }`}>
            Why Students Love Newel Academy
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
                title: 'AI Science Wingman',
                description: '24/7 personalized explanations for any science topic',
                color: 'from-cyan-500 to-blue-500'
              },
              {
                icon: (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                title: '222-Sprint Challenge',
                description: 'Fast-paced science game that makes learning addictive',
                color: 'from-purple-500 to-pink-500'
              },
              {
                icon: (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                title: 'Real Progress Tracking',
                description: 'See your improvement with detailed analytics',
                color: 'from-green-500 to-emerald-500'
              },
              {
                icon: (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ),
                title: 'Secure Platform',
                description: 'Privacy-focused with military-grade encryption',
                color: 'from-yellow-500 to-orange-500'
              },
              {
                icon: (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ),
                title: 'Global Community',
                description: 'Learn with students from around the world',
                color: 'from-pink-500 to-rose-500'
              },
              {
                icon: (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Self-Paced Learning',
                description: 'Study anytime, anywhere at your own speed',
                color: 'from-blue-500 to-indigo-500'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className={`p-8 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                  theme === 'Cyber-Dystopian'
                    ? 'cyber-box-glow bg-black border border-green-500/20 hover:border-green-400/50'
                    : 'bg-white/5 border border-white/10 hover:border-white/30 backdrop-blur-sm'
                }`}
              >
                <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 mx-auto`}>
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </div>
                <h3 className={`text-xl font-bold mb-3 text-center ${
                  theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'
                }`}>
                  {feature.title}
                </h3>
                <p className={`text-center ${
                  theme === 'Cyber-Dystopian' ? 'text-green-300/60' : 'text-white/60'
                }`}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className={`rounded-3xl p-10 md:p-16 text-center ${
          theme === 'Cyber-Dystopian'
            ? 'cyber-box-glow bg-black border-2 border-green-500/30'
            : 'bg-gradient-to-br from-cyan-900/20 via-purple-900/20 to-pink-900/20 border border-white/20 backdrop-blur-xl'
        }`}>
          <h2 className={`text-4xl font-bold mb-6 ${
            theme === 'Cyber-Dystopian' ? 'text-green-400' : 'text-white'
          }`}>
            Ready to Transform Your Science Grades?
          </h2>
          <p className={`text-xl mb-8 max-w-2xl mx-auto ${
            theme === 'Cyber-Dystopian' ? 'text-green-300/70' : 'text-white/70'
          }`}>
            Join thousands of students who are acing their science courses with our AI-powered platform.
          </p>
          <button
            onClick={onOpenAuth}
            className={`px-12 py-6 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 ${
              theme === 'Cyber-Dystopian'
                ? 'cyber-box-glow bg-green-600 text-black hover:bg-green-500'
                : 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:shadow-2xl hover:shadow-purple-500/40 text-white'
            }`}
          >
            <span className="flex items-center justify-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Create Free Account Now
            </span>
          </button>
          <p className={`mt-6 text-sm ${
            theme === 'Cyber-Dystopian' ? 'text-green-300/40' : 'text-white/40'
          }`}>
            No credit card required â€¢ Get started in 30 seconds
          </p>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------
   App
------------------------------------ */
const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({ loggedIn: false, user: null });
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const location = useLocation();

  /* Restore session + init Supabase */
  useEffect(() => {
    const init = async () => {
      try {
        const supabaseReady = await initializeSupabase();
        const storedUser = sessionService.getSession();

        if (storedUser) {
          if (supabaseReady) {
            try {
              const validated = await sessionService.validateSession();
              if (validated) {
                setAuth({ loggedIn: true, user: validated });
              } else {
                sessionService.clearSession();
              }
            } catch {
              setAuth({ loggedIn: true, user: storedUser });
            }
          } else {
            setAuth({ loggedIn: true, user: storedUser });
          }
        }

        setTheme(DEFAULT_THEME);
      } finally {
        setInitializing(false);
      }
    };

    init();
    document.title = 'Newel Academy â€¢ Master Scientific Concepts with Your Science Wingman'; 
  }, []);

  /* Theme handling with proper background effects */
  useEffect(() => {
    if (initializing) return;

    const body = document.body;
    body.className = '';
    body.style.backgroundImage = '';
    body.style.backgroundSize = '';

    // Remove all theme elements first
    document.querySelectorAll('.star-field, .constellation, .rocket, .rocket-exhaust, .asteroid').forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });
    document.querySelectorAll('.matrix-column').forEach(el => el.remove());
    document.querySelectorAll('.cyber-grid, .cyber-scanline').forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });

    if (theme === 'Cosmic') {
      body.classList.add('cosmic-bg', 'text-white');
      
      // Show cosmic elements
      document.querySelectorAll('.star-field, .constellation, .rocket, .rocket-exhaust, .asteroid').forEach(el => {
        (el as HTMLElement).style.display = 'block';
      });
      
      // Initialize star field if not already done
      const starField = document.querySelector('.star-field');
      if (starField && starField.children.length === 0) {
        for (let i = 0; i < 200; i++) {
          const star = document.createElement('div');
          star.className = 'star';
          star.style.left = `${Math.random() * 100}%`;
          star.style.top = `${Math.random() * 100}%`;
          star.style.animationDelay = `${Math.random() * 3}s`;
          star.style.animationDuration = `${2 + Math.random() * 2}s`;
          starField.appendChild(star);
        }
      }
    } else if (theme === 'Cyber-Dystopian') {
      body.classList.add('cyber-bg', 'text-green-500');
      body.style.fontFamily = "'Share Tech Mono', monospace";
      
      // Show cyber elements
      document.querySelectorAll('.cyber-grid, .cyber-scanline').forEach(el => {
        (el as HTMLElement).style.display = 'block';
      });
      
      // Initialize matrix rain
      const chars = 'ï¾Šï¾ï¾‹ï½°ï½³ï½¼ï¾…ï¾“ï¾†ï½»ï¾œï¾‚ï½µï¾˜ï½±ï¾Žï¾ƒï¾ï½¹ï¾’ï½´ï½¶ï½·ï¾‘ï¾•ï¾—ï½¾ï¾ˆï½½ï¾€ï¾‡ï¾01';
      const columns = Math.floor(window.innerWidth / 20);
      
      for (let i = 0; i < columns; i++) {
        const column = document.createElement('div');
        column.className = 'matrix-column';
        column.style.left = `${i * 20}px`;
        column.style.animationDelay = `${Math.random() * 20}s`;
        column.style.animationDuration = `${15 + Math.random() * 10}s`;
        
        let text = '';
        const length = Math.floor(10 + Math.random() * 20);
        for (let j = 0; j < length; j++) {
          text += chars[Math.floor(Math.random() * chars.length)] + '\n';
        }
        column.textContent = text;
        body.appendChild(column);
      }
    }
  }, [theme, initializing]);

  /* Auth handlers */
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
  };

  /* Loading screen */
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-cyan-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold">Initializing Newel Academy</h2>
          <p className="text-white/60 mt-2">Loading your science learning experience...</p>
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
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentTheme={theme}
        setTheme={setTheme}
      />

      {showAuthModal && !auth.loggedIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <AuthModal onLogin={handleLogin} onClose={() => setShowAuthModal(false)} />
        </div>
      )}

      <main className="flex-grow container mx-auto px-4 py-8">
        <Routes>
          {/* Home / Landing */}
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

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <RequireAuth allowedRoles={['admin']} user={auth.user} loggedIn={auth.loggedIn}>
                <AdminDashboard />
              </RequireAuth>
            }
          />

          {/* Teacher Dashboard */}
          <Route
            path="/teacher-dashboard"
            element={
              <RequireAuth allowedRoles={['teacher']} user={auth.user} loggedIn={auth.loggedIn}>
                <TeacherDashboard user={auth.user!} />
              </RequireAuth>
            }
          />

          {/* Student Dashboard */}
          <Route
            path="/student-dashboard"
            element={
              <RequireAuth allowedRoles={['student']} user={auth.user} loggedIn={auth.loggedIn}>
                <StudentDashboard user={auth.user!} />
              </RequireAuth>
            }
          />

          {/* Courses */}
          <Route
            path="/courses"
            element={
              <RequireAuth allowedRoles={['teacher', 'student']} user={auth.user} loggedIn={auth.loggedIn}>
                {auth.user?.role === 'teacher' ? (
                  <CourseManager />
                ) : (
                  <StudentCourseList user={auth.user!} />
                )}
              </RequireAuth>
            }
          />

          {/* Topic Detail */}
          <Route
            path="/topic/:subject/:topicId"
            element={
              <RequireAuth allowedRoles={['student', 'teacher']} user={auth.user} loggedIn={auth.loggedIn}>
                <TopicDetail />
              </RequireAuth>
            }
          />

          {/* ASSESSMENTS - Combined Route for Teachers & Students */}
          <Route
            path="/assessments"
            element={
              <RequireAuth allowedRoles={['teacher', 'student', 'admin']} user={auth.user} loggedIn={auth.loggedIn}>
                {auth.user?.role === 'teacher' || auth.user?.role === 'admin' ? 
                  <AssessmentManager /> : 
                  <StudentAssessmentList user={auth.user!} />
                }
              </RequireAuth>
            }
          />

          {/* Teacher Assessment Review & Management */}
          <Route
            path="/teacher-assessments"
            element={
              <RequireAuth allowedRoles={['teacher', 'admin']} user={auth.user} loggedIn={auth.loggedIn}>
                <TeacherAssessmentReview />
              </RequireAuth>
            }
          />

          {/* Sprint Challenge */}
          <Route
            path="/sprint-challenge"
            element={
              <RequireAuth allowedRoles={['student']} user={auth.user} loggedIn={auth.loggedIn}>
                <SprintChallenge />
              </RequireAuth>
            }
          />

          {/* Leaderboard */}
          <Route
            path="/leaderboard"
            element={
              <RequireAuth allowedRoles={['student', 'teacher', 'admin']} user={auth.user} loggedIn={auth.loggedIn}>
                <LeaderboardView />
              </RequireAuth>
            }
          />

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex flex-col items-center justify-center">
                <h1 className={`text-6xl font-bold mb-4 ${
                  theme === 'Cyber-Dystopian' ? 'cyber-text-glow text-green-400' : 'text-white'
                }`}>404</h1>
                <p className={`text-xl mb-8 ${
                  theme === 'Cyber-Dystopian' ? 'text-green-300/60' : 'text-white/60'
                }`}>Page not found</p>
                <Link to="/" className={`text-xl hover:underline ${
                  theme === 'Cyber-Dystopian' ? 'text-green-400' : 'text-cyan-400'
                }`}>
                  â† Return to Home
                </Link>
              </div>
            }
          />
        </Routes>
      </main>

      <footer className={`text-center py-8 border-t backdrop-blur-sm ${
        theme === 'Cyber-Dystopian' 
          ? 'text-green-300/30 border-green-500/10 bg-black/50' 
          : 'text-white/30 border-white/10 bg-black/20'
      }`}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <div className="mb-4 md:mb-0">
              <div className={`text-2xl font-bold mb-2 ${
                theme === 'Cyber-Dystopian' ? 'text-green-400' : 'text-cyan-400'
              }`}>
                Newel Academy
              </div>
              <p className="text-sm">Mastering Scientific Concepts Since 2025</p>
            </div>
            <div className="flex gap-6">
              <Link to="/" className="hover:underline">Home</Link>
              <Link to="/leaderboard" className="hover:underline">Leaderboard</Link>
              <button 
                onClick={() => setShowAuthModal(true)} 
                className="hover:underline"
              >
                Login
              </button>
            </div>
          </div>
          <p className="text-sm">Â© 2025 Newel Academy â€¢ All rights reserved</p>
        </div>
      </footer>

      {auth.loggedIn && auth.user?.role === 'student' && <AITutorChat />}
    </div>
  );
};

export default App;
