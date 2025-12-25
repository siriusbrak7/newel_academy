// src/components/Dashboards.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { User, StudentStats, Assessment, Announcement, CourseStructure, LeaderboardEntry } from '../types';
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
  getPendingTheorySubmissions
} from '../services/storageService';
import { 
  Check, X, Download, RefreshCw, BookOpen, PenTool, Zap, TrendingUp, 
  ClipboardList, Save, Megaphone, Send, Trophy, AlertCircle, Brain, 
  Clock, Users, BarChart3, Target, MessageSquare, CheckCircle, 
  ChevronDown, Lightbulb, Atom
} from 'lucide-react';

// COMPLETE Chart.js registration
import {
  Chart,
  LineController,
  BarController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

Chart.register(
  LineController,
  BarController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

import { Line, Bar, Doughnut } from 'react-chartjs-2';

// jsPDF Safe Import
let jsPDF: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  jsPDF = require('jspdf').jsPDF || require('jspdf').default;
} catch (error) {
  console.warn('jsPDF not available in this environment');
  jsPDF = class MockPDF { setFontSize() {}; text() {}; save() {}; addPage() {}; };
}

// Constants
const ANNOUNCEMENT_DURATION_MS = 48 * 60 * 60 * 1000; // 48 Hours

// ============================================================================
// SHARED UTILITIES & COMPONENTS
// ============================================================================

declare global {
  interface Window {
    neuroscienceFacts?: string[];
  }
}

const ChartFallback: React.FC<{ message: string }> = ({ message }) => (
  <div className="h-64 flex flex-col items-center justify-center text-white/40 border-2 border-dashed border-white/10 rounded-xl bg-white/5">
    <BarChart3 size={48} className="mb-4 opacity-50 text-cyan-500" />
    <p className="text-sm font-medium">{message}</p>
  </div>
);

const ChartSkeleton: React.FC = () => (
  <div className="h-64 bg-white/5 rounded-xl animate-pulse flex items-center justify-center border border-white/10">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-500 mx-auto mb-2"></div>
      <p className="text-white/40 text-sm">Loading data...</p>
    </div>
  </div>
);

const EmptyState: React.FC<{ icon: React.ReactNode, message: string }> = ({ icon, message }) => (
  <div className="p-8 text-center text-white/40 bg-white/5 rounded-xl border border-white/10 flex flex-col items-center justify-center h-full">
    <div className="mb-3 opacity-50">{icon}</div>
    <p className="text-sm">{message}</p>
  </div>
);

// ============================================================================
// NEUROSCIENCE WIDGET
// ============================================================================
const NeuroscienceWidget: React.FC = React.memo(() => {
  const [currentFact, setCurrentFact] = useState<string>("Loading neural insight...");
  const [fade, setFade] = useState(true);
  const [facts, setFacts] = useState<string[]>([]);

  useEffect(() => {
    // Load facts from window or fallback
    const loadFacts = () => {
      const windowFacts = window.neuroscienceFacts;
      const defaultFacts = [
        "The human brain has about 86 billion neurons, each connected to thousands of others.",
        "Your brain generates enough electricity to power a small light bulb (about 20 watts).",
        "Neuroplasticity allows your brain to reorganize itself throughout your life.",
        "Sleep is crucial for memory consolidation and neural repair.",
        "The brain is 73% water. Dehydration of just 2% can impair attention and memory."
      ];
      
      const loadedFacts = (windowFacts && windowFacts.length > 0) ? windowFacts : defaultFacts;
      setFacts(loadedFacts);
      
      // Set initial fact
      if (loadedFacts.length > 0) {
        setCurrentFact(loadedFacts[Math.floor(Math.random() * loadedFacts.length)]);
      }
    };
    
    loadFacts();
  }, []);

  useEffect(() => {
    if (facts.length === 0) return;

    // Fact rotation logic (11:11 minutes = 671000ms)
    const intervalId = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        const idx = Math.floor(Math.random() * facts.length);
        setCurrentFact(facts[idx]);
        setFade(true);
      }, 500); // Wait for fade out
    }, 671000);
    
    return () => clearInterval(intervalId);
  }, [facts]);

  return (
    <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-purple-500/30 p-6 rounded-2xl mb-6 relative overflow-hidden group hover:border-purple-500/50 transition-colors shadow-lg">
      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
        <Brain size={64} />
      </div>
      <h3 className="text-purple-300 font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
        <Lightbulb size={16} className="text-yellow-400" /> Daily Neuroscience Insight
      </h3>
      <p className={`text-white text-lg font-light leading-relaxed transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`}>
        "{currentFact}"
      </p>
      <div className="mt-4 flex items-center gap-2 text-xs text-white/30 border-t border-white/10 pt-3">
        <Clock size={12} />
        <span>Updates every 11:11 • Brain Science</span>
      </div>
    </div>
  );
});

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================
export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<StudentStats[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'users' | 'teachers'>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<{ academic: LeaderboardEntry[], challenge: LeaderboardEntry[], assessments: LeaderboardEntry[] }>({ 
    academic: [], challenge: [], assessments: [] 
  });

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, statsData, , leaderboards] = await Promise.all([
        getUsers(),
        getAllStudentStats(),
        getAnnouncements(),
        getLeaderboards()
      ]);

      const userList = Object.values(usersData).filter(user => !['admin', 'teacher_demo', 'student_demo'].includes(user.username));
      setUsers(userList);
      setStats(statsData);
      setLeaderboardData(leaderboards);
    } catch (err) {
      console.error('Error refreshing admin data:', err);
      setError("Failed to load dashboard data. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefreshLeaderboards = async () => {
    try {
      setLoading(true);
      await refreshAllLeaderboards();
      await refreshData();
      alert('Leaderboards refreshed successfully!');
    } catch (error) {
      alert('Failed to refresh leaderboards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshData(); }, [refreshData]);

  const handleApprove = async (username: string) => {
    const user = users.find(u => u.username === username);
    if (!user) return;
    try {
      await saveUser({ ...user, approved: true });
      await refreshData();
    } catch (error) { console.error(error); }
  };

  const handleDeleteUser = async (username: string) => {
    if (confirm(`Delete user "${username}" permanently?`)) {
      try {
        await deleteUser(username);
        await refreshData();
      } catch (error) { console.error(error); }
    }
  };

  // Memoized derived data
  const pendingUsers = useMemo(() => users.filter(u => !u.approved), [users]);
  const activeUsers = useMemo(() => users.filter(u => u.approved), [users]);
  const teachers = useMemo(() => users.filter(u => u.role === 'teacher' && u.approved), [users]);

  const gradeDistributionData = useMemo(() => {
    const gradeLevels = ['9', '10', '11', '12'];
    return {
      labels: gradeLevels,
      datasets: [{
        label: 'Students',
        data: gradeLevels.map(g => users.filter(u => u.gradeLevel === g).length),
        backgroundColor: 'rgba(6, 182, 212, 0.6)',
        borderRadius: 4
      }]
    };
  }, [users]);

  if (loading) return <div className="p-8"><ChartSkeleton /></div>;
  if (error) return <div className="p-8 text-center text-red-400 bg-red-500/10 rounded-xl border border-red-500/20">{error} <button onClick={refreshData} className="ml-2 underline">Retry</button></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">Admin Dashboard</h2>
        <div className="flex gap-2">
          <button onClick={handleRefreshLeaderboards} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition flex items-center gap-2 shadow-lg shadow-green-900/20"><RefreshCw size={16} /> Update Ranks</button>
          <button onClick={refreshData} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition flex items-center gap-2 shadow-lg shadow-cyan-900/20"><RefreshCw size={16} /> Sync Data</button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl"><p className="text-white/60 text-sm flex items-center gap-2 mb-1"><Users size={16} /> Total Users</p><p className="text-3xl font-bold text-white">{users.length}</p></div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl"><p className="text-white/60 text-sm flex items-center gap-2 mb-1"><Target size={16} /> Pending</p><p className="text-3xl font-bold text-yellow-400">{pendingUsers.length}</p></div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl"><p className="text-white/60 text-sm flex items-center gap-2 mb-1"><BarChart3 size={16} /> Active</p><p className="text-3xl font-bold text-green-400">{activeUsers.length}</p></div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl"><p className="text-white/60 text-sm flex items-center gap-2 mb-1"><Users size={16} /> Teachers</p><p className="text-3xl font-bold text-purple-400">{teachers.length}</p></div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <h3 className="text-xl font-bold text-white mb-6">Student Distribution</h3>
          {users.length > 0 ? (
            <div className="h-64">
              <Bar data={gradeDistributionData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.1)' } }, x: { grid: { display: false } } } }} />
            </div>
          ) : (
            <ChartFallback message="No students registered yet" />
          )}
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex border-b border-white/10">
          {['pending', 'users', 'teachers'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab as any)} 
              className={`flex-1 px-6 py-4 font-semibold transition text-sm uppercase tracking-wider ${activeTab === tab ? 'bg-cyan-600/20 text-cyan-400 border-b-2 border-cyan-500' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
            >
              {tab} {tab === 'pending' && pendingUsers.length > 0 && <span className="bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full ml-2">{pendingUsers.length}</span>}
            </button>
          ))}
        </div>
        <div className="p-6 min-h-[300px]">
          {activeTab === 'pending' && (
            pendingUsers.length === 0 ? <EmptyState icon={<CheckCircle size={32}/>} message="No pending approvals" /> :
            pendingUsers.map(u => (
              <div key={u.username} className="flex justify-between items-center p-4 bg-white/5 rounded-lg mb-2 border border-white/5 hover:border-white/20 transition-colors">
                <div><p className="text-white font-semibold">{u.username}</p><p className="text-white/60 text-sm">{u.role} • Grade {u.gradeLevel || 'N/A'}</p></div>
                <div className="flex gap-2"><button onClick={() => handleApprove(u.username)} className="p-2 bg-green-600 hover:bg-green-500 rounded-lg text-white shadow-lg transition"><Check size={18}/></button><button onClick={() => handleDeleteUser(u.username)} className="p-2 bg-red-600 hover:bg-red-500 rounded-lg text-white shadow-lg transition"><X size={18}/></button></div>
              </div>
            ))
          )}
          {activeTab === 'users' && activeUsers.map(u => (
             <div key={u.username} className="flex justify-between items-center p-4 bg-white/5 rounded-lg mb-2 border border-white/5">
               <div><p className="text-white font-semibold">{u.username}</p><p className="text-white/60 text-sm">{u.role} • Grade {u.gradeLevel}</p></div>
               <button onClick={() => handleDeleteUser(u.username)} className="p-2 bg-red-600/80 hover:bg-red-600 rounded-lg text-white transition"><X size={18}/></button>
             </div>
          ))}
          {activeTab === 'teachers' && teachers.map(t => (
            <div key={t.username} className="p-4 bg-white/5 rounded-lg mb-2 border border-white/5"><p className="text-white font-semibold flex items-center gap-2"><Users size={16} className="text-purple-400"/> {t.username}</p></div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TEACHER DASHBOARD (PREMIUM ENHANCED VERSION)
// ============================================================================
export const TeacherDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [dashboardVersion, setDashboardVersion] = useState(0); 
  const [stats, setStats] = useState<StudentStats[]>([]);
  const [classOverview, setClassOverview] = useState<any>({});
  const [recentAssessments, setRecentAssessments] = useState<Assessment[]>([]);
  
  // Announcement State
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementText, setAnnouncementText] = useState({ title: '', content: '' });
  const [showAnnouncementPreview, setShowAnnouncementPreview] = useState(false);
  
  // Leaderboard State
  const [leaderboardData, setLeaderboardData] = useState<{ academic: LeaderboardEntry[], challenge: LeaderboardEntry[], assessments: LeaderboardEntry[] }>({ academic: [], challenge: [], assessments: [] });
  const [activeLeaderboard, setActiveLeaderboard] = useState<'academic' | 'challenge' | 'assessments'>('assessments');
  
  // Grading State
  const [theorySubmissions, setTheorySubmissions] = useState<any[]>([]);
  
  // Course/Instruction State
  const [courses, setCourses] = useState<CourseStructure>({});
  const [selSubject, setSelSubject] = useState('');
  const [selTopic, setSelTopic] = useState('');
  const [instructionText, setInstructionText] = useState('');
  const [originalInstructionText, setOriginalInstructionText] = useState('');
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);
  
  const [loading, setLoading] = useState(true);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, overviewData, assessmentsData, leaderboards, courseData, subs, announcementsData] = await Promise.all([
        getAllStudentStats(),
        getClassOverview(),
        getAssessments(),
        getLeaderboards(),
        getCourses(),
        getPendingTheorySubmissions(),
        getAnnouncements()
      ]);

      setStats(statsData);
      setClassOverview(overviewData || {});
      setRecentAssessments(assessmentsData.slice(-5).reverse());
      setLeaderboardData(leaderboards);
      setCourses(courseData);
      setTheorySubmissions(subs || []);
      
      // Filter announcements: Only show teacher's own posts created in the last 48 hours
      const now = Date.now();
      const recentTeacherAnnouncements = announcementsData
        .filter(a => a.author === user.username)
        .filter(a => (now - a.timestamp) < ANNOUNCEMENT_DURATION_MS)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 3);
        
      setAnnouncements(recentTeacherAnnouncements);
      
    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
    }
  }, [user.username]);

  useEffect(() => { loadData(); }, [dashboardVersion, loadData]);

  // Initial Subject Selection
  useEffect(() => {
    if (!selSubject && Object.keys(courses).length > 0) {
      setSelSubject(Object.keys(courses)[0]);
    }
  }, [courses, selSubject]);

  // Auto-select first topic when subject changes
  useEffect(() => {
  if (selSubject && courses[selSubject]) {
    const topics = Object.values(courses[selSubject]);
    const currentTopicExists = topics.some((t: any) => t.id === selTopic);
    if (!currentTopicExists && topics.length > 0) {
      setSelTopic((topics[0] as any).id);
    }
  }
}, [selSubject, courses, selTopic]);

  // Update instruction text when topic selection changes
useEffect(() => {
  if (selSubject && selTopic && courses[selSubject]?.[selTopic]) {
    const desc = courses[selSubject][selTopic].description || '';
    setInstructionText(desc);
    setOriginalInstructionText(desc);
  } else {
    setInstructionText('');
    setOriginalInstructionText('');
  }
}, [selSubject, selTopic, courses]);

// Handlers
const handlePostAnnouncement = async () => {
  if(!announcementText.title || !announcementText.content) return;
  try {
    await saveAnnouncement({ 
      id: Date.now().toString(), 
      title: announcementText.title, 
      content: announcementText.content, 
      timestamp: Date.now(), 
      author: user.username 
    });
    setAnnouncementText({ title: '', content: '' });
    setShowAnnouncementPreview(false);
    alert("Announcement Posted! It will be active for 48 hours.");
    setDashboardVersion(v => v + 1);
  } catch (error) { 
    alert("Failed to post announcement"); 
  }
};

const handleSaveInstructions = async () => {
  if (!selSubject || !selTopic) return;
  const topic = courses[selSubject]?.[selTopic] as any; // Type assertion
  if (!topic) return;
  
  setIsSavingInstructions(true);
  try {
    await saveTopic(selSubject, { ...topic, description: instructionText });
    setOriginalInstructionText(instructionText); // Update reference
    // Small delay to show success state
    setTimeout(() => {
      setIsSavingInstructions(false);
      setDashboardVersion(v => v + 1);
    }, 500);
  } catch (error) { 
    alert("Failed to save instructions"); 
    setIsSavingInstructions(false);
  }
};

const handleExportReport = () => {
  try {
    const doc = new jsPDF();
    doc.text(`Class Report: ${user.username}`, 10, 20);
    let y = 30;
    stats.forEach(s => { 
      if(y > 280) { doc.addPage(); y = 20; }
      doc.text(`${s.username}: ${Math.round(s.avgScore)}%`, 10, y); 
      y+=10; 
    });
    doc.save('class_report.pdf');
  } catch(e) { 
    alert("Export unavailable in this environment"); 
  }
};
  // Chart Data Preparation with Class Average Line
  const chartData = useMemo(() => {
    const topStudents = stats.slice(0, 10);
    const classAvg = classOverview.classAverage || 0;

    return {
      labels: topStudents.map(s => s.username),
      datasets: [
        { 
          type: 'bar' as const,
          label: 'Student Score', 
          data: topStudents.map(s => s.avgScore || 0), 
          backgroundColor: (context: any) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, 'rgba(6, 182, 212, 0.8)'); // Cyan
            gradient.addColorStop(1, 'rgba(168, 85, 247, 0.4)'); // Purple
            return gradient;
          },
          borderRadius: 4,
          order: 2
        },
        {
          type: 'line' as const,
          label: 'Class Average',
          data: Array(topStudents.length).fill(classAvg),
          borderColor: '#fbbf24', // Amber
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          order: 1
        }
      ]
    };
  }, [stats, classOverview]);

  if (loading) return <div className="p-8 max-w-7xl mx-auto"><ChartSkeleton /></div>;

  const currentTopicDetails = selSubject && selTopic ? courses[selSubject]?.[selTopic] : null;
  const hasInstructionChanges = instructionText !== originalInstructionText;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl border border-white/10 shadow-xl">
        <div>
          <h2 className="text-3xl font-bold text-white">Teacher Dashboard</h2>
          <div className="text-sm text-white/50 mt-1">Manage your classroom, content, and student progress</div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportReport} className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-200 border border-purple-500/30 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:shadow-lg hover:shadow-purple-900/20"><Download size={16}/> Export Report</button>
          <button onClick={() => setDashboardVersion(v => v+1)} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"><RefreshCw size={16}/> Sync Data</button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: classOverview.totalStudents || 0, color: 'text-white', bg: 'bg-slate-800' },
          { label: 'Class Average', value: `${classOverview.classAverage || 0}%`, color: 'text-cyan-400', bg: 'bg-cyan-950/30' },
          { label: 'Active Quizzes', value: recentAssessments.length, color: 'text-purple-400', bg: 'bg-purple-950/30' },
          { label: 'Submissions', value: leaderboardData.assessments.length, color: 'text-green-400', bg: 'bg-green-950/30' },
        ].map((card, idx) => (
          <div key={idx} className={`${card.bg} border border-white/5 p-5 rounded-2xl text-center shadow-lg hover:border-white/20 transition-all`}>
            <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-2">{card.label}</p>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Main Navigation Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { to: "/courses", icon: <BookOpen size={24} className="text-purple-400" />, title: "Manage Courses", desc: "Curriculum & Topics", bg: "from-purple-500/10 to-purple-500/5", border: "border-purple-500/20" },
          { to: "/assessments", icon: <PenTool size={24} className="text-cyan-400" />, title: "Assessments", desc: "Create & Edit Quizzes", bg: "from-cyan-500/10 to-cyan-500/5", border: "border-cyan-500/20" },
          { to: "/teacher-assessments", icon: <MessageSquare size={24} className="text-yellow-400" />, title: "Grading Panel", desc: "Review Theory Answers", bg: "from-yellow-500/10 to-yellow-500/5", border: "border-yellow-500/20", badge: theorySubmissions.length }
        ].map((item, idx) => (
          <Link key={idx} to={item.to} className={`bg-gradient-to-br ${item.bg} border ${item.border} p-6 rounded-2xl flex items-center gap-4 hover:scale-[1.02] hover:shadow-lg transition-all group relative overflow-hidden`}>
            <div className="bg-white/10 p-3.5 rounded-xl group-hover:bg-white/20 transition-colors backdrop-blur-sm">{item.icon}</div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {item.title}
                {item.badge ? <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm animate-pulse">{item.badge} PENDING</span> : null}
              </h3>
              <p className="text-white/50 text-xs mt-0.5">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-12 gap-6">
        {/* Left Column (8 cols) */}
        <div className="md:col-span-8 space-y-6">
          
          {/* Performance Chart */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-bold flex items-center gap-2">
                <BarChart3 size={20} className="text-cyan-400"/> Class Performance
              </h3>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className="w-3 h-3 bg-cyan-500 rounded-sm"></span> Student
                <span className="w-8 h-0.5 bg-amber-400 border-dashed border-t border-amber-400"></span> Class Avg
              </div>
            </div>
            <div className="h-72 w-full">
              {stats.length > 0 ? (
                <Bar 
                  data={chartData} 
                  options={{ 
                    maintainAspectRatio: false, 
                    responsive: true,
                    scales: { 
                      y: { 
                        beginAtZero: true, 
                        max: 100, 
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: 'rgba(255,255,255,0.4)' }
                      }, 
                      x: { 
                        grid: { display: false },
                        ticks: { color: 'rgba(255,255,255,0.4)' }
                      } 
                    },
                    plugins: { 
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#ccc',
                        padding: 10,
                        cornerRadius: 8,
                        callbacks: {
                          label: (context) => ` Score: ${context.parsed.y}%`
                        }
                      }
                    }
                  }} 
                />
              ) : (
                <ChartFallback message="No student performance data available yet" />
              )}
            </div>
          </div>

          {/* Enhanced Course Instruction Editor */}
          <div className="bg-white/5 border border-white/10 rounded-2xl shadow-lg overflow-hidden flex flex-col h-[500px]">
            <div className="p-6 border-b border-white/10 bg-white/5">
              <h3 className="text-white font-bold flex items-center gap-2">
                <ClipboardList size={20} className="text-orange-400"/> Course Instructions
              </h3>
              <p className="text-white/40 text-xs mt-1">Update the syllabus descriptions visible to students.</p>
            </div>
            
            <div className="p-6 flex flex-col h-full gap-4">
              <div className="flex gap-4">
                 <div className="flex-1">
                   <label className="text-xs text-white/40 uppercase font-bold mb-1.5 block">Subject</label>
                   <div className="relative">
                     <select 
                       className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white appearance-none focus:ring-2 focus:ring-cyan-500 outline-none transition cursor-pointer" 
                       value={selSubject} 
                       onChange={e => setSelSubject(e.target.value)}
                     >
                       {Object.keys(courses).map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                     <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"/>
                   </div>
                 </div>
                 <div className="flex-1">
                   <label className="text-xs text-white/40 uppercase font-bold mb-1.5 block">Topic</label>
                   <div className="relative">
                     <select 
                       className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white appearance-none focus:ring-2 focus:ring-cyan-500 outline-none transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
                       value={selTopic} 
                       onChange={e => setSelTopic(e.target.value)}
                       disabled={!selSubject}
                     >
                       <option value="">Select a Topic</option>
                       {selSubject && courses[selSubject] && Object.values(courses[selSubject]).map((t:any) => (
                         <option key={t.id} value={t.id}>{t.title}</option>
                       ))}
                     </select>
                     <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"/>
                   </div>
                 </div>
              </div>

              {selTopic && currentTopicDetails ? (
                <div className="flex-1 flex flex-col relative animate-fade-in">
                  <div className="bg-cyan-900/10 border border-cyan-500/20 p-3 rounded-t-xl flex justify-between items-center">
                     <div className="flex items-center gap-2">
                       <BookOpen size={14} className="text-cyan-400"/>
                       <span className="text-cyan-200 text-sm font-medium">Editing: {currentTopicDetails.title}</span>
                     </div>
                     <span className={`text-xs ${instructionText.length > 500 ? 'text-red-400' : 'text-white/40'}`}>
                       {instructionText.length} chars
                     </span>
                  </div>
                  <textarea 
                    className="flex-1 bg-black/20 border border-t-0 border-white/10 p-4 rounded-b-xl text-white resize-none focus:ring-2 focus:ring-cyan-500/50 outline-none text-sm leading-relaxed font-mono" 
                    value={instructionText} 
                    onChange={e => setInstructionText(e.target.value)} 
                    placeholder="Enter detailed instructions, objectives, or required reading..."
                  />
                  
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-xs text-white/30 italic">
                      {hasInstructionChanges ? 'Unsaved changes' : 'All changes saved'}
                    </span>
                    <button 
                      onClick={handleSaveInstructions} 
                      disabled={!selTopic || !hasInstructionChanges || isSavingInstructions}
                      className={`
                        px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all
                        ${hasInstructionChanges 
                          ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/20' 
                          : 'bg-white/5 text-white/30 cursor-not-allowed'}
                      `}
                    >
                      {isSavingInstructions ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Saving...</>
                      ) : (
                        <><Save size={16}/> Save Changes</>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-white/30 bg-black/10 rounded-xl border border-white/5 border-dashed">
                  <ClipboardList size={48} className="mb-3 opacity-20"/>
                  <p>Select a subject and topic to edit instructions</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols) */}
        <div className="md:col-span-4 space-y-6">
          
          {/* Announcements with Preview */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-lg relative">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Megaphone size={18} className="text-cyan-400"/> Announcements
            </h3>
            
            {!showAnnouncementPreview ? (
              <div className="space-y-3 animate-fade-in">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-white/40 uppercase font-bold">Title</label>
                    <span className="text-xs text-white/20">{announcementText.title.length}/50</span>
                  </div>
                  <input 
                    className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-white text-sm focus:border-cyan-500 outline-none transition placeholder:text-white/20" 
                    placeholder="e.g., Midterm Schedule" 
                    maxLength={50}
                    value={announcementText.title} 
                    onChange={e => setAnnouncementText({...announcementText, title: e.target.value})}
                  />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-white/40 uppercase font-bold">Message</label>
                    <span className="text-xs text-white/20">{announcementText.content.length}/280</span>
                  </div>
                  <textarea 
                    className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-white text-sm focus:border-cyan-500 outline-none transition h-28 resize-none placeholder:text-white/20" 
                    placeholder="Type your message here..." 
                    maxLength={280}
                    value={announcementText.content} 
                    onChange={e => setAnnouncementText({...announcementText, content: e.target.value})}
                  />
                </div>

                <button 
                  onClick={() => setShowAnnouncementPreview(true)}
                  disabled={!announcementText.title || !announcementText.content}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl text-white font-bold flex justify-center items-center gap-2 transition shadow-lg shadow-cyan-900/20"
                >
                  Next: Preview
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in bg-black/20 p-4 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 text-cyan-400 text-xs uppercase font-bold tracking-wider mb-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span> Preview Mode
                </div>
                <div className="border-l-4 border-yellow-500 pl-4 py-1">
                   <h4 className="text-white font-bold text-lg">{announcementText.title}</h4>
                   <p className="text-white/70 text-sm mt-1">{announcementText.content}</p>
                   <p className="text-white/30 text-xs mt-3 flex items-center gap-1"><Clock size={10}/> Just now • {user.username}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowAnnouncementPreview(false)} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg text-sm font-medium">Edit</button>
                  <button onClick={handlePostAnnouncement} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-lg text-sm font-bold flex justify-center items-center gap-2"><Send size={14}/> Post</button>
                </div>
              </div>
            )}

            {/* Recent Announcements */}
            {announcements.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <h4 className="text-white/50 text-xs uppercase font-bold mb-3">Active Recent Posts (48h)</h4>
                <div className="space-y-3">
                  {announcements.map(a => (
                    <div key={a.id} className="text-sm">
                      <p className="text-white font-medium truncate">{a.title}</p>
                      <p className="text-white/40 text-xs">{new Date(a.timestamp).toLocaleDateString()} • {new Date(a.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Leaderboard */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-lg h-[400px] flex flex-col">
            <div className="flex justify-between mb-4 items-center">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Trophy size={18} className="text-yellow-400"/> Top Students
              </h3>
            </div>
            
            {/* Full Word Tabs */}
            <div className="flex bg-black/40 rounded-xl p-1 mb-4">
              {[
                { id: 'assessments', label: 'Assessments' },
                { id: 'academic', label: 'Academic' }
              ].map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveLeaderboard(tab.id as any)} 
                  className={`flex-1 py-2 text-xs rounded-lg uppercase font-bold transition-all ${
                    activeLeaderboard === tab.id 
                      ? 'bg-cyan-600 text-white shadow-md' 
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
              <table className="w-full text-white/70 text-sm">
                <thead className="bg-white/5 sticky top-0 backdrop-blur-md">
                  <tr>
                    <th className="p-3 text-left rounded-l-lg text-xs uppercase text-white/30">Rank</th>
                    <th className="p-3 text-left text-xs uppercase text-white/30">Student</th>
                    <th className="p-3 text-right rounded-r-lg text-xs uppercase text-white/30">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leaderboardData[activeLeaderboard].length === 0 ? (
                    <tr><td colSpan={3} className="p-8 text-center text-xs text-white/30 italic">No data available for this category</td></tr>
                  ) : (
                    leaderboardData[activeLeaderboard].slice(0, 10).map((e, i) => {
                      // Mock trend for UI demo (randomized based on index to be deterministic for render)
                      const isUp = (e.username.length + i) % 2 === 0;
                      
                      return (
                        <tr key={i} className="hover:bg-white/5 transition group">
                          <td className="p-3 font-mono text-xs">
                             <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                               i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                               i === 1 ? 'bg-slate-400/20 text-slate-300' :
                               i === 2 ? 'bg-orange-700/20 text-orange-400' : 'text-white/50'
                             }`}>
                               {i+1}
                             </div>
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-white flex items-center gap-2">
                              {e.username}
                            </div>
                            <div className={`text-[10px] flex items-center gap-1 ${isUp ? 'text-green-500' : 'text-red-500'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                               {isUp ? '↑ 2 positions' : '↓ 1 position'}
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-cyan-400">{Math.round(e.score)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  };


// ============================================================================
// STUDENT DASHBOARD
// ============================================================================
export const StudentDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [advice, setAdvice] = useState<string>("Analyzing your learning patterns...");
  const [pendingAssessments, setPendingAssessments] = useState<Assessment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectLabels, setSubjectLabels] = useState<string[]>([]);
  const [subjectScores, setSubjectScores] = useState<number[]>([]);
  const [courseHistory, setCourseHistory] = useState<any[]>([]);
  const [showGradeHistory, setShowGradeHistory] = useState(false);
  
  const { activeDays, streak } = useMemo(() => calculateUserStats(user), [user]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [allAssessments, allSubmissions, announcementsData, progressData, history] = await Promise.all([
        getAssessments(),
        getSubmissions(),
        getAnnouncements(),
        getProgress(user.username),
        getStudentCourseHistory(user.username),
        getStudentAssessmentFeedback(user.username)
      ]);

      // Filter pending assessments
      const pending = allAssessments.filter(a => 
        (a.targetGrade === 'all' || a.targetGrade === user.gradeLevel) && 
        !allSubmissions.some(s => s.assessmentId === a.id && s.username === user.username)
      );
      setPendingAssessments(pending.slice(0, 3));

      // Filter active announcements (last 48 hours)
      const now = Date.now();
      const activeAnnouncements = announcementsData
        .filter(a => (now - a.timestamp) < ANNOUNCEMENT_DURATION_MS)
        .sort((a, b) => b.timestamp - a.timestamp);
        
      setAnnouncements(activeAnnouncements);
      
      // Calculate Combined Scores
      const scores: Record<string, {total:number, count:number}> = {};
      const studentSubmissions = allSubmissions.filter(s => s.username === user.username && s.graded);
      
      // 1. From Course Progress (Using mainAssessmentScore as performance indicator)
      Object.keys(progressData).forEach(subj => {
        Object.values(progressData[subj]).forEach((t:any) => {
           if(t.mainAssessmentScore) {
             if(!scores[subj]) scores[subj] = {total:0, count:0};
             scores[subj].total += t.mainAssessmentScore;
             scores[subj].count++;
           }
        });
      });
      
      // 2. From Assessments
      studentSubmissions.forEach(sub => {
        const a = allAssessments.find(ax => ax.id === sub.assessmentId);
        if(a && a.subject) {
          if(!scores[a.subject]) scores[a.subject] = {total:0, count:0};
          scores[a.subject].total += (sub.score || 0);
          scores[a.subject].count++;
        }
      });
      
      const labels = Object.keys(scores);
      const values = labels.map(l => {
        const score = scores[l].total / scores[l].count;
        return isNaN(score) ? 0 : Math.round(score);
      });
      setSubjectLabels(labels);
      setSubjectScores(values);
      
      // Set AI Advice
      if (values.length > 0) {
        if (Math.max(...values) > 90) setAdvice("Excellent work! You're mastering these topics. Try the Sprint challenge!");
        else if (Math.min(...values) < 60) setAdvice("Focus on your weaker subjects. Review the course material again.");
        else setAdvice("You're making steady progress. Keep practicing to improve your scores.");
      } else {
        setAdvice("Start your first course or assessment to get personalized learning advice!");
      }

      setCourseHistory(history);
      
    } catch (error) { 
      console.error('Error loading student dashboard:', error); 
    } finally { 
      setLoading(false); 
    }
  }, [user]);

  useEffect(() => { refreshData(); }, [refreshData]);

  const chartData = useMemo(() => ({
    labels: subjectLabels,
    datasets: [{ 
      label: 'Score %', 
      data: subjectScores, 
      backgroundColor: ['#06b6d4', '#a855f7', '#ec4899', '#22c55e', '#eab308', '#ef4444'], 
      borderWidth: 0,
      hoverOffset: 4
    }]
  }), [subjectLabels, subjectScores]);

  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.text(`Student: ${user.username}`, 10, 20);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 10, 30);
      let y = 40;
      if (subjectLabels.length > 0) {
        subjectLabels.forEach((l, i) => {
          doc.text(`${l}: ${Math.round(subjectScores[i])}%`, 10, y);
          y += 10;
        });
      } else {
        doc.text("No performance data yet.", 10, y);
      }
      doc.save('progress_report.pdf');
    } catch(e) { alert("PDF export unavailable"); }
  };

  if (loading) return <div className="p-8 max-w-7xl mx-auto"><ChartSkeleton /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column (Main Content) */}
        <div className="md:col-span-2 space-y-6">
          {/* Welcome Card */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-white/10 p-8 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
            <div>
              <h2 className="text-4xl font-bold text-white mb-2">Hello, {user.username}</h2>
              <p className="text-white/60">Grade {user.gradeLevel || 'N/A'} • Science Student</p>
            </div>
            <div className="flex gap-2">
              <button onClick={refreshData} className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-white flex gap-2 transition text-sm font-medium"><RefreshCw size={16}/> Refresh</button>
              <button onClick={exportPDF} className="bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-500/30 px-4 py-2 rounded-lg flex gap-2 transition text-sm font-medium"><Download size={16}/> Report</button>
            </div>
          </div>

          {/* AI Advisor */}
          <div className="bg-gradient-to-r from-purple-900/40 to-cyan-900/40 border border-white/10 p-6 rounded-2xl flex gap-4 items-start shadow-lg">
            <div className="bg-white/10 p-3 rounded-full flex-shrink-0"><Brain className="text-cyan-300" size={24}/></div>
            <div><h4 className="font-bold text-cyan-300 mb-1">From Newel:</h4><p className="text-white/80 italic leading-relaxed">"{advice}"</p></div>
          </div>

          {/* Announcements */}
          {announcements.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Megaphone size={64}/></div>
              <h3 className="text-xl font-bold text-yellow-400 mb-4 flex gap-2 items-center"><Megaphone size={20}/> Important Updates</h3>
              <div className="space-y-4 relative z-10">
                {announcements.slice(0, 2).map(a => (
                  <div key={a.id} className="border-l-4 border-yellow-500 pl-4">
                    <p className="text-white font-bold">{a.title}</p>
                    <p className="text-white/60 text-sm mt-1">{a.content}</p>
                    <p className="text-white/30 text-xs mt-1">{new Date(a.timestamp).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Assessments */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between mb-4 items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><ClipboardList className="text-cyan-400"/> Active Assessments</h3>
              <Link to="/assessments" className="text-cyan-400 text-sm hover:underline">View All</Link>
            </div>
            <div className="space-y-3">
              {pendingAssessments.length === 0 ? (
                <EmptyState icon={<CheckCircle size={24}/>} message="No pending assessments. Great work!" />
              ) : (
                pendingAssessments.map(a => (
                  <div key={a.id} className="bg-white/5 p-4 rounded-xl flex justify-between items-center border border-white/5 hover:border-white/20 transition">
                    <div>
                      <p className="text-white font-bold">{a.title}</p>
                      <p className="text-white/40 text-xs mt-0.5">{a.subject} • {a.questions?.length || 0} Questions</p>
                    </div>
                    <Link to="/assessments" className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded-lg text-white text-sm font-bold shadow-lg shadow-cyan-900/20 transition">Start Now</Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { to: '/courses', icon: <Brain size={24} className="text-purple-400"/>, title: 'Questions', bg: 'bg-purple-900/20', border: 'border-purple-500/20' },
              { to: '/courses', icon: <Atom size={24} className="text-cyan-400"/>, title: 'Ask Newel', bg: 'bg-cyan-900/20', border: 'border-cyan-500/20' },
              { to: '/sprint-challenge', icon: <Zap size={24} className="text-yellow-400"/>, title: 'Sprint', bg: 'bg-yellow-900/20', border: 'border-yellow-500/20' }
            ].map((link, i) => (
              <Link key={i} to={link.to} className={`${link.bg} border ${link.border} p-5 rounded-xl hover:scale-105 transition-transform flex flex-col items-center text-center shadow-lg group`}>
                <div className="bg-white/10 p-3 rounded-full mb-3 group-hover:bg-white/20 transition">{link.icon}</div>
                <h3 className="text-white font-bold">{link.title}</h3>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Column (Widgets) */}
        <div className="space-y-6">
          {/* Neuroscience Widget */}
          <NeuroscienceWidget />

          {/* Performance Chart */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center shadow-lg">
            <h3 className="text-white font-bold mb-6 self-start flex items-center gap-2"><TrendingUp size={18} className="text-green-400"/> Subject Performance</h3>
            <div className="w-full flex justify-center">
              {subjectLabels.length > 0 ? (
                <div className="w-48 h-48">
                  <Doughnut 
                    data={chartData} 
                    options={{ 
                      maintainAspectRatio: false, 
                      cutout: '70%', 
                      plugins: { 
                        legend: { display: false },
                        tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.raw}%` } }
                      } 
                    }} 
                  />
                </div>
              ) : (
                <ChartFallback message="Complete assessments to see your chart" />
              )}
            </div>
            {subjectLabels.length > 0 && (
              <div className="mt-6 w-full space-y-2">
                {subjectLabels.slice(0, 3).map((l, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-white/60 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: chartData.datasets[0].backgroundColor[i] }}></span>
                      {l}
                    </span>
                    <span className="text-white font-mono">{Math.round(subjectScores[i])}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-lg">
            <h3 className="text-white font-bold mb-4">Quick Stats</h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-white/60 flex items-center gap-2"><Clock size={16}/> Active Days</span>
                <span className="text-white font-mono">{activeDays}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-white/60 flex items-center gap-2"><Zap size={16}/> Streak</span>
                <span className={`font-mono font-bold ${streak > 0 ? 'text-yellow-400' : 'text-white/40'}`}>{streak} Days</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-white/60 flex items-center gap-2"><ClipboardList size={16}/> Pending</span>
                <span className="text-white font-mono">{pendingAssessments.length}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-white/60 flex items-center gap-2"><Users size={16}/> Subjects</span>
                <span className="text-white font-mono">{subjectLabels.length}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-white/60 flex items-center gap-2"><TrendingUp size={16}/> Average</span>
                <span className="text-green-400 font-mono font-bold">
                  {subjectScores.length > 0 ? Math.round(subjectScores.reduce((a,b)=>a+b,0)/subjectScores.length) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Grade History */}
      <div className="space-y-4 bg-white/5 border border-white/10 p-6 rounded-2xl shadow-lg">
        <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowGradeHistory(!showGradeHistory)}>
          <h3 className="text-xl font-bold text-white flex gap-2 items-center"><ClipboardList className="text-green-400"/> Recent History</h3>
          <button className="text-cyan-400 text-sm flex items-center gap-1 hover:text-cyan-300 transition">
            {showGradeHistory ? 'Hide Details' : 'Show Details'} <ChevronDown size={14} className={`transform transition-transform ${showGradeHistory ? 'rotate-180' : ''}`}/>
          </button>
        </div>
        
        {showGradeHistory && (
          <div className="space-y-4 pt-2 animate-fade-in-up">
             {courseHistory.length > 0 ? (
               <div className="grid md:grid-cols-2 gap-4">
                 {courseHistory.slice(0, 6).map((c, i) => (
                   <div key={i} className="bg-black/20 p-4 rounded-xl flex justify-between items-center border border-white/5">
                     <div>
                       <p className="text-white font-medium">{c.topicTitle}</p>
                       <p className="text-white/40 text-xs">{c.subject}</p>
                     </div>
                     <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                       {c.finalScore}% {c.passed ? 'PASSED' : 'RETRY'}
                     </span>
                   </div>
                 ))}
               </div>
             ) : (
               <EmptyState icon={<BookOpen size={24}/>} message="No course history available yet." />
             )}
          </div>
        )}
      </div>
    </div>
  );
};