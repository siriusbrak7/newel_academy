import React, { useState, useEffect, useCallback, useMemo, Suspense, Component, ReactNode } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
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
import { User, Theme, AuthState } from './types';
import { DEFAULT_THEME } from './constants';
import { initializeSupabase, sessionService } from './services/supabaseService';

// ============================================================================
// GLOBAL TYPES
// ============================================================================
declare global {
  interface Window {
    ThemeManager?: {
      getCurrentTheme: any;
      getCurrentCssClass: any;
      setTheme: (theme: string) => void;
    };
    neuroscienceFacts?: string[];
  }
}

// ============================================================================
// ERROR BOUNDARY
// ============================================================================
interface ErrorBoundaryProps { children: ReactNode; fallback: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state = { hasError: false };
  props: any;
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('App Error:', error, info); }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

// ============================================================================
// ROUTE GUARD
// ============================================================================
interface RequireAuthProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  user: User | null;
  loggedIn: boolean;
}

const RequireAuth: React.FC<RequireAuthProps> = React.memo(({ children, allowedRoles, user, loggedIn }) => {
  if (!loggedIn || !user) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <div className="p-10 text-center text-red-500 font-brand text-2xl">Access Denied</div>;
  }
  return <>{children}</>;
});

// ============================================================================
// HOMEPAGE COMPONENT (Styled via Index.html Blueprint)
// ============================================================================
interface HomepageProps {
  theme: Theme;
  onOpenAuth: () => void;
}

