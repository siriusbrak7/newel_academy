import React, { useState, useEffect, useCallback } from 'react';
import { Question } from '../../types';
import { Timer, Loader2, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import Confetti from '../Confetti';
import { supabase } from '../../services/supabaseClient';
import { saveTheorySubmission } from '../../services/theoryGradingService';
import { gradeQuiz, submitQuizWithAnswers } from '../../src/utils/quiz-utils';

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
  onComplete: (score: number, passed: boolean, results?: any) => void;
  onClose: () => void;
  username: string;
  checkpoint: Checkpoint;
  topicId?: string;
  // NEW: Add mode prop
  mode?: 'quiz' | 'review';
  // NEW: Add results prop for review mode
  reviewResults?: {
    score: number;
    passed: boolean;
    results: QuestionResult[];
  };
}

// --- Helpers ---
const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, ''); // Basic sanitization
};

const normalizeAnswer = (text: string): string => {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ');    // Normalize whitespace
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
  topicId,
  // NEW: Default to quiz mode
  mode = 'quiz',
  // NEW: Optional review results
  reviewResults
}) => {
  // --- State ---
  const [currentQ, setCurrentQ] = useState(0);
  // Store answers keyed by question ID. For MCQ store the selected index (number). For THEORY store the text (string).
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [submitted, setSubmitted] = useState(mode === 'review'); // Start submitted in review mode
  const [score, setScore] = useState(mode === 'review' ? reviewResults?.score || 0 : 0);
  const [results, setResults] = useState<QuestionResult[]>(
    mode === 'review' ? reviewResults?.results || [] : []
  );
  const [showConfetti, setShowConfetti] = useState(false);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(
    mode === 'quiz' ? getCheckpointTimeLimit(checkpoint, questions) : 0
  );

  // --- Effects ---
  useEffect(() => {
    if (mode === 'quiz') {
      setTimeLeft(getCheckpointTimeLimit(checkpoint, questions));
    }
  }, [checkpoint, questions, mode]);

  useEffect(() => {
    if (timeLeft <= 0 || submitted || grading || mode === 'review') return;
    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, submitted, grading, mode]);

  useEffect(() => {
    if (timeLeft === 0 && !submitted && !grading && mode === 'quiz') {
      handleSubmit(true);
    }
  }, [timeLeft]);

  // --- Handlers ---
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = useCallback((val: number | string, questionId?: string) => {
    const qId = questionId || questions[currentQ]?.id;
    if (!qId) return;
    setAnswers(prev => ({ ...prev, [qId]: val }));
  }, [currentQ, questions]);

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
          const theoryQId = questions[0]?.id;
          const theoryAns = theoryQId ? String(answers[theoryQId] || '') : '';
          await saveTheorySubmission(
            userData.id,
            checkpointId,
            topicId,
            questions[0]?.text || '',
            sanitizeInput(theoryAns)
          );
          setSubmitted(true);
          onComplete(0, false, []);
        } else {
          throw new Error('User or topic not found');
        }
      } else {
        // MCQ Grading (now supports storing indices for MCQ answers)
        let correctCount = 0;
        const gradingResults: QuestionResult[] = [];
        let mcqCount = 0;

        questions.forEach((q) => {
          if (q.type === 'MCQ' && q.options && q.options.length) {
            mcqCount++;
            const selectedIndex = answers[q.id];
            
            // Get the user's selected answer text
            let userAnswerText = 'No Answer Selected';
            if (typeof selectedIndex === 'number' && selectedIndex >= 0 && selectedIndex < q.options.length) {
              userAnswerText = q.options[selectedIndex];
            } else if (typeof selectedIndex === 'string') {
              userAnswerText = selectedIndex;
            }
            
            // Get correct answer (already full text from database)
            const correctAnswerText = String(q.correctAnswer || '').trim();
            
            // Compare text directly (case-insensitive, trimmed)
            const isCorrect = userAnswerText.trim().toLowerCase() === correctAnswerText.toLowerCase();
            
            if (isCorrect) correctCount++;

            gradingResults.push({
              questionText: q.text,
              userAnswer: userAnswerText,
              correctAnswer: correctAnswerText,
              isCorrect,
              options: q.options,
              explanation: q.explanation
            });
          }
        });

        const finalScore = mcqCount > 0 ? (correctCount / mcqCount) * 100 : 0;
        
        setResults(gradingResults);
        setScore(finalScore);
        setSubmitted(true);

        if (finalScore >= passThreshold) {
          setShowConfetti(true);
        }

        // Pass results to parent component
        onComplete(finalScore, finalScore >= passThreshold, gradingResults);

        // OPTIONAL: Try to persist a submission record with answers as text
        if (username) {
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('id')
              .eq('username', username)
              .single();

            const userId = userData?.id;
            if (userId) {
              // Build selectedAnswers as Record<questionId, index>
              const selectedIndices: Record<string, number> = {};
              questions.forEach((q) => {
                const sel = answers[q.id];
                if (typeof sel === 'number') selectedIndices[q.id] = sel;
              });

              // Save submission (converts indices to text internally)
              await submitQuizWithAnswers(checkpointId, userId, username, selectedIndices);
            }
          } catch (e) {
            console.error('Failed to save automatic submission:', e);
          }
        }
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
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="quiz-result-title">
        {!isTheory && showConfetti && <Confetti />}
        
        <div className="bg-slate-900 border border-white/20 rounded-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden my-8 shadow-2xl">
          
          <div className="p-8 text-center border-b border-white/10 shrink-0 bg-slate-900 z-10">
            <h2 id="quiz-result-title" className="text-2xl font-bold text-white mb-4">
              {isTheory ? 'Submitted! 📝' : 
               mode === 'review' ? 'Review Results 📊' :
               score >= passThreshold ? 'Checkpoint Passed! 🎉' : 'Review Your Answers'}
            </h2>

            {!isTheory ? (
              <div className="space-y-2 mb-2">
                <div className="text-5xl font-bold text-cyan-400" aria-label={`Score: ${Math.round(score)} percent`}>
                  {Math.round(score)}%
                </div>
                <div className={`text-lg font-bold ${score >= passThreshold ? 'text-green-400' : 'text-red-400'}`}>
                  {score >= passThreshold ? `✓ Passed (Required: ${passThreshold}%)` : `✗ Need ${passThreshold}% to pass`}
                </div>
              </div>
            ) : (
              <div className="text-lg font-bold text-purple-400 mb-4">
                Submitted for Teacher Grading
              </div>
            )}
          </div>

          {!isTheory && results.length > 0 && (
            <div className="p-6 overflow-y-auto flex-grow bg-black/20" tabIndex={0} aria-label="Detailed Quiz Review">
              <h3 className="text-white/80 font-bold mb-4 uppercase text-sm tracking-wider flex items-center gap-2">
                <Info size={16} /> Detailed Review
              </h3>
              
              <div className="space-y-4">
                {results.map((res, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-xl border ${
                      res.isCorrect 
                        ? 'bg-green-500/10 border-green-500/30' 
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="mt-1" aria-hidden="true">
                        {res.isCorrect ? <CheckCircle className="text-green-400" size={20} /> : <XCircle className="text-red-400" size={20} />}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium mb-3 text-sm">
                          <span className="sr-only">Question {idx + 1}:</span> {res.questionText}
                        </p>
                        
                        <div className="text-xs space-y-2">
                          <div className={`flex items-center gap-2 p-2 rounded ${
                            res.isCorrect ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'
                          }`}>
                            <span className="font-bold">Your Answer:</span>
                            <span>{res.userAnswer}</span>
                          </div>

                          {!res.isCorrect && (
                            <div className="flex items-center gap-2 p-2 rounded bg-green-500/10 text-green-300 border border-green-500/20">
                              <span className="font-bold">Correct Answer:</span>
                              <span>{res.correctAnswer}</span>
                            </div>
                          )}

                          {/* UPDATED: New Explanation UI */}
                          {res.explanation && (
                            <div className="mt-3 p-3 rounded bg-cyan-900/20 border border-cyan-500/30">
                              <div className="flex items-center gap-2 mb-1">
                                <Info className="text-cyan-400" size={14} />
                                <span className="text-cyan-300 text-xs font-medium">Explanation</span>
                              </div>
                              <p className="text-white/80 text-sm italic">{res.explanation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-6 border-t border-white/10 shrink-0 bg-slate-900 text-center">
            <p className="text-white/60 mb-4 text-sm">
              {isTheory 
                ? 'Check back later for your grade.'
                : mode === 'review'
                  ? 'Review your previous attempt.'
                  : score >= passThreshold
                    ? 'Great job! You can now continue.'
                    : 'Review the material and try again.'}
            </p>
            <button
              onClick={onClose}
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-xl font-bold transition-colors w-full sm:w-auto focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              aria-label="Close results"
            >
              {mode === 'review' ? 'Close Review' : 'Close Results'}
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

  // --- If in review mode with no results, show message ---
  if (mode === 'review' && (!reviewResults || !reviewResults.results || reviewResults.results.length === 0)) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-white/20 p-8 rounded-2xl max-w-md w-full text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-yellow-400" />
          <h2 className="text-xl font-bold text-white mb-2">No Review Available</h2>
          <p className="text-white/70 mb-6">No previous attempt results found for this checkpoint.</p>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg">
            Close
          </button>
        </div>
      </div>
    );
  }

  // --- Render Quiz (only for quiz mode) ---
  const q = questions[currentQ];
  const isTheory = q.type === 'THEORY';

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
                const isSelected = answers[q.id] === i;
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswerChange(i, q.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                      isSelected
                        ? 'bg-cyan-600/30 border-cyan-400 text-white'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                    role="radio"
                    aria-checked={isSelected ? 'true' : 'false'}
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
              value={String(answers[q.id] || '')}
              onChange={(e) => handleAnswerChange(e.target.value, q.id)}
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