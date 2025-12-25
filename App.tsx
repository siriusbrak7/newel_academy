import React, { useState, useEffect, useCallback, useMemo, Suspense, Component, ReactNode } from 'react';
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

// ============================================================================
// GLOBAL TYPES & DECLARATIONS
// ============================================================================
declare global {
  interface Window {
    ThemeManager?: {
      setTheme: (theme: string) => void;
      applyThemeClasses: (element: HTMLElement, theme: string) => void;
      getCurrentTheme: () => string;
      getCurrentCssClass: () => string;
    };
    neuroscienceFacts?: string[];
  }
}

// ============================================================================
// ERROR BOUNDARY COMPONENT (Production Reliability)
// ============================================================================
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: { hasError: boolean; };
  props: any;
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
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

const RequireAuth: React.FC<RequireAuthProps> = React.memo(({
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
      <div role="alert" className="p-10 text-center text-red-500 text-2xl font-bold">
        Access Denied — Required role: {allowedRoles.join(', ')}
      </div>
    );
  }

  return <>{children}</>;
});

// ============================================================================
// HOMEPAGE COMPONENT (Optimized)
// ============================================================================
interface HomepageProps {
  theme: Theme;
  onOpenAuth: () => void;
}

const Homepage: React.FC<HomepageProps> = React.memo(({ theme, onOpenAuth }) => {
  // Memoize particle generation to prevent recalculation on every render
  const particles = useMemo(() => {
    const count = theme === 'Cosmic' ? 150 : 100;
    return Array.from({ length: count }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 2 + 0.5
    }));
  }, [theme]);

  // Memoize feature list
  const features = useMemo(() => [
    {
      image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=300&fit=crop&auto=format',
      title: 'Course Mastery',
      description: 'Complete coverage of Biology, Chemistry, and Physics syllabi'
    },
    {
      image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=300&fit=crop&auto=format',
      title: '24/7 Learning Assistant',
      description: 'Instant help with homework and concept clarification anytime'
    },
    {
      image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&h=300&fit=crop&auto=format',
      title: 'Expert Tutor Available',
      description: 'Schedule sessions with certified science tutor for personalized guidance'
    }
  ], []);

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center text-center px-4 relative overflow-hidden">
      {/* Background Effects - Memoized render logic implicitly handled by React structure, 
          but keeping DOM lightweight */}
      {theme === 'Cosmic' && (
        <>
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
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
          {/* Decorative Planets - aria-hidden for accessibility */}
          <div className="absolute top-1/4 left-1/4 w-48 h-48 animate-float" aria-hidden="true" style={{ animationDuration: '15s' }}>
            <div className="absolute w-12 h-12 rounded-full bg-gradient-to-r from-orange-400 to-yellow-300 animate-pulse">
              <div className="absolute top-1/4 w-full h-1 bg-orange-600/50"></div>
              <div className="absolute top-1/2 w-full h-2 bg-orange-700/50"></div>
            </div>
          </div>
        </>
      )}

      {theme === 'Cyber-Dystopian' && (
        <div className="absolute inset-0 pointer-events-none opacity-10" aria-hidden="true">
          <div className="absolute inset-0 bg-grid-pattern" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-scan" />
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto w-full">
        {/* Hero Section */}
        <div className="mb-16 pt-12">
          <div className="inline-block mb-6">
            <div className={`px-6 py-2 rounded-full mb-4 ${
                theme === 'Cyber-Dystopian' ? 'cyber-box-glow bg-black text-green-400' : 'bg-gradient-to-r from-cyan-900/30 to-purple-900/30 text-cyan-300 border border-cyan-500/30'
              }`}>
              <span className="text-sm font-bold uppercase tracking-widest">Science Learning Platform</span>
            </div>
          </div>

          <h1 className={`text-5xl md:text-6xl lg:text-7xl font-bold mb-6 font-['Poppins'] ${
              theme === 'Cyber-Dystopian' ? 'cyber-text-glow text-green-400' : 'bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent'
            }`}>
            Scientific Thinking....<br />
            <span className="text-4xl md:text-5xl lg:text-6xl block mt-2 font-normal">Reinvented for Students</span>
          </h1>

          <p className={`text-xl md:text-2xl mb-8 max-w-3xl mx-auto font-light leading-relaxed ${theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white/90'}`}>
            Learn Science at Warp Speed....
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button
              onClick={onOpenAuth}
              aria-label="Start Learning"
              className={`px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 font-['Poppins'] ${
                theme === 'Cyber-Dystopian' ? 'cyber-box-glow bg-black text-green-400 hover:bg-green-950 cyber-glitch' : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:shadow-2xl hover:shadow-cyan-500/30 text-white'
              }`}
            >
              Start Learning.....
            </button>
          </div>
        </div>

        {/* Value Proposition */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-20 p-6 rounded-2xl bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm ${theme === 'Cyber-Dystopian' ? 'cyber-box-glow' : ''}`}>
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="h-48 mb-4 overflow-hidden rounded-lg bg-gray-800/30">
                <ImageOptimizer 
                  src={feature.image} 
                  alt={feature.title} 
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                  scienceThemed={true}
                  loading="lazy"
                />
              </div>
              <h3 className={`text-xl font-bold mb-3 font-['Poppins'] ${theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}`}>
                {feature.title}
              </h3>
              <p className={`font-['Inter'] ${theme === 'Cyber-Dystopian' ? 'text-green-300/70' : 'text-white/70'}`}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* AI Ethical Use */}
        <div className={`p-10 rounded-2xl backdrop-blur-md border mb-20 ${theme === 'Cyber-Dystopian' ? 'cyber-box-glow bg-black/70 border-green-500/30' : 'bg-white/10 border-white/20'}`}>
          <h2 className={`text-3xl font-bold mb-8 text-center font-['Poppins'] ${theme === 'Cyber-Dystopian' ? 'text-green-300' : 'text-white'}`}>
            Ethical Use of AI in Learning
          </h2>
          <ul className={`space-y-5 text-lg max-w-3xl mx-auto ${theme === 'Cyber-Dystopian' ? 'text-green-300/90' : 'text-white/90'}`}>
            <li className="flex items-start gap-4">
              <span className="text-2xl" aria-hidden="true">👉</span>
              <span>Use AI as a study assistant to deepen understanding, not to replace your own thinking.</span>
            </li>
            <li className="flex items-start gap-4">
              <span className="text-2xl" aria-hidden="true">👉</span>
              <span>Always verify AI-generated information with credible sources and textbooks.</span>
            </li>
            <li className="flex items-start gap-4">
              <span className="text-2xl" aria-hidden="true">👉</span>
              <span>Develop your own answers and explanations — let AI be a guide, not the author.</span>
            </li>
            <li className="flex items-start gap-4">
              <span className="text-2xl" aria-hidden="true">👉</span>
              <span>Maintain academic integrity: be transparent when AI helped you learn a concept.</span>
            </li>
            <li className="flex items-start gap-4">
              <span className="text-2xl" aria-hidden="true">👉</span>
              <span>AI accelerates learning when used ethically as it strengthens your mind.</span>
            </li>
          </ul>
        </div>

        {/* Final CTA */}
        <div className={`rounded-3xl p-10 md:p-16 text-center my-20 ${theme === 'Cyber-Dystopian' ? 'cyber-box-glow bg-black border-2 border-green-500/30' : 'bg-gradient-to-br from-cyan-900/20 via-purple-900/20 to-pink-900/20 border border-white/20 backdrop-blur-xl'}`}>
          <h2 className={`text-4xl font-bold mb-6 font-['Poppins'] ${theme === 'Cyber-Dystopian' ? 'text-green-400' : 'text-white'}`}>
            Start Exploring.....
          </h2>
          <button
            onClick={onOpenAuth}
            aria-label="Get Started Now"
            className={`px-12 py-6 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 font-['Poppins'] ${theme === 'Cyber-Dystopian' ? 'cyber-box-glow bg-green-600 text-black hover:bg-green-500' : 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:shadow-2xl hover:shadow-purple-500/40 text-white'}`}
          >
            Get Started Now
          </button>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({ loggedIn: false, user: null });
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Performance Monitoring
  useEffect(() => {
    const startTime = performance.now();
    return () => {
      const loadTime = performance.now() - startTime;
      if (loadTime > 3000) {
        console.warn(`App loaded in ${loadTime.toFixed(0)}ms`);
      }
    };
  }, []);

  // Initialization Effect
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

  // Theme Sync
  useEffect(() => {
    if (initializing) return;
    window.ThemeManager?.setTheme(theme);
  }, [theme, initializing]);

  // Callbacks for stability
  const handleLogin = useCallback((user: User) => {
    const now = Date.now();
    const updatedUser: User = {
      ...user,
      lastLogin: now,
      loginHistory: [...(user.loginHistory || []), now]
    };
    sessionService.saveSession(updatedUser);
    setAuth({ loggedIn: true, user: updatedUser });
    setShowAuthModal(false);
  }, []);

  const handleLogout = useCallback(() => {
    sessionService.clearSession();
    setAuth({ loggedIn: false, user: null });
    setSidebarOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const openAuth = useCallback(() => setShowAuthModal(true), []);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white" role="status">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-cyan-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold">Initializing The Newel....</h2>
        </div>
      </div>
    );
  }

  // Fallback UI for Error Boundary
  const ErrorFallback = (
    <div className="min-h-screen flex flex-col items-center justify-center text-white bg-slate-900">
      <h2 className="text-2xl font-bold mb-4 text-red-500">Something went wrong.</h2>
      <button 
        onClick={() => window.location.reload()} 
        className="px-6 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-700"
      >
        Reload Application
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        user={auth.user}
        onLogout={handleLogout}
        toggleSidebar={toggleSidebar}
        notifications={2}
        onOpenAuth={openAuth}
        currentTheme={theme}
      />

      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        currentTheme={theme} 
        setTheme={setTheme} 
      />

      {showAuthModal && !auth.loggedIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true">
          <AuthModal onLogin={handleLogin} onClose={() => setShowAuthModal(false)} />
        </div>
      )}

      <main className="flex-grow container mx-auto px-4 py-8">
        <ErrorBoundary fallback={ErrorFallback}>
          <Suspense fallback={<div className="text-center p-8 text-white/50">Loading content...</div>}>
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
                    <Homepage theme={theme} onOpenAuth={openAuth} />
                  )
                }
              />

              {/* Protected Routes */}
              <Route path="/admin" element={<RequireAuth allowedRoles={['admin']} user={auth.user} loggedIn={auth.loggedIn}><AdminDashboard /></RequireAuth>} />
              <Route path="/teacher-dashboard" element={<RequireAuth allowedRoles={['teacher']} user={auth.user} loggedIn={auth.loggedIn}><TeacherDashboard user={auth.user!} /></RequireAuth>} />
              <Route path="/student-dashboard" element={<RequireAuth allowedRoles={['student']} user={auth.user} loggedIn={auth.loggedIn}><StudentDashboard user={auth.user!} /></RequireAuth>} />

              <Route
                path="/courses"
                element={
                  <RequireAuth allowedRoles={['teacher', 'student']} user={auth.user} loggedIn={auth.loggedIn}>
                    {auth.user?.role === 'teacher' ? <CourseManager /> : <StudentCourseList user={auth.user!} />}
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
          </Suspense>
        </ErrorBoundary>
      </main>

      <footer className={`text-center py-8 border-t backdrop-blur-sm ${theme === 'Cyber-Dystopian' ? 'text-green-300/30 border-green-500/10 bg-black/50' : 'text-white/30 border-white/10 bg-black/20'}`}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <div className="mb-4 md:mb-0 text-left">
              <div className={`text-2xl font-bold mb-2 font-['Poppins'] ${theme === 'Cyber-Dystopian' ? 'text-green-400' : 'text-cyan-400'}`}>
                The Newel
              </div>
              <p className="text-sm">Expert Science Tutoring</p>
            </div>
            
            {/* Added Footer Navigation */}
            <div className="flex justify-center gap-6 mb-4 text-sm">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <Link to="/courses" className="hover:text-white transition-colors">Courses</Link>
              {!auth.loggedIn && (
                <button 
                  onClick={openAuth}
                  className="hover:text-white transition-colors"
                >
                  Register
                </button>
              )}
            </div>
          </div>
          <p className="text-sm">© 2025 The Newel • Science Learning Platform</p>
        </div>
      </footer>

      {auth.loggedIn && auth.user?.role === 'student' && <AITutorChat />}
    </div>
  );
};

export default App;