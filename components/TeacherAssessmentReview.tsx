import React, { useState, useEffect } from 'react';

// Define types locally to avoid import issues
interface Assessment {
  id: string;
  title: string;
  subject: string;
  topic?: string;
  questions: any[];
  assignedTo: string[];
  targetGrade: string;
  createdBy: string;
  dueDate?: number;
}

interface Submission {
  assessmentId: string;
  username: string;
  answers: Record<string, string>;
  submittedAt: number;
  graded: boolean;
  score?: number;
  feedback?: string;
  newelGraded?: boolean;
}

interface User {
  username: string;
  role: 'admin' | 'teacher' | 'student';
  approved: boolean;
  securityQuestion: string;
  securityAnswer: string;
  gradeLevel?: string;
  assignedStudents?: string[];
  lastLogin?: number;
  loginHistory?: number[];
}

interface TheorySubmission {
  id: string;
  user_id: string;
  checkpoint_id: string;
  topic_id: string;
  question_text: string;
  student_answer: string;
  ai_suggested_score?: number;
  teacher_score?: number;
  teacher_feedback?: string;
  graded_by?: string;
  submitted_at: string;
  graded_at?: string;
  status: 'pending' | 'ai_graded' | 'teacher_graded' | 'approved';
  user?: { username: string };
  graded_by_user?: { username: string };
  topic?: { title: string };
  checkpoint?: { title: string; checkpoint_number: number };
}

import { supabase } from '../services/supabaseClient';
import { 
  getAssessments, 
  getSubmissions, 
  deleteAssessment,
  getUsers 
} from '../services/storageService';
import { 
  getPendingTheorySubmissions,
  aiGradeTheoryAnswer,
  teacherGradeTheoryAnswer,
  approveTheoryGrade
} from '../services/theoryGradingService';
import { 
  Trash2, Edit, Eye, Users, BarChart, Calendar, Check, X, 
  Sparkles, MessageSquare, User as UserIcon, BookOpen, Clock
} from 'lucide-react';
import { RestrictedTextArea } from '@/RestrictedTextArea';

