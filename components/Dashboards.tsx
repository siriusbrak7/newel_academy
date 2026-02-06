// Dashboards.tsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RestrictedTextArea } from '../RestrictedTextArea';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  StudentStats, 
  Assessment, 
  Announcement, 
  CourseStructure, 
  LeaderboardEntry, 
  // FIX: Rename Notification to avoid conflict
  Notification as NotificationType,
  Role 
} from '../types';
import {
  getUsers,
  saveUser,
  deleteUser,
  getAllStudentStats,
  getAssessments,
  getAnnouncements,
  getClassOverview,
  getLeaderboards,
  getCourses,
  getProgress,
  calculateUserStats,
  saveTopic,
  getStudentCourseHistory,
  getStudentAssessmentFeedback,
  saveAnnouncement,
  getSubmissions,
  refreshAllLeaderboards,
  uploadFileToSupabase,
  deleteMaterial,
  // Notification functions
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification,
  notifyCourseMaterialAdded,
  getCoursesLight,
  getStudentSubjectPerformance,
  getStudentCheckpointScores
} from '../services/storageService';
import { cache } from '../services/storageService';
import { 
  Check, 
  X, 
  Download, 
  RefreshCw, 
  BookOpen, 
  PenTool, 
  Zap, 
  TrendingUp, 
  ClipboardList, 
  Save, 
  Megaphone, 
  Send, 
  Trophy,
  AlertCircle,
  Brain,
  Atom,
  Clock,
  Users as UsersIcon,
  BarChart3,
  Target,
  MessageSquare,
  CheckCircle,
  ChevronDown,
  FileText,
  Link as LinkIcon,
  File as FileIcon,
  Trash2, 
  Bug,
  Plus,
  Bell,
  Info,
  // FIXED: Added all missing icon imports
  Search,
  MoreVertical,
  Award,
  Calendar,
  Activity,
  TrendingDown
} from 'lucide-react';

// Fixed Chart.js imports
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { supabase } from '@/services/supabaseClient';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

// Conditional jsPDF import
let jsPDF: any;
try {
  jsPDF = require('jspdf').jsPDF || require('jspdf').default;
} catch (error) {
  console.warn('jsPDF not available, PDF export will be disabled');
  jsPDF = class MockPDF {
    setFontSize() {}
    text() {}
    save() { console.log('PDF export disabled - install jspdf') }
  };
}

// =====================================================
// TYPE DEFINITIONS
// =====================================================

interface CoursePerformance {
  topicTitle: string;
  subject: string;
  gradeLevel: string;
  checkpointCount: number;
  checkpointScores: number[];
  averageScore: number;
  passed: boolean;
  completedAt?: number;
  checkpoints: Array<{
    id: string;
    title: string;
    score: number;
    passed: boolean;
    completedAt: number;
  }>;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// FIX: Implement missing function with proper return type
// FIX: Implement missing function with proper return type
// FIX: Implement missing function with proper return type
// FIX: Replace the entire getStudentDetailedCoursePerformance function with this corrected version
// FIXED VERSION of getStudentDetailedCoursePerformance in Dashboards.tsx
const getStudentDetailedCoursePerformance = async (username: string): Promise<Record<string, CoursePerformance>> => {
  try {
    console.log(`📊 Getting detailed course performance for ${username}`);
    
    // Get user ID first
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (!userData) {
      console.log('❌ User not found');
      return {};
    }

    // SIMPLIFIED QUERY - Get everything in one go
    const { data: topicsProgress, error } = await supabase
      .from('user_progress')
      .select(`
        *,
        topic:topics (
          id,
          title,
          grade_level,
          subject_id
        )
      `)
      .eq('user_id', userData.id);

    if (error) {
      console.error('❌ Error fetching topics progress:', error);
      return {};
    }

    console.log(`📚 Found ${topicsProgress?.length || 0} topics with progress`);

    if (!topicsProgress || topicsProgress.length === 0) {
      return {};
    }

    // Get subject names in a separate query
    const subjectIds = topicsProgress.map(tp => tp.topic?.subject_id).filter(Boolean);
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name')
      .in('id', subjectIds);

    const subjectMap = new Map();
    subjects?.forEach(s => subjectMap.set(s.id, s.name));

    const performance: Record<string, CoursePerformance> = {};
    
    // Process each topic
    for (const progress of topicsProgress) {
      const topic = progress.topic;
      if (!topic || !topic.id) continue;
      
      // Get checkpoints for this topic
      const { data: checkpoints } = await supabase
        .from('checkpoints')
        .select('id, checkpoint_number, title, required_score')
        .eq('topic_id', topic.id)
        .order('checkpoint_number', { ascending: true });

      if (!checkpoints || checkpoints.length === 0) continue;
      
      const checkpointIds = checkpoints.map(c => c.id);
      
      // Get student's progress on these checkpoints
      const { data: checkpointProgress } = await supabase
        .from('student_checkpoint_progress')
        .select('checkpoint_id, score, passed, completed_at')
        .eq('user_id', userData.id)
        .in('checkpoint_id', checkpointIds);

      // Calculate performance metrics
      const checkpointScores = checkpointProgress?.map(cp => cp.score || 0) || [];
      const averageScore = checkpointScores.length > 0 
        ? Math.round(checkpointScores.reduce((a, b) => a + b, 0) / checkpointScores.length)
        : 0;
      
      // Get subject name safely
      const subjectName = subjectMap.get(topic.subject_id) || 'General';

      performance[topic.id] = {
        topicTitle: topic.title,
        subject: subjectName,
        gradeLevel: topic.grade_level || '9',
        checkpointCount: checkpointProgress?.length || 0,
        checkpointScores,
        averageScore,
        passed: averageScore >= 60,
        completedAt: checkpointProgress?.length > 0 
          ? Math.max(...checkpointProgress.map(cp => new Date(cp.completed_at || 0).getTime()))
          : undefined,
        checkpoints: checkpointProgress?.map(cp => {
          const checkpoint = checkpoints.find(c => c.id === cp.checkpoint_id);
          return {
            id: cp.checkpoint_id,
            title: checkpoint?.title || `Checkpoint ${cp.checkpoint_id}`,
            score: cp.score || 0,
            passed: cp.passed || false,
            completedAt: new Date(cp.completed_at || 0).getTime()
          };
        }) || []
      };
    }

    console.log(`✅ Course performance data: ${Object.keys(performance).length} topics`);
    return performance;
    
  } catch (error) {
    console.error('❌ Error getting detailed course performance:', error);
    return {};
  }
};

// =====================================================
// STUDENT DASHBOARD COMPONENT - FIXED VERSION
// =====================================================
export const StudentDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [advice, setAdvice] = useState<string>("Analyzing your learning patterns...");
  const [pendingAssessments, setPendingAssessments] = useState<Assessment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [progress, setProgress] = useState<any>({});
  const [courses, setCourses] = useState<CourseStructure>({});
  const [subjectLabels, setSubjectLabels] = useState<string[]>([]);
  const [subjectScores, setSubjectScores] = useState<number[]>([]);
  const [courseHistory, setCourseHistory] = useState<any[]>([]);
  const [assessmentFeedback, setAssessmentFeedback] = useState<any[]>([]);
  const [showGradeHistory, setShowGradeHistory] = useState(false);
  
  // Neuroscience Facts State
  const [neuroscienceFacts, setNeuroscienceFacts] = useState<string[]>([]);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [factFade, setFactFade] = useState(true);
  
