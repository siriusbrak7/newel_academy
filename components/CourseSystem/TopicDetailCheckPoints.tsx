// components/CourseSystem/TopicDetailCheckpoints.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// Add this import at the top with your other imports
import { getCheckpointQuestions } from '../../services/checkpointService';
import { User, Material, Question } from '../../types';
import { 
  getStoredSession, 
  getTopicCheckpoints,
  getStudentCheckpointProgress,
  saveCheckpointProgress,
  getTopicFinalAssessment,
  hasUnlockedFinalAssessment,
  updateTopicProgress,
  getCourses
} from '../../services/storageService';
import { getAITutorResponse } from '../../services/geminiService';
import { 
  ArrowLeft, FileText, Play, CheckCircle, Lock, Link as LinkIcon, 
  File, Wand2, MessageCircle, ChevronRight, Brain, Check, Clock,
  Trophy, BookOpen, Target, BarChart3, Zap
} from 'lucide-react';
import { CheckpointQuiz } from './CheckpointQuiz';
import { QuizInterface } from './QuizInterface';
import { QUESTION_BANK } from '../../constants';

export const TopicDetailCheckpoints: React.FC = () => {
  const { subject, topicId } = useParams<{ subject: string; topicId: string }>();
  const navigate = useNavigate();
  
  const [user, setUser] = useState<User | null>(null);
  const [topic, setTopic] = useState<any>(null);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [checkpointProgress, setCheckpointProgress] = useState<Record<string, any>>({});
  const [finalAssessment, setFinalAssessment] = useState<any>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeCheckpoint, setActiveCheckpoint] = useState<any>(null);
  const [activeFinalQuiz, setActiveFinalQuiz] = useState(false);
  const [showAiAsk, setShowAiAsk] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
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

        // Load checkpoints
        const checkpointsData = await getTopicCheckpoints(topicId!);
        setCheckpoints(checkpointsData);

        // Load checkpoint progress
        const progressData = await getStudentCheckpointProgress(storedUser.username, topicId!);
        setCheckpointProgress(progressData);

        // Load final assessment
        const finalAssess = await getTopicFinalAssessment(topicId!);
        setFinalAssessment(finalAssess);

        // Check specifically if Checkpoint 4 (Final MCQ) is passed
        const checkpoint4Id = '6ad5399c-c1d0-4de1-8d36-8ecf2fd1dc3e';
        const checkpoint4Progress = progressData[checkpoint4Id];
        const isCheckpoint4Passed = checkpoint4Progress?.passed || false;

        // Checkpoint 5 should only unlock if Checkpoint 4 is passed
        const checkpoint5Unlocked = isCheckpoint4Passed;

        setIsUnlocked(checkpoint5Unlocked);

        // Add this debug log to see what's happening
        console.log('Unlock status:', {
          checkpoint4Id,
          checkpoint4Progress,
          isCheckpoint4Passed,
          checkpoint5Unlocked,
          allProgress: progressData
        });

      } catch (error) {
        console.error('Error loading topic:', error);
        navigate('/courses');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [subject, topicId, navigate]);

  const handleCheckpointComplete = async (checkpointId: string, score: number, passed: boolean) => {
    if (!user) return;

    try {
      // Save checkpoint progress
      await saveCheckpointProgress(user.username, checkpointId, score, passed);
      
      // Refresh progress data
      const progressData = await getStudentCheckpointProgress(user.username, topicId!);
      setCheckpointProgress(progressData);

      // Recheck if final assessment is now unlocked
      const checkpoint4Id = '6ad5399c-c1d0-4de1-8d36-8ecf2fd1dc3e';
      const checkpoint4Progress = progressData[checkpoint4Id];
      const isCheckpoint4Passed = checkpoint4Progress?.passed || false;
      const checkpoint5Unlocked = isCheckpoint4Passed;
      
      setIsUnlocked(checkpoint5Unlocked);

      setActiveCheckpoint(null);
    } catch (error) {
      console.error('Error saving checkpoint progress:', error);
    }
  };

  const handleFinalAssessmentComplete = async (score: number, passed: boolean) => {
    if (!user || !subject || !topicId) return;

    try {
      // Update topic progress
      await updateTopicProgress(user.username, subject!, topicId!, {
        mainAssessmentScore: score,
        mainAssessmentPassed: passed
      });

      setActiveFinalQuiz(false);
      alert(passed ? '🎉 Congratulations! You passed the final assessment!' : 'Keep practicing and try again.');
    } catch (error) {
      console.error('Error updating final assessment:', error);
    }
  };

  const startCheckpoint = async (checkpoint: any) => {
  try {
    // 1. Use the service to fetch ALL questions from the database
    const allCheckpointQuestions = await getCheckpointQuestions(checkpoint.id);
    
    console.log('Starting checkpoint:', {
      checkpointNumber: checkpoint.checkpoint_number,
      totalQuestionsInPool: allCheckpointQuestions.length,
      questionsToShow: checkpoint.checkpoint_number === 4 ? 20 : 
                       checkpoint.checkpoint_number === 5 ? 1 : 
                       allCheckpointQuestions.length,
      actualQuestionsSelected: allCheckpointQuestions.length,
      isFinalMCQ: checkpoint.checkpoint_number === 4,
      isFinalTheory: checkpoint.checkpoint_number === 5
    });
    
    // 2. For FINAL MCQ (Checkpoint 4), select 20 random questions from the pool
    let questionsToUse = allCheckpointQuestions;
    
    if (checkpoint.checkpoint_number === 4 && allCheckpointQuestions.length > 20) {
      // Fisher-Yates shuffle algorithm for random selection
      const shuffled = [...allCheckpointQuestions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      questionsToUse = shuffled.slice(0, 20);
    }
    
    // 3. For FINAL THEORY (Checkpoint 5), select 1 random question
    if (checkpoint.checkpoint_number === 5 && allCheckpointQuestions.length > 1) {
      const randomIndex = Math.floor(Math.random() * allCheckpointQuestions.length);
      questionsToUse = [allCheckpointQuestions[randomIndex]];
    }
    
    // 4. Format questions for the quiz component
    if (questionsToUse && questionsToUse.length > 0) {
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
    } else {
      console.warn(`No questions found for checkpoint ${checkpoint.id}`);
      // Fallback logic here if needed
    }
  } catch (error) {
    console.error('Error loading checkpoint questions:', error);
  }
};

  const startFinalAssessment = () => {
    if (!topic || !user || !finalAssessment) return;
    
    const allQuestions = QUESTION_BANK[subject!] || [];
    const gradeMap: Record<string, string> = {
      '9': 'IGCSE', '10': 'IGCSE', '11': 'AS', '12': 'A_LEVEL'
    };
    const targetDiff = gradeMap[user.gradeLevel || '9'] || 'IGCSE';
    
    const relevantQuestions = allQuestions.filter(q => 
      q.difficulty === targetDiff
    );

    const shuffled = [...relevantQuestions].sort(() => 0.5 - Math.random());
    const mcqs = shuffled.slice(0, 20); // 20 MCQ questions

    // Add 2 theory questions
    const theoryQuestions: Question[] = [
      {
        id: 'theory_1',
        text: `Write a reflective essay about what you learned in ${topic.title}. Discuss key concepts and how they connect to real-world applications.`,
        options: [],
        correctAnswer: '',
        type: 'THEORY',
        difficulty: targetDiff as any,
        topic: topic.title
      },
      {
        id: 'theory_2',
        text: `Analyze the importance of ${topic.title} in modern science. Provide examples and explain their significance.`,
        options: [],
        correctAnswer: '',
        type: 'THEORY',
        difficulty: targetDiff as any,
        topic: topic.title
      }
    ];

    setActiveFinalQuiz(true);
  };

  const handleAskAi = async () => {
    if (!aiQuestion.trim() || !topic) return;
    setAiLoading(true);
    try {
      const resp = await getAITutorResponse(
        aiQuestion, 
        `Topic: ${topic.title}, Description: ${topic.description}. Student level: ${user?.gradeLevel}`
      );
      setAiAnswer(resp);
    } catch (error) {
      console.error('Error:', error);
      setAiAnswer("Sorry, I couldn't process your question. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const calculateProgress = () => {
    if (checkpoints.length === 0) return { passed: 0, total: 0, percentage: 0 };
    
    const passedCount = checkpoints.filter(cp => checkpointProgress[cp.id]?.passed).length;
    return {
      passed: passedCount,
      total: checkpoints.length,
      percentage: (passedCount / checkpoints.length) * 100
    };
  };

  const progress = calculateProgress();

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
        <p className="mt-4 text-white/60">Loading topic...</p>
      </div>
    );
  }

  if (!user || !topic) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <p className="text-white/60">Topic not found</p>
        <button 
          onClick={() => navigate('/courses')}
          className="mt-4 text-cyan-400 hover:text-cyan-300"
        >
          Back to Courses
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 relative">
      {/* Checkpoint Quiz Modal */}
      {activeCheckpoint && user && (
        <CheckpointQuiz
          checkpointId={activeCheckpoint.id}
          checkpointTitle={activeCheckpoint.title}
          questions={activeCheckpoint.questions}
          passThreshold={activeCheckpoint.required_score || 85}
          onComplete={(score, passed) => 
            handleCheckpointComplete(activeCheckpoint.id, score, passed)
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
          questions={[]} // Will be loaded dynamically
          passThreshold={finalAssessment.pass_percentage || 85}
          onComplete={handleFinalAssessmentComplete}
          onClose={() => setActiveFinalQuiz(false)}
          isCourseFinal={true}
          assessmentId={finalAssessment.id}
          username={user.username}
        />
      )}

      {/* Ask AI Sidebar */}
      {showAiAsk && (
        <div className="fixed inset-y-0 right-0 w-80 bg-slate-900 border-l border-white/10 p-6 z-40 shadow-2xl flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Wand2 size={18} className="text-cyan-400"/> Ask Newel
            </h3>
            <button onClick={() => setShowAiAsk(false)} className="text-white/50 hover:text-white">
              <ChevronRight />
            </button>
          </div>
          <div className="flex-grow overflow-y-auto mb-4 text-sm text-white/80 whitespace-pre-wrap">
            {aiAnswer ? aiAnswer : (
              <span className="opacity-50">Ask about {topic.title}...</span>
            )}
            {aiLoading && <span className="animate-pulse">Thinking...</span>}
          </div>
          <div className="flex gap-2">
            <input 
              className="flex-grow bg-white/5 border border-white/10 rounded px-2 py-1 text-white" 
              value={aiQuestion} 
              onChange={e => setAiQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAskAi()}
              placeholder="What is...?"
            />
            <button 
              onClick={handleAskAi} 
              disabled={aiLoading}
              className="bg-cyan-600 p-2 rounded text-white disabled:opacity-50"
            >
              <MessageCircle size={16}/>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <button 
          onClick={() => navigate('/courses')} 
          className="flex items-center gap-2 text-white/50 hover:text-white"
        >
          <ArrowLeft size={18} /> Back to Courses
        </button>
        <button 
          onClick={() => setShowAiAsk(!showAiAsk)}
          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
        >
          <Wand2 size={16} className="text-purple-400"/> Ask Newel about this Topic
        </button>
      </div>

      {/* Topic Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-white/10 rounded-3xl p-8 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">{topic.title}</h1>
            <p className="text-white/60 text-lg mb-4">{topic.description}</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-white/50">Grade {topic.gradeLevel}</span>
              <span className="text-white/50">•</span>
              <span className="text-white/50">{subject}</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="bg-cyan-500/10 border border-cyan-500/30 px-4 py-2 rounded-xl mb-2">
              <div className="text-2xl font-bold text-cyan-400">{Math.round(progress.percentage)}%</div>
              <div className="text-xs text-cyan-300/70">Checkpoints</div>
            </div>
            <div className="text-sm text-white/50">
              {progress.passed}/{progress.total} completed
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Column - Materials & Checkpoints */}
        <div className="md:col-span-2 space-y-8">
          {/* Learning Materials */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen className="text-cyan-400"/> Learning Materials
            </h2>
            <div className="grid gap-3">
              {topic.materials?.length > 0 ? topic.materials.map((m: Material) => (
                <div key={m.id} className="bg-white/5 hover:bg-white/10 p-4 rounded-xl border border-white/5 flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${
                      m.type === 'file' ? 'bg-green-500/20 text-green-300' : 
                      m.type === 'link' ? 'bg-blue-500/20 text-blue-300' : 
                      'bg-white/10 text-white'
                    }`}>
                      {m.type === 'file' ? <File size={18}/> : 
                       m.type === 'link' ? <LinkIcon size={18}/> : 
                       <FileText size={18}/>}
                    </div>
                    <span className="text-white font-medium">{m.title}</span>
                  </div>
                  {m.type === 'link' || m.type === 'file' ? (
                    <a 
                      href={m.content} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-xs bg-cyan-600 px-2 py-1 rounded text-white hover:bg-cyan-700"
                    >
                      Open
                    </a>
                  ) : (
                    <button 
                      onClick={() => alert(m.content)} 
                      className="text-xs bg-white/10 px-2 py-1 rounded text-white group-hover:bg-cyan-600 transition-colors"
                    >
                      View
                    </button>
                  )}
                </div>
              )) : (
                <p className="text-white/30 italic">No materials uploaded yet.</p>
              )}
              
              {/* Biolens Integration - Only for Biology */}
              {subject === 'Biology' && (
                <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 p-4 rounded-xl border border-green-500/30 mt-4">
                  <h4 className="text-green-300 font-bold mb-2 flex items-center gap-2">
                    <LinkIcon className="text-green-400"/> Biolens Interactive Learning
                  </h4>
                  <p className="text-white/70 text-sm mb-3">
                    Brief Notes, Interactive Checkpoint, Virtual Lab....
                  </p>
                  <a 
                    href="https://biolens-zhgf.onrender.com/" 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-block bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold"
                  >
                    Open Biolens →
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* Checkpoints */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Target className="text-purple-400"/> Topic Checkpoints
            </h2>
            <div className="space-y-4">
              {checkpoints.map((cp, index) => {
                const progress = checkpointProgress[cp.id];
                const isPassed = progress?.passed;
                const score = progress?.score;
                
                return (
                  <div key={cp.id} className={`p-4 rounded-xl border ${
                    isPassed ? 'bg-green-900/10 border-green-500/30' : 'bg-white/5 border-white/10'
                  } flex justify-between items-center`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isPassed ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'
                      }`}>
                        {isPassed ? <CheckCircle size={20} /> : <span className="font-bold">{index + 1}</span>}
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">{cp.title}</h4>
                        <p className="text-xs text-white/40">
                          Checkpoint {cp.checkpoint_number} • {cp.question_count} questions
                        </p>
                        {score !== undefined && (
                          <p className="text-xs text-white/50 mt-1">
                            Score: {Math.round(score)}% {score >= 85 ? '✓' : '✗'}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {isPassed ? (
                      <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                        <CheckCircle size={18} /> Passed
                      </div>
                    ) : (
                      <button 
                        onClick={() => startCheckpoint(cp)}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-purple-900/20 flex items-center gap-2"
                      >
                        <Play size={14} /> Start Quiz
                      </button>
                    )}
                  </div>
                );
              })}
              
              {checkpoints.length === 0 && (
                <div className="text-center py-8 text-white/30 italic">
                  No checkpoints defined for this topic yet.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column - Progress & Final Assessment */}
        <div className="space-y-6">
          {/* Progress Summary */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="text-cyan-400"/> Progress Summary
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/60">Checkpoints Completed</span>
                  <span className="text-white font-bold">{progress.passed}/{progress.total}</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${progress.percentage}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{checkpoints.length}</div>
                  <div className="text-xs text-white/50">Total Checkpoints</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{progress.passed}</div>
                  <div className="text-xs text-white/50">Passed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Final Assessment - Updated with proper prerequisite check */}
          <div className={`p-6 rounded-2xl border ${
            checkpointProgress['6ad5399c-c1d0-4de1-8d36-8ecf2fd1dc3e']?.passed ? 
            'bg-gradient-to-b from-cyan-900/20 to-purple-900/20 border-cyan-500/30' : 
            'bg-white/5 border-white/10 opacity-70'
          }`}>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Trophy className="text-yellow-400"/> Final Theory Assessment
            </h3>
            <p className="text-sm text-white/60 mb-4">
              {checkpointProgress['6ad5399c-c1d0-4de1-8d36-8ecf2fd1dc3e']?.passed
                ? 'Complete this theory assessment to demonstrate mastery. 25 minutes time limit.'
                : `Pass the 20-question MCQ assessment first (85% required).`}
            </p>
            
            {finalAssessment ? (
              <>
                <div className="text-sm text-white/50 mb-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Question Type:</span>
                    <span className="text-white">Theory (Essay)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time Limit:</span>
                    <span className="text-yellow-400">25 minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Passing Score:</span>
                    <span className="text-green-400">85%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prerequisite:</span>
                    <span className={checkpointProgress['6ad5399c-c1d0-4de1-8d36-8ecf2fd1dc3e']?.passed ? "text-green-400" : "text-red-400"}>
                      {checkpointProgress['6ad5399c-c1d0-4de1-8d36-8ecf2fd1dc3e']?.passed ? "✓ MCQ Passed" : "✗ MCQ Required"}
                    </span>
                  </div>
                </div>
                
                {checkpointProgress['6ad5399c-c1d0-4de1-8d36-8ecf2fd1dc3e']?.passed ? (
                  <button 
                    onClick={() => {
                      const theoryCheckpoint = checkpoints.find(cp => cp.checkpoint_number === 5);
                      if (theoryCheckpoint) {
                        startCheckpoint(theoryCheckpoint);
                      }
                    }}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                  >
                    <Zap size={18} /> Start Final Theory Assessment
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-white/40 bg-black/20 p-3 rounded-lg justify-center">
                    <Lock size={18} /> Complete MCQ Assessment First
                  </div>
                )}
              </>
            ) : (
              <div className="text-white/40 italic text-sm text-center py-4">
                Final assessment not configured yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}