const Homepage: React.FC<HomepageProps> = React.memo(({ theme, onOpenAuth }) => {
  // REPLACED IMAGES WITH ICONS & SYMBOLS
  const features = useMemo(() => [
    {
      icon: 'fa-solid fa-atom',
      color: 'text-cyan-400',
      title: 'Course Mastery',
      description: 'Master Biology, Chemistry, and Physics with our cosmic curriculum.'
    },
    {
      icon: 'fa-solid fa-brain',
      color: 'text-purple-400',
      title: 'Neural Assistance',
      description: '24/7 AI support that adapts to your unique neural learning patterns.'
    },
    {
      icon: 'fa-solid fa-user-astronaut',
      color: 'text-pink-400',
      title: 'Expert Guidance',
      description: 'Connect with certified tutors for personalized mission support.'
    }
  ], []);

  const isCyber = theme === 'Cyber-Dystopian';

  return (
    <div className="flex flex-col justify-center items-center text-center px-4 relative overflow-hidden min-h-[85vh]">
      
      {/* BACKGROUND DECORATIONS (Floating Symbols) */}
      {!isCyber && (
        <>
          <div className="absolute top-20 left-[10%] opacity-20 text-cyan-500 text-6xl animate-float" style={{ animationDuration: '8s' }}>
            <i className="fa-solid fa-dna"></i>
          </div>
          <div className="absolute bottom-20 right-[10%] opacity-20 text-purple-500 text-8xl animate-float" style={{ animationDuration: '12s', animationDelay: '1s' }}>
            <i className="fa-solid fa-flask"></i>
          </div>
          <div className="absolute top-1/3 right-[20%] opacity-10 text-white text-4xl animate-pulse-glow" style={{ animationDuration: '4s' }}>
            <i className="fa-solid fa-star-of-life"></i>
          </div>
        </>
      )}

      {/* MAIN CONTENT */}
      <div className="relative z-10 max-w-6xl mx-auto w-full pt-10">
        
        {/* HERO */}
        <div className="mb-24">
          <div className={`inline-block px-6 py-2 rounded-full mb-6 border ${
            isCyber 
              ? 'border-green-500 bg-black text-green-500 font-data' 
              : 'border-cyan-500/30 bg-white/5 text-cyan-300 backdrop-blur-md'
          }`}>
            <span className="text-sm font-bold tracking-[0.2em] uppercase">
              {isCyber ? 'SYSTEM_OVERRIDE_ACTIVE' : 'Next Gen Science Platform'}
            </span>
          </div>

          <h1 className={`text-6xl md:text-7xl lg:text-8xl mb-6 ${
            isCyber ? 'font-data text-green-500 cyber-glitch' : 'font-brand text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 drop-shadow-lg'
          }`}>
            Scientific Thinking<br />
            <span className={isCyber ? 'text-green-700' : 'text-white'}>Reinvented</span>
          </h1>

          <p className={`text-xl md:text-2xl mb-10 max-w-2xl mx-auto leading-relaxed ${
            isCyber ? 'font-data text-green-900' : 'font-body text-slate-300'
          }`}>
            Learn Science at Warp Speed. The universe of knowledge awaits.
          </p>

          <button
            onClick={onOpenAuth}
            className="neon-button px-12 py-4 rounded-full text-xl font-bold tracking-wide transform hover:-translate-y-1 transition-all duration-300"
          >
            {isCyber ? '> INITIALIZE_LEARNING' : 'Start Learning'}
          </button>
        </div>

        {/* FEATURES (Replaced Images with Glass Cards & Icons) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className={`glass-card p-8 flex flex-col items-center transition-all duration-500 hover:bg-white/10 ${isCyber ? 'hover:border-green-400' : 'hover:border-cyan-400'}`}
            >
              <div className={`text-6xl mb-6 ${feature.color} animate-float`} style={{ animationDelay: `${index * 0.5}s` }}>
                <i className={feature.icon}></i>
              </div>
              <h3 className={`text-2xl font-bold mb-4 ${isCyber ? 'font-data text-green-400' : 'font-brand text-white'}`}>
                {feature.title}
              </h3>
              <p className={`text-sm leading-relaxed ${isCyber ? 'font-data text-green-800' : 'font-body text-slate-300'}`}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* ETHICAL AI SECTION */}
        <div className={`glass-card p-12 mb-20 relative overflow-hidden`}>
          {/* Decorative background glow */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
          
          <h2 className={`text-3xl font-bold mb-8 text-center ${isCyber ? 'font-data text-green-500' : 'font-brand text-white'}`}>
            Ethical AI Protocol
          </h2>
          
          <ul className={`space-y-4 max-w-3xl mx-auto text-left ${isCyber ? 'font-data text-green-700' : 'font-body text-slate-200'}`}>
            {[
              "Use AI as a co-pilot, not an autopilot.",
              "Verify all generated data with textbooks.",
              "Develop your own neural pathways; let AI guide, not solve.",
              "Maintain academic integrity in all missions."
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-4 p-2 rounded hover:bg-white/5 transition-colors">
                <i className={`fa-solid fa-check mt-1 ${isCyber ? 'text-green-500' : 'text-cyan-400'}`}></i>
                <span className="text-lg">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// MAIN APP
// ============================================================================
const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({ loggedIn: false, user: null });
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        await initializeSupabase();
        const storedUser = sessionService.getSession();
        if (storedUser) {
          const validated = await sessionService.validateSession().catch(() => null);
          setAuth({ loggedIn: !!validated, user: validated || storedUser });
        }
        setTheme(DEFAULT_THEME);
      } finally {
        setInitializing(false);
      }
    };
    init();
  }, []);

  // Sync Theme with Index.html Bridge
  useEffect(() => {
    if (initializing) return;
    window.ThemeManager?.setTheme(theme);
  }, [theme, initializing]);

  // Handlers
  const handleLogin = useCallback((user: User) => {
    const now = Date.now();
    const updatedUser = { ...user, lastLogin: now, loginHistory: [...(user.loginHistory || []), now] };
    sessionService.saveSession(updatedUser);
    setAuth({ loggedIn: true, user: updatedUser });
    setShowAuthModal(false);
  }, []);

  const handleLogout = useCallback(() => {
    sessionService.clearSession();
    setAuth({ loggedIn: false, user: null });
    setSidebarOpen(false);
  }, []);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e1b4b] text-white">
        <div className="animate-spin text-4xl text-cyan-400">
          <i className="fa-solid fa-atom"></i>
        </div>
      </div>
    );
  }

  const isCyber = theme === 'Cyber-Dystopian';

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <Navbar
        user={auth.user}
        onLogout={handleLogout}
        toggleSidebar={() => setSidebarOpen(prev => !prev)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <AuthModal onLogin={handleLogin} onClose={() => setShowAuthModal(false)} />
        </div>
      )}

      <main className="flex-grow container mx-auto px-4 py-8">
        <ErrorBoundary fallback={
          <div className="text-center text-red-500 mt-20 font-brand text-2xl">
            System Failure. Reload Required.
          </div>
        }>
          <Suspense fallback={<div className="text-center text-white/50 mt-20">Initializing Module...</div>}>
            <Routes>
              <Route path="/" element={
                auth.loggedIn && auth.user ? (
                  <Navigate to={
                    auth.user.role === 'admin' ? '/admin' : 
                    auth.user.role === 'teacher' ? '/teacher-dashboard' : 
                    '/student-dashboard'
                  } replace />
                ) : (
                  <Homepage theme={theme} onOpenAuth={() => setShowAuthModal(true)} />
                )
              } />

              <Route path="/admin" element={<RequireAuth allowedRoles={['admin']} user={auth.user} loggedIn={auth.loggedIn}><AdminDashboard /></RequireAuth>} />
              <Route path="/teacher-dashboard" element={<RequireAuth allowedRoles={['teacher']} user={auth.user} loggedIn={auth.loggedIn}><TeacherDashboard user={auth.user!} /></RequireAuth>} />
              <Route path="/student-dashboard" element={<RequireAuth allowedRoles={['student']} user={auth.user} loggedIn={auth.loggedIn}><StudentDashboard user={auth.user!} /></RequireAuth>} />
              
              <Route path="/courses" element={
                <RequireAuth allowedRoles={['teacher', 'student']} user={auth.user} loggedIn={auth.loggedIn}>
                  {auth.user?.role === 'teacher' ? <CourseManager /> : <StudentCourseList user={auth.user!} />}
                </RequireAuth>
              } />

              <Route path="/topic/:subject/:topicId" element={<RequireAuth allowedRoles={['student', 'teacher']} user={auth.user} loggedIn={auth.loggedIn}><TopicDetail /></RequireAuth>} />
              
              <Route path="/assessments" element={
                <RequireAuth allowedRoles={['teacher', 'student', 'admin']} user={auth.user} loggedIn={auth.loggedIn}>
                  {auth.user?.role === 'teacher' || auth.user?.role === 'admin' ? <AssessmentManager /> : <StudentAssessmentList user={auth.user!} />}
                </RequireAuth>
              } />

              <Route path="/teacher-assessments" element={<RequireAuth allowedRoles={['teacher', 'admin']} user={auth.user} loggedIn={auth.loggedIn}><TeacherAssessmentReview /></RequireAuth>} />
              <Route path="/sprint-challenge" element={<RequireAuth allowedRoles={['student']} user={auth.user} loggedIn={auth.loggedIn}><SprintChallenge /></RequireAuth>} />
              <Route path="/leaderboard" element={<RequireAuth allowedRoles={['student', 'teacher', 'admin']} user={auth.user} loggedIn={auth.loggedIn}><LeaderboardView /></RequireAuth>} />

              <Route path="*" element={
                <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
                  <div className={`text-9xl font-bold mb-4 ${isCyber ? 'text-green-600' : 'text-white/20'}`}>404</div>
                  <h1 className={`text-3xl mb-8 ${isCyber ? 'font-data text-green-500' : 'font-brand text-white'}`}>
                    Orbit Not Found
                  </h1>
                  <Link to="/" className="neon-button px-8 py-3 rounded-full">Return to Base</Link>
                </div>
              } />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      <footer className={`py-8 text-center backdrop-blur-md border-t ${
        isCyber ? 'bg-black border-green-900 text-green-800' : 'bg-white/5 border-white/10 text-slate-400'
      }`}>
        <div className="container mx-auto px-4">
          <div className={`text-2xl font-bold mb-2 ${isCyber ? 'font-data text-green-600' : 'font-brand text-cyan-400'}`}>
            The Newel Academy
          </div>
          <p className="text-sm mb-4">Advancing Scientific Literacy</p>
          <div className="flex justify-center gap-6 text-xs uppercase tracking-widest opacity-60">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <Link to="/courses" className="hover:text-white transition-colors">Curriculum</Link>
            {!auth.loggedIn && <button onClick={() => setShowAuthModal(true)} className="hover:text-white">Login</button>}
          </div>
        </div>
      </footer>

      {auth.loggedIn && auth.user?.role === 'student' && <AITutorChat />}
    </div>
  );
};

export default App;