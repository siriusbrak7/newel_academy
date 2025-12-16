// src/components/CourseSystem/TopicDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Topic, User, TopicProgress, Question, Material } from '../../types';
import { getCourses, getProgress, updateTopicProgress, getStoredSession } from '../../services/storageService';
import { getAITutorResponse } from '../../services/geminiService';
import { 
  ArrowLeft, FileText, Play, CheckCircle, Lock, Link as LinkIcon, 
  File, Wand2, MessageCircle, ChevronRight, Brain, Check, Clock 
} from 'lucide-react';
import { QuizInterface } from './QuizInterface';
import { QUESTION_BANK, IGCSE_CELL_BIO_THEORY, AS_CELL_BIO_THEORY, ALEVEL_CELL_BIO_THEORY } from '../../constants';

interface TopicDetailProps {
  // Props if needed, currently gets user from session
}

export const TopicDetail: React.FC<TopicDetailProps> = () => {
  const { subject, topicId } = useParams<{ subject: string; topicId: string }>();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [progress, setProgress] = useState<TopicProgress | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<{ 
    title: string; 
    questions: Question[]; 
    threshold: number; 
    isMain: boolean; 
    subtopic?: string 
  } | null>(null);
  const [showAiAsk, setShowAiAsk] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedUser = getStoredSession();
        if (!storedUser) {
          navigate('/');
          return;
        }
        setUser(storedUser);

        const coursesData = await getCourses();
        const t = coursesData[subject!]?.[topicId!];
        
        if (t) {
          setTopic(t);
          const userProg = await getProgress(storedUser.username);
          setProgress(userProg[subject!]?.[topicId!] || { 
            subtopics: {}, 
            checkpointScores: {}, 
            mainAssessmentPassed: false 
          });
        } else {
          navigate('/courses');
        }
      } catch (error) {
        console.error('Error loading topic:', error);
        navigate('/courses');
      }
    };

    loadData();
  }, [subject, topicId, navigate]);

  const startCheckpoint = (subtopic: string) => {
    const customQs = topic?.subtopicQuestions?.[subtopic] || [];
    
    let finalPool: Question[] = [];
    
    if (customQs.length > 0) {
      finalPool = customQs;
    } else {
      const allQs = QUESTION_BANK[subject!] || [];
      const gradeMap: Record<string, string> = {
        '9': 'IGCSE', '10': 'IGCSE', '11': 'AS', '12': 'A_LEVEL'
      };
      const targetDiff = gradeMap[user?.gradeLevel || '9'] || 'IGCSE';
      const relevantQs = allQs.filter(q => 
        (q.topic === topic?.id) && 
        q.difficulty === targetDiff
      );
      finalPool = relevantQs.length > 0 ? relevantQs : allQs.filter(q => q.topic === topic?.id);
    }

    const shuffled = [...finalPool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);
    
    setActiveQuiz({
      title: `Checkpoint for ${subtopic}`,
      questions: selected.length > 0 ? selected : [{
        id: 'dummy', 
        text: 'Sample Question?', 
        options: ['Option A', 'Option B'], 
        correctAnswer: 'Option A', 
        type: 'MCQ', 
        difficulty: 'IGCSE', 
        topic: ''
      }],
      threshold: 85,
      isMain: false,
      subtopic
    });
  };

  const startMainAssessment = () => {
    if (!topic || !user) return;
    
    const allQs = QUESTION_BANK[subject!] || [];
    const gradeMap: Record<string, string> = {
      '9': 'IGCSE', '10': 'IGCSE', '11': 'AS', '12': 'A_LEVEL'
    };
    const targetDiff = gradeMap[user.gradeLevel || '9'] || 'IGCSE';
    
    const relevantQs = allQs.filter(q => 
      (q.topic === topic.id) && 
      q.difficulty === targetDiff
    );

    const shuffled = [...relevantQs].sort(() => 0.5 - Math.random());
    const mcqs = shuffled.slice(0, 20);

    let theoryPool: Question[] = [];
    if (targetDiff === 'IGCSE') theoryPool = IGCSE_CELL_BIO_THEORY;
    else if (targetDiff === 'AS') theoryPool = AS_CELL_BIO_THEORY;
    else theoryPool = ALEVEL_CELL_BIO_THEORY;

    const theoryQuestion = theoryPool[Math.floor(Math.random() * theoryPool.length)] || {
      id: 'theory_default',
      text: 'Discuss the importance of this topic.',
      options: [],
      correctAnswer: '',
      type: 'THEORY',
      difficulty: targetDiff as any,
      topic: topic.id
    };

    setActiveQuiz({
      title: `${topic.title} - Final Assessment`,
      questions: [...mcqs, theoryQuestion],
      threshold: 85,
      isMain: true
    });
  };

  const handleQuizComplete = async (score: number, passed: boolean) => {
    if (!user || !subject || !topicId) return;
    
    if (activeQuiz?.isMain) {
      await updateTopicProgress(user.username, subject!, topicId!, {
        mainAssessmentScore: score,
        mainAssessmentPassed: passed
      });
    } else if (activeQuiz?.subtopic) {
      const updates: Partial<TopicProgress> = {};
      if (passed) {
        updates.subtopics = { ...progress?.subtopics, [activeQuiz.subtopic]: true };
      }
      updates.checkpointScores = { 
        ...progress?.checkpointScores, 
        [activeQuiz.subtopic]: score 
      };
      await updateTopicProgress(user.username, subject!, topicId!, updates);
    }
    
    const userProg = await getProgress(user.username);
    setProgress(userProg[subject!]?.[topicId!] || progress);
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
      console.error('AI Error:', error);
      setAiAnswer("Sorry, I couldn't process your question. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
        <p className="mt-4 text-white/60">Loading...</p>
      </div>
    );
  }

  if (!topic || !progress) {
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

  const passedCount = Object.values(progress.subtopics || {}).filter(Boolean).length;
  const allSubtopicsPassed = topic.subtopics?.every(st => {
    const score = progress.checkpointScores?.[st];
    return score !== undefined && score >= 85;
  }) || false;

  return (
    <div className="max-w-4xl mx-auto pb-20 relative">
      {activeQuiz && (
        <QuizInterface 
          title={activeQuiz.title}
          questions={activeQuiz.questions}
          passThreshold={activeQuiz.threshold}
          onComplete={handleQuizComplete}
          onClose={() => setActiveQuiz(null)}
          isCourseFinal={activeQuiz.isMain}
          assessmentId={activeQuiz.isMain ? `${topicId}_final` : undefined}
          username={user.username}
        />
      )}

      {/* Ask AI Sidebar */}
      {showAiAsk && (
        <div className="fixed inset-y-0 right-0 w-80 bg-slate-900 border-l border-white/10 p-6 z-40 shadow-2xl flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Wand2 size={18} className="text-cyan-400"/> Ask AI
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
          <Wand2 size={16} className="text-purple-400"/> Ask AI about this Topic
        </button>
      </div>

      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-white/10 rounded-3xl p-8 mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">{topic.title}</h1>
        <p className="text-white/60 text-lg mb-6">{topic.description}</p>
        
        <div className="flex gap-4">
          {progress.mainAssessmentPassed ? (
            <div className="bg-green-500/20 text-green-300 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
              <CheckCircle size={20} /> Mastered
            </div>
          ) : (
            <div className="bg-white/10 text-white/60 px-4 py-2 rounded-lg font-medium">
              In Progress ({passedCount}/{topic.subtopics?.length || 0} checkpoints)
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="text-cyan-400"/> Learning Materials
            </h2>
            <div className="grid gap-3">
              {topic.materials?.length > 0 ? topic.materials.map(m => (
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
                    Explore interactive 3D models and visualizations for this topic.
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

          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Play className="text-purple-400"/> Subtopic Checkpoints
            </h2>
            <div className="space-y-4">
              {topic.subtopics?.map((st, i) => {
                const isPassed = progress.subtopics[st];
                const score = progress.checkpointScores?.[st];
                return (
                  <div key={i} className={`p-4 rounded-xl border ${
                    isPassed ? 'bg-green-900/10 border-green-500/30' : 'bg-white/5 border-white/10'
                  } flex justify-between items-center`}>
                    <div>
                      <h4 className="text-white font-semibold">Checkpoint {i + 1}</h4>
                      <p className="text-xs text-white/40">{st}</p>
                      {score !== undefined && (
                        <span className="text-xs text-white/50">Score: {Math.round(score)}% {score >= 85 ? '✓' : '✗'}</span>
                      )}
                    </div>
                    {isPassed ? (
                      <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                        <CheckCircle size={18} /> Passed
                      </div>
                    ) : (
                      <button 
                        onClick={() => startCheckpoint(st)}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-purple-900/20"
                      >
                        Start Quiz
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div>
          <div className={`p-6 rounded-2xl border ${
            allSubtopicsPassed ? 
            'bg-gradient-to-b from-cyan-900/20 to-purple-900/20 border-cyan-500/30' : 
            'bg-white/5 border-white/10 opacity-70'
          }`}>
            <h3 className="text-xl font-bold text-white mb-2">Final Topic Assessment</h3>
            <p className="text-sm text-white/60 mb-6">
              {allSubtopicsPassed 
                ? 'Complete all subtopic checkpoints to unlock the final assessment. Includes 20 MCQs and 1 Theory Question.'
                : `Complete ${passedCount}/${topic.subtopics?.length || 0} checkpoints to unlock the final assessment.`}
            </p>
            
            {allSubtopicsPassed ? (
              <button 
                onClick={startMainAssessment}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg transform hover:scale-[1.02] transition-all"
              >
                Start Assessment
              </button>
            ) : (
              <div className="flex items-center gap-2 text-white/40 bg-black/20 p-3 rounded-lg justify-center">
                <Lock size={18} /> Locked - Complete {topic.subtopics?.length - passedCount} more checkpoints
              </div>
            )}
            
            {progress.mainAssessmentScore !== undefined && (
              <div className="mt-4 text-center">
                <span className="text-sm text-white/50">Best Score: </span>
                <span className={`font-bold ${
                  progress.mainAssessmentPassed ? 'text-green-400' : 'text-red-400'
                }`}>
                  {Math.round(progress.mainAssessmentScore)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};