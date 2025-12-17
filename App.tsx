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
    document.title = 'Newel Academy â€¢ Learn Effectively with AI-Powered Learning Platform and Expert Tutor Available!'; 
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
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
                <div className="min-h-[80vh] flex flex-col justify-center items-center text-center px-4 relative">
                  <div className="relative mb-12 z-10">
                    <div className="cosmic-planet w-64 h-64 rounded-full animate-float"></div>
                    <div className="cosmic-moon w-16 h-16 rounded-full absolute -top-4 -right-4 animate-orbit"></div>
                  </div>
                  
                  <h1 className={`text-6xl font-bold mb-4 z-10 relative ${
                    theme === 'Cyber-Dystopian' 
                      ? 'cyber-text-glow text-green-400' 
                      : 'bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent'
                  }`}>
                    Newel Academy
                  </h1>
                  <p className={`text-xl mb-8 max-w-2xl z-10 relative ${
                    theme === 'Cyber-Dystopian' ? 'text-green-300/70' : 'text-white/70'
                  }`}>
                    Master Science with AI-Powered Learning, Interactive Quizzes, and Personalized Tutoring
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 z-10 relative">
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                        theme === 'Cyber-Dystopian'
                          ? 'cyber-box-glow bg-black text-green-400 hover:bg-green-950 cyber-glitch'
                          : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:scale-105 text-white'
                      }`}
                    >
                      Get Started
                    </button>
                    <Link
                      to="/leaderboard"
                      className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                        theme === 'Cyber-Dystopian'
                          ? 'bg-black border border-green-500/50 text-green-400 hover:bg-green-950'
                          : 'bg-white/10 border border-white/20 hover:bg-white/20 text-white'
                      }`}
                    >
                      View Leaderboard
                    </Link>
                  </div>
                  
                  <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl z-10 relative">
                    <div className={`p-6 rounded-2xl ${
                      theme === 'Cyber-Dystopian'
                        ? 'cyber-box-glow bg-black'
                        : 'bg-white/5 border border-white/10'
                    }`}>
                      <div className={`text-3xl mb-4 ${
                        theme === 'Cyber-Dystopian' ? 'text-green-400' : 'text-cyan-400'
                      }`}>
                        <svg className="w-12 h-12 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <h3 className={`text-xl font-bold mb-2 ${
                        theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'
                      }`}>AI Tutor</h3>
                      <p className={theme === 'Cyber-Dystopian' ? 'text-green-300/60' : 'text-white/60'}>
                        24/7 personalized science explanations
                      </p>
                    </div>
                    <div className={`p-6 rounded-2xl ${
                      theme === 'Cyber-Dystopian'
                        ? 'cyber-box-glow bg-black'
                        : 'bg-white/5 border border-white/10'
                    }`}>
                      <div className={`text-3xl mb-4 ${
                        theme === 'Cyber-Dystopian' ? 'text-green-400' : 'text-purple-400'
                      }`}>
                        <svg className="w-12 h-12 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h3 className={`text-xl font-bold mb-2 ${
                        theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'
                      }`}>222-Sprint</h3>
                      <p className={theme === 'Cyber-Dystopian' ? 'text-green-300/60' : 'text-white/60'}>
                        Fast-paced science challenge game
                      </p>
                    </div>
                    <div className={`p-6 rounded-2xl ${
                      theme === 'Cyber-Dystopian'
                        ? 'cyber-box-glow bg-black'
                        : 'bg-white/5 border border-white/10'
                    }`}>
                      <div className={`text-3xl mb-4 ${
                        theme === 'Cyber-Dystopian' ? 'text-green-400' : 'text-green-400'
                      }`}>
                        <svg className="w-12 h-12 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className={`text-xl font-bold mb-2 ${
                        theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'
                      }`}>Progress Tracking</h3>
                      <p className={theme === 'Cyber-Dystopian' ? 'text-green-300/60' : 'text-white/60'}>
                        Real-time analytics & leaderboards
                      </p>
                    </div>
                  </div>
                </div>
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

      <footer className={`text-center py-6 border-t ${
        theme === 'Cyber-Dystopian' 
          ? 'text-green-300/30 border-green-500/10' 
          : 'text-white/30 border-white/10'
      }`}>
        Newel Academy Â© 2025 â€¢ Mastering Science with AI-Powered Learning
      </footer>

      {auth.loggedIn && auth.user?.role === 'student' && <AITutorChat />}
    </div>
  );
};

export default App;
