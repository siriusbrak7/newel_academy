// Dashboards.tsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useMemo } from 'react';
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
  getStudentCheckpointScores // ADD THIS IMPORT
} from '../services/storageService';
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
  Info
} from 'lucide-react';

// Fixed Chart.js imports
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

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
// STUDENT DASHBOARD COMPONENT - FIXED VERSION
// =====================================================
export const StudentDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [advice, setAdvice] = useState<string>("Analyzing your learning patterns...");
  const [pendingAssessments, setPendingAssessments] = useState<Assessment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [progress, setProgress] = useState<any>({});
  const [courses, setCourses] = useState<CourseStructure>({});
  const [loading, setLoading] = useState(true);
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
  
  // Navigation
  const navigate = useNavigate();
  
  // Stats
  const { activeDays, streak } = calculateUserStats(user);

  // Load Neuroscience Facts
  useEffect(() => {
    if (window.neuroscienceFacts && window.neuroscienceFacts.length > 0) {
      setNeuroscienceFacts(window.neuroscienceFacts);
    } else {
      // Fallback facts if not loaded from index.html
      const defaultFacts = [
        "The human brain has about 86 billion neurons, each connected to thousands of others.",
        "Your brain generates enough electricity to power a small light bulb (about 20 watts).",
        "Neuroplasticity allows your brain to reorganize itself throughout your life.",
        "Sleep is crucial for memory consolidation and neural repair.",
        "The brain is 73% water. Dehydration of just 2% can impair attention and memory.",
        "Learning new skills increases myelin, making neural pathways faster."
      ];
      setNeuroscienceFacts(defaultFacts);
    }
  }, []);

  // Load Notifications
  const loadUserNotifications = async () => {
    if (!user?.username) return;
    
    try {
      const notifications = await getUserNotifications(user.username);
      setUserNotifications(notifications);
      setUnreadCount(notifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

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

  // Rotate neuroscience facts
  useEffect(() => {
    if (neuroscienceFacts.length === 0) return;
    
    const interval = setInterval(() => {
      setFactFade(false);
      setTimeout(() => {
        setCurrentFactIndex((prev) => (prev + 1) % neuroscienceFacts.length);
        setFactFade(true);
      }, 300);
    }, 11110); // Change fact every 11 seconds

    return () => clearInterval(interval);
  }, [neuroscienceFacts]);

  // FIXED refreshData function
  const refreshData = async () => {
    setLoading(true);
    try {
      console.log(`📊 Loading data for student: ${user.username}`);
      
      // Load notifications
      await loadUserNotifications();
      
      // Load pending assessments
      const allAssessments = await getAssessments();
      const allSubmissions = await getSubmissions();
      
      const pending = allAssessments.filter(a =>
        (a.targetGrade === 'all' || a.targetGrade === user.gradeLevel) &&
        !allSubmissions.some(s => s.assessmentId === a.id && s.username === user.username)
      );
      setPendingAssessments(pending.slice(0, 3));
      
      // Load announcements
      const announcementsData = await getAnnouncements();
      setAnnouncements(announcementsData);
      
      // Load courses
      const coursesData = await getCoursesLight();
      setCourses(coursesData);
      
      // Load progress
      const progressData = await getProgress(user.username);
      setProgress(progressData);
      
      // ===== FIXED: Get subject performance =====
      const subjectPerformance = await getStudentSubjectPerformance(user.username);
      
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
          
          // Calculate overall average PROPERLY
          const overallAvg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
          console.log(`📈 Overall average: ${Math.round(overallAvg)}% from ${validScores.length} subjects`);
          
          // Generate advice based on performance
          if (overallAvg < 50) {
            setAdvice("Focus on mastering fundamentals. Review materials and retry checkpoints.");
          } else if (overallAvg < 70) {
            setAdvice("Good progress! Focus on improving weak areas identified in checkpoints.");
          } else if (overallAvg < 85) {
            setAdvice("Excellent work! You're mastering concepts. Try the 222-Sprint challenge!");
          } else {
            setAdvice("Outstanding performance! Consider helping classmates or exploring advanced topics.");
          }
        } else {
          // No valid scores
          setSubjectLabels([]);
          setSubjectScores([]);
          setAdvice("Complete assessments and checkpoints to see your scores!");
        }
      } else {
        // If no scores yet
        setSubjectLabels([]);
        setSubjectScores([]);
        setAdvice("Start by exploring courses and completing your first checkpoint or assessment!");
      }
      
      // Load course history
      const history = await getStudentCourseHistory(user.username);
      setCourseHistory(history);
      
      // Load assessment feedback
      const feedback = await getStudentAssessmentFeedback(user.username);
      setAssessmentFeedback(feedback);
      
    } catch (error) {
      console.error('❌ Error refreshing student dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debug function to check score calculations
  const debugScoreCalculation = async () => {
    try {
      console.log('🔍 DEBUG: Starting score calculation analysis...');
      
      // 1. Get checkpoint scores directly
      const checkpointScores = await getStudentCheckpointScores(user.username);
      console.log('📊 Checkpoint scores by subject:', checkpointScores);
      
      // 2. Get assessment submissions
      const allSubmissions = await getSubmissions();
      const userSubmissions = allSubmissions.filter(s => 
        s.username === user.username && s.graded && s.score !== undefined
      );
      console.log(`📝 Assessment submissions: ${userSubmissions.length}`);
      
      userSubmissions.forEach(sub => {
        console.log(`   - ${sub.assessmentId}: ${sub.score}%`);
      });
      
      // 3. Get subject performance via the fixed function
      const subjectPerformance = await getStudentSubjectPerformance(user.username);
      console.log('🎯 Final subject performance:', subjectPerformance);
      
      // Calculate overall average
      const scores = Object.values(subjectPerformance);
      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        console.log(`📈 Overall average calculated: ${Math.round(avg)}%`);
      }
      
    } catch (error) {
      console.error('❌ Debug error:', error);
    }
  };

  useEffect(() => {
    refreshData();
    
    // Set up notification refresh every 30 seconds
    const notificationInterval = setInterval(() => {
      if (user?.username) {
        loadUserNotifications();
      }
    }, 30000);
    
    return () => clearInterval(notificationInterval);
  }, [user]);

  // Chart data
  const chartData = useMemo(() => {
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
    
    return {
      labels: subjectLabels,
      datasets: [{
        label: 'Average Score (%)',
        data: subjectScores,
        backgroundColor: [
          'rgba(6, 182, 212, 0.6)',
          'rgba(168, 85, 247, 0.6)',
          'rgba(236, 72, 153, 0.6)',
          'rgba(34, 197, 94, 0.6)',
          'rgba(245, 158, 11, 0.6)',
          'rgba(239, 68, 68, 0.6)'
        ],
        borderColor: 'transparent',
        hoverOffset: 12,
        borderWidth: 0
      }]
    };
  }, [subjectLabels, subjectScores]);

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
      
      if (subjectLabels.length > 0) {
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
      } else {
        doc.text('No performance data available yet.', 10, y);
        y += 10;
        doc.text('Complete assessments to see your scores.', 10, y);
      }
      
      // Add neuroscience fact
      y += 10;
      if (neuroscienceFacts.length > 0) {
        doc.text('Brain Fact of the Day:', 10, y);
        y += 10;
        doc.text(neuroscienceFacts[currentFactIndex], 10, y, { maxWidth: 180 });
        y += 15;
      }
      
      // Add notifications summary
      if (userNotifications.length > 0) {
        doc.text('Recent Notifications:', 10, y);
        y += 10;
        userNotifications.slice(0, 3).forEach((notification, i) => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(`${i+1}. ${notification.text.substring(0, 50)}...`, 10, y);
          y += 8;
        });
      }
      
      // Add course history if available
      if (courseHistory.length > 0) {
        doc.text('Completed Courses:', 10, y);
        y += 10;
        courseHistory.forEach(course => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(`- ${course.topicTitle}: ${Math.round(course.finalScore || 0)}% ${course.passed ? '(Passed)' : '(Not Passed)'}`, 10, y);
          y += 8;
        });
      }
      
      // Add assessment feedback if available
      y += 10;
      if (assessmentFeedback.length > 0) {
        doc.text('Recent Assessment Feedback:', 10, y);
        y += 10;
        assessmentFeedback.slice(0, 3).forEach(feedback => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(`- ${feedback.assessmentTitle}: ${feedback.score}%`, 10, y);
          y += 8;
          if (feedback.feedback) {
            doc.text(`  Feedback: ${feedback.feedback.substring(0, 50)}...`, 10, y);
            y += 8;
          }
        });
      }
      
      doc.save(`${user.username}_progress_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert("Failed to export report");
    }
  };

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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
        <p className="mt-4 text-white/60">Loading your dashboard...</p>
      </div>
    );
  }

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
                {subjectLabels.length > 0 && ` • ${subjectLabels.length} Subjects Tracked`}
                {unreadCount > 0 && ` • ${unreadCount} new notification${unreadCount > 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={refreshData} 
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
              >
                <RefreshCw size={16} /> Refresh
              </button>
              <button 
                onClick={exportPDF} 
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
              >
                <Download size={16} /> Export Report
              </button>
              {/* Temporary debug button - remove after fixing */}
              <button 
                onClick={debugScoreCalculation}
                className="bg-red-500/20 hover:bg-red-500/40 text-red-300 px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
              >
                <Bug size={16} /> Debug Scores
              </button>
            </div>
          </div>

          {/* Quick Start Guide for Students - UPDATED */}
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

          {/* Notifications Section - NEW */}
          {userNotifications.length > 0 && (
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
                {userNotifications.slice(0, 3).map((notification, index) => (
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
                
                {userNotifications.length > 3 && (
                  <div className="text-center pt-2">
                    <Link 
                      to="/notifications" 
                      className="text-xs text-cyan-400 hover:text-cyan-300"
                    >
                      View all {userNotifications.length} notifications →
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
          {announcements.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-6 rounded-2xl">
              <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                <Megaphone size={20}/> Important Updates
              </h3>
              <div className="space-y-4">
                {announcements.slice(0, 2).map(ann => {
                  const timeLeft = ann.expiresAt ? ann.expiresAt - Date.now() : null;
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
                        <span>{new Date(ann.timestamp).toLocaleDateString()}</span>
                        <span>By: {ann.author}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending Assessments Summary */}
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
          {/* Performance Chart */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl h-64 flex flex-col items-center justify-center">
            <div className="w-full">
              <h3 className="text-white font-bold mb-4 self-start">Subject Performance</h3>
              {subjectLabels.length > 0 ? (
                <div className="w-48 h-48 mx-auto">
                  <Doughnut 
                    data={chartData} 
                    options={{ 
                      plugins: { 
                        legend: { 
                          display: subjectLabels.length <= 5,
                          position: 'bottom',
                          labels: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: { size: 10 }
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => `${context.label}: ${context.raw}%`
                          }
                        }
                      },
                      maintainAspectRatio: false,
                      cutout: '65%'
                    }} 
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2 text-white/20"></div>
                  <p className="text-white/40 mb-2">No scores yet</p>
                  <p className="text-white/50 text-xs">
                    Complete assessments<br/>to see your performance
                  </p>
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
                <span className="text-white font-mono">{subjectLabels.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 flex items-center gap-2">
                  <ClipboardList size={16}/> Pending Assessments
                </span>
                <span className="text-white font-mono">{pendingAssessments.length}</span>
              </div>
              {subjectScores.length > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-white/60 flex items-center gap-2">
                    <TrendingUp size={16}/> Overall Average
                  </span>
                  <span className="text-green-400 font-mono font-bold">
                    {Math.round(subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length)}%
                  </span>
                </div>
              )}
              
              {/* Performance Metrics */}
              {courseHistory.length > 0 && (
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
            className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            {showGradeHistory ? 'Hide Details' : 'Show Details'}
            <ChevronDown className={`transform transition-transform ${showGradeHistory ? 'rotate-180' : ''}`} size={14} />
          </button>
        </div>
        
        {/* Grade History Cards (Collapsible) */}
        {showGradeHistory && (
          <div className="space-y-4">
            {/* Completed Courses */}
            {courseHistory.length > 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Completed Courses</h4>
                <div className="space-y-2">
                  {courseHistory.slice(0, 5).map((course, index) => (
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
                        <span>{course.checkpoints.filter(cp => cp.passed).length}/{course.checkpoints.length} checkpoints</span>
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
              </div>
            )}
            
            {/* Assessment Feedback */}
            {assessmentFeedback.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Recent Feedback</h4>
                <div className="space-y-3">
                  {assessmentFeedback.slice(0, 3).map((feedback, index) => (
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
// TEACHER DASHBOARD COMPONENT - WITH STUDENT TRACKING
// =====================================================
export const TeacherDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [students, setStudents] = useState<StudentStats[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [classOverview, setClassOverview] = useState<any>({});
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
  
  // Student tracking states
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [studentCheckpointData, setStudentCheckpointData] = useState<{
    checkpointScores: Record<string, number>;
    courseHistory: any[];
    subjectPerformance: any;
    username: string;
  } | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [showTrackingSection, setShowTrackingSection] = useState(false);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [studentsData, assessmentsData, announcementsData, overviewData] = await Promise.all([
        getAllStudentStats(),
        getAssessments(),
        getAnnouncements(),
        getClassOverview()
      ]);
      
      // Filter students for this teacher's grade level if specified
      const filteredStudents = studentsData.filter(s => 
        !user.gradeLevel || s.gradeLevel === user.gradeLevel
      );
      
      setStudents(filteredStudents);
      setAssessments(assessmentsData);
      setAnnouncements(announcementsData);
      setClassOverview(overviewData);
      
      // Auto-select first student if none selected
      if (filteredStudents.length > 0 && !selectedStudent) {
        setSelectedStudent(filteredStudents[0].username);
      }
    } catch (error) {
      console.error('Error refreshing teacher dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Load student checkpoint data when selected student changes
  useEffect(() => {
    if (selectedStudent) {
      loadStudentCheckpointData(selectedStudent);
    }
  }, [selectedStudent]);

  const loadStudentCheckpointData = async (username: string) => {
    setTrackingLoading(true);
    try {
      // Get student's checkpoint scores by subject
      const checkpointScores = await getStudentCheckpointScores(username);
      
      // Get student's course history
      const courseHistory = await getStudentCourseHistory(username);
      
      // Get student's subject performance
      const subjectPerformance = await getStudentSubjectPerformance(username);
      
      setStudentCheckpointData({
        checkpointScores,
        courseHistory,
        subjectPerformance,
        username
      });
    } catch (error) {
      console.error('Error loading student checkpoint data:', error);
      setStudentCheckpointData(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  const createAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      alert('Please fill in both title and content');
      return;
    }

    try {
      await saveAnnouncement({
        id: Date.now().toString(),
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        timestamp: Date.now(),
        author: user.username,
        expiresAt: Date.now() + (48 * 60 * 60 * 1000) // 48 hours
      });
      
      setNewAnnouncement({ title: '', content: '' });
      refreshData();
      alert('Announcement created successfully!');
    } catch (error) {
      console.error('Error creating announcement:', error);
      alert('Failed to create announcement');
    }
  };

  const formatCheckpointData = (checkpointScores: Record<string, number>) => {
    if (!checkpointScores || Object.keys(checkpointScores).length === 0) {
      return [];
    }
    
    return Object.entries(checkpointScores).map(([subject, score]) => ({
      subject,
      score,
      status: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Improvement',
      color: score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400',
      bgColor: score >= 80 ? 'bg-green-500/20' : score >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20'
    }));
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
        <p className="mt-4 text-white/60">Loading teacher dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-white">Teacher Dashboard</h1>
          <p className="text-white/60">Welcome, {user.username}</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={refreshData} 
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <Link 
            to="/courses" 
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <BookOpen size={16} /> Manage Courses
          </Link>
          <Link 
            to="/assessments" 
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <PenTool size={16} /> Create Assessment
          </Link>
        </div>
      </div>

      {/* Class Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Total Students</p>
              <p className="text-3xl font-bold text-white">{classOverview.totalStudents || 0}</p>
            </div>
            <UsersIcon className="text-cyan-400" size={32} />
          </div>
          <p className="text-white/40 text-sm mt-2">In your class</p>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Class Average</p>
              <p className="text-3xl font-bold text-white">{classOverview.classAverage || 0}%</p>
            </div>
            <TrendingUp className="text-green-400" size={32} />
          </div>
          <p className="text-white/40 text-sm mt-2">Overall performance</p>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Weakest Topic</p>
              <p className="text-3xl font-bold text-white truncate">{classOverview.weakestTopic || 'N/A'}</p>
            </div>
            <AlertCircle className="text-yellow-400" size={32} />
          </div>
          <p className="text-white/40 text-sm mt-2">Needs attention</p>
        </div>
      </div>

      {/* Student Checkpoint Tracking Section */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="text-purple-400" /> Student Checkpoint Tracking
          </h2>
          <button
            onClick={() => setShowTrackingSection(!showTrackingSection)}
            className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            {showTrackingSection ? 'Hide Details' : 'Show Details'}
            <ChevronDown className={`transform transition-transform ${showTrackingSection ? 'rotate-180' : ''}`} size={14} />
          </button>
        </div>
        
        {showTrackingSection && (
          <>
            {/* Student Selection */}
            <div className="mb-6">
              <label className="block text-white/60 text-sm mb-2">Select Student to Track</label>
              <div className="flex gap-3">
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Choose a student...</option>
                  {students.map(student => (
                    <option key={student.username} value={student.username}>
                      {student.username} (Grade {student.gradeLevel}) - Avg: {student.avgScore.toFixed(1)}%
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => selectedStudent && loadStudentCheckpointData(selectedStudent)}
                  disabled={!selectedStudent || trackingLoading}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {trackingLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} /> Refresh Data
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Student Performance Data */}
            {selectedStudent && studentCheckpointData ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-white">Checkpoint Performance: {selectedStudent}</h3>
                      <p className="text-white/60 text-sm">
                        Grade {students.find(s => s.username === selectedStudent)?.gradeLevel || 'N/A'} • 
                        Overall Average: {students.find(s => s.username === selectedStudent)?.avgScore.toFixed(1) || '0'}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/60 text-sm">Last Updated</p>
                      <p className="text-white">{new Date().toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>

                {/* Subject Performance */}
                {studentCheckpointData.checkpointScores && Object.keys(studentCheckpointData.checkpointScores).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <BookOpen size={18} /> Subject Performance
                      </h4>
                      <div className="space-y-3">
                        {formatCheckpointData(studentCheckpointData.checkpointScores).map((item, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <div>
                              <p className="text-white font-medium">{item.subject}</p>
                              <p className={`text-xs px-2 py-1 rounded mt-1 inline-block ${item.bgColor} ${item.color}`}>
                                {item.status}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-xl font-bold ${item.color}`}>{item.score}%</p>
                              <p className="text-white/40 text-xs">Checkpoint Avg</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Overall Statistics */}
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <BarChart3 size={18} /> Overall Statistics
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-white/60">Subjects Tracked</span>
                          <span className="text-white font-bold">
                            {Object.keys(studentCheckpointData.checkpointScores).length}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/60">Overall Average</span>
                          <span className="text-green-400 font-bold">
                            {Object.values<number>(studentCheckpointData.checkpointScores).length > 0 
                              ? Math.round(
                                  Object.values<number>(studentCheckpointData.checkpointScores)
                                    .reduce((a: number, b: number) => a + b, 0) / 
                                  Object.keys(studentCheckpointData.checkpointScores).length
                                )
                              : 0}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/60">Strongest Subject</span>
                          <span className="text-green-400 font-bold">
                            {Object.entries(studentCheckpointData.checkpointScores)
                              .sort((a: [string, number], b: [string, number]) => b[1] - a[1])[0]?.[0] || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/60">Weakest Subject</span>
                          <span className="text-red-400 font-bold">
                            {Object.entries(studentCheckpointData.checkpointScores)
                              .sort((a: [string, number], b: [string, number]) => a[1] - b[1])[0]?.[0] || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="text-white/20 mx-auto mb-4" size={48} />
                    <p className="text-white/40">No checkpoint data available</p>
                    <p className="text-white/30 text-sm mt-1">
                      {selectedStudent} hasn't completed any checkpoints yet
                    </p>
                  </div>
                )}

                {/* Course History */}
                {studentCheckpointData.courseHistory && studentCheckpointData.courseHistory.length > 0 && (
                  <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <CheckCircle size={18} /> Completed Courses
                    </h4>
                    <div className="space-y-3">
                      {studentCheckpointData.courseHistory.slice(0, 5).map((course: any, index: number) => (
                        <div key={index} className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
                          <div>
                            <p className="text-white font-medium">{course.topicTitle}</p>
                            <p className="text-white/60 text-sm">{course.subject} • Grade {course.gradeLevel}</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded text-xs ${
                              course.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {course.finalScore}% {course.passed ? '✓' : '✗'}
                            </span>
                            <p className="text-white/40 text-xs mt-1">
                              {course.checkpoints?.filter((cp: any) => cp.passed).length}/{course.checkpoints?.length} checkpoints
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : selectedStudent ? (
              <div className="text-center py-8">
                {trackingLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                    <p className="text-white/60">Loading checkpoint data for {selectedStudent}...</p>
                  </>
                ) : (
                  <>
                    <Target className="text-white/20 mx-auto mb-4" size={48} />
                    <p className="text-white/40">No checkpoint data available</p>
                    <p className="text-white/30 text-sm mt-1">
                      {selectedStudent} hasn't completed any checkpoints or there was an error loading data
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <UsersIcon className="text-white/20 mx-auto mb-4" size={48} />
                <p className="text-white/40">Select a student to track their checkpoint performance</p>
                <p className="text-white/30 text-sm mt-1">Choose from the dropdown menu above</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Announcement */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Megaphone className="text-orange-400" /> Create Announcement
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-white/60 text-sm mb-2">Title</label>
            <input
              type="text"
              value={newAnnouncement.title}
              onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              placeholder="Important update..."
            />
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-2">Content</label>
            <textarea
              value={newAnnouncement.content}
              onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 min-h-[100px]"
              placeholder="Share important information with your students..."
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={createAnnouncement}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Send size={16} /> Publish Announcement
            </button>
          </div>
        </div>
      </div>

      {/* Student Performance Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Student Performance</h2>
          <span className="text-white/60 text-sm">
            {students.length} students • Avg: {classOverview.classAverage || 0}%
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-white/80">
            <thead className="text-xs text-white/60 border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Grade Level</th>
                <th className="py-3 px-4">Average Score</th>
                <th className="py-3 px-4">Completion Rate</th>
                <th className="py-3 px-4">Last Active</th>
                <th className="py-3 px-4">Streak</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.username} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 px-4 font-medium">{student.username}</td>
                  <td className="py-3 px-4">{student.gradeLevel}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                          style={{ width: `${Math.min(100, student.avgScore)}%` }}
                        />
                      </div>
                      <span className={`font-bold ${
                        student.avgScore >= 80 ? 'text-green-400' :
                        student.avgScore >= 60 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {student.avgScore.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      student.completionRate >= 80 ? 'bg-green-500/20 text-green-400' :
                      student.completionRate >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {student.completionRate}%
                    </span>
                  </td>
                  <td className="py-3 px-4">{student.lastActive}</td>
                  <td className="py-3 px-4">
                    <span className={`flex items-center gap-1 ${
                      student.streak > 0 ? 'text-yellow-400' : 'text-white/60'
                    }`}>
                      <Zap size={12} /> {student.streak} days
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => {
                        setSelectedStudent(student.username);
                        setShowTrackingSection(true);
                      }}
                      className="text-xs bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 px-3 py-1 rounded transition-colors"
                    >
                      Track Checkpoints
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {students.length === 0 && (
          <div className="text-center py-12">
            <UsersIcon className="text-white/20 mx-auto mb-4" size={48} />
            <p className="text-white/40">No students found</p>
            <p className="text-white/30 text-sm mt-1">Students will appear here once they start using the platform</p>
          </div>
        )}
      </div>

      {/* Active Announcements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Megaphone className="text-orange-400" /> Active Announcements
          </h3>
          <div className="space-y-4">
            {announcements.slice(0, 3).map(ann => {
              const timeLeft = ann.expiresAt ? ann.expiresAt - Date.now() : null;
              const hoursLeft = timeLeft ? Math.ceil(timeLeft / (60 * 60 * 1000)) : 48;
              
              return (
                <div key={ann.id} className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-white font-medium">{ann.title}</p>
                    {hoursLeft <= 24 && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
                        {hoursLeft}h left
                      </span>
                    )}
                  </div>
                  <p className="text-white/60 text-sm mb-2">{ann.content}</p>
                  <div className="flex justify-between text-white/30 text-xs">
                    <span>By: {ann.author}</span>
                    <span>{new Date(ann.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <ClipboardList className="text-cyan-400" /> Recent Assessments
          </h3>
          <div className="space-y-3">
            {assessments.slice(0, 3).map(assessment => (
              <div key={assessment.id} className="bg-white/5 p-4 rounded-lg border border-white/10">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-white font-medium">{assessment.title}</p>
                  <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded">
                    {assessment.questions?.length || 0} Questions
                  </span>
                </div>
                <p className="text-white/60 text-sm mb-2">{assessment.subject}</p>
                <div className="flex justify-between text-white/30 text-xs">
                  <span>Grade: {assessment.targetGrade}</span>
                  <span>By: {assessment.createdBy}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};