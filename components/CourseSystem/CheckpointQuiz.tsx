// components/CourseSystem/CheckpointQuiz.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Question } from '../../types';
import { Timer, Loader2, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import Confetti from '../Confetti';
import { supabase } from '../../services/supabaseClient';
import { saveTheorySubmission } from '../../services/theoryGradingService';

// --- Types ---
interface Checkpoint {
  checkpoint_number: number;
  id: string;
}

interface QuestionResult {
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  options: string[];
  explanation?: string;
}

interface CheckpointQuizProps {
  checkpointId: string;
  checkpointTitle: string;
  questions: Question[];
  passThreshold: number;
  onComplete: (score: number, passed: boolean) => void;
  onClose: () => void;
  username: string;
  checkpoint: Checkpoint;
  topicId?: string;
}

// --- Helpers ---
const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, ''); // Basic sanitization
};

const getCheckpointTimeLimit = (checkpoint: Checkpoint, questions: Question[]) => {
  if (!checkpoint || !questions) return 1800;
  switch (checkpoint.checkpoint_number) {
    case 4: return questions.length * 25;
    case 5: return 1500;
    default: return questions.length * 30;
  }
};

export const CheckpointQuiz: React.FC<CheckpointQuizProps> = ({
  checkpointId,
  checkpointTitle,
  questions,
  passThreshold,
  onComplete,
  onClose,
  username,
  checkpoint,
  topicId
}) => {
  // --- State ---
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(
    getCheckpointTimeLimit(checkpoint, questions)
  );

  // --- Effects ---
  useEffect(() => {
    setTimeLeft(getCheckpointTimeLimit(checkpoint, questions));
  }, [checkpoint, questions]);

  useEffect(() => {
    if (timeLeft <= 0 || submitted || grading) return;
    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, submitted, grading]);

  useEffect(() => {
    if (timeLeft === 0 && !submitted && !grading) {
      handleSubmit(true);
    }
  }, [timeLeft]);

  // --- Handlers ---
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = useCallback((val: string) => {
    setAnswers(prev => ({ ...prev, [currentQ]: val }));
  }, [currentQ]);

  const handleSubmit = async (forced = false) => {
    setGrading(true);
    setError(null);

    try {
      const isTheoryCheckpoint = checkpoint?.checkpoint_number === 5;

      if (isTheoryCheckpoint) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .single();

        if (userData && topicId) {
          await saveTheorySubmission(
            userData.id,
            checkpointId,
            topicId,
            questions[0]?.text || '',
            sanitizeInput(answers[0] || '')
          );
          setSubmitted(true);
          onComplete(0, false);
        } else {
          throw new Error('User or topic not found');
        }
      } else {
        // MCQ Grading
        let correctCount = 0;
        const gradingResults: QuestionResult[] = [];

        questions.forEach((q, idx) => {
          if (q.type === 'MCQ' && q.correctAnswer && q.options) {
            const selectedAnswer = answers[idx] || "No Answer Selected";
            const correctLetter = q.correctAnswer.toUpperCase();
            const letterIndex = 'ABCD'.indexOf(correctLetter);
            let correctOptionText = "";

            if (letterIndex >= 0 && letterIndex < q.options.length) {
              correctOptionText = q.options[letterIndex];
            }

            const isCorrect = selectedAnswer === correctOptionText;
            if (isCorrect) correctCount++;

            gradingResults.push({
              questionText: q.text,
              userAnswer: selectedAnswer,
              correctAnswer: correctOptionText,
              isCorrect: isCorrect,
              options: q.options,
              explanation: q.explanation
            });
          }
        });

        const finalScore = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;
        
        setResults(gradingResults);
        setScore(finalScore);
        setSubmitted(true);

        if (finalScore >= passThreshold) {
          setShowConfetti(true);
        }

        onComplete(finalScore, finalScore >= passThreshold);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during grading.');
    } finally {
      setGrading(false);
    }
  };

  // --- Render Loading/Grading ---
  if (grading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" role="alert" aria-busy="true">
        <div className="text-center text-white">
          <Loader2 size={48} className="animate-spin mx-auto mb-4 text-cyan-400" />
          <h2 className="text-2xl font-bold">Grading Your Quiz...</h2>
        </div>
      </div>
    );
  }

  // --- Render Results ---
  if (submitted) {
    const isTheory = checkpoint?.checkpoint_number === 5;
    
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
        {!isTheory && showConfetti && <Confetti />}
        
        <div className="bg-slate-900 border border-white/20 rounded-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
          
          <div className="p-8 text-center border-b border-white/10">
            <h2 className="text-2xl font-bold text-white">
              {isTheory ? 'Submitted for Grading! 📝' : score >= passThreshold ? 'Checkpoint Passed! 🎉' : 'Review Needed'}
            </h2>
            <div className="text-5xl font-bold text-cyan-400 my-4">
              {isTheory ? '✓' : `${Math.round(score)}%`}
            </div>
            {!isTheory && (
              <div className={`text-lg font-bold ${score >= passThreshold ? 'text-green-400' : 'text-red-400'}`}>
                {score >= passThreshold ? `✓ Passed (Required: ${passThreshold}%)` : `✗ Need ${passThreshold}% to pass`}
              </div>
            )}
          </div>

          {/* This area allows the student to scroll through all their answers */}
          <div className="p-6 overflow-y-auto flex-grow bg-black/20">
            <h3 className="text-white/50 font-bold mb-4 uppercase text-xs">Detailed Review</h3>
            <div className="space-y-4">
              {results.map((res, idx) => (
                <div key={idx} className={`p-4 rounded-xl border ${res.isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                  <p className="text-white text-sm mb-2">{idx + 1}. {res.questionText}</p>
                  <div className="text-xs">
                    <span className="text-white/40">Your Answer: </span>
                    <span className={res.isCorrect ? 'text-green-400' : 'text-red-400'}>{res.userAnswer}</span>
                  </div>
                  {!res.isCorrect && (
                    <div className="text-xs mt-1">
                      <span className="text-white/40">Correct Answer: </span>
                      <span className="text-green-400">{res.correctAnswer}</span>
                    </div>
                  )}
                  {res.explanation && (
                    <div className="text-xs mt-2 pt-2 border-t border-white/10 text-white/60 italic">
                      {res.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* THE FIX: The button that finally closes the quiz */}
          <div className="p-6 border-t border-white/10 bg-slate-900 text-center">
            <p className="text-white/60 mb-4 text-sm">
              {isTheory 
                ? 'Your answer has been submitted for teacher grading. Check back later for your grade.'
                : score >= passThreshold
                  ? 'Great job! You can now continue.'
                  : 'Review the material and try again.'}
            </p>
            <button
              onClick={onClose}
              className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold transition-all"
            >
              Finished Reviewing
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Render Error State ---
  if (error) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-red-500/50 p-6 rounded-2xl max-w-md w-full text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold text-white mb-2">Error</h2>
          <p className="text-white/70 mb-6">{error}</p>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg">
            Close
          </button>
        </div>
      </div>
    );
  }

  const q = questions[currentQ];
  const isTheory = q.type === 'THEORY';

  // --- Render Quiz ---
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="quiz-title">
      <div className="bg-slate-900 border border-white/20 p-6 rounded-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
        
        {/* Quiz Header */}
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <h3 id="quiz-title" className="text-xl font-bold text-white">
            {checkpointTitle}{' '}
            <span className="text-sm opacity-50" aria-label={`Question ${currentQ + 1} of ${questions.length}`}>
              ({currentQ + 1}/{questions.length})
            </span>
          </h3>

          <div 
            className={`flex items-center gap-2 px-3 py-1 rounded-full font-mono font-bold border ${
              timeLeft < 60 ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
            }`}
            role="timer"
            aria-live={timeLeft < 60 ? "assertive" : "off"}
          >
            <Timer size={16} aria-hidden="true" />
            <span className="sr-only">Time Remaining:</span>
            {formatTime(timeLeft)}
          </div>

          <button 
            onClick={onClose} 
            className="text-white/50 hover:text-white focus:outline-none focus:text-white"
            aria-label="Cancel quiz"
          >
            Cancel
          </button>
        </div>

        {/* Quiz Content */}
        <div className="flex-grow overflow-y-auto mb-6">
          <p className="text-lg text-white my-6 whitespace-pre-wrap font-medium" id="question-text">
            {q.text}
          </p>

          {!isTheory ? (
            <div className="space-y-3" role="radiogroup" aria-labelledby="question-text">
              {q.options.map((opt, i) => {
                const isSelected = answers[currentQ] === opt;
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswerChange(opt)}
                    className={`w-full text-left p-4 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                      isSelected
                        ? 'bg-cyan-600/30 border-cyan-400 text-white'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                    role="radio"
                    aria-checked={isSelected}
                  >
                    <span className="inline-block w-6 font-bold opacity-50 mr-2" aria-hidden="true">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              className="w-full h-48 bg-black/30 border border-white/10 rounded-xl p-4 text-white focus:border-purple-400 outline-none resize-none focus:ring-1 focus:ring-purple-400"
              placeholder="Type your answer here..."
              value={answers[currentQ] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              aria-label="Type your answer"
            />
          )}
        </div>

        {/* Quiz Footer/Navigation */}
        <div className="flex justify-between pt-4 border-t border-white/10">
          <button
            disabled={currentQ === 0}
            onClick={() => setCurrentQ(prev => prev - 1)}
            className="text-white/50 hover:text-white disabled:opacity-30 flex items-center gap-2 px-4 py-2"
            aria-label="Previous question"
          >
            Previous
          </button>

          {currentQ < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQ(prev => prev + 1)}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold focus:ring-2 focus:ring-white"
              aria-label="Next question"
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => handleSubmit(false)}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-lg font-bold shadow-lg focus:ring-2 focus:ring-green-400"
              aria-label="Submit quiz"
            >
              Submit Quiz
            </button>
          )}
        </div>
      </div>
    </div>
  );
};