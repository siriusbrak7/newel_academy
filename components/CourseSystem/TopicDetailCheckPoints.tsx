import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCheckpointQuestions } from '../../services/checkpointService';
import { User, Material, Question } from '../../types';
import { 
  getStoredSession, 
  getTopicCheckpoints,
  getStudentCheckpointProgress,
  saveCheckpointProgress,
  getTopicFinalAssessment,
  updateTopicProgress,
  getCoursesLight,
  getTopicMaterials, // OPTIMIZED: On-demand materials loading
  notifyTopic80PercentComplete,
  getStudentCourseHistory,
  getStudentAssessmentFeedback,
  getStudentSubjectPerformance // For quick stats
} from '../../services/storageService';
import { getAITutorResponse } from '../../services/geminiService';
import { supabase } from '../../services/supabaseClient';
import { 
  ArrowLeft, FileText, Play, CheckCircle, Lock, Link as LinkIcon, 
  File, Wand2, MessageCircle, ChevronRight, Brain, Check, Clock,
  Trophy, BookOpen, Target, BarChart3, Zap, AlertCircle, RefreshCw, Star,
  Loader2, ExternalLink, ChevronDown, Users, Award, TrendingUp
} from 'lucide-react';
import { CheckpointQuiz } from './CheckpointQuiz';
import { QuizInterface } from './QuizInterface';