export const TeacherAssessmentReview: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [theorySubmissions, setTheorySubmissions] = useState<TheorySubmission[]>([]);
  const [activeTab, setActiveTab] = useState<'assessments' | 'theory'>('assessments');
  const [selectedTheory, setSelectedTheory] = useState<TheorySubmission | null>(null);
  const [gradingScore, setGradingScore] = useState<number>(85);
  const [teacherFeedback, setTeacherFeedback] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [aiGrading, setAiGrading] = useState<boolean>(false);

  useEffect(() => {
    loadData();
    // Get current teacher user
    const storedUser = JSON.parse(localStorage.getItem('newel_currentUser') || 'null');
    setCurrentUser(storedUser);
  }, []);

  const loadData = async () => {
    const [assessmentsData, submissionsData, theoryData] = await Promise.all([
      getAssessments(),
      getSubmissions(),
      getPendingTheorySubmissions()
    ]);
    setAssessments(assessmentsData);
    setSubmissions(submissionsData);
    setTheorySubmissions(theoryData);
  };

  const getAssessmentStats = (assessmentId: string) => {
    const assessmentSubs = submissions.filter(s => s.assessmentId === assessmentId);
    const gradedSubs = assessmentSubs.filter(s => s.graded);
    const avgScore = gradedSubs.length > 0 
      ? Math.round(gradedSubs.reduce((sum, s) => sum + (s.score || 0), 0) / gradedSubs.length)
      : 0;
    
    return {
      totalSubmissions: assessmentSubs.length,
      gradedSubmissions: gradedSubs.length,
      averageScore: avgScore
    };
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this assessment?')) {
      await deleteAssessment(id);
      loadData();
    }
  };

  const handleAiGrade = async (submission: TheorySubmission) => {
    if (!currentUser) return;
    
    setAiGrading(true);
    try {
      const score = await aiGradeTheoryAnswer(
        submission.id,
        submission.question_text,
        submission.student_answer
      );
      
      // Update local state
      setTheorySubmissions(prev => prev.map(s => 
        s.id === submission.id 
          ? { ...s, ai_suggested_score: score, status: 'ai_graded' as const }
          : s
      ));
      
      if (selectedTheory?.id === submission.id) {
        setSelectedTheory({
          ...submission,
          ai_suggested_score: score,
          status: 'ai_graded'
        });
        setGradingScore(score);
      }
      
      alert(`AI suggested score: ${score}%`);
    } catch (error) {
      console.error('AI grading error:', error);
      alert('Failed to AI grade. Please try manual grading.');
    } finally {
      setAiGrading(false);
    }
  };

  // Add this function to update student progress after grading
  const updateStudentProgressAfterGrading = async (
    submission: TheorySubmission, 
    score: number
  ) => {
    try {
      // Import the function dynamically to avoid circular dependencies
      const { saveCheckpointProgress } = await import('../services/checkpointService');
      
      // Save checkpoint progress for the student
      const checkpointId = submission.checkpoint_id;
      const passed = score >= 85; // Use 85% threshold
      
      // Update checkpoint progress
      await saveCheckpointProgress(
        submission.user_id,
        checkpointId,
        score,
        passed
      );
      
      console.log(`✅ Updated checkpoint progress: ${submission.user_id}, score: ${score}%, passed: ${passed}`);
      
      // If passed, check if we should unlock the next topic
      if (passed && submission.topic_id) {
        await checkAndUnlockNextTopic(submission.user_id, submission.topic_id);
      }
      
    } catch (error) {
      console.error('❌ Error updating student progress:', error);
    }
  };

  // Add this function too
  const checkAndUnlockNextTopic = async (userId: string, currentTopicId: string) => {
    try {
      // Get all topics in the same subject
      const { data: currentTopic } = await supabase
        .from('topics')
        .select('subject_id, sort_order')
        .eq('id', currentTopicId)
        .single();
      
      if (!currentTopic) return;
      
      // Get the next topic in sequence
      const { data: nextTopic } = await supabase
        .from('topics')
        .select('id, title')
        .eq('subject_id', currentTopic.subject_id)
        .eq('sort_order', (currentTopic.sort_order || 0) + 1)
        .single();
      
      if (nextTopic) {
        console.log(`✅ Unlocking next topic: ${nextTopic.title} for user ${userId}`);
        // Store unlock status in user_topic_access table
        const { error } = await supabase
          .from('user_topic_access')
          .upsert({
            user_id: userId,
            topic_id: nextTopic.id,
            unlocked: true,
            unlocked_at: new Date().toISOString()
          }, { onConflict: 'user_id,topic_id' });
        
        if (error) {
          console.error('Error saving unlock status:', error);
        }
      }
    } catch (error) {
      console.error('Error checking next topic:', error);
    }
  };

  const handleTeacherGrade = async () => {
    if (!selectedTheory || !currentUser) return;
    
    try {
      await teacherGradeTheoryAnswer(
        selectedTheory.id,
        gradingScore,
        teacherFeedback,
        currentUser.username
      );
      
      // ✅ ADD THIS: Update student progress after grading
      await updateStudentProgressAfterGrading(selectedTheory, gradingScore);
      
      // Update local state
      setTheorySubmissions(prev => prev.map(s => 
        s.id === selectedTheory.id 
          ? { 
              ...s, 
              teacher_score: gradingScore, 
              teacher_feedback: teacherFeedback,
              graded_by: currentUser.username,
              status: 'teacher_graded' as const 
            }
          : s
      ));
      
      alert('Grade submitted successfully!');
      setSelectedTheory(null);
      setTeacherFeedback('');
    } catch (error) {
      console.error('Grading error:', error);
      alert('Failed to submit grade.');
    }
  };

  const handleApproveGrade = async (submission: TheorySubmission) => {
    if (!currentUser || !submission.ai_suggested_score) return;
    
    try {
      await approveTheoryGrade(
        submission.id,
        submission.ai_suggested_score,
        'AI grade approved by teacher.',
        currentUser.username
      );
      
      // Update local state
      setTheorySubmissions(prev => prev.map(s => 
        s.id === submission.id 
          ? { ...s, status: 'approved' as const }
          : s
      ));
      
      alert('Grade approved and finalized!');
    } catch (error) {
      console.error('Approval error:', error);
      alert('Failed to approve grade.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Assessment & Theory Grading</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('assessments')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'assessments'
                ? 'bg-cyan-600 text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            MCQ Assessments
          </button>
          <button
            onClick={() => setActiveTab('theory')}
            className={`px-4 py-2 rounded-lg transition relative ${
              activeTab === 'theory'
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            Theory Submissions
            {theorySubmissions.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {theorySubmissions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'assessments' ? (
        // Original assessments view
        <div className="grid gap-4">
          {assessments.map(assessment => {
            const stats = getAssessmentStats(assessment.id);
            
            return (
              <div key={assessment.id} className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{assessment.title}</h3>
                    <p className="text-white/50 text-sm">
                      {assessment.subject} • Grade {assessment.targetGrade} • {assessment.questions.length} questions
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button className="p-2 bg-cyan-600/20 text-cyan-400 rounded-lg hover:bg-cyan-600/40">
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(assessment.id)}
                      className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/40"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-black/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                      <Users size={16} /> Total Submissions
                    </div>
                    <div className="text-2xl font-bold text-white">{stats.totalSubmissions}</div>
                  </div>
                  
                  <div className="bg-black/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                      <BarChart size={16} /> Average Score
                    </div>
                    <div className={`text-2xl font-bold ${
                      stats.averageScore >= 70 ? 'text-green-400' : 
                      stats.averageScore >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {stats.averageScore}%
                    </div>
                  </div>
                  
                  <div className="bg-black/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                      <Eye size={16} /> Graded
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {stats.gradedSubmissions}/{stats.totalSubmissions}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Theory submissions grading view
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Submission list */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="text-purple-400" /> Pending Theory Submissions
              </h3>
              
              <div className="space-y-3">
                {theorySubmissions.length === 0 ? (
                  <div className="text-center py-8 text-white/40 italic">
                    No pending theory submissions.
                  </div>
                ) : (
                  theorySubmissions.map(sub => (
                    <div
                      key={sub.id}
                      className={`p-4 rounded-lg cursor-pointer transition ${
                        selectedTheory?.id === sub.id
                          ? 'bg-cyan-600/20 border border-cyan-500/50'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                      onClick={() => {
                        setSelectedTheory(sub);
                        setGradingScore(sub.ai_suggested_score || sub.teacher_score || 85);
                        setTeacherFeedback(sub.teacher_feedback || '');
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-semibold">
                              {sub.user?.username || 'Student'}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              sub.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              sub.status === 'ai_graded' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {sub.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <p className="text-white/70 text-sm truncate">
                            {sub.topic?.title || 'Topic'} • Checkpoint {sub.checkpoint?.checkpoint_number || '?'}
                          </p>
                          <p className="text-white/50 text-xs mt-1">
                            Submitted: {new Date(sub.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        {sub.ai_suggested_score && (
                          <div className="text-right">
                            <div className="text-lg font-bold text-purple-400">
                              {sub.ai_suggested_score}%
                            </div>
                            <div className="text-xs text-white/50">AI Suggested</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          {/* Right column: Grading interface */}
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Grade Submission</h3>
              
              {!selectedTheory ? (
                <div className="text-center py-8 text-white/40 italic">
                  Select a submission to grade
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white/60 text-sm mb-1">Question</label>
                      <div className="bg-black/20 p-3 rounded text-white text-sm">
                        {selectedTheory.question_text}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-white/60 text-sm mb-1">Student Answer</label>
                      <div className="bg-black/20 p-3 rounded text-white text-sm whitespace-pre-wrap">
                        {selectedTheory.student_answer}
                      </div>
                    </div>
                    
                    {selectedTheory.ai_suggested_score && (
                      <div className="bg-purple-500/10 border border-purple-500/30 p-3 rounded">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-purple-400 font-bold">AI Suggested Score</div>
                            <div className="text-white/70 text-sm">
                              {selectedTheory.ai_suggested_score}%
                            </div>
                          </div>
                          <button
                            onClick={() => handleApproveGrade(selectedTheory)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm flex items-center gap-1"
                          >
                            <Check size={14} /> Approve
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-white/60 text-sm mb-1">Score (0-100)</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={gradingScore}
                        onChange={(e) => setGradingScore(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-center text-2xl font-bold text-cyan-400 mt-2">
                        {gradingScore}%
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-white/60 text-sm mb-1">Feedback</label>
                      <RestrictedTextArea
                        className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm h-32"
                        value={teacherFeedback}
                        onChange={(e) => setTeacherFeedback(e.target.value)}
                        placeholder="Provide constructive feedback..."
                        restrictPaste={true}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAiGrade(selectedTheory)}
                        disabled={aiGrading}
                        className="flex-1 py-2 bg-purple-600 text-white rounded font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Sparkles size={16} />
                        {aiGrading ? 'AI Grading...' : 'AI Auto-Grade'}
                      </button>
                      
                      <button
                        onClick={handleTeacherGrade}
                        className="flex-1 py-2 bg-cyan-600 text-white rounded font-bold flex items-center justify-center gap-2"
                      >
                        <Check size={16} /> Submit Grade
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Stats */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h4 className="text-white font-bold mb-3">Grading Stats</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/60">Pending</span>
                  <span className="text-yellow-400 font-bold">
                    {theorySubmissions.filter(s => s.status === 'pending').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">AI Graded</span>
                  <span className="text-purple-400 font-bold">
                    {theorySubmissions.filter(s => s.status === 'ai_graded').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Teacher Graded</span>
                  <span className="text-green-400 font-bold">
                    {theorySubmissions.filter(s => s.status === 'teacher_graded').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Approved</span>
                  <span className="text-cyan-400 font-bold">
                    {theorySubmissions.filter(s => s.status === 'approved').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};