  // Notifications State
  const [userNotifications, setUserNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Progressive loading states - OPTIMIZED
  const [loadingStates, setLoadingStates] = useState({
    essential: true,          // Header, basic stats
    performance: false,       // Charts, analytics (heavy)
    notifications: false,     // Notifications (can delay)
    assessments: false,       // Pending assessments
    courseHistory: false,     // Only when expanded
    announcements: false      // Low priority
  });
  
  // Cache for expensive calculations
  const [performanceCache, setPerformanceCache] = useState<{
    subjectPerformance?: Record<string, number>;
    lastUpdated?: number;
  }>({});
  
  // New: Data cache for quick refreshes
  const [dataCache, setDataCache] = useState<{
    essential?: {
      progress: any;
      courses: CourseStructure;
      pendingAssessments: Assessment[];
    };
    timestamp?: number;
  }>({});
  
  // Navigation
  const navigate = useNavigate();
  
  // Stats (memoized to prevent recalculation)
  const { activeDays, streak } = useMemo(() => calculateUserStats(user), [user]);

  // =====================================================
  // OPTIMIZATION 1: LOAD NEUROSCIENCE FACTS FROM WINDOW
  // =====================================================
  useEffect(() => {
    // Use window cache if available (fastest)
    const windowWithFacts = window as any;
    if (windowWithFacts.neuroscienceFacts && Array.isArray(windowWithFacts.neuroscienceFacts)) {
      setNeuroscienceFacts(windowWithFacts.neuroscienceFacts); // ALL facts
    } else {
      // Fallback facts (small set)
      const defaultFacts = [
        "The human brain has about 86 billion neurons.",
        "Neuroplasticity allows your brain to reorganize itself.",
        "Sleep is crucial for memory consolidation.",
        "Learning new skills increases neural pathway speed."
      ];
      setNeuroscienceFacts(defaultFacts);
    }
  }, []);

  // Rotate neuroscience facts (non-blocking)
  useEffect(() => {
    if (neuroscienceFacts.length === 0) return;
    
    const interval = setInterval(() => {
      setFactFade(false);
      setTimeout(() => {
        setCurrentFactIndex((prev) => (prev + 1) % neuroscienceFacts.length);
        setFactFade(true);
      }, 300);
    }, 11110);

    return () => clearInterval(interval);
  }, [neuroscienceFacts]);

  // =====================================================
  // OPTIMIZATION 2: LOAD ESSENTIAL DATA IN PARALLEL
  // =====================================================
  const loadEssentialData = async (forceRefresh = false): Promise<{
    progress: any;
    courses: CourseStructure;
    pendingAssessments: Assessment[];
  }> => {
    // Check centralized cache first (5 minute cache for essential data)
    const cacheKey = `newel_dashboard_essential_${user.username}`;
    if (!forceRefresh) {
      try {
        const cached = await cache.get(cacheKey, 5 * 60 * 1000);
        if (cached) {
          console.log('📦 Using cached essential data (centralized)');
          // Keep local state in sync
          setDataCache({ essential: cached, timestamp: Date.now() });
          return cached;
        }
      } catch (e) {
        // fallback to fresh fetch
        console.warn('Cache read failed for essential data', e);
      }
    }
    
    console.time('loadEssentialData');
    
    try {
      // OPTIMIZATION: Use Promise.all for independent operations
      const [progressData, coursesData, allAssessments] = await Promise.all([
        getProgress(user.username),
        getCoursesLight(user?.gradeLevel, user), // Add user parameter for limits //
        getAssessments()
      ]);
      
      // Get submissions separately (needed for filtering)
      const allSubmissions = await getSubmissions();
      
      // Filter pending assessments (max 3)
      const pending = allAssessments.filter(a =>
        (a.targetGrade === 'all' || a.targetGrade === user.gradeLevel) &&
        !allSubmissions.some(s => s.assessmentId === a.id && s.username === user.username)
      ).slice(0, 3);
      
      // Cache the essential data (centralized)
      const essentialData = {
        progress: progressData,
        courses: coursesData,
        pendingAssessments: pending
      };
      try {
        cache.set(cacheKey, essentialData, 5 * 60 * 1000);
      } catch (e) {
        console.warn('Failed to set cache for essential data', e);
      }
      setDataCache({ essential: essentialData, timestamp: Date.now() });
      
      console.timeEnd('loadEssentialData');
      console.log('✅ Essential data loaded:', {
        progressKeys: Object.keys(progressData).length,
        courses: Object.keys(coursesData).length,
        pendingAssessments: pending.length
      });
      
      return essentialData;
      
    } catch (error) {
      console.error('❌ Error loading essential data:', error);
      console.timeEnd('loadEssentialData');
      throw error;
    }
  };

  // =====================================================
  // FIXED: PERFORMANCE DATA LOADING WITH FALLBACK
  // =====================================================
  const loadPerformanceData = async (forceRefresh = false) => {
    // Check centralized cache first (5 minute cache for performance data)
    const perfCacheKey = `newel_performance_${user.username}`;
    if (!forceRefresh) {
      try {
        const cachedPerf = await cache.get(perfCacheKey, 5 * 60 * 1000);
        if (cachedPerf && cachedPerf.subjectPerformance) {
          console.log('📊 Using cached performance data (centralized)');
          setPerformanceCache({ subjectPerformance: cachedPerf.subjectPerformance, lastUpdated: Date.now() });
          const labels = Object.keys(cachedPerf.subjectPerformance);
          const scores = Object.values(cachedPerf.subjectPerformance);
          setSubjectLabels(labels as string[]);
          setSubjectScores(scores as number[]);
          generateAdvice(scores as number[]);
          setLoadingStates(prev => ({ ...prev, performance: false }));
          return;
        }
      } catch (e) {
        console.warn('Perf cache read failed', e);
      }
    }
    
    setLoadingStates(prev => ({ ...prev, performance: true }));
    console.time('loadPerformanceData');
    
    try {
      console.log('📊 Loading performance data...');
      
      // Try multiple methods to get performance data
      let subjectPerformance: Record<string, number> = {};
      
      // Method 1: Try getStudentSubjectPerformance
      try {
        subjectPerformance = await getStudentSubjectPerformance(user.username);
        console.log('📊 Method 1 (subject performance) result:', subjectPerformance);
      } catch (error1) {
        console.log('📊 Method 1 failed, trying method 2...');
        
        // Method 2: Try getStudentDetailedCoursePerformance and calculate manually
        try {
          const coursePerformance = await getStudentDetailedCoursePerformance(user.username);
          console.log('📊 Course performance data:', coursePerformance);
          
          if (Object.keys(coursePerformance).length > 0) {
            // Group by subject and calculate averages
            const subjectScoresMap: Record<string, number[]> = {};
            
            Object.values(coursePerformance).forEach(topic => {
              if (!topic || !topic.subject) return;
              
              const subject = topic.subject;
              if (!subjectScoresMap[subject]) {
                subjectScoresMap[subject] = [];
              }
              if (topic.averageScore && topic.averageScore > 0) {
                subjectScoresMap[subject].push(topic.averageScore);
              }
            });
            
            // Calculate average for each subject
            Object.entries(subjectScoresMap).forEach(([subject, scores]) => {
              if (scores.length > 0) {
                const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
                subjectPerformance[subject] = Math.round(average);
              }
            });
          }
        } catch (error2) {
          console.error('📊 Method 2 also failed:', error2);
        }
      }
      
      // Update centralized cache and local state
      try {
        cache.set(perfCacheKey, { subjectPerformance }, 5 * 60 * 1000);
      } catch (e) {
        console.warn('Failed to set performance cache', e);
      }
      setPerformanceCache({ subjectPerformance, lastUpdated: Date.now() });
      
      if (Object.keys(subjectPerformance).length > 0) {
        const labels = Object.keys(subjectPerformance);
        const scores = Object.values(subjectPerformance);
        
        // VALIDATION: Ensure all scores are valid (0-100)
        const validScores = scores.filter(score => 
          typeof score === 'number' && score >= 0 && score <= 100
        );
        
        if (validScores.length > 0) {
          setSubjectLabels(labels);
          setSubjectScores(scores);
          generateAdvice(validScores);
          console.log('✅ Subject performance data loaded:', { labels, scores });
        } else {
          // Show placeholder for new students
          setSubjectLabels(['Start Learning!']);
          setSubjectScores([0]);
          setAdvice("Complete your first checkpoint or assessment to see your scores!");
          console.log('⚠️ Scores found but invalid values');
        }
      } else {
        // No performance data found - show encouraging placeholder
        const sampleSubjects = ['Physics', 'Chemistry', 'Biology'];
        const sampleScores = [0, 0, 0];
        
        setSubjectLabels(sampleSubjects);
        setSubjectScores(sampleScores);
        setAdvice("Explore courses and complete checkpoints to unlock your real performance data!");
        console.log('📭 No subject performance data found - showing placeholder');
      }
      
      console.timeEnd('loadPerformanceData');
      
    } catch (error) {
      console.error('❌ Error loading performance data:', error);
      // Show placeholder even on error
      setSubjectLabels(['Start Learning!']);
      setSubjectScores([0]);
      setAdvice("Complete checkpoints and assessments to see your subject performance here!");
    } finally {
      setLoadingStates(prev => ({ ...prev, performance: false }));
    }
  };

  // Helper to generate advice (memoized)
  const generateAdvice = useCallback((scores: number[]) => {
    if (scores.length === 0) {
      setAdvice("Complete assessments and checkpoints to get personalized advice!");
      return;
    }
    
    const overallAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    if (overallAvg < 50) {
      setAdvice("Focus on mastering fundamentals. Review materials and retry checkpoints.");
    } else if (overallAvg < 70) {
      setAdvice("Good progress! Focus on improving weak areas identified in checkpoints.");
    } else if (overallAvg < 85) {
      setAdvice("Excellent work! You're mastering concepts. Try the 222-Sprint challenge!");
    } else {
      setAdvice("Outstanding performance! Consider helping classmates or exploring advanced topics.");
    }
  }, []);

  // =====================================================
  // OPTIMIZATION 4: PROGRESSIVE DATA LOADING STRATEGY
  // =====================================================
  useEffect(() => {
    const loadDataProgressive = async () => {
      console.log('🚀 Starting progressive data load...');
      
      try {
        // PHASE 1: ESSENTIAL DATA (immediate - critical for UI)
        setLoadingStates(prev => ({ ...prev, essential: true, assessments: true }));
        const essentialData = await loadEssentialData();
        
        // Update state with essential data
        setProgress(essentialData.progress);
        setCourses(essentialData.courses);
        setPendingAssessments(essentialData.pendingAssessments);
        setLoadingStates(prev => ({ ...prev, essential: false, assessments: false }));
        
        console.log('✅ Phase 1 complete: Essential data loaded');
        
        // PHASE 2: PERFORMANCE DATA (after 100ms delay)
        setTimeout(() => {
          setLoadingStates(prev => ({ ...prev, performance: true }));
          loadPerformanceData();
        }, 100);
        
        // PHASE 3: NOTIFICATIONS (after 300ms delay - lower priority)
        setTimeout(() => {
          loadUserNotifications();
        }, 300);
        
        // PHASE 4: ANNOUNCEMENTS (after 500ms delay - lowest priority)
        setTimeout(() => {
          loadAnnouncements();
        }, 500);
        
      } catch (error) {
        console.error('❌ Error in progressive loading:', error);
        setLoadingStates(prev => ({ 
          ...prev, 
          essential: false, 
          assessments: false,
          performance: false 
        }));
      }
    };
    
    loadDataProgressive();
    
    // Set up notification refresh every 60 seconds (reduced frequency)
    const notificationInterval = setInterval(() => {
      if (user?.username && !loadingStates.notifications) {
        loadUserNotifications();
      }
    }, 60000); // 60 seconds
    
    return () => clearInterval(notificationInterval);
  }, [user]);

  // =====================================================
  // OPTIMIZATION 5: LAZY LOAD FUNCTIONS
  // =====================================================
  
  // Load notifications (can be delayed)
  const loadUserNotifications = async () => {
    if (!user?.username) return;
    
    setLoadingStates(prev => ({ ...prev, notifications: true }));
    try {
      const notifications = await getUserNotifications(user.username);
      setUserNotifications(notifications.slice(0, 5)); // Only show 5 most recent
      setUnreadCount(notifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, notifications: false }));
    }
  };

  // Load announcements (lowest priority)
  const loadAnnouncements = async () => {
    setLoadingStates(prev => ({ ...prev, announcements: true }));
    try {
      const announcementsData = await getAnnouncements();
      setAnnouncements(announcementsData.slice(0, 2)); // Only show 2 max
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, announcements: false }));
    }
  };

  // Lazy load course history only when needed
  const loadCourseHistory = async () => {
    if (courseHistory.length > 0) return; // Already loaded
    
    setLoadingStates(prev => ({ ...prev, courseHistory: true }));
    try {
      const history = await getStudentCourseHistory(user.username);
      setCourseHistory(history.slice(0, 5)); // Only show 5 most recent
      
      // Also load assessment feedback if needed
      if (showGradeHistory) {
        const feedback = await getStudentAssessmentFeedback(user.username);
        setAssessmentFeedback(feedback.slice(0, 3)); // Only show 3 most recent
      }
    } catch (error) {
      console.error('Error loading course history:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, courseHistory: false }));
    }
  };

  // =====================================================
  // OPTIMIZATION 6: LAZY LOAD TRIGGER
  // =====================================================
  useEffect(() => {
    if (showGradeHistory && courseHistory.length === 0 && !loadingStates.courseHistory) {
      loadCourseHistory();
    }
  }, [showGradeHistory]);

  // =====================================================
  // OPTIMIZATION 7: REFRESH WITH CACHE
  // =====================================================
  const refreshData = async (force = false) => {
    console.log('🔄 Refreshing student dashboard...');
    
    // Show loading states for what we're refreshing
    setLoadingStates({
      essential: force || !dataCache.essential,
      notifications: force,
      assessments: force || !dataCache.essential,
      performance: true, // Always reload performance
      courseHistory: false,
      announcements: force
    });
    
    try {
      if (force || !dataCache.essential) {
        // If force, clear centralized essential cache for this user then reload
        if (force) {
          try { cache.clear(`newel_dashboard_essential_${user.username}`); } catch (e) {}
        }
        const essentialData = await loadEssentialData(true);
        setProgress(essentialData.progress);
        setCourses(essentialData.courses);
        setPendingAssessments(essentialData.pendingAssessments);
        
        if (force) {
          await loadUserNotifications();
          await loadAnnouncements();
        }
      }
      
      // Always reload performance data (with potential cache)
      if (force) {
        try { cache.clear(`newel_performance_${user.username}`); } catch (e) {}
      }
      await loadPerformanceData(force);
      
      console.log('✅ Refresh complete');
    } catch (error) {
      console.error('❌ Error during refresh:', error);
    }
  };

  // =====================================================
  // FIXED: CHART DATA WITH PLACEHOLDER SUPPORT
  // =====================================================
  const chartData = useMemo(() => {
    // Check if we're showing placeholder data
    const isPlaceholder = subjectLabels.length === 1 && subjectLabels[0] === 'Start Learning!';
    const isSampleData = subjectLabels.length === 3 && subjectLabels.includes('Physics') && subjectScores.every(score => score === 0);
    
    if (isPlaceholder) {
      return {
        labels: ['Start Learning!'],
        datasets: [{
          label: 'Complete your first checkpoint',
          data: [100],
          backgroundColor: ['rgba(59, 130, 246, 0.6)'], // Blue color
          borderColor: 'transparent',
          hoverOffset: 12,
          borderWidth: 0
        }]
      };
    }
    
    if (isSampleData) {
      return {
        labels: subjectLabels,
        datasets: [{
          label: 'Ready to begin!',
          data: [30, 30, 40], // Sample distribution
          backgroundColor: [
            'rgba(6, 182, 212, 0.6)',    // cyan - Physics
            'rgba(168, 85, 247, 0.6)',   // purple - Chemistry
            'rgba(34, 197, 94, 0.6)',    // green - Biology
          ],
          borderColor: 'transparent',
          hoverOffset: 12,
          borderWidth: 0
        }]
      };
    }
    
    if (subjectLabels.length === 0 || subjectScores.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          label: 'Average Score (%)',
          data: [0],
          backgroundColor: ['rgba(100, 100, 100, 0.6)'],
          borderColor: 'transparent',
          hoverOffset: 12,
          borderWidth: 0
        }]
      };
    }
    
    // Generate consistent colors based on number of subjects
    const generateColors = (count: number) => {
      const baseColors = [
        'rgba(6, 182, 212, 0.6)',    // cyan
        'rgba(168, 85, 247, 0.6)',   // purple
        'rgba(236, 72, 153, 0.6)',   // pink
        'rgba(34, 197, 94, 0.6)',    // green
        'rgba(245, 158, 11, 0.6)',   // yellow
        'rgba(239, 68, 68, 0.6)',    // red
      ];
      
      if (count <= baseColors.length) {
        return baseColors.slice(0, count);
      }
      
      // Generate more colors if needed (simpler algorithm)
      const colors = [...baseColors];
      for (let i = baseColors.length; i < count; i++) {
        const hue = (i * 50) % 360; // Simple hue distribution
        colors.push(`hsla(${hue}, 70%, 60%, 0.6)`);
      }
      return colors;
    };
    
    return {
      labels: subjectLabels,
      datasets: [{
        label: 'Average Score (%)',
        data: subjectScores,
        backgroundColor: generateColors(subjectLabels.length),
        borderColor: 'transparent',
        hoverOffset: 12,
        borderWidth: 0
      }]
    };
  }, [subjectLabels, subjectScores]);

  // Handle notification click
  const handleNotificationClick = async (notification: NotificationType) => {
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
  };

  // Export PDF
  const exportPDF = async () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text(`Progress Report: ${user.username}`, 10, 20);
      doc.setFontSize(12);
      doc.text(`Grade Level: ${user.gradeLevel || 'Not specified'}`, 10, 30);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 10, 40);
      doc.text(`Active Days: ${activeDays} | Current Streak: ${streak} days`, 10, 50);
      
      let y = 70;
      
      if (subjectLabels.length > 0 && subjectLabels[0] !== 'Start Learning!') {
        doc.text('Subject Performance:', 10, y);
        y += 10;
        
        subjectLabels.forEach((subject, i) => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(`${subject}: ${Math.round(subjectScores[i])}% Average`, 10, y);
          y += 10;
        });
      }
      
      // Save the PDF
      doc.save(`${user.username}_progress_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert("Failed to export report");
    }
  };

  // =====================================================
  // QUICK START FEATURES
  // =====================================================
  const features = [
    { 
      title: "Critical Questions", 
      desc: "Practice Standard Science questions.", 
      icon: <Brain className="text-purple-400" size={32} />, 
      color: "from-purple-500/20 to-blue-500/20", 
      link: "/courses" 
    },
    { 
      title: "Ask Newel", 
      desc: "Get instant simplifications of complex theories.", 
      icon: <Atom className="text-cyan-400" size={32} />, 
      color: "from-cyan-500/20 to-teal-500/20", 
      link: "/courses" 
    },
    { 
      title: "222 Sprint", 
      desc: "Challenge: Answer as many as you can in 222 seconds.", 
      icon: <Zap className="text-yellow-400" size={32} />, 
      color: "from-yellow-500/20 to-orange-500/20", 
      link: "/sprint-challenge" 
    }
  ];

  // =====================================================
  // DEBUG FUNCTION
  // =====================================================
  const testPerformanceData = async () => {
    console.log('🧪 Testing performance data retrieval...');
    
    try {
      // Test 1: Direct function call
      console.log('Test 1: getStudentSubjectPerformance');
      const subjectPerf = await getStudentSubjectPerformance(user.username);
      console.log('Subject Performance:', subjectPerf);
      
      // Test 2: Detailed course performance
      console.log('Test 2: getStudentDetailedCoursePerformance');
      const coursePerf = await getStudentDetailedCoursePerformance(user.username);
      console.log('Course Performance:', coursePerf);
      
      // Test 3: Checkpoints
      console.log('Test 3: getStudentCheckpointScores');
      const checkpointScores = await getStudentCheckpointScores(user.username);
      console.log('Checkpoint Scores:', checkpointScores);
      
      // Test 4: Submissions
      console.log('Test 4: getSubmissions');
      const submissions = await getSubmissions();
      const mySubmissions = submissions.filter(s => s.username === user.username);
      console.log('My Submissions:', mySubmissions);
      
      // Show all results
      alert(`
        Subject Performance: ${JSON.stringify(subjectPerf)}
        Course Performance Topics: ${Object.keys(coursePerf).length}
        Checkpoint Scores: ${JSON.stringify(checkpointScores)}
        My Submissions: ${mySubmissions.length}
      `);
      
    } catch (error) {
      console.error('Test failed:', error);
    }
  };

  // =====================================================
  // RENDER LOADING STATE
  // =====================================================
  if (loadingStates.essential) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Skeleton for header */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-white/10 p-8 rounded-2xl flex items-center justify-between">
              <div className="space-y-3">
                <div className="h-10 w-64 bg-white/10 rounded-lg animate-pulse"></div>
                <div className="h-4 w-96 bg-white/5 rounded animate-pulse"></div>
              </div>
              <div className="flex gap-2">
                <div className="h-10 w-24 bg-white/10 rounded-lg animate-pulse"></div>
                <div className="h-10 w-28 bg-white/10 rounded-lg animate-pulse"></div>
              </div>
            </div>
            
            {/* Skeleton for features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                  <div className="h-12 w-12 bg-white/10 rounded-xl mb-4 animate-pulse"></div>
                  <div className="h-6 w-32 bg-white/10 rounded mb-2 animate-pulse"></div>
                  <div className="h-4 w-48 bg-white/5 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Skeleton for right column */}
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl h-64 flex flex-col items-center justify-center">
              <div className="h-48 w-48 bg-white/5 rounded-full animate-pulse"></div>
            </div>
            
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
              <div className="h-6 w-32 bg-white/10 rounded mb-4 animate-pulse"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 w-24 bg-white/5 rounded animate-pulse"></div>
                    <div className="h-4 w-12 bg-white/5 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-white/60">Loading your dashboard...</p>
          <p className="text-white/40 text-sm mt-2">Getting your courses and progress ready</p>
        </div>
      </div>
    );
  }

  // =====================================================
  // MAIN RENDER
  // =====================================================
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-white/10 p-8 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-4xl font-bold text-white mb-2">Welcome Back, {user.username}</h2>
              <p className="text-white/60">
                {user.gradeLevel ? `Grade ${user.gradeLevel} Science Student` : 'Science Student'}
                {subjectLabels.length > 0 && subjectLabels[0] !== 'Start Learning!' && ` • ${subjectLabels.length} Subjects Tracked`}
                {unreadCount > 0 && ` • ${unreadCount} new notification${unreadCount > 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => refreshData(false)}
                disabled={loadingStates.performance || loadingStates.assessments}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingStates.performance || loadingStates.assessments ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} /> Refresh
                  </>
                )}
              </button>
              <button 
                onClick={exportPDF} 
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
              >
                <Download size={16} /> Export Report
              </button>
            </div>
          </div>

          {/* Quick Start Guide */}
          <div className="mb-6">
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-white/10 p-4 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-white/10 p-2 rounded-lg">
                  <BookOpen className="text-cyan-300" size={20} />
                </div>
                <h4 className="font-bold text-cyan-300 text-lg">Quick Start Guide</h4>
                <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded">New</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={14} />
                  <span className="text-white/90">Study course materials</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={14} />
                  <span className="text-white/90">Complete checkpoints</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={14} />
                  <span className="text-white/90">Track progress on dashboard</span>
                </div>
                <div className="flex items-start gap-2">
                  <MessageSquare className="text-blue-400 flex-shrink-0 mt-0.5" size={14} />
                  <span className="text-white/90">Ask Newel for help</span>
                </div>
                <div className="flex items-start gap-2">
                  <Zap className="text-yellow-400 flex-shrink-0 mt-0.5" size={14} />
                  <span className="text-white/90">Try 222-Sprint challenge</span>
                </div>
                <div className="flex items-start gap-2">
                  <Trophy className="text-purple-400 flex-shrink-0 mt-0.5" size={14} />
                  <span className="text-white/90">Climb the leaderboard</span>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/60 flex justify-between">
                <span>Need help? Check course details for full guide</span>
                <Link to="/courses" className="text-cyan-400 hover:text-cyan-300">
                  Go to Courses →
                </Link>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          {loadingStates.notifications ? (
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="h-6 w-32 bg-white/10 rounded animate-pulse"></div>
                <div className="h-6 w-16 bg-white/10 rounded animate-pulse"></div>
              </div>
              <div className="space-y-2">
                {[1, 2].map(i => (
                  <div key={i} className="p-3 rounded-lg border border-white/10">
                    <div className="flex items-start gap-2">
                      <div className="h-8 w-8 bg-white/10 rounded animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-48 bg-white/10 rounded animate-pulse"></div>
                        <div className="h-3 w-32 bg-white/5 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : userNotifications.length > 0 && (
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Bell className="text-yellow-400" size={18} /> Recent Updates
                </h4>
                <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded">
                  {unreadCount} unread
                </span>
              </div>
              
              <div className="space-y-2">
                {userNotifications.map((notification, index) => (
                  <div 
                    key={index}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-white/5 ${notification.read ? 'border-white/5 bg-white/2' : 'border-cyan-500/20 bg-cyan-500/5'}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`p-1.5 rounded ${notification.type === 'success' ? 'bg-green-500/20 text-green-400' : 
                                      notification.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                                      notification.type === 'alert' ? 'bg-red-500/20 text-red-400' :
                                      'bg-cyan-500/20 text-cyan-400'}`}>
                        {notification.type === 'success' && <CheckCircle size={12} />}
                        {notification.type === 'warning' && <AlertCircle size={12} />}
                        {notification.type === 'alert' && <Bell size={12} />}
                        {notification.type === 'info' && <Info size={12} />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white/90">{notification.text}</p>
                        <p className="text-xs text-white/40 mt-1">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-cyan-500 rounded-full mt-1"></div>
                      )}
                    </div>
                  </div>
                ))}
                
                {userNotifications.length > 5 && (
                  <div className="text-center pt-2">
                    <Link 
                      to="/notifications" 
                      className="text-xs text-cyan-400 hover:text-cyan-300"
                    >
                      View all notifications →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Neuroscience Facts Section */}
          {neuroscienceFacts.length > 0 && (
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-white/10 p-6 rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="bg-white/10 p-3 rounded-xl">
                  <Brain className="text-cyan-300" size={28}/>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-cyan-300 text-lg">Neuroscience Insight</h4>
                    <span className="text-xs text-white/40">
                      Fact {currentFactIndex + 1} of {neuroscienceFacts.length}
                    </span>
                  </div>
                  <p className={`text-white/90 italic transition-opacity duration-300 ${factFade ? 'opacity-100' : 'opacity-0'}`}>
                    "{neuroscienceFacts[currentFactIndex]}"
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-500 transition-all duration-1000 ease-out"
                        style={{ width: `${((currentFactIndex + 1) / neuroscienceFacts.length) * 100}%` }}
                      />
                    </div>
                    <button 
                      onClick={() => {
                        setFactFade(false);
                        setTimeout(() => {
                          setCurrentFactIndex((prev) => (prev + 1) % neuroscienceFacts.length);
                          setFactFade(true);
                        }, 300);
                      }}
                      className="text-xs text-cyan-400 hover:text-cyan-300 bg-white/5 px-2 py-1 rounded"
                    >
                      Next Fact
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Advisor */}
          <div className="bg-gradient-to-r from-purple-900/40 to-cyan-900/40 border border-white/10 p-6 rounded-2xl flex gap-4 items-start">
            <div className="bg-white/10 p-3 rounded-full">
              <Brain className="text-cyan-300" size={24}/>
            </div>
            <div>
              <h4 className="font-bold text-cyan-300 mb-1">From Newel:</h4>
              <p className="text-white/80 italic">"{advice}"</p>
            </div>
          </div>

          {/* Announcements */}
          {loadingStates.announcements ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-6 rounded-2xl">
              <div className="h-6 w-48 bg-yellow-500/20 rounded mb-4 animate-pulse"></div>
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="border-l-4 border-yellow-500 pl-4">
                    <div className="h-5 w-56 bg-yellow-500/10 rounded mb-2 animate-pulse"></div>
                    <div className="h-4 w-full bg-yellow-500/5 rounded mb-2 animate-pulse"></div>
                    <div className="flex justify-between">
                      <div className="h-3 w-24 bg-yellow-500/5 rounded animate-pulse"></div>
                      <div className="h-3 w-20 bg-yellow-500/5 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : announcements.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-6 rounded-2xl">
              <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                <Megaphone size={20}/> Important Updates
              </h3>
              <div className="space-y-4">
                {announcements.map(ann => {
                  const expiresDate = ann.expiresAt ? new Date(ann.expiresAt) : null;
                  const timeLeft = expiresDate ? expiresDate.getTime() - Date.now() : null;
                  const hoursLeft = timeLeft ? Math.ceil(timeLeft / (60 * 60 * 1000)) : 48;
                  
                  return (
                    <div key={ann.id} className="border-l-4 border-yellow-500 pl-4">
                      <div className="flex justify-between items-start">
                        <p className="text-white font-medium">{ann.title}</p>
                        {hoursLeft <= 24 && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
                            {hoursLeft}h left
                          </span>
                        )}
                      </div>
                      <p className="text-white/60 text-sm">{ann.content}</p>
                      <div className="flex justify-between text-white/30 text-xs mt-2">
                        <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                        <span>By: {ann.author || ann.authorName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending Assessments */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <ClipboardList className="text-cyan-400"/> My Active Assessments
              </h3>
              <Link to="/assessments" className="text-sm text-cyan-400 hover:underline">
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {pendingAssessments.length === 0 && 
                <p className="text-white/40 italic text-sm">No pending assessments. Great work!</p>
              }
              {pendingAssessments.map(a => (
                <div key={a.id} className="bg-white/5 p-3 rounded-lg flex justify-between items-center hover:bg-white/10 transition-colors">
                  <div>
                    <p className="text-white font-bold text-sm">{a.title}</p>
                    <p className="text-white/40 text-xs">{a.subject} • {a.questions?.length || 0} Questions</p>
                  </div>
                  <Link 
                    to="/assessments" 
                    className="bg-cyan-600/50 hover:bg-cyan-600 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Start Now
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <Link 
                to={f.link} 
                key={i} 
                className={`group bg-gradient-to-br ${f.color} backdrop-blur-sm border border-white/10 p-6 rounded-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow-xl`}
              >
                <div className="mb-4 bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                  {f.icon}
                </div>
                <h3 className="font-bold text-white mb-1">{f.title}</h3>
                <p className="text-white/60 text-xs">{f.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Performance Chart - FIXED */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl h-64 flex flex-col items-center justify-center">
            <div className="w-full">
              <h3 className="text-white font-bold mb-4 self-start">Subject Performance</h3>
              {loadingStates.performance ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                  <p className="text-white/60">Calculating your performance...</p>
                  <p className="text-white/40 text-sm mt-1">This may take a moment</p>
                </div>
              ) : subjectLabels.length > 0 ? (
                <div className="w-48 h-48 mx-auto">
                  <Doughnut 
                    data={chartData} 
                    options={{ 
                      plugins: { 
                        legend: { 
                          display: subjectLabels.length <= 5 && subjectLabels[0] !== 'Start Learning!',
                          position: 'bottom',
                          labels: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: { size: 10 }
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              if (context.label === 'Start Learning!') {
                                return 'Complete your first checkpoint to see scores';
                              }
                              if (subjectLabels.includes('Physics') && subjectScores.every(s => s === 0)) {
                                return 'Start learning to unlock performance data';
                              }
                              return `${context.label}: ${context.raw}%`;
                            }
                          }
                        }
                      },
                      maintainAspectRatio: false,
                      cutout: '65%'
                    }} 
                  />
                  {(subjectLabels[0] === 'Start Learning!' || 
                    (subjectLabels.includes('Physics') && subjectScores.every(s => s === 0))) && (
                    <div className="text-center mt-4">
                      <p className="text-cyan-300 text-sm font-medium">Ready to begin?</p>
                      <p className="text-white/60 text-xs">Complete checkpoints to see your progress here</p>
                      <Link 
                        to="/courses" 
                        className="inline-block mt-2 text-xs bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded hover:bg-cyan-500/30 transition-colors"
                      >
                        Browse Courses →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2 text-white/20">📊</div>
                  <p className="text-white/40 mb-2">No performance data available</p>
                  <p className="text-white/50 text-xs">
                    Complete assessments or checkpoints<br/>to see your performance
                  </p>
                  <button 
                    onClick={testPerformanceData}
                    className="mt-3 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded transition-colors"
                  >
                    Test Data Retrieval
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h3 className="text-white font-bold mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white/60 flex items-center gap-2">
                  <Clock size={16}/> Active Days
                </span>
                <span className="text-white font-mono">{activeDays}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 flex items-center gap-2">
                  <Zap size={16}/> Streak
                </span>
                <span className={`font-mono font-bold ${streak > 0 ? 'text-yellow-400' : 'text-white/60'}`}>
                  {streak} {streak === 1 ? 'Day' : 'Days'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 flex items-center gap-2">
                  <Brain size={16}/> Subjects Tracked
                </span>
                <span className="text-white font-mono">
                  {loadingStates.performance ? (
                    <span className="inline-block h-4 w-6 bg-white/10 rounded animate-pulse"></span>
                  ) : (
                    subjectLabels[0] === 'Start Learning!' ? 0 : subjectLabels.length
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 flex items-center gap-2">
                  <ClipboardList size={16}/> Pending Assessments
                </span>
                <span className="text-white font-mono">{pendingAssessments.length}</span>
              </div>
              {loadingStates.performance ? (
                <div className="flex justify-between items-center">
                  <span className="text-white/60 flex items-center gap-2">
                    <TrendingUp size={16}/> Overall Average
                  </span>
                  <span className="inline-block h-6 w-12 bg-white/10 rounded animate-pulse"></span>
                </div>
              ) : subjectScores.length > 0 && subjectLabels[0] !== 'Start Learning!' && !subjectScores.every(s => s === 0) ? (
                <div className="flex justify-between items-center">
                  <span className="text-white/60 flex items-center gap-2">
                    <TrendingUp size={16}/> Overall Average
                  </span>
                  <span className="text-green-400 font-mono font-bold">
                    {Math.round(subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length)}%
                  </span>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-white/60 flex items-center gap-2">
                    <TrendingUp size={16}/> Overall Average
                  </span>
                  <span className="text-white/60 font-mono">--%</span>
                </div>
              )}
              
              {/* Performance Metrics - Lazy loaded */}
              {loadingStates.courseHistory && showGradeHistory ? (
                <>
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 flex items-center gap-2">
                        <CheckCircle size={16}/> Courses Completed
                      </span>
                      <span className="inline-block h-4 w-8 bg-white/10 rounded animate-pulse"></span>
                    </div>
                  </div>
                </>
              ) : courseHistory.length > 0 && (
                <>
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 flex items-center gap-2">
                        <CheckCircle size={16}/> Courses Completed
                      </span>
                      <span className="text-white font-mono">{courseHistory.length}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 flex items-center gap-2">
                      <TrendingUp size={16}/> Course Avg Score
                    </span>
                    <span className="text-green-400 font-mono font-bold">
                      {courseHistory.length > 0 ? Math.round(courseHistory.reduce((sum, course) => sum + (course.finalScore || 0), 0) / courseHistory.length) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 flex items-center gap-2">
                      <Target size={16}/> Pass Rate
                    </span>
                    <span className="text-cyan-400 font-mono font-bold">
                      {courseHistory.length > 0 ? Math.round((courseHistory.filter(c => c.passed).length / courseHistory.length) * 100) : 0}%
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Grade History Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="text-green-400"/> Performance History
          </h3>
          <button 
            onClick={() => setShowGradeHistory(!showGradeHistory)}
            disabled={loadingStates.courseHistory}
            className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingStates.courseHistory ? 'Loading...' : (showGradeHistory ? 'Hide Details' : 'Show Details')}
            <ChevronDown className={`transform transition-transform ${showGradeHistory ? 'rotate-180' : ''}`} size={14} />
          </button>
        </div>
        
        {/* Grade History Cards (Collapsible) */}
        {showGradeHistory && (
          <div className="space-y-4">
            {loadingStates.courseHistory ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="h-6 w-48 bg-white/10 rounded mb-4 animate-pulse"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-black/20 p-3 rounded-lg">
                      <div className="flex justify-between mb-2">
                        <div className="h-5 w-56 bg-white/10 rounded animate-pulse"></div>
                        <div className="h-6 w-16 bg-white/10 rounded animate-pulse"></div>
                      </div>
                      <div className="flex justify-between">
                        <div className="h-3 w-36 bg-white/5 rounded animate-pulse"></div>
                        <div className="h-3 w-24 bg-white/5 rounded animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : courseHistory.length > 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Completed Courses</h4>
                <div className="space-y-2">
                  {courseHistory.map((course, index) => (
                    <div key={index} className="bg-black/20 p-3 rounded-lg hover:bg-black/30 transition-colors">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-white font-medium">{course.topicTitle}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          course.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {course.finalScore}% {course.passed ? '✓' : '✗'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-white/60">
                        <span>{course.subject} • Grade {course.gradeLevel}</span>
                        <span>{course.checkpoints?.filter((cp: any) => cp.passed).length || 0}/{course.checkpoints?.length || 0} checkpoints</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                <BookOpen className="text-white/20 mx-auto mb-2" size={32} />
                <p className="text-white/40">No completed courses yet</p>
                <p className="text-white/30 text-sm mt-1">Complete topics to see your history here</p>
                <Link 
                  to="/courses" 
                  className="inline-block mt-3 text-sm text-cyan-400 hover:text-cyan-300"
                >
                  Start Learning Now →
                </Link>
              </div>
            )}
            
            {/* Assessment Feedback */}
            {assessmentFeedback.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Recent Feedback</h4>
                <div className="space-y-3">
                  {assessmentFeedback.map((feedback, index) => (
                    <div key={index} className="bg-black/20 p-3 rounded-lg hover:bg-black/30 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-medium text-sm">{feedback.assessmentTitle}</span>
                        <span className="text-cyan-400 font-bold">{feedback.score}%</span>
                      </div>
                      <p className="text-white/70 text-xs mb-1">{feedback.feedback}</p>
                      <div className="flex justify-between text-xs text-white/40">
                        <span>{feedback.subject}</span>
                        <span>{new Date(feedback.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// =====================================================
// ADMIN DASHBOARD COMPONENT
// =====================================================
export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [leaderboards, setLeaderboards] = useState<{
    academic: LeaderboardEntry[];
    challenge: LeaderboardEntry[];
    assessments: LeaderboardEntry[];
  }>({ academic: [], challenge: [], assessments: [] });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [usersData, assessmentsData, announcementsData, leaderboardsData] = await Promise.all([
        getUsers(),
        getAssessments(),
        getAnnouncements(),
        getLeaderboards()
      ]);
      
      // Convert users object to array
      const usersArray = Object.values(usersData).filter(u => !['admin', 'teacher_demo', 'student_demo'].includes(u.username));
      setUsers(usersArray);
      setAssessments(assessmentsData);
      setAnnouncements(announcementsData);
      setLeaderboards(leaderboardsData);
    } catch (error) {
      console.error('Error refreshing admin dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [refreshKey]);

  const approveUser = async (username: string) => {
    const user = users.find(u => u.username === username);
    if (!user) return;
    
    user.approved = true;
    await saveUser(user);
    setRefreshKey(k => k + 1);
  };

  const deleteUserHandler = async (username: string) => {
    if (!confirm(`Delete user ${username}? This cannot be undone.`)) return;
    await deleteUser(username);
    setRefreshKey(k => k + 1);
  };

  const exportData = async () => {
    try {
      const data = { users, assessments, announcements, leaderboards };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newel-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
        <p className="mt-4 text-white/60">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
        <div className="flex gap-3">
          <button 
            onClick={refreshData} 
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button 
            onClick={exportData} 
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download size={16} /> Export Data
          </button>
          <button 
            onClick={() => setRefreshKey(k => k + 1)} 
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw size={16} /> Force Refresh
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Total Users</p>
              <p className="text-3xl font-bold text-white">{users.length}</p>
            </div>
            <UsersIcon className="text-cyan-400" size={32} />
          </div>
          <div className="mt-4 flex gap-2 text-sm">
            <span className="bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded">
              {users.filter(u => u.role === 'student').length} Students
            </span>
            <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
              {users.filter(u => u.role === 'teacher').length} Teachers
            </span>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Pending Approvals</p>
              <p className="text-3xl font-bold text-white">{users.filter(u => !u.approved).length}</p>
            </div>
            <AlertCircle className="text-yellow-400" size={32} />
          </div>
          <p className="text-white/40 text-sm mt-2">Users waiting for access</p>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Active Assessments</p>
              <p className="text-3xl font-bold text-white">{assessments.length}</p>
            </div>
            <ClipboardList className="text-green-400" size={32} />
          </div>
          <p className="text-white/40 text-sm mt-2">Available for students</p>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Active Announcements</p>
              <p className="text-3xl font-bold text-white">{announcements.length}</p>
            </div>
            <Megaphone className="text-orange-400" size={32} />
          </div>
          <p className="text-white/40 text-sm mt-2">Current notifications</p>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <div className="flex gap-2">
            <span className="bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded text-sm">
              {users.filter(u => u.approved).length} Approved
            </span>
            <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded text-sm">
              {users.filter(u => !u.approved).length} Pending
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-white/80">
            <thead className="text-xs text-white/60 border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Grade Level</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.username} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 px-4 font-medium">{user.username}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                      user.role === 'teacher' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">{user.gradeLevel || 'N/A'}</td>
                  <td className="py-3 px-4">
                    {user.approved ? (
                      <span className="flex items-center gap-1 text-green-400">
                        <Check size={14} /> Approved
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-yellow-400">
                        <AlertCircle size={14} /> Pending
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      {!user.approved && (
                        <button
                          onClick={() => approveUser(user.username)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => deleteUserHandler(user.username)}
                        className="bg-red-600/20 hover:bg-red-600/40 text-red-300 px-3 py-1 rounded text-xs transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <UsersIcon className="text-white/20 mx-auto mb-4" size={48} />
            <p className="text-white/40">No users found</p>
            <p className="text-white/30 text-sm mt-1">Users will appear here once registered</p>
          </div>
        )}
      </div>

      {/* Leaderboard Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="text-yellow-400" /> Academic Leaderboard
          </h3>
          <div className="space-y-3">
            {leaderboards.academic.slice(0, 5).map((entry, i) => (
              <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    i === 1 ? 'bg-gray-400/20 text-gray-300' :
                    i === 2 ? 'bg-amber-700/20 text-amber-400' :
                    'bg-white/5 text-white/60'
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-white font-medium">{entry.username}</p>
                    <p className="text-white/40 text-xs">Grade {entry.gradeLevel || '?'}</p>
                  </div>
                </div>
                <span className="text-green-400 font-bold">{entry.score}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="text-orange-400" /> 222-Sprint Challenge
          </h3>
          <div className="space-y-3">
            {leaderboards.challenge.slice(0, 5).map((entry, i) => (
              <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    i === 1 ? 'bg-gray-400/20 text-gray-300' :
                    i === 2 ? 'bg-amber-700/20 text-amber-400' :
                    'bg-white/5 text-white/60'
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-white font-medium">{entry.username}</p>
                    <p className="text-white/40 text-xs">Grade {entry.gradeLevel || '?'}</p>
                  </div>
                </div>
                <span className="text-orange-400 font-bold">{entry.score} pts</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="text-cyan-400" /> Assessment Performance
          </h3>
          <div className="space-y-3">
            {leaderboards.assessments.slice(0, 5).map((entry, i) => (
              <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    i === 1 ? 'bg-gray-400/20 text-gray-300' :
                    i === 2 ? 'bg-amber-700/20 text-amber-400' :
                    'bg-white/5 text-white/60'
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-white font-medium">{entry.username}</p>
                    <p className="text-white/40 text-xs">Grade {entry.gradeLevel || '?'}</p>
                  </div>
                </div>
                <span className="text-cyan-400 font-bold">{entry.score}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


// =====================================================
// TEACHER DASHBOARD COMPONENT - MOBILE OPTIMIZED VERSION
// =====================================================
export const TeacherDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [students, setStudents] = useState<StudentStats[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentStats[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [classOverview, setClassOverview] = useState<any>({});
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
  
  // Student tracking states
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [studentCourseData, setStudentCourseData] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [showTrackingSection, setShowTrackingSection] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'grade'>('name');
  const [filterGrade, setFilterGrade] = useState<string>('all');

  // Cache for student data (2-minute cache)
  const [studentDataCache, setStudentDataCache] = useState<Record<string, any>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Add this helper function at the top of TeacherDashboard component
const loadStudentPerformance = async (username: string) => {
  try {
    // Use the simpler function
    const subjectPerformance = await getStudentSubjectPerformance(username);
    
    // If that fails, try a direct query
    if (Object.keys(subjectPerformance).length === 0) {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();
      
      if (userData) {
        const { data: progress } = await supabase
          .from('student_checkpoint_progress')
          .select(`
            score,
            checkpoint:checkpoints (
              topic:topics (
                subject:subject_id (name)
              )
            )
          `)
          .eq('user_id', userData.id)
          .not('score', 'is', null);
        
        // Process the data...
      }
    }
    
    return subjectPerformance;
  } catch (error) {
    console.error('Error loading student performance:', error);
    return {};
  }
};

  // =====================================================
  // OPTIMIZATION 1: PARALLEL DATA LOADING
  // =====================================================
  const refreshData = async () => {
    console.log('🔄 Refreshing teacher dashboard...');
    setLoading(true);
    
    try {
      // OPTIMIZATION: Load all data in parallel
      const [studentsData, assessmentsData, announcementsData, overviewData] = await Promise.all([
        getAllStudentStats(),
        getAssessments(),
        getAnnouncements(),
        getClassOverview()
      ]);
      
      console.log(`✅ Loaded: ${studentsData.length} students, ${assessmentsData.length} assessments, ${announcementsData.length} announcements`);
      
      // Filter students for this teacher's grade level if specified
      const gradeFiltered = studentsData.filter(s => 
        !user.gradeLevel || s.gradeLevel === user.gradeLevel
      );
      
      setStudents(gradeFiltered);
      setFilteredStudents(gradeFiltered);
      setAssessments(assessmentsData.slice(0, 5)); // Only keep 5 latest assessments
      setAnnouncements(announcementsData.slice(0, 3)); // Only keep 3 latest announcements
      setClassOverview(overviewData);
      
      // Auto-select first student if none selected
      if (gradeFiltered.length > 0 && !selectedStudent) {
        setSelectedStudent(gradeFiltered[0].username);
      }
      
    } catch (error) {
      console.error('❌ Error refreshing teacher dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // OPTIMIZATION 2: CACHED STUDENT COURSE DATA LOADING
  // =====================================================
  const loadStudentCourseData = async (username: string, forceRefresh = false) => {
    // Check centralized cache first (2-minute cache)
    const cacheKey = `newel_student_${username}`;
    const now = Date.now();
    if (!forceRefresh) {
      try {
        const cached = await cache.get(cacheKey, 2 * 60 * 1000);
        if (cached) {
          console.log(`📊 Using cached student data for ${username} (centralized)`);
          setStudentCourseData(cached);
          return;
        }
      } catch (e) {
        console.warn('Failed to read student cache', e);
      }
    }
    
    console.log(`📊 Loading course data for ${username}...`);
    setTrackingLoading(true);
    
    try {
      // Get detailed course performance
      const coursePerformance = await getStudentDetailedCoursePerformance(username);
      
      // Get student's course history
      const courseHistory = await getStudentCourseHistory(username);
      
      // Calculate overall statistics
      let totalCheckpoints = 0;
      let passedCheckpoints = 0;
      let totalScore = 0;
      let topicCount = 0;
      let strongestTopic = { name: '', score: 0 };
      let weakestTopic = { name: '', score: 100 };
      
      Object.values(coursePerformance).forEach(topic => {
        if (!topic) return;
        
        totalCheckpoints += topic.checkpointCount || 0;
        passedCheckpoints += topic.checkpoints?.filter((cp: any) => cp.passed).length || 0;
        totalScore += topic.averageScore || 0;
        topicCount++;
        
        if (topic.averageScore > strongestTopic.score) {
          strongestTopic = { name: topic.topicTitle, score: topic.averageScore };
        }
        if (topic.averageScore < weakestTopic.score) {
          weakestTopic = { name: topic.topicTitle, score: topic.averageScore };
        }
      });
      
      const overallAverage = topicCount > 0 ? Math.round(totalScore / topicCount) : 0;
      const completionRate = totalCheckpoints > 0 ? Math.round((passedCheckpoints / totalCheckpoints) * 100) : 0;
      
      const studentData = {
        coursePerformance,
        courseHistory,
        username,
        overallStats: {
          totalTopics: topicCount,
          overallAverage,
          strongestTopic: strongestTopic.name || 'N/A',
          weakestTopic: weakestTopic.name || 'N/A',
          totalCheckpoints,
          passedCheckpoints,
          completionRate
        }
      };
      
      // Update centralized cache and local cache state
      try {
        cache.set(cacheKey, studentData, 2 * 60 * 1000);
      } catch (e) {
        console.warn('Failed to set student cache', e);
      }
      setStudentDataCache(prev => ({
        ...prev,
        [cacheKey]: {
          data: studentData,
          timestamp: now
        }
      }));
      
      setStudentCourseData(studentData);
      
      // Auto-select first topic if available
      const topics = Object.keys(coursePerformance);
      if (topics.length > 0 && !selectedTopic) {
        setSelectedTopic(topics[0]);
      }
      
    } catch (error) {
      console.error('❌ Error loading student course data:', error);
      setStudentCourseData(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  // =====================================================
  // OPTIMIZATION 3: EFFICIENT FILTERING & SORTING WITH DEBOUNCE
  // =====================================================
  useEffect(() => {
    // Debounce filter operations (150ms)
    const timeoutId = setTimeout(() => {
      let result = [...students];
      
      // Apply search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        result = result.filter(student => 
          student.username.toLowerCase().includes(term)
        );
      }
      
      // Apply grade filter
      if (filterGrade !== 'all') {
        result = result.filter(student => student.gradeLevel === filterGrade);
      }
      
      // Apply sorting
      result.sort((a, b) => {
        switch (sortBy) {
          case 'score':
            return b.avgScore - a.avgScore;
          case 'grade':
            return parseInt(a.gradeLevel) - parseInt(b.gradeLevel);
          case 'name':
          default:
            return a.username.localeCompare(b.username);
        }
      });
      
      setFilteredStudents(result);
    }, 150);
    
    return () => clearTimeout(timeoutId);
  }, [students, searchTerm, sortBy, filterGrade]);

  // =====================================================
  // OPTIMIZATION 4: LAZY LOAD STUDENT DATA WHEN NEEDED
  // =====================================================
  useEffect(() => {
    if (selectedStudent && showTrackingSection) {
      loadStudentCourseData(selectedStudent);
    }
  }, [selectedStudent, showTrackingSection]);

  // =====================================================
  // OPTIMIZATION 5: MEMOIZED CLASS STATISTICS
  // =====================================================
  const classStats = useMemo(() => {
    if (students.length === 0) return null;
    
    const totalStudents = students.length;
    const totalScore = students.reduce((sum, student) => sum + student.avgScore, 0);
    const classAverage = Math.round(totalScore / totalStudents);
    
    // Find struggling students (below 60%)
    const strugglingStudents = students.filter(s => s.avgScore < 60);
    
    // Count students by performance level
    const performanceLevels = {
      excellent: students.filter(s => s.avgScore >= 80).length,
      good: students.filter(s => s.avgScore >= 60 && s.avgScore < 80).length,
      needsHelp: students.filter(s => s.avgScore < 60).length
    };
    
    // Calculate average streak
    const avgStreak = Math.round(students.reduce((sum, student) => sum + student.streak, 0) / totalStudents);
    
    // Calculate average completion rate
    const avgCompletionRate = Math.round(students.reduce((sum, student) => sum + student.completionRate, 0) / totalStudents);
    
    return {
      totalStudents,
      classAverage,
      strugglingStudents: strugglingStudents.length,
      strugglingPercentage: Math.round((strugglingStudents.length / totalStudents) * 100),
      performanceLevels,
      avgStreak,
      avgCompletionRate
    };
  }, [students]);

  // =====================================================
  // OPTIMIZATION 6: FORMAT COURSE DATA WITH MEMOIZATION
  // =====================================================
  const formatCourseData = useMemo(() => {
    if (!studentCourseData || Object.keys(studentCourseData.coursePerformance).length === 0) {
      return [];
    }
    
    return Object.entries(studentCourseData.coursePerformance).map(([key, topic]: [string, any]) => ({
      key,
      topicTitle: topic.topicTitle,
      subject: topic.subject,
      averageScore: topic.averageScore,
      checkpointCount: topic.checkpointCount,
      passed: topic.passed,
      status: topic.averageScore >= 80 ? 'Excellent' : 
              topic.averageScore >= 60 ? 'Good' : 'Needs Improvement',
      color: topic.averageScore >= 80 ? 'text-green-400' : 
             topic.averageScore >= 60 ? 'text-yellow-400' : 'text-red-400',
      bgColor: topic.averageScore >= 80 ? 'bg-green-500/20' : 
               topic.averageScore >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20',
      checkpoints: topic.checkpoints || []
    }));
  }, [studentCourseData]);

  // Selected topic details
  const selectedTopicDetails = useMemo(() => {
    if (!studentCourseData || !selectedTopic || !studentCourseData.coursePerformance[selectedTopic]) {
      return null;
    }
    
    return studentCourseData.coursePerformance[selectedTopic];
  }, [studentCourseData, selectedTopic]);

  // =====================================================
  // INITIAL DATA LOAD
  // =====================================================
  useEffect(() => {
    refreshData();
  }, [refreshTrigger]);

  // =====================================================
  // HANDLER FUNCTIONS - FIXED ANNOUNCEMENT CREATION
  // =====================================================
  const createAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      alert('Please fill in both title and content');
      return;
    }

    try {
      // Fixed: Use correct field names for the new interface
      await saveAnnouncement({
        id: `temp-${Date.now()}`, // Temporary ID for frontend
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        authorName: user.username,
        author: user.username,
        createdAt: new Date().toISOString(), // Required field
        expiresAt: new Date(Date.now() + (48 * 60 * 60 * 1000)).toISOString()
      });
      
      setNewAnnouncement({ title: '', content: '' });
      setRefreshTrigger(prev => prev + 1);
      alert('Announcement created successfully!');
    } catch (error) {
      console.error('Error creating announcement:', error);
      alert('Failed to create announcement');
    }
  };

  const exportStudentData = () => {
    if (!selectedStudent || !studentCourseData) {
      alert('No student data to export');
      return;
    }

    const data = {
      student: selectedStudent,
      exportDate: new Date().toISOString(),
      overallStats: studentCourseData.overallStats,
      coursePerformance: studentCourseData.coursePerformance,
      courseHistory: studentCourseData.courseHistory
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedStudent}_performance_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // =====================================================
  // LOADING STATE - MOBILE OPTIMIZED
  // =====================================================
  if (loading) {
    return (
      <div className="px-4 py-8 max-w-7xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <div className="h-10 w-64 bg-white/10 rounded-lg animate-pulse"></div>
            <div className="h-4 w-48 sm:w-96 bg-white/5 rounded animate-pulse"></div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 w-24 sm:w-28 bg-white/10 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
        
        {/* Stats Cards Skeleton - Mobile Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="space-y-1 sm:space-y-2">
                  <div className="h-3 sm:h-4 w-16 sm:w-24 bg-white/10 rounded animate-pulse"></div>
                  <div className="h-6 sm:h-8 w-12 sm:w-16 bg-white/10 rounded animate-pulse"></div>
                </div>
                <div className="h-6 sm:h-8 w-6 sm:w-8 bg-white/10 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Main Content Skeleton */}
        <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
          <div className="h-6 sm:h-8 w-32 sm:w-48 bg-white/10 rounded mb-4 sm:mb-6 animate-pulse"></div>
          <div className="space-y-3 sm:space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-8 sm:h-10 w-8 sm:w-10 bg-white/10 rounded-full animate-pulse"></div>
                  <div className="space-y-1 sm:space-y-2">
                    <div className="h-3 sm:h-4 w-24 sm:w-32 bg-white/10 rounded animate-pulse"></div>
                    <div className="h-2 sm:h-3 w-16 sm:w-24 bg-white/5 rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="flex gap-1 sm:gap-2">
                  <div className="h-6 sm:h-8 w-16 sm:w-20 bg-white/10 rounded animate-pulse"></div>
                  <div className="h-6 sm:h-8 w-6 sm:w-8 bg-white/10 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // MAIN RENDER - MOBILE OPTIMIZED
  // =====================================================
  return (
    <div className="px-4 py-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">Teacher Dashboard</h1>
          <p className="text-white/60 text-sm sm:text-base">Welcome, {user.username}</p>
        </div>
        <div className="flex gap-2 sm:gap-3 flex-wrap">
          <button 
            onClick={() => setRefreshTrigger(prev => prev + 1)} 
            className="bg-white/10 hover:bg-white/20 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm sm:text-base"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <Link 
            to="/courses" 
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm sm:text-base"
          >
            <BookOpen size={14} /> Courses
          </Link>
          <Link 
            to="/assessments" 
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm sm:text-base"
          >
            <PenTool size={14} /> Assessments
          </Link>
        </div>
      </div>

      {/* Class Overview Stats - Mobile Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs sm:text-sm">Total Students</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{classStats?.totalStudents || 0}</p>
            </div>
            <UsersIcon className="text-cyan-400" size={24} />
          </div>
          <p className="text-white/40 text-xs sm:text-sm mt-1 sm:mt-2 truncate">
            {user.gradeLevel ? `Grade ${user.gradeLevel}` : 'All Grades'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs sm:text-sm">Class Average</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{classStats?.classAverage || 0}%</p>
            </div>
            <TrendingUp className="text-green-400" size={24} />
          </div>
          <p className="text-white/40 text-xs sm:text-sm mt-1 sm:mt-2">
            {classStats && classStats.classAverage >= 70 ? 'Excellent' : 
             classStats && classStats.classAverage >= 50 ? 'Good' : 'Needs attention'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs sm:text-sm">Struggling</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{classStats?.strugglingStudents || 0}</p>
            </div>
            <AlertCircle className="text-yellow-400" size={24} />
          </div>
          <p className="text-white/40 text-xs sm:text-sm mt-1 sm:mt-2">
            {classStats?.strugglingPercentage || 0}% need help
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs sm:text-sm">Completion Rate</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{classStats?.avgCompletionRate || 0}%</p>
            </div>
            <BarChart3 className="text-purple-400" size={24} />
          </div>
          <p className="text-white/40 text-xs sm:text-sm mt-1 sm:mt-2">
            Average completion
          </p>
        </div>
      </div>

      {/* Student Course Tracking Section - Mobile Optimized */}
      <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Target className="text-purple-400" size={18} /> Student Tracking
          </h2>
          <button
            onClick={() => setShowTrackingSection(!showTrackingSection)}
            className="text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            {showTrackingSection ? 'Hide' : 'Show'}
            <ChevronDown className={`transform transition-transform ${showTrackingSection ? 'rotate-180' : ''}`} size={12} />
          </button>
        </div>
        
        {showTrackingSection && (
          <div className="space-y-4">
            {/* Student Selection and Filters - Mobile Stacked */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" size={16} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search students..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm"
                  >
                    <option value="all">All Grades</option>
                    <option value="9">Grade 9</option>
                    <option value="10">Grade 10</option>
                    <option value="11">Grade 11</option>
                    <option value="12">Grade 12</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm"
                  >
                    <option value="name">Name</option>
                    <option value="score">Score</option>
                    <option value="grade">Grade</option>
                  </select>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm"
                >
                  <option value="">Choose student...</option>
                  {filteredStudents.map(student => (
                    <option key={student.username} value={student.username}>
                      {student.username} (G{student.gradeLevel}) - {Math.round(student.avgScore)}%
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => selectedStudent && loadStudentCourseData(selectedStudent, true)}
                    disabled={!selectedStudent || trackingLoading}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {trackingLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} /> Refresh
                      </>
                    )}
                  </button>
                  {selectedStudent && studentCourseData && (
                    <button
                      onClick={exportStudentData}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
                    >
                      <Download size={14} /> Export
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Student Course Performance Data */}
            {selectedStudent && studentCourseData ? (
              <div className="space-y-4">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-white/10 p-4 rounded-xl">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-white">{selectedStudent}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-white/60 text-xs flex items-center gap-1">
                          <UsersIcon size={12} /> Grade {students.find(s => s.username === selectedStudent)?.gradeLevel || 'N/A'}
                        </span>
                        <span className="text-white/60 text-xs flex items-center gap-1">
                          <Award size={12} /> {students.find(s => s.username === selectedStudent)?.avgScore.toFixed(1) || '0'}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-white/60">Analysis</p>
                      <p className="text-white">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Course/Topic Performance - Mobile Stacked */}
                {Object.keys(studentCourseData.coursePerformance).length > 0 ? (
                  <div className="space-y-4">
                    {/* Topic List */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                          <BookOpen size={16} /> Topics
                        </h4>
                        <span className="text-white/60 text-xs">
                          {Object.keys(studentCourseData.coursePerformance).length} topics
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {formatCourseData.map((topic) => (
                          <div 
                            key={topic.key}
                            className={`bg-white/5 p-3 rounded-lg border transition-all duration-300 ${
                              selectedTopic === topic.key 
                                ? 'border-cyan-500/50 bg-gradient-to-r from-cyan-500/10 to-transparent' 
                                : 'border-white/10 hover:border-white/20'
                            } hover:bg-white/10 cursor-pointer`}
                            onClick={() => setSelectedTopic(topic.key)}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded ${topic.bgColor}`}>
                                    <BookOpen size={14} className={topic.color} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-white font-medium text-sm truncate">
                                      {topic.topicTitle}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-1 mt-1">
                                      <span className="text-white/60 text-xs">{topic.subject}</span>
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${topic.bgColor} ${topic.color}`}>
                                        {topic.status}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-lg font-bold ${topic.color}`}>{topic.averageScore}%</p>
                              </div>
                            </div>
                            
                            {/* Progress bar */}
                            <div className="mt-3">
                              <div className="flex justify-between text-xs text-white/60 mb-1">
                                <span>Progress</span>
                                <span>{topic.averageScore}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-1000 ${
                                    topic.averageScore >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 
                                    topic.averageScore >= 60 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' : 
                                    'bg-gradient-to-r from-red-500 to-pink-500'
                                  }`}
                                  style={{ width: `${Math.min(100, topic.averageScore)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Overall Statistics and Selected Topic Details - Mobile Stacked */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Overall Statistics */}
                      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 p-4 rounded-xl">
                        <h4 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                          <BarChart3 size={16} /> Statistics
                        </h4>
                        <div className="space-y-3">
                          {[
                            { label: 'Topics', value: studentCourseData.overallStats.totalTopics, icon: BookOpen },
                            { label: 'Checkpoints', value: studentCourseData.overallStats.totalCheckpoints, icon: CheckCircle },
                            { label: 'Passed', value: studentCourseData.overallStats.passedCheckpoints, icon: Award, color: 'text-green-400' },
                            { label: 'Overall Avg', value: `${studentCourseData.overallStats.overallAverage}%`, icon: TrendingUp, 
                              color: studentCourseData.overallStats.overallAverage >= 80 ? 'text-green-400' :
                                     studentCourseData.overallStats.overallAverage >= 60 ? 'text-yellow-400' :
                                     'text-red-400' },
                            { label: 'Strongest', value: studentCourseData.overallStats.strongestTopic, icon: Activity, color: 'text-green-400' },
                            { label: 'Needs Help', value: studentCourseData.overallStats.weakestTopic, icon: TrendingDown, color: 'text-red-400' }
                          ].map((item, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-white/60 text-sm flex items-center gap-2">
                                <item.icon size={12} /> {item.label}
                              </span>
                              <span className={`font-medium ${item.color || 'text-white'}`}>
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Selected Topic Details */}
                      {selectedTopicDetails && (
                        <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/20 p-4 rounded-xl">
                          <h4 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                            <CheckCircle size={16} /> Checkpoints
                          </h4>
                          <div className="mb-3">
                            <p className="text-white font-medium text-sm">{selectedTopicDetails?.topicTitle}</p>
                            <p className="text-white/60 text-xs">
                              {selectedTopicDetails?.subject} • Grade {selectedTopicDetails?.gradeLevel}
                            </p>
                          </div>
                          
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {selectedTopicDetails?.checkpoints.map((checkpoint: any, index: number) => (
                              <div 
                                key={checkpoint.id} 
                                className={`bg-black/30 p-2 rounded-lg border text-sm ${
                                  checkpoint.passed ? 'border-green-500/20' : 'border-red-500/20'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-white flex items-center gap-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                      checkpoint.passed ? 'bg-green-500' : 'bg-red-500'
                                    }`} />
                                    CP {index + 1}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                                    checkpoint.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                  }`}>
                                    {checkpoint.score}% {checkpoint.passed ? '✓' : '✗'}
                                  </span>
                                </div>
                                <p className="text-white/70 text-xs truncate mt-1">{checkpoint.title}</p>
                              </div>
                            ))}
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <div className="flex justify-between items-center">
                              <span className="text-white/60 text-sm">Topic Avg</span>
                              <span className={`font-bold ${
                                selectedTopicDetails?.averageScore >= 80 ? 'text-green-400' :
                                selectedTopicDetails?.averageScore >= 60 ? 'text-yellow-400' :
                                'text-red-400'
                              }`}>
                                {selectedTopicDetails?.averageScore}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Course History */}
                    {studentCourseData.courseHistory && studentCourseData.courseHistory.length > 0 && (
                      <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                        <h4 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                          <CheckCircle size={16} /> History
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {studentCourseData.courseHistory.slice(0, 4).map((course: any, index: number) => (
                            <div key={index} className="bg-black/20 p-3 rounded-lg border border-white/10">
                              <div className="flex justify-between items-start mb-2">
                                <div className="min-w-0">
                                  <p className="text-white font-medium text-sm truncate">{course.topicTitle}</p>
                                  <p className="text-white/60 text-xs">{course.subject}</p>
                                </div>
                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                  course.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {course.finalScore}%
                                </span>
                              </div>
                              <div className="flex justify-between text-xs text-white/60">
                                <span>Checkpoints: {course.checkpoints?.filter((cp: any) => cp.passed).length}/{course.checkpoints?.length}</span>
                                <span>{course.completedDate ? new Date(course.completedDate).toLocaleDateString() : 'N/A'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="text-white/20" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">No Course Data</h3>
                    <p className="text-white/60 text-sm">
                      {selectedStudent} hasn't completed any courses yet
                    </p>
                  </div>
                )}
              </div>
            ) : selectedStudent ? (
              <div className="text-center py-8">
                {trackingLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                    <h3 className="text-lg font-bold text-white mb-2">Loading...</h3>
                    <p className="text-white/60 text-sm">Analyzing data for {selectedStudent}</p>
                  </>
                ) : (
                  <>
                    <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <UsersIcon className="text-white/20" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Select Student</h3>
                    <p className="text-white/60 text-sm">
                      Choose a student to track their course performance
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="text-white/20" size={32} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Student Tracking</h3>
                <p className="text-white/60 text-sm">
                  Track individual student performance
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Student Performance Table - Mobile Optimized */}
      <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Student Performance</h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <span className="text-white/60 text-sm">
              {filteredStudents.length} students • Avg: {classStats?.classAverage || 0}%
            </span>
            {classStats && (
              <div className="flex gap-1 sm:gap-2">
                <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                  {classStats.performanceLevels.excellent} Exc
                </span>
                <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
                  {classStats.performanceLevels.good} Good
                </span>
                <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">
                  {classStats.performanceLevels.needsHelp} Help
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-full inline-block align-middle">
            <table className="min-w-full text-sm text-left text-white/80">
              <thead className="text-xs text-white/60 border-b border-white/10">
                <tr>
                  <th className="py-2 px-3">Student</th>
                  <th className="py-2 px-3 hidden sm:table-cell">Grade</th>
                  <th className="py-2 px-3">Score</th>
                  <th className="py-2 px-3 hidden md:table-cell">Completion</th>
                  <th className="py-2 px-3 hidden lg:table-cell">Last Active</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.slice(0, 8).map(student => (
                  <tr 
                    key={student.username} 
                    className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                      selectedStudent === student.username ? 'bg-cyan-500/10' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">
                            {student.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="truncate max-w-[120px]">{student.username}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 hidden sm:table-cell">
                      <span className="px-1.5 py-0.5 rounded bg-white/5 text-xs">
                        G{student.gradeLevel}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                            style={{ width: `${Math.min(100, student.avgScore)}%` }}
                          />
                        </div>
                        <span className={`font-medium text-xs ${
                          student.avgScore >= 80 ? 'text-green-400' :
                          student.avgScore >= 60 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {Math.round(student.avgScore)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3 hidden md:table-cell">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        student.completionRate >= 80 ? 'bg-green-500/20 text-green-400' :
                        student.completionRate >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {student.completionRate}%
                      </span>
                    </td>
                    <td className="py-2 px-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        <Clock size={10} className="text-white/40" />
                        <span className="text-xs">{student.lastActive}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setSelectedStudent(student.username);
                            setShowTrackingSection(true);
                          }}
                          className="text-xs bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 px-2 py-1 rounded transition-colors whitespace-nowrap"
                        >
                          Track
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-8">
            <UsersIcon className="text-white/20 mx-auto mb-3" size={32} />
            <p className="text-white/40">No students found</p>
          </div>
        )}

        {filteredStudents.length > 8 && (
          <div className="mt-4 text-center">
            <button className="text-sm text-cyan-400 hover:text-cyan-300">
              View all {filteredStudents.length} students →
            </button>
          </div>
        )}
      </div>

      {/* Create Announcement - Mobile Optimized */}
      <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
          <Megaphone className="text-orange-400" size={18} /> Create Announcement
        </h2>
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-white/60 text-xs sm:text-sm mb-1">Title</label>
            <input
              type="text"
              value={newAnnouncement.title}
              onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 sm:px-4 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm"
              placeholder="Important update..."
            />
          </div>
          <div>
            <label className="block text-white/60 text-xs sm:text-sm mb-1">Content</label>
            <RestrictedTextArea
              value={newAnnouncement.content}
              onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 sm:px-4 py-2 text-white focus:outline-none focus:border-cyan-500 min-h-[80px] sm:min-h-[100px] text-sm"
              placeholder="Share important information..."
              restrictPaste={true}
            />
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="text-white/40 text-xs">
              Expires in 48 hours
            </div>
            <button
              onClick={createAnnouncement}
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white px-4 sm:px-6 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors w-full sm:w-auto text-sm sm:text-base"
            >
              <Send size={14} /> Publish Announcement
            </button>
          </div>
        </div>
      </div>

      {/* Active Announcements & Recent Assessments - Mobile Stacked */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
            <Megaphone className="text-orange-400" size={16} /> Announcements
          </h3>
          <div className="space-y-3">
            {announcements.length > 0 ? (
              announcements.map(ann => {
                const expiresDate = ann.expiresAt ? new Date(ann.expiresAt) : null;
                const timeLeft = expiresDate ? expiresDate.getTime() - Date.now() : null;
                const hoursLeft = timeLeft ? Math.ceil(timeLeft / (60 * 60 * 1000)) : 48;
                const isExpiring = hoursLeft <= 24;
                
                return (
                  <div key={ann.id} className="bg-white/5 p-3 rounded-lg border border-white/10">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-white font-medium text-sm">{ann.title}</p>
                      {isExpiring && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          hoursLeft <= 6 
                            ? 'bg-red-500/20 text-red-300' 
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {hoursLeft}h
                        </span>
                      )}
                    </div>
                    <p className="text-white/60 text-xs mb-2 line-clamp-2">{ann.content}</p>
                    <div className="flex justify-between text-white/30 text-xs">
                      <span className="flex items-center gap-1">
                        <UsersIcon size={10} /> {ann.authorName || 'System'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={10} /> {new Date(ann.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6">
                <Megaphone className="text-white/20 mx-auto mb-2" size={24} />
                <p className="text-white/40 text-sm">No announcements</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
            <ClipboardList className="text-cyan-400" size={16} /> Assessments
          </h3>
          <div className="space-y-3">
            {assessments.length > 0 ? (
              assessments.map(assessment => (
                <div key={assessment.id} className="bg-white/5 p-3 rounded-lg border border-white/10">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-white font-medium text-sm truncate">{assessment.title}</p>
                    <span className="text-xs bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded whitespace-nowrap">
                      {assessment.questions?.length || 0} Qs
                    </span>
                  </div>
                  <p className="text-white/60 text-xs mb-1">{assessment.subject}</p>
                  <div className="flex justify-between text-white/30 text-xs">
                    <span className="flex items-center gap-1">
                      <UsersIcon size={10} /> G{assessment.targetGrade}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={10} /> {assessment.createdBy}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <ClipboardList className="text-white/20 mx-auto mb-2" size={24} />
                <p className="text-white/40 text-sm">No assessments</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};