// Quick user session helper
const getCurrentUser = () => {
  try {
    const stored = localStorage.getItem('newel_currentUser');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// Cache for topic data
const topicCache = new Map();

export const TopicDetailCheckpoints: React.FC = () => {
  const { subject, topicId } = useParams<{ subject: string; topicId: string }>();
  const navigate = useNavigate();
  
  const [user, setUser] = useState<User | null>(null);
  const [topic, setTopic] = useState<any>(null);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [checkpointProgress, setCheckpointProgress] = useState<Record<string, any>>({});
  const [finalAssessment, setFinalAssessment] = useState<any>(null);
  const [finalAssessmentQuestions, setFinalAssessmentQuestions] = useState<Question[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeCheckpoint, setActiveCheckpoint] = useState<any>(null);
  const [activeFinalQuiz, setActiveFinalQuiz] = useState(false);
  const [showAiAsk, setShowAiAsk] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  // Loading states - SEPARATED for better UX
  const [loading, setLoading] = useState({
    essential: true,    // User, topic basics, checkpoints
    materials: false,   // Materials (lazy load)
    finalAssessment: false,
    progress: false
  });
  
  const [error, setError] = useState<string | null>(null);
  
  // Final assessment completion state
  const [hasPassedFinalAssessment, setHasPassedFinalAssessment] = useState(false);
  const [finalAssessmentScore, setFinalAssessmentScore] = useState(0);
  const [finalAssessmentCompletionDate, setFinalAssessmentCompletionDate] = useState('');

  // Store checkpoint results for review
  const [checkpointResults, setCheckpointResults] = useState<Record<string, any>>({});
  const [showReviewForCheckpoint, setShowReviewForCheckpoint] = useState<string | null>(null);

  // Materials lazy loading state
  const [materialsLoaded, setMaterialsLoaded] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);

  // =====================================================
  // OPTIMIZATION 1: CACHE CHECKPOINT PROGRESS
  // =====================================================
  const getCachedProgress = useCallback(async (username: string, topicId: string) => {
    const cacheKey = `progress_${username}_${topicId}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // 2 minute cache for progress
      if (Date.now() - timestamp < 2 * 60 * 1000) {
        return data;
      }
    }
    
    const progress = await getStudentCheckpointProgress(username, topicId);
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: progress,
      timestamp: Date.now()
    }));
    
    return progress;
  }, []);

  // =====================================================
  // OPTIMIZATION 2: LOAD ESSENTIAL DATA FIRST
  // =====================================================
  useEffect(() => {
    const loadEssentialData = async () => {
      console.time('loadTopicEssentialData');
      
      try {
        setError(null);
        
        // 1. Get user (fast - from localStorage)
        const storedUser = getStoredSession();
        if (!storedUser) {
          navigate('/');
          return;
        }
        setUser(storedUser);

        // 2. Load basic topic info (NO MATERIALS initially)
        console.log(`📥 Loading topic basics: ${topicId} in ${subject}...`);
        const courses = await getCoursesLight();
        const topicData = courses[subject!]?.[topicId!];
        
        if (!topicData) {
          navigate('/courses');
          return;
        }
        
        // Set basic topic data WITHOUT materials
        setTopic({
          ...topicData,
          materials: [] // Empty initially
        });

        // 3. Load checkpoints and progress in parallel
        const [checkpointsData, progressData] = await Promise.all([
          getTopicCheckpoints(topicId!),
          getCachedProgress(storedUser.username, topicId!)
        ]);
        
        if (!checkpointsData || checkpointsData.length === 0) {
          setError('No checkpoints found for this topic. Please contact your teacher.');
          setCheckpoints([]);
        } else {
          // Filter out checkpoint 5 (theory) - handle separately
          const checkpointsToShow = checkpointsData.filter(cp => cp.checkpoint_number !== 5);
          setCheckpoints(checkpointsToShow);
        }

        setCheckpointProgress(progressData);

        // 4. Check unlock status (checkpoint 4 passed)
        const checkpoint4 = checkpointsData?.find((cp: any) => cp.checkpoint_number === 4);
        if (checkpoint4) {
          const checkpoint4Progress = progressData[checkpoint4.id];
          setIsUnlocked(checkpoint4Progress?.passed || false);
        }

        // 5. Check final assessment status
        const checkpoint5 = checkpointsData?.find((cp: any) => cp.checkpoint_number === 5);
        if (checkpoint5) {
          const checkpoint5Progress = progressData[checkpoint5.id];
          if (checkpoint5Progress) {
            setHasPassedFinalAssessment(checkpoint5Progress.passed || false);
            setFinalAssessmentScore(checkpoint5Progress.score || 0);
            if (checkpoint5Progress.completed_at) {
              setFinalAssessmentCompletionDate(new Date(checkpoint5Progress.completed_at).toLocaleDateString());
            }
          }
        }

        setLoading(prev => ({ ...prev, essential: false }));
        console.timeEnd('loadTopicEssentialData');
        console.log('✅ Essential topic data loaded');

        // 6. Lazy load materials after 500ms delay (non-blocking)
        setTimeout(() => {
          loadTopicMaterials();
        }, 500);

      } catch (error) {
        console.error('❌ Error loading topic:', error);
        setError('Failed to load topic data. Please try again.');
        setLoading(prev => ({ ...prev, essential: false }));
      }
    };

    loadEssentialData();
  }, [subject, topicId, navigate, getCachedProgress]);

  // =====================================================
  // OPTIMIZATION 3: LAZY LOAD MATERIALS
  // =====================================================
  const loadTopicMaterials = async () => {
    if (!topicId || materialsLoaded) return;
    
    console.time('loadTopicMaterials');
    setLoading(prev => ({ ...prev, materials: true }));
    
    try {
      console.log(`📚 Lazy loading materials for topic: ${topicId}`);
      const loadedMaterials = await getTopicMaterials(topicId);
      
      setMaterials(loadedMaterials);
      setMaterialsLoaded(true);
      
      // Update topic with materials
      setTopic(prev => ({
        ...prev,
        materials: loadedMaterials
      }));
      
      console.timeEnd('loadTopicMaterials');
      console.log(`✅ Loaded ${loadedMaterials.length} materials`);
      
    } catch (error) {
      console.error('❌ Error loading materials:', error);
    } finally {
      setLoading(prev => ({ ...prev, materials: false }));
    }
  };

  // =====================================================
  // OPTIMIZATION 4: LAZY LOAD FINAL ASSESSMENT
  // =====================================================
  const loadFinalAssessment = async () => {
    if (finalAssessment || !topicId) return;
    
    setLoading(prev => ({ ...prev, finalAssessment: true }));
    
    try {
      const finalAssess = await getTopicFinalAssessment(topicId);
      setFinalAssessment(finalAssess);

      if (finalAssess) {
        await loadFinalAssessmentQuestions(finalAssess.id);
      }
    } catch (error) {
      console.error('❌ Error loading final assessment:', error);
    } finally {
      setLoading(prev => ({ ...prev, finalAssessment: false }));
    }
  };

  // Load final assessment questions
  const loadFinalAssessmentQuestions = async (finalAssessmentId: string) => {
    try {
      const { data: questionsData, error } = await supabase
        .from('final_assessment_questions')
        .select(`
          question_id,
          questions!inner (
            id, text, type, difficulty, correct_answer, options, model_answer, explanation
          )
        `)
        .eq('final_assessment_id', finalAssessmentId)
        .order('sort_order', { ascending: true })
        .limit(10); // Limit to 10 questions

      if (error) throw error;

      if (questionsData && questionsData.length > 0) {
        const formattedQuestions: Question[] = questionsData
          .map(item => {
            const q = Array.isArray(item.questions) ? item.questions[0] : item.questions;
            if (!q) return null;
            
            return {
              id: q.id,
              text: q.text || 'Question text not available',
              type: (q.type as 'MCQ' | 'THEORY') || 'THEORY',
              difficulty: q.difficulty || 'AS',
              topic: topic?.title || 'General',
              correctAnswer: q.correct_answer || '',
              options: q.options || [],
              modelAnswer: q.model_answer || '',
              explanation: q.explanation || ''
            };
          })
          .filter((q): q is NonNullable<typeof q> => q !== null);
          
        if (formattedQuestions.length > 0) {
          setFinalAssessmentQuestions(formattedQuestions);
        }
      }
    } catch (error) {
      console.error('❌ Error loading final questions:', error);
    }
  };

  // =====================================================
  // OPTIMIZATION 5: PROGRESS CALCULATION (MEMOIZED)
  // =====================================================
  const progress = useMemo(() => {
    if (!checkpoints.length) {
      return { passed: 0, total: 0, percentage: 0, isTopicComplete: false };
    }
    
    const totalStandardCheckpoints = checkpoints.length;
    let passedStandardCount = 0;
    
    checkpoints.forEach(cp => {
      const prog = checkpointProgress[cp.id];
      if (prog?.passed) {
        passedStandardCount++;
      }
    });

    const standardRatio = totalStandardCheckpoints > 0 ? (passedStandardCount / totalStandardCheckpoints) : 0;
    const standardPercentage = standardRatio * 80;
    const finalPercentage = hasPassedFinalAssessment ? 20 : 0;
    const totalPercentage = Math.round(standardPercentage + finalPercentage);
    const isTopicComplete = hasPassedFinalAssessment && (passedStandardCount === totalStandardCheckpoints);

    return { 
      passed: passedStandardCount, 
      total: totalStandardCheckpoints, 
      percentage: totalPercentage,
      isTopicComplete
    };
  }, [checkpoints, checkpointProgress, hasPassedFinalAssessment]);

  // =====================================================
  // OPTIMIZATION 6: CHECKPOINT HANDLERS
  // =====================================================
  const handleCheckpointComplete = async (
    checkpointId: string, 
    score: number, 
    passed: boolean,
    results?: any
  ) => {
    if (!user || !user.username) {
      alert('User session error. Please log in again.');
      return;
    }

    try {
      // Cache results for review
      if (results) {
        setCheckpointResults(prev => ({
          ...prev,
          [checkpointId]: { score, passed, results }
        }));
      }
      
      // Save progress
      await saveCheckpointProgress(user.username, checkpointId, score, passed);
      
      // Update local progress (clear cache)
      const progressKey = `progress_${user.username}_${topicId}`;
      sessionStorage.removeItem(progressKey);
      
      const newProgress = await getStudentCheckpointProgress(user.username, topicId!);
      setCheckpointProgress(newProgress);

      // Check if checkpoint 4 was passed
      const completedCheckpoint = checkpoints.find(cp => cp.id === checkpointId);
      const isCheckpoint4 = completedCheckpoint?.checkpoint_number === 4;

      if (isCheckpoint4 && passed) {
        setIsUnlocked(true);
        
        // Notify topic progress
        try {
          const progressPercentage = Math.round((Object.keys(newProgress).filter(id => newProgress[id]?.passed).length / checkpoints.length) * 100);
          if (progressPercentage >= 80) {
            await notifyTopic80PercentComplete(
              user.username,
              topic.title,
              subject!,
              progressPercentage
            );
          }
        } catch (notifyErr) {
          console.error('Failed to send notification:', notifyErr);
        }
      }

      if (passed) {
        // Quick success feedback
        const event = new CustomEvent('showToast', {
          detail: { message: '🎉 Checkpoint Passed!', type: 'success' }
        });
        window.dispatchEvent(event);
      }

    } catch (error) {
      console.error('Error saving progress:', error);
      alert('Failed to save progress.');
    }
  };

  const handleFinalAssessmentComplete = async (score: number, passed: boolean) => {
    if (!user || !subject || !topicId) return;

    try {
      setHasPassedFinalAssessment(passed);
      setFinalAssessmentScore(score);
      setFinalAssessmentCompletionDate(new Date().toLocaleDateString());

      // Find checkpoint 5 and save progress
      const checkpointsData = await getTopicCheckpoints(topicId);
      const checkpoint5 = checkpointsData.find(cp => cp.checkpoint_number === 5);
      
      if (checkpoint5) {
        await saveCheckpointProgress(user.username, checkpoint5.id, score, passed);
        const progressData = await getStudentCheckpointProgress(user.username, topicId);
        setCheckpointProgress(progressData);
      }

      await updateTopicProgress(user.username, subject!, topicId!, {
        mainAssessmentScore: score,
        mainAssessmentPassed: passed
      });

      if (passed) {
        const event = new CustomEvent('showToast', {
          detail: { message: '🎉 Topic Completed! Final Assessment Passed!', type: 'success' }
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error('Error updating final assessment:', error);
    }
  };

  // =====================================================
  // OPTIMIZATION 7: START CHECKPOINT WITH CACHED QUESTIONS
  // =====================================================
  const startCheckpoint = async (checkpoint: any) => {
    try {
      const allCheckpointQuestions = await getCheckpointQuestions(checkpoint.id);
      
      if (!allCheckpointQuestions || allCheckpointQuestions.length === 0) {
        alert('No questions available for this checkpoint.');
        return;
      }
      
      // Determine number of questions based on checkpoint type
      let questionsToShow = checkpoint.checkpoint_number === 4 ? 20 : 5;
      let questionsToUse = allCheckpointQuestions;
      
      // Randomize if we have more questions than needed
      if (allCheckpointQuestions.length > questionsToShow) {
        const shuffled = [...allCheckpointQuestions];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        questionsToUse = shuffled.slice(0, questionsToShow);
      }
      
      const formattedQuestions: Question[] = questionsToUse.map(q => ({
        id: q.id,
        text: q.text,
        type: q.type || 'MCQ',
        difficulty: q.difficulty || 'IGCSE',
        topic: topic?.title || '',
        options: q.options || [],
        correctAnswer: q.correctAnswer || '',
        explanation: q.explanation || ''
      }));
      
      setActiveCheckpoint({
        ...checkpoint,
        questions: formattedQuestions
      });
      
    } catch (error) {
      console.error('Error starting checkpoint:', error);
      alert('Failed to load checkpoint.');
    }
  };

  const reviewCheckpoint = (checkpointId: string) => {
    setShowReviewForCheckpoint(checkpointId);
  };

  const startFinalAssessment = async () => {
    if (!isUnlocked) {
      alert('You must pass Checkpoint 4 (MCQ) first!');
      return;
    }
    
    // Lazy load final assessment if not loaded
    if (!finalAssessment) {
      await loadFinalAssessment();
    }
    
    if (finalAssessmentQuestions.length === 0) {
      alert('No questions available for final assessment yet.');
      return;
    }
    
    setActiveFinalQuiz(true);
  };

  // =====================================================
  // OPTIMIZATION 8: AI TUTOR (DEBOUNCED)
  // =====================================================
  const handleAskAi = async () => {
    if (!aiQuestion.trim() || !topic || aiLoading) return;
    
    setAiLoading(true);
    try {
      const resp = await getAITutorResponse(
        aiQuestion, 
        `Topic: ${topic.title}. Student level: ${user?.gradeLevel}`
      );
      setAiAnswer(resp);
    } catch (error) {
      console.error('Error:', error);
      setAiAnswer("Sorry, I couldn't process your question.");
    } finally {
      setAiLoading(false);
    }
  };

  // =====================================================
  // RENDER LOADING STATES
  // =====================================================
  if (loading.essential) {
    return (
      <div className="max-w-6xl mx-auto p-8 space-y-6">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-white/10 rounded-3xl p-8">
          <div className="flex justify-between items-start">
            <div className="space-y-3">
              <div className="h-12 w-96 bg-white/10 rounded-lg animate-pulse"></div>
              <div className="h-6 w-64 bg-white/5 rounded animate-pulse"></div>
            </div>
            <div className="h-16 w-32 bg-white/10 rounded-xl animate-pulse"></div>
          </div>
        </div>
        
        {/* Materials Section Skeleton */}
        <div className="space-y-4">
          <div className="h-8 w-48 bg-white/10 rounded animate-pulse"></div>
          <div className="grid gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/5 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white/10 rounded animate-pulse"></div>
                  <div className="h-6 w-48 bg-white/10 rounded animate-pulse"></div>
                </div>
                <div className="h-8 w-20 bg-white/10 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-white/60">Loading topic...</p>
        </div>
      </div>
    );
  }

  if (error || !user || !topic) {
    return (
      <div className="max-w-6xl mx-auto p-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <p className="text-white text-xl">{error || 'Topic not found'}</p>
        <button 
          onClick={() => navigate('/courses')} 
          className="mt-4 text-cyan-400 hover:text-cyan-300"
        >
          Back to Courses
        </button>
      </div>
    );
  }

  // =====================================================
  // MAIN RENDER
  // =====================================================
  return (
    <div className="max-w-6xl mx-auto pb-20 relative">
      {/* Checkpoint Quiz Modal */}
      {activeCheckpoint && user && (
        <CheckpointQuiz
          checkpointId={activeCheckpoint.id}
          checkpointTitle={activeCheckpoint.title}
          questions={activeCheckpoint.questions}
          passThreshold={activeCheckpoint.required_score || 80}
          onComplete={(score, passed, results) => 
            handleCheckpointComplete(activeCheckpoint.id, score, passed, results)
          }
          onClose={() => setActiveCheckpoint(null)}
          username={user.username}
          checkpoint={activeCheckpoint}
          topicId={topicId}
        />
      )}

      {/* Final Assessment Quiz Modal */}
      {activeFinalQuiz && user && finalAssessment && (
        <QuizInterface
          title={`${topic.title} - Final Assessment`}
          questions={finalAssessmentQuestions}
          passThreshold={finalAssessment.pass_percentage || 80}
          onComplete={handleFinalAssessmentComplete}
          onClose={() => setActiveFinalQuiz(false)}
          isCourseFinal={true}
          assessmentId={finalAssessment.id}
          username={user.username}
        />
      )}

      {/* Review Modal */}
      {showReviewForCheckpoint && checkpointResults[showReviewForCheckpoint] && (
        <CheckpointQuiz
          checkpointId={showReviewForCheckpoint}
          checkpointTitle={`Review: ${checkpoints.find(cp => cp.id === showReviewForCheckpoint)?.title || 'Checkpoint'}`}
          questions={checkpoints.find(cp => cp.id === showReviewForCheckpoint)?.questions || []}
          passThreshold={checkpoints.find(cp => cp.id === showReviewForCheckpoint)?.required_score || 80}
          onComplete={() => {}}
          onClose={() => setShowReviewForCheckpoint(null)}
          username={user.username}
          checkpoint={checkpoints.find(cp => cp.id === showReviewForCheckpoint)!}
          topicId={topicId}
          mode="review"
          reviewResults={checkpointResults[showReviewForCheckpoint]}
        />
      )}

      {/* AI Sidebar */}
      {showAiAsk && (
        <div className="fixed inset-y-0 right-0 w-80 bg-slate-900 border-l border-white/10 p-6 z-40 shadow-2xl flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">Ask Newel</h3>
            <button onClick={() => setShowAiAsk(false)} className="text-white/50 hover:text-white">
              <ChevronRight />
            </button>
          </div>
          <div className="flex-grow overflow-y-auto mb-4 text-sm text-white/80 whitespace-pre-wrap">
            {aiAnswer || <span className="opacity-50">Ask Newel about {topic.title}...</span>}
          </div>
          <div className="flex gap-2">
            <input 
              className="flex-grow bg-white/5 border border-white/10 rounded px-2 py-1 text-white" 
              value={aiQuestion} 
              onChange={e => setAiQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAskAi()}
              placeholder="Type your question..."
            />
            <button 
              onClick={handleAskAi} 
              disabled={aiLoading}
              className="bg-cyan-600 p-2 rounded text-white disabled:opacity-50"
            >
              {aiLoading ? <Loader2 className="animate-spin" size={16} /> : <MessageCircle size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <button 
          onClick={() => navigate('/courses')} 
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} /> Back to Courses
        </button>
        <button 
          onClick={() => setShowAiAsk(!showAiAsk)} 
          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
        >
          <Wand2 size={16} className="text-purple-400"/> Ask Newel
        </button>
      </div>

      {/* Topic Title Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-white/10 rounded-3xl p-8 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              {topic.title}
              {progress.isTopicComplete && <CheckCircle className="text-green-400" size={32} />}
            </h1>
            <p className="text-white/60 text-lg mb-4">{topic.description}</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-white/50">Grade {topic.gradeLevel}</span>
              <span className="text-white/50">•</span>
              <span className="text-white/50">{subject}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <div className={`border px-4 py-2 rounded-xl mb-2 flex flex-col items-center ${
              progress.isTopicComplete 
                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
            }`}>
              <div className="text-3xl font-bold">{Math.round(progress.percentage)}%</div>
              <div className="text-xs uppercase tracking-wider font-bold">
                {progress.isTopicComplete ? 'Mastered' : 'Progress'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Column - Materials & Checkpoints */}
        <div className="md:col-span-2 space-y-8">
          {/* Materials Section with Lazy Loading */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="text-cyan-400"/> Materials
                {loading.materials && (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                )}
              </h2>
              {!materialsLoaded && !loading.materials && (
                <button 
                  onClick={loadTopicMaterials}
                  className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  Load Materials
                </button>
              )}
            </div>
            
            {loading.materials ? (
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  <span className="text-white/60">Loading materials...</span>
                </div>
              </div>
            ) : materials.length > 0 ? (
              <div className="grid gap-3">
                {materials.map((m) => (
                  <div key={m.id} className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center justify-between hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded text-white">
                        {m.type === 'file' ? <File size={18}/> : m.type === 'link' ? <LinkIcon size={18}/> : <FileText size={18}/>}
                      </div>
                      <span className="text-white font-medium">{m.title}</span>
                    </div>
                    <a 
                      href={m.content} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-xs bg-cyan-600 px-3 py-1.5 rounded text-white hover:bg-cyan-700 transition-colors flex items-center gap-1"
                    >
                      Open <ExternalLink size={12} />
                    </a>
                  </div>
                ))}
              </div>
            ) : materialsLoaded ? (
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-center">
                <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/60">No materials available</p>
                <p className="text-white/40 text-sm mt-1">Check back later or contact your teacher</p>
              </div>
            ) : (
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-center">
                <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/60">Materials not loaded yet</p>
                <button 
                  onClick={loadTopicMaterials}
                  className="mt-3 text-sm text-cyan-400 hover:text-cyan-300"
                >
                  Click to load materials
                </button>
              </div>
            )}
            
            {/* Biolens Integration for Biology */}
            {subject === 'Biology' && (
              <div className="bg-green-900/20 p-4 rounded-xl border border-green-500/30 mt-4">
                <h4 className="text-green-300 font-bold mb-2 flex items-center gap-2">
                  <Brain size={16} /> Biolens Interactive
                </h4>
                <p className="text-white/70 text-sm mb-3">Interactive 3D biology models and simulations</p>
                <a 
                  href="https://biolens-zhgf.onrender.com/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm inline-flex items-center gap-2 transition-colors"
                >
                  Open Biolens <ExternalLink size={14} />
                </a>
              </div>
            )}
          </section>

          {/* Detailed How-to Guide */}
          <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white/10 p-2 rounded-lg">
                <BookOpen className="text-cyan-300" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">How to Complete This Topic</h3>
                <p className="text-sm text-white/60">Follow these steps to master this topic</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <h4 className="font-medium text-white mb-1">Study the Materials</h4>
                    <p className="text-sm text-white/70">Access the links provided above. Use Biolens for biology topics.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <h4 className="font-medium text-white mb-1">Complete Checkpoints 1-3</h4>
                    <p className="text-sm text-white/70">Test your understanding with short MCQs after studying.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <h4 className="font-medium text-white mb-1">Master Checkpoint 4</h4>
                    <p className="text-sm text-white/70">Comprehensive MCQ test (20 questions, 80% pass) unlocks Final Assessment.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-sm font-bold">4</div>
                  <div>
                    <h4 className="font-medium text-white mb-1">Final Assessment</h4>
                    <p className="text-sm text-white/70">Complete the theory-based final assessment (80% to pass).</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-yellow-500/20 text-yellow-400 rounded-full flex items-center justify-center text-sm font-bold">5</div>
                  <div>
                    <h4 className="font-medium text-white mb-1">Get Help When Stuck</h4>
                    <p className="text-sm text-white/70">Use "Ask Newel" button for help with difficult concepts.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center text-sm font-bold">6</div>
                  <div>
                    <h4 className="font-medium text-white mb-1">Track Your Progress</h4>
                    <p className="text-sm text-white/70">Monitor completion percentage on the right panel.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-cyan-400">80%</div>
                  <div className="text-white/60">Checkpoints</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-400">20%</div>
                  <div className="text-white/60">Final Assessment</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">80%</div>
                  <div className="text-white/60">Pass Threshold</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-400">222s</div>
                  <div className="text-white/60">Sprint Challenge</div>
                </div>
              </div>
            </div>
          </div>

          {/* Checkpoints Section */}
          <section className="bg-gradient-to-r from-slate-900 to-slate-800 border border-white/10 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Target className="text-purple-400"/> Checkpoints (80%)
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {checkpoints.map((checkpoint) => {
                const progress = checkpointProgress[checkpoint.id];
                const hasResults = checkpointResults[checkpoint.id];
                
                return (
                  <div key={checkpoint.id} className={`p-4 rounded-xl border ${progress?.passed ? 'bg-green-900/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-white">Checkpoint {checkpoint.checkpoint_number}</h3>
                      {progress?.passed && <CheckCircle size={14} className="text-green-400" />}
                    </div>
                    <p className="text-sm text-white/60 mb-4">{checkpoint.title}</p>
                    {checkpoint.checkpoint_number === 4 && (
                      <div className="text-xs bg-cyan-900/20 text-cyan-300 p-2 rounded mb-3">
                        Pass this (80%) to unlock Final Assessment
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => startCheckpoint(checkpoint)}
                        className={`flex-grow py-2 rounded-lg text-sm font-medium ${
                          progress?.passed 
                            ? 'bg-white/10 text-white hover:bg-white/20' 
                            : 'bg-cyan-600 text-white hover:bg-cyan-700'
                        }`}
                      >
                        {progress?.passed ? 'Retake' : 'Start'}
                      </button>
                      
                      {progress?.passed && hasResults && (
                        <button
                          onClick={() => reviewCheckpoint(checkpoint.id)}
                          className="px-3 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-1"
                          title="Review last attempt"
                        >
                          <Brain size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column - Progress & Final */}
        <div className="space-y-6">
          {/* Progress Breakdown */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="text-cyan-400"/> Progress Breakdown
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/60">Checkpoints (Max 80%)</span>
                  <span className="text-white font-bold">
                    {Math.min(80, Math.round((progress.passed / progress.total) * 80))}%
                  </span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-500 transition-all duration-500" 
                    style={{ width: `${(progress.passed / progress.total) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-white/40 mt-1">
                  {progress.passed} of {progress.total} checkpoints passed
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/60">Final Assessment (20%)</span>
                  <span className={`font-bold ${hasPassedFinalAssessment ? 'text-green-400' : 'text-white/30'}`}>
                    {hasPassedFinalAssessment ? '20%' : '0%'}
                  </span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-purple-500 transition-all duration-500`} 
                    style={{ width: hasPassedFinalAssessment ? '100%' : '0%' }} 
                  />
                </div>
                <div className="text-xs text-white/40 mt-1">
                  {hasPassedFinalAssessment ? 'Completed' : 'Not started'}
                </div>
              </div>
            </div>
          </div>

          {/* Final Assessment Card */}
          <div className={`p-6 rounded-2xl border ${isUnlocked ? 'bg-gradient-to-b from-cyan-900/20 to-purple-900/20 border-cyan-500/30' : 'bg-white/5 border-white/10 opacity-70'}`}>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Trophy className="text-yellow-400"/> Final Assessment
            </h3>
            <p className="text-sm text-white/60 mb-4">Complete Theory (20% of grade)</p>
            
            {hasPassedFinalAssessment ? (
              <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-xl text-center mb-3">
                <Star className="text-yellow-400 mx-auto mb-2" size={32} fill="currentColor" />
                <div className="text-green-400 font-bold text-lg">Passed!</div>
                <div className="text-white/60 text-sm">Score: {finalAssessmentScore}%</div>
                <div className="text-white/40 text-xs mt-1">Completed: {finalAssessmentCompletionDate}</div>
              </div>
            ) : isUnlocked ? (
              <button 
                onClick={startFinalAssessment}
                disabled={loading.finalAssessment}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:from-cyan-400 hover:to-purple-500 transition-all disabled:opacity-50"
              >
                {loading.finalAssessment ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Loading...
                  </>
                ) : (
                  <>
                    <Zap size={18} /> Start Final
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2 text-white/40 bg-black/20 p-3 rounded-lg text-sm">
                <Lock size={16} /> Complete Checkpoint 4 First
              </div>
            )}
            
            {isUnlocked && !hasPassedFinalAssessment && (
              <div className="mt-4 text-xs text-white/50">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle size={12} />
                  <span>80% pass required • 60 minute time limit</span>
                </div>
                <div className="flex items-center gap-2">
                  <Brain size={12} />
                  <span>Theory questions • Teacher graded</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="text-green-400"/> Quick Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Topic Progress</span>
                <span className="text-white font-bold">{progress.percentage}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Checkpoints Passed</span>
                <span className="text-cyan-400 font-bold">{progress.passed}/{progress.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Materials Available</span>
                <span className="text-white font-bold">
                  {loading.materials ? '...' : materials.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Final Unlocked</span>
                <span className={`font-bold ${isUnlocked ? 'text-green-400' : 'text-red-400'}`}>
                  {isUnlocked ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Need Help Section */}
          <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 p-5 rounded-2xl">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <MessageCircle className="text-purple-400"/> Need Help?
            </h3>
            <p className="text-white/70 text-sm mb-3">
              Stuck on a concept or question? Get instant help.
            </p>
            <button
              onClick={() => setShowAiAsk(true)}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all flex items-center justify-center gap-2"
            >
              <Wand2 size={16} /> Ask Newel AI Tutor
            </button>
            <div className="mt-3 text-xs text-white/50 text-center">
              Available 24/7 • Instant explanations
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};