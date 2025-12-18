// Dashboards.tsx - COMPLETE FIXED VERSION FOR DEPLOYMENT
// Dashboards.tsx - Updated Chart.js imports
import React, { useState, useEffect, useMemo } from 'react';
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
  saveAnnouncement,
  getSubmissions,
  refreshAllLeaderboards,
  getPendingTheorySubmissions
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
  BookOpen as BookOpenIcon,
  Users,
  BarChart3,
  Target,
  MessageSquare
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

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<StudentStats[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'users' | 'teachers'>('pending');
  const [loading, setLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<{ academic: LeaderboardEntry[], challenge: LeaderboardEntry[], assessments: LeaderboardEntry[] }>({ 
    academic: [], 
    challenge: [], 
    assessments: [] 
  });

  const refreshData = async () => {
    setLoading(true);
    try {
      // Get users (real users only, no demo accounts)
      const usersData = await getUsers();
      const userList = Object.values(usersData).filter(user => 
        !['admin', 'teacher_demo', 'student_demo'].includes(user.username)
      );
      setUsers(userList);
      
      // Get stats (already filtered in service)
      const statsData = await getAllStudentStats();
      setStats(statsData);
      
      // Get assessments
      const assessmentsData = await getAssessments();
      setAssessments(assessmentsData.slice(0, 5));
      
      // Get announcements
      const announcementsData = await getAnnouncements();
      setAnnouncements(announcementsData);
      
      // Get leaderboards
      const leaderboards = await getLeaderboards();
      setLeaderboardData(leaderboards);
      
      console.log('âœ… Admin data refresh complete');
    } catch (error) {
      console.error('âŒ Error refreshing admin data:', error);
      setStats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshLeaderboards = async () => {
    try {
      await refreshAllLeaderboards();
      const leaderboards = await getLeaderboards();
      setLeaderboardData(leaderboards);
      alert('Leaderboards refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing leaderboards:', error);
      alert('Failed to refresh leaderboards');
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleApprove = async (username: string) => {
    const user = users.find(u => u.username === username);
    if (!user) return;
    
    try {
      await saveUser({ ...user, approved: true });
      await refreshData();
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (confirm(`Delete user "${username}" permanently?`)) {
      try {
        await deleteUser(username);
        await refreshData();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const pendingUsers = useMemo(() => users.filter(u => !u.approved), [users]);
  const activeUsers = useMemo(() => users.filter(u => u.approved), [users]);
  const teachers = useMemo(() => users.filter(u => u.role === 'teacher' && u.approved), [users]);

  const performanceData = useMemo(() => {
    return {
      labels: stats.slice(0, 10).map(s => s.username),
      datasets: [{
        label: 'Avg Assessment Score',
        data: stats.slice(0, 10).map(s => s.avgScore || 0),
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        tension: 0.4,
        fill: true
      }]
    };
  }, [stats]);

  const gradeDistributionData = useMemo(() => {
    const gradeLevels = ['9', '10', '11', '12'];
    return {
      labels: gradeLevels,
      datasets: [{
        label: 'Real Students',
        data: gradeLevels.map(g => users.filter(u => u.gradeLevel === g).length),
        backgroundColor: 'rgba(6, 182, 212, 0.6)'
      }]
    };
  }, [users]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
        <p className="mt-4 text-white/60">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">Admin Dashboard</h2>
        <div className="flex gap-2">
          <button
            onClick={handleRefreshLeaderboards}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            <RefreshCw size={16} /> Refresh Leaderboards
          </button>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition flex items-center gap-2"
          >
            <RefreshCw size={16} /> Refresh All Data
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white/5 p-6 rounded-2xl">
          <p className="text-white/60 text-sm flex items-center gap-2">
            <Users size={16} /> Total Real Users
          </p>
          <p className="text-3xl font-bold text-white">{users.length}</p>
        </div>
        <div className="bg-white/5 p-6 rounded-2xl">
          <p className="text-white/60 text-sm flex items-center gap-2">
            <Target size={16} /> Pending Approval
          </p>
          <p className="text-3xl font-bold text-yellow-400">{pendingUsers.length}</p>
        </div>
        <div className="bg-white/5 p-6 rounded-2xl">
          <p className="text-white/60 text-sm flex items-center gap-2">
            <BarChart3 size={16} /> Active Users
          </p>
          <p className="text-3xl font-bold text-green-400">{activeUsers.length}</p>
        </div>
        <div className="bg-white/5 p-6 rounded-2xl">
          <p className="text-white/60 text-sm flex items-center gap-2">
            <Users size={16} /> Teachers
          </p>
          <p className="text-3xl font-bold text-purple-400">{teachers.length}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/5 p-6 rounded-2xl">
          <h3 className="text-xl font-bold text-white mb-4">Real Students by Grade</h3>
          <Bar 
            data={gradeDistributionData} 
            options={{ 
              maintainAspectRatio: true,
              responsive: true,
              plugins: { 
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (context: any) => `${context.label}: ${context.raw} students`
                  }
                }
              }
            }} 
          />
        </div>
        <div className="bg-white/5 p-6 rounded-2xl">
          <h3 className="text-xl font-bold text-white mb-4">Performance Overview</h3>
          {stats.length > 0 ? (
            <Line 
              data={performanceData} 
              options={{ 
                maintainAspectRatio: true,
                responsive: true,
                plugins: { 
                  legend: { display: true },
                  tooltip: {
                    callbacks: {
                      label: (context: any) => `${context.dataset.label}: ${context.raw.toFixed(1)}%`
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                      callback: (value: any) => `${value}%`
                    }
                  }
                }
              }} 
            />
          ) : (
            <div className="text-center text-white/40 py-8">
              No performance data available yet
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/5 rounded-2xl overflow-hidden">
        <div className="flex border-b border-white/10">
          {['pending', 'users', 'teachers'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === tab
                  ? 'bg-cyan-600 text-white'
                  : 'text-white/60 hover:bg-white/5'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'pending' && pendingUsers.length > 0 && (
                <span className="ml-2 px-2 py-1 bg-yellow-500 text-black text-xs rounded-full">
                  {pendingUsers.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'pending' && (
            <div className="space-y-2">
              {pendingUsers.length === 0 ? (
                <p className="text-white/40 text-center py-8">No pending approvals</p>
              ) : (
                pendingUsers.map(u => (
                  <div
                    key={u.username}
                    className="flex justify-between items-center p-4 bg-white/5 rounded-lg"
                  >
                    <div>
                      <p className="text-white font-semibold">{u.username}</p>
                      <p className="text-white/60 text-sm">
                        {u.role} â€¢ Grade {u.gradeLevel || 'N/A'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(u.username)}
                        className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        <Check size={20} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.username)}
                        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-2">
              {activeUsers.map(u => (
                <div
                  key={u.username}
                  className="flex justify-between items-center p-4 bg-white/5 rounded-lg"
                >
                  <div>
                    <p className="text-white font-semibold">{u.username}</p>
                    <p className="text-white/60 text-sm">
                      {u.role} â€¢ Grade {u.gradeLevel || 'N/A'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteUser(u.username)}
                    className="p-2 bg-red-600/80 text-white rounded-lg hover:bg-red-600 transition"
                  >
                    <X size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'teachers' && (
            <div className="space-y-2">
              {teachers.map(t => (
                <div
                  key={t.username}
                  className="flex justify-between items-center p-4 bg-white/5 rounded-lg"
                >
                  <div>
                    <p className="text-white font-semibold">{t.username}</p>
                    <p className="text-white/60 text-sm">Teacher</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard Preview */}
      <div className="bg-white/5 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Leaderboard Status</h3>
          <button
            onClick={handleRefreshLeaderboards}
            className="px-4 py-2 bg-green-600/80 text-white rounded-lg hover:bg-green-600 transition text-sm"
          >
            Force Refresh
          </button>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white/5 p-4 rounded-lg">
            <p className="text-white/60 text-sm">Academic Leaderboard</p>
            <p className="text-2xl font-bold text-white">{leaderboardData.academic.length} entries</p>
            {leaderboardData.academic.length > 0 && (
              <p className="text-white/40 text-xs mt-1">
                Top: {leaderboardData.academic[0]?.username} ({Math.round(leaderboardData.academic[0]?.score || 0)})
              </p>
            )}
          </div>
          <div className="bg-white/5 p-4 rounded-lg">
            <p className="text-white/60 text-sm">Challenge Leaderboard</p>
            <p className="text-2xl font-bold text-white">{leaderboardData.challenge.length} entries</p>
            {leaderboardData.challenge.length > 0 && (
              <p className="text-white/40 text-xs mt-1">
                Top: {leaderboardData.challenge[0]?.username} ({Math.round(leaderboardData.challenge[0]?.score || 0)})
              </p>
            )}
          </div>
          <div className="bg-white/5 p-4 rounded-lg">
            <p className="text-white/60 text-sm">Assessment Leaderboard</p>
            <p className="text-2xl font-bold text-white">{leaderboardData.assessments.length} entries</p>
            {leaderboardData.assessments.length > 0 && (
              <p className="text-white/40 text-xs mt-1">
                Top: {leaderboardData.assessments[0]?.username} ({Math.round(leaderboardData.assessments[0]?.score || 0)}%)
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- TEACHER DASHBOARD ---
export const TeacherDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [dashboardVersion, setDashboardVersion] = useState(0); 
  const [stats, setStats] = useState<StudentStats[]>([]);
  const [classOverview, setClassOverview] = useState<any>({});
  const [recentAssessments, setRecentAssessments] = useState<Assessment[]>([]);
  const [announcementText, setAnnouncementText] = useState({ title: '', content: '' });
  const [leaderboardData, setLeaderboardData] = useState<{ academic: LeaderboardEntry[], challenge: LeaderboardEntry[], assessments: LeaderboardEntry[] }>({ 
    academic: [], 
    challenge: [], 
    assessments: [] 
  });
  const [theorySubmissions, setTheorySubmissions] = useState<any[]>([]);

  const [activeLeaderboard, setActiveLeaderboard] = useState<'academic' | 'challenge' | 'assessments'>('assessments');

  // Instruction Editor State
  const [courses, setCourses] = useState<CourseStructure>({});
  const [selSubject, setSelSubject] = useState('Biology');
  const [selTopic, setSelTopic] = useState('');
  const [instructionText, setInstructionText] = useState('');
  const [loading, setLoading] = useState(true);

  const loadTheorySubmissions = async () => {
    try {
      const submissions = await getPendingTheorySubmissions();
      setTheorySubmissions(submissions || []);
    } catch (error) {
      console.error('Error loading theory submissions:', error);
    }
  };

  const loadData = async () => {
    console.log("Refreshing Teacher Dashboard Data...");
    setLoading(true);
    try {
      const statsData = await getAllStudentStats();
      setStats(statsData);
      
      const overviewData = await getClassOverview();
      setClassOverview(overviewData || {});
      
      const allAssessments = await getAssessments();
      setRecentAssessments(allAssessments.slice(-5).reverse());
      
      const leaderboards = await getLeaderboards();
      setLeaderboardData(leaderboards);
      
      const courseData = await getCourses();
      setCourses(courseData);
      
      if (!courseData[selSubject] && Object.keys(courseData).length > 0) {
        setSelSubject(Object.keys(courseData)[0]);
      }
    } catch (error) {
      
      console.error('Error loading teacher dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dashboardVersion]);

  useEffect(() => {
    if (selSubject && selTopic && courses[selSubject]?.[selTopic]) {
      setInstructionText(courses[selSubject][selTopic].description || '');
    }
  }, [selSubject, selTopic, courses]);

  const forceRefresh = () => setDashboardVersion(prev => prev + 1);

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
      alert("Announcement Posted!");
      forceRefresh();
    } catch (error) {
      
      console.error('Error posting announcement:', error);
      alert("Failed to post announcement");
    }
  };

  const handleSaveInstructions = async () => {
    if (!selSubject || !selTopic) return;
    const topic = courses[selSubject]?.[selTopic];
    if (!topic) return;

    try {
      const updatedTopic = { ...topic, description: instructionText };
      await saveTopic(selSubject, updatedTopic);
      alert("Instructions Saved!");
      forceRefresh(); 
    } catch (error) {
      
      console.error('Error saving instructions:', error);
      alert("Failed to save instructions");
    }
  };

  const handleExportReport = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text('Class Performance Report', 10, 20);
      doc.setFontSize(12);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 10, 30);
      doc.text(`Teacher: ${user.username}`, 10, 40);
      
      let y = 60;
      doc.text('Student Performance:', 10, y);
      y += 10;
      
      stats.forEach((s) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(`${s.username} (Grade ${s.gradeLevel}) - Avg Score: ${Math.round(s.avgScore)}%`, 10, y);
        y += 10;
      });
      
      doc.save(`${user.username}_class_report.pdf`);
    } catch (error) {
      
      console.error('Error exporting report:', error);
      alert("Failed to export report");
    }
  };

  const barData = {
    labels: stats.slice(0, 10).map(s => s.username),
    datasets: [{
      label: 'Avg Assessment Score (%)',
      data: stats.slice(0, 10).map(s => s.avgScore || 0),
      backgroundColor: '#a855f7',
      borderColor: '#a855f7',
      borderWidth: 1
    }]
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
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Teacher Dashboard</h2>
          <div className="text-sm text-white/50">Real Student Data Only â€¢ Ready for Deployment</div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportReport} 
            className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-200 border border-purple-500/30 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Download size={16}/> Export Report
          </button>
          <button 
            onClick={forceRefresh} 
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <RefreshCw size={16}/> Refresh Data
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
          <p className="text-xs text-white/50 uppercase">Real Students</p>
          <p className="text-2xl font-bold text-white">{classOverview.totalStudents || 0}</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
          <p className="text-xs text-white/50 uppercase">Class Avg</p>
          <p className="text-2xl font-bold text-cyan-400">{classOverview.classAverage || 0}%</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
          <p className="text-xs text-white/50 uppercase">Active Quizzes</p>
          <p className="text-2xl font-bold text-purple-400">{recentAssessments.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
          <p className="text-xs text-white/50 uppercase">Assessment Entries</p>
          <p className="text-2xl font-bold text-green-400">{leaderboardData.assessments.length}</p>
        </div>
      </div>
      
      {/* Main Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Link 
          to="/courses" 
          className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 flex items-center gap-6 hover:bg-white/10 transition-colors group"
        >
          <div className="bg-purple-900/50 p-4 rounded-xl group-hover:scale-110 transition-transform">
            <BookOpenIcon size={32} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Manage Courses</h3>
            <p className="text-white/50 text-sm">Add topics, upload materials, and create checkpoints.</p>
          </div>
        </Link>

        <Link 
          to="/assessments" 
          className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 backdrop-blur-md rounded-2xl border border-cyan-500/30 p-6 flex items-center gap-6 hover:scale-[1.02] transition-transform group shadow-lg"
        >
          <div className="bg-cyan-900/50 p-4 rounded-xl shadow-cyan-500/20 shadow-lg">
            <PenTool size={32} className="text-cyan-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Create & Grade Assessments <Zap size={16} className="text-yellow-400"/>
            </h3>
            <p className="text-white/60 text-sm">Create MCQ/Written quizzes, use AI Auto-Grading, and review student submissions.</p>
          </div>
        </Link>
      </div>
        
        <Link 
          to="/courses" 
          className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 backdrop-blur-md rounded-2xl border border-purple-500/30 p-6 flex items-center gap-6 hover:scale-[1.02] transition-transform group shadow-lg"
        >
          <div className="bg-purple-900/50 p-4 rounded-xl shadow-purple-500/20 shadow-lg">
            <MessageSquare size={32} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Grade Theory Submissions 
              {theorySubmissions.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {theorySubmissions.length} new
                </span>
              )}
            </h3>
            <p className="text-white/60 text-sm">
              Review and grade student theory answers from checkpoint assessments.
            </p>
          </div>
        </Link>
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Analytics & Instructions */}
        <div className="md:col-span-2 space-y-6">
          {/* Analytics Chart */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-green-400"/> Real Student Performance
            </h3>
            <div className="h-64">
              {stats.length > 0 ? (
                <Bar 
                data={barData} 
                options={{ 
                  maintainAspectRatio: false, 
                  responsive: true,
                  scales: { 
                    y: { 
                      beginAtZero: true, 
                      max: 100, 
                      ticks: {
                        callback: (value: any) => `${value}%`
                      },
                      grid: { color: 'rgba(255,255,255,0.1)' } 
                    }, 
                    x: { 
                      grid: { display: false },
                      ticks: {
                        maxRotation: 45,
                        minRotation: 45
                      }
                    } 
                  },
                  plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        callbacks: {
                          label: (context: any) => `Score: ${context.raw.toFixed(1)}%`
                        }
                      }
                    }
                  }} 
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-white/40">No student performance data yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Instructions Editor */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <ClipboardList size={20} className="text-orange-400"/> Quick Course Instructions
            </h3>
            <div className="flex gap-4 mb-4">
              <select 
                className="bg-black/20 border border-white/10 rounded-lg p-2 text-white flex-1" 
                value={selSubject} 
                onChange={e => setSelSubject(e.target.value)}
              >
                {Object.keys(courses).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select 
                className="bg-black/20 border border-white/10 rounded-lg p-2 text-white flex-1" 
                value={selTopic} 
                onChange={e => setSelTopic(e.target.value)}
              >
                <option value="">Select Topic</option>
                {selSubject && courses[selSubject] && Object.values(courses[selSubject]).map((t: any) => 
                  <option key={t.id} value={t.id}>{t.title}</option>
                )}
              </select>
            </div>
            <textarea 
              className="w-full h-32 bg-black/20 border border-white/10 rounded-lg p-3 text-white text-sm mb-4" 
              placeholder="Select a topic to edit its instructions/description..."
              value={instructionText}
              onChange={e => setInstructionText(e.target.value)}
            />
            <button 
              onClick={handleSaveInstructions} 
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-6 rounded-lg text-sm flex items-center gap-2"
            >
              <Save size={16}/> Save Instructions
            </button>
          </div>
        </div>

        {/* Right Column: Announcements & Recent */}
        <div className="space-y-6">
          {/* Post Announcement */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Megaphone size={18}/> Post Announcement
            </h3>
            <div className="space-y-3">
              <input 
                className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white text-sm" 
                placeholder="Title (e.g. Exam next week)"
                value={announcementText.title}
                onChange={e => setAnnouncementText({...announcementText, title: e.target.value})}
              />
              <textarea 
                className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white text-sm h-24" 
                placeholder="Message content..."
                value={announcementText.content}
                onChange={e => setAnnouncementText({...announcementText, content: e.target.value})}
              />
              <button 
                onClick={handlePostAnnouncement} 
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-lg text-sm flex justify-center items-center gap-2"
              >
                <Send size={16}/> Post Update
              </button>
            </div>
          </div>

          {/* Recent Assessments List */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h3 className="text-white font-bold mb-4">Recent Assessments</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentAssessments.length === 0 && 
                <p className="text-white/40 italic text-sm">No assessments created yet.</p>
              }
              {recentAssessments.map(a => (
                <div key={a.id} className="text-sm text-white/70 border-b border-white/5 pb-2 last:border-0">
                  <p className="font-bold text-white">{a.title}</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs opacity-50 bg-white/10 px-2 py-0.5 rounded">{a.subject}</span>
                    <span className="text-xs opacity-50">Grade {a.targetGrade || 'All'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Class Leaderboards */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="text-yellow-400"/> Assessment Leaderboard (Real Students Only)
          </h3>
          <div className="flex gap-2">
            {['assessments', 'academic', 'challenge'].map(t => (
              <button 
                key={t}
                onClick={() => setActiveLeaderboard(t as any)}
                className={`text-xs px-3 py-1 rounded-full uppercase font-bold transition-all ${
                  activeLeaderboard === t ? 'bg-cyan-600 text-white' : 'bg-white/10 text-white/50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-white/5 text-white uppercase font-bold text-xs">
              <tr>
                <th className="p-4">Rank</th>
                <th className="p-4">Student</th>
                <th className="p-4">Grade</th>
                <th className="p-4 text-right">Avg Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leaderboardData[activeLeaderboard].length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center italic text-white/30">
                    No data available. Scores will appear after grading assessments.
                  </td>
                </tr>
              )}
              {leaderboardData[activeLeaderboard].map((entry, i) => (
                <tr key={i} className="hover:bg-white/5">
                  <td className="p-4 text-white font-mono">#{i+1}</td>
                  <td className="p-4 font-bold text-white">{entry.username}</td>
                  <td className="p-4">
                    <span className="bg-white/10 px-2 py-1 rounded text-xs">{entry.grade_level}</span>
                  </td>
                  <td className="p-4 text-right font-mono text-cyan-300">
                    {Math.round(entry.score || 0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Student List */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Real Student Progress Overview</h3>
          <span className="text-white/40 text-sm">
            Showing {stats.length} students
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-white/5 text-white uppercase font-bold text-xs">
              <tr>
                <th className="p-4">Student</th>
                <th className="p-4">Grade</th>
                <th className="p-4">Avg Score</th>
                <th className="p-4">Status</th>
                <th className="p-4">Last Active</th>
                <th className="p-4">Streak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center italic text-white/30">
                    No student data available. Students will appear after they register and complete assessments.
                  </td>
                </tr>
              ) : (
                stats.map(s => (
                  <tr key={s.username} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-medium text-white">{s.username}</td>
                    <td className="p-4">
                      <span className="bg-white/10 px-2 py-1 rounded text-xs">{s.gradeLevel}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-black/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500" 
                            style={{ width: `${Math.min(s.avgScore || 0, 100)}%` }}
                          ></div>
                        </div>
                        <span className="font-mono text-xs">{Math.round(s.avgScore || 0)}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {(s.avgScore || 0) < 50 ? (
                        <span className="text-red-400 flex items-center gap-1 text-xs bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                          <AlertCircle size={12}/> Needs Help
                        </span>
                      ) : (
                        <span className="text-green-400 text-xs bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                          On Track
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-xs opacity-60">{s.lastActive || 'Never'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${s.streak > 0 ? 'bg-green-500/10 text-green-400' : 'bg-white/10 text-white/60'}`}>
                        {s.streak} days
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- STUDENT DASHBOARD ---
export const StudentDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [advice, setAdvice] = useState<string>("Analyzing your learning patterns...");
  const [pendingAssessments, setPendingAssessments] = useState<Assessment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [progress, setProgress] = useState<any>({});
  const [courses, setCourses] = useState<CourseStructure>({});
  const [loading, setLoading] = useState(true);
  const [subjectLabels, setSubjectLabels] = useState<string[]>([]);
  const [subjectScores, setSubjectScores] = useState<number[]>([]);
  
  // Stats
  const { activeDays, streak } = calculateUserStats(user);

  const refreshData = async () => {
    setLoading(true);
    try {
      console.log(`ðŸ“Š Loading data for student: ${user.username}`);
      
      // Refresh pending assessments
      const allAssessments = await getAssessments();
      const allSubmissions = await getSubmissions();
      
      // Filter: Grade matches AND (assigned to all OR specific user) AND (not submitted)
      const pending = allAssessments.filter(a =>
        (a.targetGrade === 'all' || a.targetGrade === user.gradeLevel) &&
        !allSubmissions.some(s => s.assessmentId === a.id && s.username === user.username)
      );
      setPendingAssessments(pending.slice(0, 3));
      
      const announcementsData = await getAnnouncements();
      setAnnouncements(announcementsData);
      
      const progressData = await getProgress(user.username);
      setProgress(progressData);
      
      const coursesData = await getCourses();
      setCourses(coursesData);
      
      // ========== FIXED: Calculate combined subject scores ==========
      // 1. Get scores from COURSE progress (mainAssessmentScore from topics)
      const courseSubjectScores: Record<string, { total: number, count: number }> = {};
      Object.keys(progressData).forEach(subject => {
        Object.keys(progressData[subject]).forEach(topicId => {
          const score = progressData[subject][topicId]?.mainAssessmentScore;
          if (score && score > 0) {
            if (!courseSubjectScores[subject]) {
              courseSubjectScores[subject] = { total: 0, count: 0 };
            }
            courseSubjectScores[subject].total += score;
            courseSubjectScores[subject].count++;
          }
        });
      });
      
      // 2. Get scores from ASSESSMENTS (graded submissions)
      const studentSubmissions = allSubmissions.filter(
        s => s.username === user.username && s.graded && s.score !== undefined && s.score > 0
      );
      
      console.log(`ðŸ“„ Found ${studentSubmissions.length} graded submissions for ${user.username}`);
      studentSubmissions.forEach(sub => {
        console.log(`   Submission: ${sub.assessmentId}, Score: ${sub.score}`);
      });
      
      const assessmentSubjectScores: Record<string, { total: number, count: number }> = {};
      
      studentSubmissions.forEach(sub => {
        const assessment = allAssessments.find(a => a.id === sub.assessmentId);
        if (assessment && assessment.subject) {
          if (!assessmentSubjectScores[assessment.subject]) {
            assessmentSubjectScores[assessment.subject] = { total: 0, count: 0 };
          }
          assessmentSubjectScores[assessment.subject].total += (sub.score || 0);
          assessmentSubjectScores[assessment.subject].count++;
        }
      });
      
      // 3. COMBINE both sources (prioritize assessments if both exist)
      const combinedScores: Record<string, number> = {};
      
      // Add assessment scores first (these are teacher-graded assessments)
      Object.keys(assessmentSubjectScores).forEach(subject => {
        const data = assessmentSubjectScores[subject];
        if (data.count > 0) {
          combinedScores[subject] = data.total / data.count;
          console.log(`ðŸ“ˆ Assessment average for ${subject}: ${combinedScores[subject].toFixed(1)}%`);
        }
      });
      
      // Add course scores for subjects not already covered
      Object.keys(courseSubjectScores).forEach(subject => {
        if (!combinedScores[subject] && courseSubjectScores[subject].count > 0) {
          const data = courseSubjectScores[subject];
          combinedScores[subject] = data.total / data.count;
          console.log(`ðŸ“˜ Course average for ${subject}: ${combinedScores[subject].toFixed(1)}%`);
        }
      });
      
      // 4. Prepare for chart
      const newLabels: string[] = [];
      const newScores: number[] = [];
      
      Object.keys(combinedScores).forEach(subject => {
        newLabels.push(subject);
        newScores.push(combinedScores[subject]);
      });
      
      setSubjectLabels(newLabels);
      setSubjectScores(newScores);
      
      console.log('ðŸŽ¯ Final chart data:', { labels: newLabels, scores: newScores });
      // ========== END FIX ==========
      
      // Generate advice based on combined scores
      if (newLabels.length === 0) {
        if (studentSubmissions.length > 0) {
          // Has assessments but no subject classification
          setAdvice("Great work on your assessments! Complete more to see detailed performance analytics.");
        } else {
          setAdvice("Start your first course or assessment to get personalized AI advice!");
        }
      } else {
        const lowestScore = Math.min(...newScores);
        const highestScore = Math.max(...newScores);
        
        if (lowestScore < 60) {
          const subject = newLabels[newScores.indexOf(lowestScore)];
          setAdvice(`Focus on improving your ${subject} skills. Review feedback and practice more questions.`);
        } else if (highestScore >= 90) {
          setAdvice("Excellent work! You're mastering these topics. Try the 222-Sprint challenge!");
        } else {
          setAdvice("You're making good progress! Keep practicing to improve your scores.");
        }
      }
      
    } catch (error) {
      
      console.error('Error refreshing student dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [user]);

  const chartData = {
    labels: subjectLabels.length > 0 ? subjectLabels : ['No Scores Yet'],
    datasets: [{
      label: 'Average Score (%)',
      data: subjectScores.length > 0 ? subjectScores : [0],
      backgroundColor: [
        'rgba(6, 182, 212, 0.6)',    // Cyan
        'rgba(168, 85, 247, 0.6)',   // Purple
        'rgba(236, 72, 153, 0.6)',   // Pink
        'rgba(34, 197, 94, 0.6)',    // Green
        'rgba(245, 158, 11, 0.6)',   // Yellow
        'rgba(239, 68, 68, 0.6)'     // Red
      ],
      borderColor: 'transparent',
      hoverOffset: 12,
      borderWidth: 0
    }]
  };

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
      
      // Add pending assessments
      y += 10;
      if (pendingAssessments.length > 0) {
        doc.text('Pending Assessments:', 10, y);
        y += 10;
        pendingAssessments.forEach(assessment => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(`- ${assessment.title} (${assessment.subject})`, 10, y);
          y += 8;
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
      title: "Cambridge Questions", 
      desc: "Practice IGCSE/A-Level style questions.", 
      icon: <Brain className="text-purple-400" size={32} />, 
      color: "from-purple-500/20 to-blue-500/20", 
      link: "/courses" 
    },
    { 
      title: "AI Explainer", 
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
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-white/10 p-8 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-4xl font-bold text-white mb-2">Hello, {user.username}</h2>
              <p className="text-white/60">
                {user.gradeLevel ? `Grade ${user.gradeLevel} Science Student` : 'Science Student'}
                {subjectScores.length > 0 && ` â€¢ ${subjectScores.length} Subjects Tracked`}
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={refreshData} 
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
              >
                <RefreshCw size={16} /> Refresh
              </button>
              <button 
                onClick={exportPDF} 
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
              >
                <Download size={16} /> Export Report
              </button>
            </div>
          </div>

          {/* AI Advisor */}
          <div className="bg-gradient-to-r from-purple-900/40 to-cyan-900/40 border border-white/10 p-6 rounded-2xl flex gap-4 items-start">
            <div className="bg-white/10 p-3 rounded-full">
              <Brain className="text-cyan-300" size={24}/>
            </div>
            <div>
              <h4 className="font-bold text-cyan-300 mb-1">AI Advisor</h4>
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
                {announcements.slice(0, 2).map(ann => (
                  <div key={ann.id} className="border-l-4 border-yellow-500 pl-4">
                    <p className="text-white font-medium">{ann.title}</p>
                    <p className="text-white/60 text-sm">{ann.content}</p>
                    <span className="text-white/30 text-xs">
                      {new Date(ann.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
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
                <div key={a.id} className="bg-white/5 p-3 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="text-white font-bold text-sm">{a.title}</p>
                    <p className="text-white/40 text-xs">{a.subject} â€¢ {a.questions?.length || 0} Questions</p>
                  </div>
                  <Link 
                    to="/assessments" 
                    className="bg-cyan-600/50 hover:bg-cyan-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Start Now
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <Link 
                to={f.link} 
                key={i} 
                className={`group bg-gradient-to-br ${f.color} backdrop-blur-md border border-white/10 p-6 rounded-2xl hover:scale-105 transition-all cursor-pointer shadow-xl`}
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
                  <div className="text-4xl mb-2 text-white/20">ðŸ“Š</div>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

