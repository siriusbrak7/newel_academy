// components/Gamification.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trophy, Zap, TrendingUp, Users, Star, Award, Timer, Target, 
  Brain, Crown, BookOpen, ClipboardList, AlertCircle,
  RefreshCw
} from 'lucide-react';
import { getLeaderboards, saveSprintScore } from '../services/storageService';
import { supabase } from '../services/supabaseClient';

interface LeaderboardEntry {
  username: string;
  score: number;
  grade_level?: string;
}

interface LeaderboardData {
  academic: LeaderboardEntry[];
  challenge: LeaderboardEntry[];
  assessments: LeaderboardEntry[];
}

interface SprintQuestion {
  id: string;
  text: string;
  answer: string;
  subject: string;
  topic: string;
  type: string;
  explanation?: string;
  difficulty?: string;
  options?: string[];
}

export const SprintChallenge: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(222);
  const [isRunning, setIsRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState<SprintQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [username, setUsername] = useState('');
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);

  // Refs to avoid stale closures in timer
  const scoreRef = useRef(score);
  const usernameRef = useRef(username);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep refs in sync
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { usernameRef.current = username; }, [username]);

  // Initialize questions from database
  const loadRandomQuestions = useCallback(async () => {
    try {
      setLoadingQuestions(true);
      console.log('🎮 Loading questions for Sprint Challenge from ALL checkpoints...');

      // STRATEGY 1: Get questions via checkpoint questions join
      const { data: checkpointQuestions, error: cpError } = await supabase
        .from('checkpoint_questions')
        .select(`
          id,
          checkpoint_id,
          question_id,
          order,
          questions!inner (
            id,
            text,
            type,
            difficulty,
            topic_id,
            subtopic_name,
            options,
            correct_answer,
            model_answer,
            explanation,
            topics!inner (
              title,
              subjects!inner (name)
            )
          )
        `)
        .limit(200);

      if (!cpError && checkpointQuestions && checkpointQuestions.length > 0) {
        console.log(`✅ Found ${checkpointQuestions.length} questions from checkpoints`);
        
        const sprintQuestions: SprintQuestion[] = checkpointQuestions
          .map((cpq: any) => {
            const qData = Array.isArray(cpq.questions) ? cpq.questions[0] : cpq.questions;
            return { ...cpq, questions: qData };
          })
          .filter((cpq) => cpq.questions && cpq.questions.text)
          .map((cpq) => {
            const q = cpq.questions;
            const subjectName = Array.isArray(q.topics) 
              ? q.topics[0]?.subjects?.name 
              : q.topics?.subjects?.name || 'General';
            
            const topicName = Array.isArray(q.topics)
              ? q.topics[0]?.title
              : q.topics?.title || 'General';
            
            return {
              id: q.id,
              text: q.text,
              answer: q.correct_answer || q.model_answer || '',
              subject: subjectName,
              topic: topicName,
              type: q.type || 'MCQ',
              explanation: q.explanation || '',
              difficulty: q.difficulty || 'IGCSE',
              options: q.options || []
            };
          });

        // Fisher-Yates shuffle
        const shuffled = [...sprintQuestions];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        setQuestions(shuffled.slice(0, 20));
        setLoadingQuestions(false);
        return;
      }

      console.log('⚠️ No checkpoint questions found, trying direct questions...');

      // STRATEGY 2: Fallback to direct questions fetch
      const { data: allQuestions, error: qError } = await supabase
        .from('questions')
        .select(`
          id,
          text,
          type,
          difficulty,
          topic_id,
          subtopic_name,
          options,
          correct_answer,
          model_answer,
          explanation,
          topics!inner (
            title,
            subjects!inner (name)
          )
        `)
        .limit(100);

      if (qError) {
        console.error('❌ Error loading questions:', qError);
        setQuestions(getSampleQuestions());
        setLoadingQuestions(false);
        return;
      }

      if (!allQuestions || allQuestions.length === 0) {
        console.log('⚠️ No questions found, using sample questions');
        setQuestions(getSampleQuestions());
        setLoadingQuestions(false);
        return;
      }

      console.log(`✅ Found ${allQuestions.length} total questions`);

      const sprintQuestions: SprintQuestion[] = allQuestions
        .filter((q: any) => q.text && q.text.trim().length > 0)
        .map((q: any) => {
          const subjectName = Array.isArray(q.topics) 
            ? q.topics[0]?.subjects?.name 
            : q.topics?.subjects?.name || 'General';
            
          const topicName = Array.isArray(q.topics) 
            ? q.topics[0]?.title 
            : q.topics?.title || 'General';
          
          return {
            id: q.id,
            text: q.text,
            answer: q.correct_answer || q.model_answer || '',
            subject: subjectName,
            topic: topicName,
            type: q.type || 'MCQ',
            explanation: q.explanation || '',
            difficulty: q.difficulty || 'IGCSE',
            options: q.options || []
          };
        });

      console.log(`✅ Transformed ${sprintQuestions.length} valid questions`);

      // Fisher-Yates shuffle
      const shuffled = [...sprintQuestions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      setQuestions(shuffled.slice(0, 20));
      setLoadingQuestions(false);
      console.log(`🎮 Loaded ${Math.min(shuffled.length, 20)} random questions`);
    } catch (error) {
      console.error('❌ Error loading random questions:', error);
      setQuestions(getSampleQuestions());
      setLoadingQuestions(false);
    }
  }, []);

  // Fallback sample questions
  const getSampleQuestions = (): SprintQuestion[] => {
    return [
      { 
        id: '1', 
        text: "What is the chemical symbol for water?", 
        answer: "H2O",
        type: 'MCQ',
        topic: 'Chemistry Basics',
        subject: 'Chemistry',
        difficulty: 'IGCSE',
        options: ['H2O', 'CO2', 'O2', 'NaCl']
      },
      { 
        id: '2', 
        text: "Who discovered gravity?", 
        answer: "Newton",
        type: 'THEORY',
        topic: 'Physics Fundamentals',
        subject: 'Physics',
        difficulty: 'IGCSE'
      },
      { 
        id: '3', 
        text: "What planet is known as the Red Planet?", 
        answer: "Mars",
        type: 'MCQ',
        topic: 'Astronomy',
        subject: 'Physics',
        difficulty: 'IGCSE',
        options: ['Mars', 'Venus', 'Jupiter', 'Saturn']
      },
      { 
        id: '4', 
        text: "What is the largest organ in the human body?", 
        answer: "Skin",
        type: 'MCQ',
        topic: 'Human Biology',
        subject: 'Biology',
        difficulty: 'IGCSE',
        options: ['Heart', 'Liver', 'Skin', 'Lungs']
      },
      { 
        id: '5', 
        text: "What gas do plants absorb from the atmosphere?", 
        answer: "CO2",
        type: 'MCQ',
        topic: 'Photosynthesis',
        subject: 'Biology',
        difficulty: 'IGCSE',
        options: ['Oxygen', 'Nitrogen', 'CO2', 'Hydrogen']
      },
      { 
        id: '6', 
        text: "What is the atomic number of Carbon?", 
        answer: "6",
        type: 'MCQ',
        topic: 'Atomic Structure',
        subject: 'Chemistry',
        difficulty: 'IGCSE',
        options: ['12', '6', '14', '8']
      },
      { 
        id: '7', 
        text: "What force keeps planets in orbit around the sun?", 
        answer: "Gravity",
        type: 'THEORY',
        topic: 'Gravity',
        subject: 'Physics',
        difficulty: 'IGCSE'
      },
      { 
        id: '8', 
        text: "What process do plants use to make food?", 
        answer: "Photosynthesis",
        type: 'MCQ',
        topic: 'Plant Biology',
        subject: 'Biology',
        difficulty: 'IGCSE',
        options: ['Respiration', 'Photosynthesis', 'Transpiration', 'Digestion']
      },
      { 
        id: '9', 
        text: "What is the formula for speed?", 
        answer: "Speed = Distance/Time",
        type: 'THEORY',
        topic: 'Motion',
        subject: 'Physics',
        difficulty: 'IGCSE'
      },
      { 
        id: '10', 
        text: "What is the powerhouse of the cell?", 
        answer: "Mitochondria",
        type: 'MCQ',
        topic: 'Cell Biology',
        subject: 'Biology',
        difficulty: 'IGCSE',
        options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Vacuole']
      }
    ];
  };

  useEffect(() => {
    loadRandomQuestions();
    
    const storedUser = localStorage.getItem('newel_currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUsername(user.username);
      } catch (e) {
        console.error('Failed to parse user:', e);
      }
    }
  }, [loadRandomQuestions]);

  // Timer effect — uses refs to avoid stale closures
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            setGameOver(true);
            // Use ref for current score
            persistScore(scoreRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning]);

  // Persist score to backend (uses passed value, not stale state)
  const persistScore = async (finalScore: number) => {
    const currentUsername = usernameRef.current;
    if (!currentUsername) {
      console.log('No username found, score not saved');
      return;
    }
    
    try {
      await saveSprintScore(currentUsername, finalScore);
      console.log('✅ Score saved to leaderboard:', finalScore);
    } catch (error) {
      console.error('❌ Failed to save score:', error);
    }
  };

  const startGame = async () => {
    await loadRandomQuestions();
    setTimeLeft(222);
    setScore(0);
    setCurrentQuestion(0);
    setGameOver(false);
    setUserAnswer('');
    setSelectedOption(null);
    setLastAnswerCorrect(null);
    setStreak(0);
    setIsRunning(true);
    
    // Focus the input after a tick
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const advanceQuestion = useCallback((newScore: number) => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedOption(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setGameOver(true);
      setIsRunning(false);
      persistScore(newScore);
    }
    setUserAnswer('');
  }, [currentQuestion, questions.length]);

  const checkAnswer = useCallback(() => {
    if (!isRunning || gameOver) return;
    
    const currentQ = questions[currentQuestion];
    if (!currentQ) return;
    
    const trimmedAnswer = userAnswer.trim();
    if (!trimmedAnswer && selectedOption === null) return;
    
    let correct = false;
    
    if (currentQ.type === 'MCQ' && currentQ.options && currentQ.options.length > 0) {
      const correctAnswerLower = currentQ.answer.toLowerCase().trim();
      
      // Option 1: User clicked an MCQ option
      if (selectedOption !== null) {
        const selectedText = currentQ.options[selectedOption];
        correct = selectedText?.toLowerCase().trim() === correctAnswerLower;
      } else {
        const userAnswerLower = trimmedAnswer.toLowerCase();
        
        // Option 2: User typed a letter like A, B, C, D
        const letterIndex = 'abcd'.indexOf(userAnswerLower);
        if (userAnswerLower.length === 1 && letterIndex !== -1 && letterIndex < currentQ.options.length) {
          const mappedOption = currentQ.options[letterIndex];
          correct = mappedOption?.toLowerCase().trim() === correctAnswerLower;
        } else {
          // Option 3: User typed the full answer text
          correct = userAnswerLower === correctAnswerLower;
        }
      }
    } else {
      // THEORY question — partial match with minimum length guard
      const userAnswerLower = trimmedAnswer.toLowerCase();
      const correctAnswerLower = currentQ.answer.toLowerCase().trim();
      
      if (userAnswerLower.length >= 2) {
        // Exact match
        correct = userAnswerLower === correctAnswerLower;
        
        // Contained match (both directions) — only if answer/input is meaningful length
        if (!correct && userAnswerLower.length >= 3) {
          const correctWords = correctAnswerLower.split(/\s+/).filter(w => w.length > 2);
          const userWords = userAnswerLower.split(/\s+/).filter(w => w.length > 2);
          
          // Check if user's key words appear in the correct answer or vice versa
          if (correctWords.length > 0 && userWords.length > 0) {
            const matchingWords = userWords.filter(uw => 
              correctWords.some(cw => cw.includes(uw) || uw.includes(cw))
            );
            correct = matchingWords.length >= Math.max(1, Math.ceil(correctWords.length * 0.5));
          }
        }
      }
    }
    
    // Flash feedback
    setLastAnswerCorrect(correct);
    setTimeout(() => setLastAnswerCorrect(null), 600);
    
    let newScore = score;
    if (correct) {
      const streakBonus = streak >= 3 ? 50 : 0;
      const pointsEarned = 100 + streakBonus;
      newScore = score + pointsEarned;
      setScore(newScore);
      setStreak(prev => prev + 1);
      console.log(`✅ Correct! +${pointsEarned}pts${streakBonus ? ' (streak bonus!)' : ''}`);
    } else {
      setStreak(0);
      console.log('❌ Incorrect. Correct answer:', currentQ.answer);
    }
    
    advanceQuestion(newScore);
  }, [isRunning, gameOver, questions, currentQuestion, userAnswer, selectedOption, score, streak, advanceQuestion]);

  const skipQuestion = useCallback(() => {
    if (!isRunning || gameOver) return;
    setStreak(0);
    advanceQuestion(score);
  }, [isRunning, gameOver, score, advanceQuestion]);

  const handleSelectOption = (index: number) => {
    if (!isRunning || gameOver) return;
    setSelectedOption(index);
    setUserAnswer(questions[currentQuestion]?.options?.[index] || '');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      checkAnswer();
    }
    // Quick letter shortcuts for MCQ
    const currentQ = questions[currentQuestion];
    if (currentQ?.type === 'MCQ' && currentQ.options && currentQ.options.length > 0) {
      const key = e.key.toLowerCase();
      const letterIndex = 'abcd'.indexOf(key);
      if (letterIndex !== -1 && letterIndex < currentQ.options.length && !userAnswer) {
        handleSelectOption(letterIndex);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentQuestionInfo = () => {
    const q = questions[currentQuestion];
    if (!q) return { subject: '', topic: '', difficulty: '', type: '' };
    
    return {
      subject: q.subject,
      topic: q.topic,
      difficulty: q.difficulty || 'IGCSE',
      type: q.type === 'MCQ' ? 'Multiple Choice' : 'Theory'
    };
  };

  const questionInfo = getCurrentQuestionInfo();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold text-white mb-2">222-Sprint Challenge</h1>
      <p className="text-white/60 mb-8">Answer random questions from all subjects in 222 seconds!</p>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Game Panel */}
        <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-white/20 p-8 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <div className="text-center">
              <div className={`text-5xl font-bold font-mono transition-colors ${
                timeLeft <= 30 ? 'text-red-400 animate-pulse' : 
                timeLeft <= 60 ? 'text-yellow-400' : 'text-cyan-400'
              }`}>
                {formatTime(timeLeft)}
              </div>
              <div className="text-white/60 text-sm">time remaining</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-yellow-400 font-mono">{score}</div>
              <div className="text-white/60 text-sm">points</div>
              {streak >= 3 && (
                <div className="text-orange-400 text-xs font-bold mt-1 animate-bounce">
                  🔥 {streak} streak!
                </div>
              )}
            </div>
          </div>

          {/* Answer feedback flash */}
          {lastAnswerCorrect !== null && (
            <div className={`text-center py-2 rounded-lg mb-3 font-bold text-sm transition-all ${
              lastAnswerCorrect 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {lastAnswerCorrect ? '✅ Correct!' : '❌ Wrong!'}
            </div>
          )}
          
          {loadingQuestions ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
              <p className="text-white/60">Loading random questions...</p>
              <p className="text-white/40 text-sm mt-2">Selecting from all subjects and topics</p>
            </div>
          ) : !gameOver ? (
            <>
              <div className="bg-black/30 p-6 rounded-xl mb-6">
                {/* Question Info */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-xs font-bold">
                    {questionInfo.subject}
                  </span>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                    {questionInfo.topic}
                  </span>
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs">
                    {questionInfo.difficulty}
                  </span>
                  <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs">
                    {questionInfo.type}
                  </span>
                </div>
                
                <div className="text-white/50 text-sm mb-2">
                  Question {currentQuestion + 1} of {questions.length}
                </div>
                
                <div className="text-white text-xl font-bold mb-6">
                  {questions[currentQuestion]?.text || "Loading question..."}
                </div>
                
                {/* Clickable MCQ Options */}
                {questions[currentQuestion]?.type === 'MCQ' && 
                 questions[currentQuestion]?.options &&
                 questions[currentQuestion]?.options!.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <p className="text-white/60 text-sm">Click an option or type the letter:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {questions[currentQuestion].options?.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectOption(idx)}
                          disabled={!isRunning}
                          className={`text-left p-3 rounded-lg text-sm transition-all ${
                            selectedOption === idx
                              ? 'bg-cyan-500/30 border border-cyan-400 text-white'
                              : 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10'
                          } ${!isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span className="font-bold text-cyan-400 mr-2">
                            {String.fromCharCode(65 + idx)}.
                          </span>
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Text input for theory OR alternative MCQ input */}
                {questions[currentQuestion]?.type !== 'MCQ' && (
                  <input
                    ref={inputRef}
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your answer..."
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white text-lg placeholder-white/40"
                    disabled={!isRunning}
                    autoFocus
                  />
                )}
                
                {questions[currentQuestion]?.type === 'MCQ' && (
                  <div className="text-white/40 text-sm mt-3">
                    Click an option above, or press A/B/C/D, then Enter to submit
                  </div>
                )}
                {questions[currentQuestion]?.type !== 'MCQ' && (
                  <div className="text-white/40 text-sm mt-3">
                    Short answer expected — press Enter to submit
                  </div>
                )}
              </div>
              
              <div className="flex gap-4">
                {!isRunning ? (
                  <button
                    onClick={startGame}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold py-4 rounded-lg text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"
                  >
                    <Zap size={20} /> Start Sprint!
                  </button>
                ) : (
                  <>
                    <button
                      onClick={checkAnswer}
                      className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-500 text-white font-bold py-4 rounded-lg text-lg hover:scale-105 transition-transform"
                    >
                      Submit Answer →
                    </button>
                    <button
                      onClick={skipQuestion}
                      className="px-4 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 transition"
                    >
                      Skip
                    </button>
                  </>
                )}
              </div>
              
              {/* Progress bar */}
              <div className="mt-6">
                <div className="flex justify-between text-white/60 text-sm mb-1">
                  <span>Progress</span>
                  <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-cyan-500 transition-all duration-300"
                    style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">
                {timeLeft === 0 ? "Time's Up!" : "Sprint Complete!"}
              </h3>
              <p className="text-white/70 mb-2">Final Score:</p>
              <p className="text-5xl font-bold text-yellow-400 mb-2">{score}</p>
              {streak >= 3 && (
                <p className="text-orange-400 text-sm mb-4">Best streak: {streak} 🔥</p>
              )}
              <p className="text-white/60 mb-6">
                You answered {currentQuestion} of {questions.length} questions
              </p>
              <div className="flex gap-4">
                <button
                  onClick={startGame}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-3 rounded-lg text-lg"
                >
                  Play Again
                </button>
                <button
                  onClick={loadRandomQuestions}
                  className="px-4 bg-white/10 text-white rounded-lg hover:bg-white/20 transition flex items-center gap-2"
                >
                  <RefreshCw size={16} /> New Questions
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Right: Instructions & Stats */}
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Target className="text-red-400" /> How to Play
            </h3>
            <ul className="space-y-3 text-white/70">
              <li className="flex items-start gap-2">
                <Zap className="text-yellow-400 mt-1" size={16} />
                <span><strong>222 seconds</strong> (3:42) to answer as many questions as possible</span>
              </li>
              <li className="flex items-start gap-2">
                <Star className="text-yellow-400 mt-1" size={16} />
                <span><strong>+100 points</strong> per correct answer, <strong>+50 bonus</strong> for 3+ streaks</span>
              </li>
              <li className="flex items-start gap-2">
                <Brain className="text-cyan-400 mt-1" size={16} />
                <span>Questions are <strong>randomly selected</strong> from all subjects and topics</span>
              </li>
              <li className="flex items-start gap-2">
                <BookOpen className="text-purple-400 mt-1" size={16} />
                <span><strong>Click options</strong> for MCQ or <strong>type answers</strong> for theory</span>
              </li>
              <li className="flex items-start gap-2">
                <Trophy className="text-yellow-400 mt-1" size={16} />
                <span>Top scores appear on the <strong>global leaderboard</strong></span>
              </li>
            </ul>
          </div>
          
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="text-green-400" /> Game Statistics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{questions.length}</div>
                <div className="text-white/60 text-sm">Questions Loaded</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">
                  {questions.filter(q => q.subject === 'Biology').length}
                </div>
                <div className="text-white/60 text-sm">Biology</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">
                  {questions.filter(q => q.subject === 'Physics').length}
                </div>
                <div className="text-white/60 text-sm">Physics</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">
                  {questions.filter(q => q.subject === 'Chemistry').length}
                </div>
                <div className="text-white/60 text-sm">Chemistry</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Brain className="text-cyan-400" /> Tips for Success
            </h3>
            <ul className="space-y-2 text-white/60 text-sm">
              <li>• <strong>Click options</strong> directly for fastest MCQ answers</li>
              <li>• Press <strong>A, B, C, D</strong> keys as shortcuts for MCQ</li>
              <li>• Press <strong>Enter</strong> to quickly submit answers</li>
              <li>• Build <strong>streaks of 3+</strong> for bonus points</li>
              <li>• Skip questions you don't know to save time</li>
              <li>• Practice all subjects for better scores</li>
            </ul>
          </div>
          
          <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 p-4 rounded-xl">
            <p className="text-white/80 text-sm">
              <strong>Note:</strong> Questions are pulled randomly from your course materials. 
              The more courses you complete, the more diverse your questions will be!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================
// LEADERBOARD VIEW
// =====================================================
export const LeaderboardView: React.FC = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData>({
    academic: [],
    challenge: [],
    assessments: []
  });
  const [activeTab, setActiveTab] = useState<'academic' | 'challenge' | 'assessments'>('academic');
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLeaderboards = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const storedUser = localStorage.getItem('newel_currentUser');
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            setUsername(user.username);
          } catch (e) {
            console.error('Failed to parse user:', e);
          }
        }
        
        const data = await getLeaderboards();
        console.log('📊 Leaderboard data loaded:', data);
        
        const safeData = {
          academic: Array.isArray(data?.academic) ? data.academic : [],
          challenge: Array.isArray(data?.challenge) ? data.challenge : [],
          assessments: Array.isArray(data?.assessments) ? data.assessments : []
        };
        
        setLeaderboardData(safeData);
        
      } catch (err) {
        console.error('❌ Error loading leaderboards:', err);
        setError('Failed to load leaderboards. Please try again later.');
        setLeaderboardData({
          academic: [],
          challenge: [],
          assessments: []
        });
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboards();
  }, []);

  const getCurrentUserRank = (entries: LeaderboardEntry[]) => {
    if (!username) return null;
    return entries.findIndex(entry => entry.username === username) + 1;
  };

  const renderTable = (entries: LeaderboardEntry[]) => {
    if (!entries || entries.length === 0) {
      return (
        <div className="text-center py-8 text-white/40">
          No data available yet. Be the first to score!
        </div>
      );
    }

    return (
      <table className="w-full text-left text-sm text-white/70">
        <thead className="bg-white/5 text-white uppercase font-bold text-xs">
          <tr>
            <th className="p-4">Rank</th>
            <th className="p-4">Student</th>
            <th className="p-4">Score</th>
            <th className="p-4">Grade</th>
            <th className="p-4 text-right">Badge</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {entries.slice(0, 40).map((entry, index) => {
            const isCurrentUser = entry.username === username;
            return (
              <tr 
                key={`${entry.username}-${index}`} 
                className={`hover:bg-white/5 transition-colors ${isCurrentUser ? 'bg-cyan-500/10 border-l-4 border-cyan-500' : ''}`}
              >
                <td className="p-4 text-white font-mono">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">#{index + 1}</span>
                    {index < 3 && (
                      <Crown className={`${
                        index === 0 ? 'text-yellow-400' : 
                        index === 1 ? 'text-gray-300' : 
                        'text-amber-700'
                      }`} size={16} />
                    )}
                  </div>
                </td>
                <td className="p-4 font-bold">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <Users size={16} />
                    </div>
                    <span className={`${isCurrentUser ? 'text-cyan-300' : 'text-white'}`}>
                      {entry.username}
                      {isCurrentUser && <span className="ml-2 text-xs bg-cyan-500/20 px-2 py-0.5 rounded">You</span>}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500" 
                        style={{ width: `${Math.min((entry.score / 1000) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-cyan-300">{Math.round(entry.score)}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-white/10">
                    Grade {entry.grade_level || 'N/A'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {index === 0 && <Award className="inline text-yellow-400" size={20} />}
                  {index === 1 && <Award className="inline text-gray-300" size={20} />}
                  {index === 2 && <Award className="inline text-amber-700" size={20} />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const getActiveEntries = () => {
    switch (activeTab) {
      case 'academic': return leaderboardData.academic;
      case 'challenge': return leaderboardData.challenge;
      case 'assessments': return leaderboardData.assessments;
      default: return [];
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
        <p className="mt-4 text-white/60">Loading leaderboards...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-white mb-2">Unable to Load Leaderboards</h3>
          <p className="text-white/70 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const currentData = leaderboardData[activeTab];
  const currentUserRank = getCurrentUserRank(currentData);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Class Leaderboards</h1>
          <p className="text-white/60">Compete with classmates and track your progress</p>
        </div>
        <Link 
          to="/sprint-challenge" 
          className="bg-gradient-to-r from-cyan-600 to-blue-500 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Zap size={20} /> Join 222-Sprint
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <Trophy className="text-yellow-400" size={32} />
            <span className="text-3xl font-bold text-white">{leaderboardData.academic.length}</span>
          </div>
          <p className="text-white/60 text-sm">Academic Leaders</p>
        </div>
        
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <Zap className="text-purple-400" size={32} />
            <span className="text-3xl font-bold text-white">{leaderboardData.challenge.length}</span>
          </div>
          <p className="text-white/60 text-sm">Sprint Challenge Champions</p>
        </div>
        
        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <Brain className="text-green-400" size={32} />
            <span className="text-3xl font-bold text-white">{leaderboardData.assessments.length}</span>
          </div>
          <p className="text-white/60 text-sm">Assessment Aces</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/5 rounded-2xl overflow-hidden">
        <div className="flex border-b border-white/10">
          {[
            { id: 'academic', label: 'Academic Scores', icon: <Trophy size={18} /> },
            { id: 'challenge', label: '222-Sprint', icon: <Zap size={18} /> },
            { id: 'assessments', label: 'Assessments', icon: <Brain size={18} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'academic' | 'challenge' | 'assessments')}
              className={`flex-1 px-6 py-4 font-semibold transition flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-cyan-600 text-white'
                  : 'text-white/60 hover:bg-white/5'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'challenge' && leaderboardData.challenge.length > 0 && (
                <span className="ml-2 px-2 py-1 bg-yellow-500 text-black text-xs rounded-full">
                  Live
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-x-auto">
          {renderTable(getActiveEntries())}
        </div>
      </div>

      {/* How to Improve Section */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-white/10 p-8 rounded-2xl">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <TrendingUp className="text-green-400" /> How to Rise in the Ranks
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-cyan-500/20 p-2 rounded-lg">
                <Target className="text-cyan-400" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-white">Complete Assessments</h4>
                <p className="text-white/60 text-sm">Every graded assessment adds to your academic score</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-purple-500/20 p-2 rounded-lg">
                <Zap className="text-purple-400" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-white">Master the Sprint</h4>
                <p className="text-white/60 text-sm">Play the 222-Sprint Challenge to boost your ranking</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-green-500/20 p-2 rounded-lg">
                <Star className="text-green-400" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-white">Study All Subjects</h4>
                <p className="text-white/60 text-sm">The Sprint Challenge pulls questions from all topics</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-yellow-500/20 p-2 rounded-lg">
                <Award className="text-yellow-400" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-white">Practice Daily</h4>
                <p className="text-white/60 text-sm">Regular practice improves both speed and accuracy</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};