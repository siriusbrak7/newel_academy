// src/components/CourseSystem/StudentAssessmentList.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Assessment, Submission } from '../../types';
import { getAssessmentsLight, getAssessmentQuestions, getSubmissions, prefetchAssessmentQuestions } from '../../services/storageService';
import { QuizInterface } from './QuizInterface';
import { ArrowLeft, Clock, List, CheckCircle, Brain, FileText, Loader2 } from 'lucide-react';

interface StudentAssessmentListProps {
  user: User;
}

export const StudentAssessmentList: React.FC<StudentAssessmentListProps> = ({ user }) => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [pendingAssessments, setPendingAssessments] = useState<Assessment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAssessmentId, setLoadingAssessmentId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [listHeight, setListHeight] = useState(600);
  const navigate = useNavigate();

  useEffect(() => {
    refreshData();
  }, [user.gradeLevel]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;

    const handleScroll = () => setScrollTop(node.scrollTop);
    const handleResize = () => setListHeight(node.clientHeight || 600);

    handleResize();
    node.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    return () => {
      node.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const refreshData = async () => {
    try {
      setLoading(true);
      const all = await getAssessmentsLight();
      const userAssessments = all.filter(a => 
        a.targetGrade === 'all' || a.targetGrade === user.gradeLevel
      );
      setAssessments(userAssessments);
      
      const subs = await getSubmissions();
      setSubmissions(subs);
      
      const pending = userAssessments.filter(a =>
        !subs.some(s => s.assessmentId === a.id && s.username === user.username)
      );
      setPendingAssessments(pending.slice(0, 3));
    } catch (error) {
      console.error('Error loading assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (id: string) => {
    const sub = submissions.find(s => s.assessmentId === id && s.username === user.username);
    if (!sub) return 'pending';
    return sub.graded ? 'graded' : 'submitted';
  };

  const getScore = (id: string) => {
    const sub = submissions.find(s => s.assessmentId === id && s.username === user.username);
    return sub?.score;
  };

  const getFeedback = (id: string) => {
    const sub = submissions.find(s => s.assessmentId === id && s.username === user.username);
    return sub?.feedback;
  };

  const estimatedItemHeight = 180;
  const overscan = 4;
  const totalItems = assessments.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / estimatedItemHeight) - overscan);
  const visibleCount = Math.ceil(listHeight / estimatedItemHeight) + overscan * 2;
  const endIndex = Math.min(totalItems, startIndex + visibleCount);
  const visibleAssessments = useMemo(
    () => assessments.slice(startIndex, endIndex),
    [assessments, startIndex, endIndex]
  );

  useEffect(() => {
    if (!activeQuiz) return;
    const idx = assessments.findIndex(a => a.id === activeQuiz.id);
    const next = idx >= 0 ? assessments[idx + 1] : undefined;
    if (next?.id) {
      prefetchAssessmentQuestions(next.id);
    }
  }, [activeQuiz, assessments]);

  const startAssessment = async (assessment: Assessment) => {
    try {
      setLoadingAssessmentId(assessment.id);
      const questions = await getAssessmentQuestions(assessment.id);
      if (!questions || questions.length === 0) {
        alert('No questions available for this assessment.');
        return;
      }
      setActiveQuiz({ ...assessment, questions });
    } catch (error) {
      console.error('Error loading assessment questions:', error);
      alert('Failed to load assessment questions.');
    } finally {
      setLoadingAssessmentId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {activeQuiz && (
        <QuizInterface 
          title={activeQuiz.title}
          questions={activeQuiz.questions}
          onComplete={() => { 
            setActiveQuiz(null); 
            refreshData();
          }}
          passThreshold={50}
          onClose={() => {
            setActiveQuiz(null);
            refreshData();
          }}
          isAssessment={true}
          assessmentId={activeQuiz.id}
          username={user.username}
        />
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">My Assignments</h2>
          <p className="text-white/60">Teacher Assigned Quizzes & Written Tasks</p>
        </div>
        <button 
          onClick={() => navigate('/student-dashboard')} 
          className="text-white/50 hover:text-white flex items-center gap-2"
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
      </div>

      <div
        ref={listRef}
        className="grid gap-4 max-h-[70vh] overflow-y-auto pr-1"
      >
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse">
                <div className="h-6 w-64 bg-white/10 rounded mb-3"></div>
                <div className="h-4 w-40 bg-white/10 rounded"></div>
              </div>
            ))}
          </div>
        )}

        {!loading && assessments.length === 0 && (
          <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
            <FileText size={48} className="mx-auto text-white/20 mb-4"/>
            <p className="text-white/50">No assignments assigned yet.</p>
          </div>
        )}
        
        {!loading && (
          <div style={{ height: totalItems * estimatedItemHeight }}>
            <div style={{ transform: `translateY(${startIndex * estimatedItemHeight}px)` }}>
              {visibleAssessments.map(assessment => {
                const status = getStatus(assessment.id);
                const score = getScore(assessment.id);
                const teacherFeedback = getFeedback(assessment.id);
                const mcqCount = assessment.mcqCount ?? 0;
                const theoryCount = assessment.theoryCount ?? 0;
                const totalQuestions = assessment.questionCount ?? (mcqCount + theoryCount);
                const estimatedTime = Math.ceil((mcqCount * 25) / 60) + (theoryCount * 20);

                return (
                  <div key={assessment.id} className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col gap-4 hover:bg-white/10 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-white">{assessment.title}</h3>
                        <div className="flex gap-4 mt-1 text-sm text-white/50">
                          <span>{assessment.subject}</span>
                          <span>â€¢</span>
                          <span className="flex items-center gap-1">
                            <List size={14}/> {totalQuestions} Questions
                          </span>
                          <span>â€¢</span>
                          <span className="text-cyan-400 flex items-center gap-1">
                            <Clock size={14}/> ~{estimatedTime} mins
                          </span>
                        </div>
                      </div>
                      
                      {status === 'pending' && (
                        <button 
                          onClick={() => startAssessment(assessment)}
                          disabled={loadingAssessmentId === assessment.id}
                          className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {loadingAssessmentId === assessment.id ? (
                            <>
                              <Loader2 size={16} className="animate-spin" /> Loading...
                            </>
                          ) : (
                            'Start Now'
                          )}
                        </button>
                      )}
                      
                      {status === 'submitted' && (
                        <div className="flex items-center gap-2 text-yellow-400 bg-yellow-500/10 px-4 py-2 rounded-lg border border-yellow-500/30">
                          <Clock size={18}/> Awaiting Grade
                        </div>
                      )}
          
                      {status === 'graded' && (
                        <div className="flex items-center gap-2 text-green-400 bg-green-500/10 px-4 py-2 rounded-lg border border-green-500/30">
                          <CheckCircle size={18}/> Score: {score}%
                        </div>
                      )}
                    </div>

                    {status === 'graded' && teacherFeedback && (
                      <div className="bg-black/30 p-4 rounded-lg border-l-4 border-purple-500 mt-2">
                        <h4 className="text-xs font-bold text-purple-300 uppercase mb-2 flex items-center gap-2">
                          <Brain size={14}/> Feedback / Grading Report
                        </h4>
                        <div className="text-white/80 text-sm whitespace-pre-wrap font-mono">
                          {teacherFeedback}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
