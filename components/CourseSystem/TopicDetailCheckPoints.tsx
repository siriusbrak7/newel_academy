import React, { useState, useEffect, useMemo } from 'react';
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
  getCourses,
  notifyTopic80PercentComplete,
  notifyLeaderboardUpdate
} from '../../services/storageService';
import { getAITutorResponse } from '../../services/geminiService';
import { supabase } from '../../services/supabaseClient';
import { 
  ArrowLeft, FileText, Play, CheckCircle, Lock, Link as LinkIcon, 
  File, Wand2, MessageCircle, ChevronRight, Brain, Check, Clock,
  Trophy, BookOpen, Target, BarChart3, Zap, AlertCircle, RefreshCw, Star
} from 'lucide-react';
import { CheckpointQuiz } from './CheckpointQuiz';
import { QuizInterface } from './QuizInterface';


const getCurrentUser = () => {
  try {
    const stored = localStorage.getItem('newel_currentUser');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Final assessment completion state
  const [hasPassedFinalAssessment, setHasPassedFinalAssessment] = useState(false);
  const [finalAssessmentScore, setFinalAssessmentScore] = useState(0);
  const [finalAssessmentCompletionDate, setFinalAssessmentCompletionDate] = useState('');

  // NEW: Store checkpoint results for review
  const [checkpointResults, setCheckpointResults] = useState<Record<string, any>>({});
  const [showReviewForCheckpoint, setShowReviewForCheckpoint] = useState<string | null>(null);

  // ------------------------------------------------------------------
  // FIXED: Progress Calculation (80% Checkpoints + 20% Final)
  // ------------------------------------------------------------------
  const progress = useMemo(() => {
    // 1. Calculate Standard Checkpoint Progress (Worth 80% of total)
    // Note: 'checkpoints' state already filters out CP 5 (the final), so it only contains 1-4
    const totalStandardCheckpoints = checkpoints.length;
    
    let passedStandardCount = 0;
    checkpoints.forEach(cp => {
      const prog = checkpointProgress[cp.id];
      if (prog?.passed) {
        passedStandardCount++;
      }
    });

    // Avoid division by zero
    const standardRatio = totalStandardCheckpoints > 0 ? (passedStandardCount / totalStandardCheckpoints) : 0;
    const standardPercentage = standardRatio * 80; // Max 80%

    // 2. Calculate Final Assessment Progress (Worth 20% of total)
    const finalPercentage = hasPassedFinalAssessment ? 20 : 0;

    // 3. Total Calculation
    const totalPercentage = Math.round(standardPercentage + finalPercentage);
    const isTopicComplete = hasPassedFinalAssessment && (passedStandardCount === totalStandardCheckpoints);

 

    return { 
      passed: passedStandardCount, 
      total: totalStandardCheckpoints, 
      percentage: totalPercentage,
      isTopicComplete
    };
  }, [checkpoints, checkpointProgress, hasPassedFinalAssessment]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const storedUser = getStoredSession();
        if (!storedUser) {
          navigate('/');
          return;
        }
        setUser(storedUser);

        // Load topic from courses
        const courses = await getCourses();
        const topicData = courses[subject!]?.[topicId!];
        
        if (!topicData) {
          navigate('/courses');
          return;
        }
        setTopic(topicData);

        // Load checkpoints for THIS topic
        const checkpointsData = await getTopicCheckpoints(topicId!);
        
        if (!checkpointsData || checkpointsData.length === 0) {
          setError('No checkpoints found for this topic. Please contact your teacher.');
          setCheckpoints([]);
        } else {
          // Filter out checkpoint 5 from display list (it's handled as Final Assessment)
          const checkpointsToShow = checkpointsData.filter(cp => cp.checkpoint_number !== 5);
          setCheckpoints(checkpointsToShow);
        }

        // Load checkpoint progress
        const progressData = await getStudentCheckpointProgress((await storedUser).username, topicId!);
        setCheckpointProgress(progressData);

        // Load final assessment
        const finalAssess = await getTopicFinalAssessment(topicId!);
        setFinalAssessment(finalAssess);

        // Load final assessment questions
        if (finalAssess) {
          await loadFinalAssessmentQuestions(finalAssess.id);
        }

        // Determine Unlock Status (Based on Checkpoint 4)
        const userCheckpoint4Attempts = Object.entries(progressData)
          .filter(([checkpointId]) => {
            const checkpoint = checkpointsData.find(cp => cp.id === checkpointId);
            return checkpoint?.checkpoint_number === 4;
          });

        const latestCheckpoint4 = userCheckpoint4Attempts
          .sort((a, b) => {
            const dateA = new Date(a[1].completed_at || 0);
            const dateB = new Date(b[1].completed_at || 0);
            return dateB.getTime() - dateA.getTime();
          })[0];

        const isCheckpoint4Passed = latestCheckpoint4?.[1]?.passed || false;
        
        // Unlock Logic: Checkpoint 4 passed unlocks Final
        setIsUnlocked(isCheckpoint4Passed);

        // Check if final assessment is passed
        const finalCheckpointProgress = Object.entries(progressData).find(([checkpointId]) => {
          const checkpoint = checkpointsData.find(cp => cp.id === checkpointId);
          return checkpoint?.checkpoint_number === 5;
        });

        if (finalCheckpointProgress) {
          const [, finalProgress] = finalCheckpointProgress;
          setHasPassedFinalAssessment(finalProgress.passed || false);
          setFinalAssessmentScore(finalProgress.score || 0);
          if (finalProgress.completed_at) {
            setFinalAssessmentCompletionDate(new Date(finalProgress.completed_at).toLocaleDateString());
          }
        }

      } catch (error) {
        console.error('Error loading topic:', error);
        setError('Failed to load topic data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [subject, topicId, navigate]);

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
      .order('sort_order', { ascending: true });

    if (error) throw error;

    if (questionsData && questionsData.length > 0) {
      const formattedQuestions: Question[] = questionsData
        .map(item => {
          // The query returns an array for questions, take the first one
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
      } else {
        console.warn('No valid questions found for final assessment');
      }
    }
  } catch (error) {
    console.error('Error loading final questions:', error);
  }
};

  // Unlock next topic logic
  const unlockNextTopic = async (userId: string, completedTopicId: string) => {
    try {
      const { data: currentTopic } = await supabase
        .from('topics')
        .select('subject_id, title')
        .eq('id', completedTopicId)
        .single();

      if (!currentTopic) return;

      const { data: allTopics } = await supabase
        .from('topics')
        .select('id, title, sort_order')
        .eq('subject_id', currentTopic.subject_id)
        .order('title', { ascending: true });

      if (!allTopics) return;

      const currentIndex = allTopics.findIndex(t => t.id === completedTopicId);
      if (currentIndex !== -1 && currentIndex < allTopics.length - 1) {
        const nextTopic = allTopics[currentIndex + 1];
        
        await supabase
          .from('user_topic_access')
          .upsert({
            user_id: userId,
            topic_id: nextTopic.id,
            unlocked: true,
            unlocked_at: new Date().toISOString()
          }, { onConflict: 'user_id, topic_id' });
      }
    } catch (error) {
      console.error('Failed to unlock next topic:', error);
    }
  };

  // --- UPDATED HANDLERS ---

  const handleCheckpointComplete = async (
  checkpointId: string, 
  score: number, 
  passed: boolean,
  results?: any // NEW: Accept quiz results
) => {
  // Add this check
  if (!user || !user.username) {
    console.error('❌ Cannot save checkpoint: No user or username found');
    alert('User session error. Please log in again.');
    return;
  }

  try {
    console.log('💾 Saving checkpoint for user:', user.username);
    
    // NEW: Store the results for review
    if (results) {
      setCheckpointResults(prev => ({
        ...prev,
        [checkpointId]: results
      }));
    }
    
    await saveCheckpointProgress(user.username, checkpointId, score, passed);
    
    const progressData = await getStudentCheckpointProgress(user.username, topicId!);
    setCheckpointProgress(progressData);

    const completedCheckpoint = checkpoints.find(cp => cp.id === checkpointId);
    
    // Add notification for checkpoint completion
    try {
      if (passed && completedCheckpoint && completedCheckpoint.checkpoint_number === 4) {
        // Calculate topic progress
        const totalCheckpoints = checkpoints.length + 1; // +1 for final assessment
        const completedCheckpoints = Object.keys(progressData)
          .filter(id => progressData[id]?.passed)
          .length; 
        
        const progressPercentage = Math.round((completedCheckpoints / totalCheckpoints) * 100);
        
        if (progressPercentage >= 80) {
          await notifyTopic80PercentComplete(
            user.username,
            topic.title,
            subject!,
            progressPercentage
          );
          console.log('📢 Notification sent:', { user: user.username, topic: topic.title, progress: progressPercentage });
        }
      }
    } catch (notifyErr) {
      console.error('Failed to send checkpoint notification:', notifyErr);
    }

    const isCheckpoint4 = completedCheckpoint?.checkpoint_number === 4;

    if (isCheckpoint4 && passed) {
      setIsUnlocked(true);
      
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('username', user.username)
        .single();

      if (userData && topicId) {
        await supabase
          .from('user_progress')
          .upsert({
            user_id: userData.id,
            topic_id: topicId,
            last_accessed: new Date().toISOString()
          }, { onConflict: 'user_id, topic_id' });
      }
    }

    // NOTE: We do NOT set activeCheckpoint to null here anymore
    // This allows the student to see the review.
    if (passed) alert(`🎉 Checkpoint Passed!`);

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

      // Add notification for topic completion
      try {
        if (passed) {
          await notifyTopic80PercentComplete(
            user.username,
            topic.title,
            subject!,
            100 // 100% completed
          );
          console.log('📢 Notification sent:', { user: user.username, topic: topic.title, progress: 100 });
        }
      } catch (notifyErr) {
        console.error('Failed to send final assessment notification:', notifyErr);
      }

      if (passed) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('username', user.username)
          .single();

        if (userData) {
          await unlockNextTopic(userData.id, topicId);
        }
      }

      // NOTE: We do NOT set activeFinalQuiz to false here anymore.
      alert(passed ? '🎉 Topic Completed! Final Assessment Passed!' : 'Keep practicing.');
    } catch (error) {
      console.error('Error updating final assessment:', error);
    }
  };

  const startCheckpoint = async (checkpoint: any) => {
    try {
      const allCheckpointQuestions = await getCheckpointQuestions(checkpoint.id);
      
      if (!allCheckpointQuestions || allCheckpointQuestions.length === 0) {
        alert('No questions available for this checkpoint.');
        return;
      }
      
      let questionsToShow = checkpoint.checkpoint_number === 4 ? 20 : 5;
      let questionsToUse = allCheckpointQuestions;
      
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
        correctAnswer: q.correctAnswer || ''
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

  // NEW: Function to review checkpoint
  const reviewCheckpoint = (checkpointId: string) => {
    setShowReviewForCheckpoint(checkpointId);
  };

  const startFinalAssessment = async () => {
    if (!isUnlocked) {
      alert('You must pass Checkpoint 4 (MCQ) first!');
      return;
    }
    if (finalAssessmentQuestions.length === 0) {
       alert('No questions available for final assessment yet.');
       return;
    }
    setActiveFinalQuiz(true);
  };
 
  const handleAskAi = async () => {
    if (!aiQuestion.trim() || !topic) return;
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

  const isMostRecentAttempt = (checkpointId: string) => {
    const checkpoint = checkpoints.find(cp => cp.id === checkpointId);
    if (!checkpoint) return false;
      
    const attempts = checkpoints
      .filter(cp => cp.checkpoint_number === checkpoint.checkpoint_number)
      .map(cp => ({ id: cp.id, progress: checkpointProgress[cp.id] }))
      .filter(item => item.progress)
      .sort((a, b) => new Date(b.progress.completed_at).getTime() - new Date(a.progress.completed_at).getTime());
      
    return attempts[0]?.id === checkpointId;
  };

  if (loading) return <div className="p-8 text-center text-white">Loading...</div>;
  if (error || !user || !topic) return <div className="p-8 text-center text-white">{error || 'Topic not found'}</div>;

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

      {/* Updated Review Modal using CheckpointQuiz component */}
{showReviewForCheckpoint && checkpointResults[showReviewForCheckpoint] && (
  <CheckpointQuiz
    checkpointId={showReviewForCheckpoint}
    checkpointTitle={`Review: ${checkpoints.find(cp => cp.id === showReviewForCheckpoint)?.title || 'Checkpoint'}`}
    questions={checkpoints.find(cp => cp.id === showReviewForCheckpoint)?.questions || []}
    passThreshold={checkpoints.find(cp => cp.id === showReviewForCheckpoint)?.required_score || 80}
    onComplete={() => {}} // No-op for review mode
    onClose={() => setShowReviewForCheckpoint(null)}
    username={user.username}
    checkpoint={checkpoints.find(cp => cp.id === showReviewForCheckpoint)!}
    topicId={topicId}
    mode="review"
    reviewResults={{
      score: checkpointResults[showReviewForCheckpoint].score,
      passed: checkpointResults[showReviewForCheckpoint].passed,
      results: checkpointResults[showReviewForCheckpoint].results
    }}
  />
)}

      {/* AI Sidebar */}
      {showAiAsk && (
        <div className="fixed inset-y-0 right-0 w-80 bg-slate-900 border-l border-white/10 p-6 z-40 shadow-2xl flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">Ask Newel</h3>
            <button onClick={() => setShowAiAsk(false)} className="text-white/50 hover:text-white"><ChevronRight /></button>
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
            />
            <button onClick={handleAskAi} disabled={aiLoading} className="bg-cyan-600 p-2 rounded text-white"><MessageCircle size={16}/></button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <button onClick={() => navigate('/courses')} className="flex items-center gap-2 text-white/50 hover:text-white">
          <ArrowLeft size={18} /> Back to Courses
        </button>
        <button onClick={() => setShowAiAsk(!showAiAsk)} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
          <Wand2 size={16} className="text-purple-400"/> Ask Newel
        </button>
      </div>

            {/* Detailed How-to Guide for Students */}
            <div className="mb-10 bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-white/10 rounded-2xl p-6">
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
                      <p className="text-sm text-white/70">Access the links provided in the "Materials" section. Use Biolens for biology topics if available for a quick topic review.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <h4 className="font-medium text-white mb-1">Complete Checkpoints 1-3</h4>
                      <p className="text-sm text-white/70">Test your understanding with short MCQs after studying each section.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <h4 className="font-medium text-white mb-1">Master Checkpoint 4</h4>
                      <p className="text-sm text-white/70">This comprehensive MCQ test (20 questions, 80% pass) unlocks the Final Assessment.</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-sm font-bold">4</div>
                    <div>
                      <h4 className="font-medium text-white mb-1">Final Assessment</h4>
                      <p className="text-sm text-white/70">Complete the theory-based final assessment (worth 20% of total grade).</p>
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
                      <p className="text-sm text-white/70">Monitor your completion percentage and checkpoint status on the right panel.</p>
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
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><BookOpen className="text-cyan-400"/> Materials</h2>
            <div className="grid gap-3">
              {topic.materials?.map((m: Material) => (
                <div key={m.id} className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded text-white">
                      {m.type === 'file' ? <File size={18}/> : m.type === 'link' ? <LinkIcon size={18}/> : <FileText size={18}/>}
                    </div>
                    <span className="text-white font-medium">{m.title}</span>
                  </div>
                  <a href={m.content} target="_blank" rel="noreferrer" className="text-xs bg-cyan-600 px-2 py-1 rounded text-white">Open</a>
                </div>
              ))}
              {subject === 'Biology' && (
                <div className="bg-green-900/20 p-4 rounded-xl border border-green-500/30 mt-2">
                  <h4 className="text-green-300 font-bold mb-2">Biolens Interactive</h4>
                  <a href="https://biolens-zhgf.onrender.com/" target="_blank" rel="noreferrer" className="bg-green-600 text-white px-4 py-2 rounded text-sm">Open Biolens</a>
                </div>
              )}
            </div>
          </section>

          <section className="mt-12">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-white/10 rounded-3xl p-8">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Target className="text-purple-400"/> Checkpoints (80%)</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {checkpoints.map((checkpoint) => {
                  const progress = checkpointProgress[checkpoint.id];
                  const isMostRecent = isMostRecentAttempt(checkpoint.id);
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
                      
                      {/* Updated button section with Review option */}
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
            </div>
          </section>
        </div>

        {/* Right Column - Progress & Final */}
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><BarChart3 className="text-cyan-400"/> Progress Breakdown</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/60">Checkpoints (Max 80%)</span>
                  <span className="text-white font-bold">{Math.min(80, Math.round((progress.percentage / 100) * 80) + (progress.passed === progress.total && !hasPassedFinalAssessment ? 0 : 0))}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500" style={{ width: `${(progress.passed / progress.total) * 100}%` }}></div>
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
                  <div className={`h-full bg-purple-500`} style={{ width: hasPassedFinalAssessment ? '100%' : '0%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-2xl border ${isUnlocked ? 'bg-gradient-to-b from-cyan-900/20 to-purple-900/20 border-cyan-500/30' : 'bg-white/5 border-white/10 opacity-70'}`}>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Trophy className="text-yellow-400"/> Final Assessment</h3>
            <p className="text-sm text-white/60 mb-4">Complete Theory (20% of grade)</p>
            
            {hasPassedFinalAssessment ? (
              <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-xl text-center mb-3">
                <Star className="text-yellow-400 mx-auto mb-2" size={32} fill="currentColor" />
                <div className="text-green-400 font-bold text-lg">Passed!</div>
                <div className="text-white/60 text-sm">Score: {finalAssessmentScore}%</div>
              </div>
            ) : isUnlocked ? (
              <button onClick={startFinalAssessment} className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                <Zap size={18} /> Start Final
              </button>
            ) : (
              <div className="flex items-center gap-2 text-white/40 bg-black/20 p-3 rounded-lg text-sm">
                <Lock size={16} /> Complete Checkpoint 4 First
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};