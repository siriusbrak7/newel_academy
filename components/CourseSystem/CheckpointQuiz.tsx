// components/CourseSystem/CheckpointQuiz.tsx
import React, { useState, useEffect } from 'react';
import { Question } from '../../types';
import { Timer, Loader2 } from 'lucide-react';
import Confetti from '../Confetti';
import { supabase } from '../../services/supabaseClient';
import { saveTheorySubmission } from '../../services/theoryGradingService';

interface Checkpoint {
  checkpoint_number: number;
  id: string;
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
  topicId?: string; // Add this prop
}

// ✅ TIMER CALCULATION (FINAL VERSION)
const getCheckpointTimeLimit = (
  checkpoint: Checkpoint,
  questions: Question[]
) => {
  if (!checkpoint || !questions) return 1800; // Default 30 minutes

  switch (checkpoint.checkpoint_number) {
    case 4: // Final MCQ
      // 25 seconds per question × ACTUAL number of questions
      return questions.length * 25;

    case 5: // Final Theory
      // Fixed 25 minutes
      return 1500;

    default: // Checkpoints 1–3
      // 30 seconds per question
      return questions.length * 30;
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
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [grading, setGrading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(
    getCheckpointTimeLimit(checkpoint, questions)
  );

  // Recalculate timer if checkpoint or questions change
  useEffect(() => {
    setTimeLeft(getCheckpointTimeLimit(checkpoint, questions));
  }, [checkpoint, questions]);

  // Countdown
  useEffect(() => {
    if (timeLeft <= 0 || submitted || grading) return;

    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, submitted, grading]);

  // Auto-submit on timeout
  useEffect(() => {
    if (timeLeft === 0 && !submitted && !grading) {
      alert("Time's up! Submitting now.");
      handleSubmit(true);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (val: string) => {
    setAnswers({ ...answers, [currentQ]: val });
  };

  const handleSubmit = async (forced = false) => {
    setGrading(true);

    // Check if this is a theory question (Checkpoint 5)
    const isTheoryCheckpoint = checkpoint?.checkpoint_number === 5;
    
    if (isTheoryCheckpoint) {
      // For theory questions, save submission for teacher grading
      try {
        // Get user ID first
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .single();

        if (userData && topicId) {
          // Save theory submission
          await saveTheorySubmission(
            userData.id,
            checkpointId,
            topicId,
            questions[0]?.text || '',
            answers[0] || '' // Use first answer for theory questions
          );

          alert('Theory answer submitted! Teacher will grade it soon.');
          setSubmitted(true);
          onComplete(0, false); // Temporary score until graded
        } else {
          throw new Error('User or topic not found');
        }
      } catch (error) {
        console.error('Error saving theory submission:', error);
        alert('Failed to submit answer. Please try again.');
      } finally {
        setGrading(false);
      }
      return;
    }

    // Original MCQ grading logic for checkpoints 1-4
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (q.type === 'MCQ' && answers[idx] === q.correctAnswer) {
        correctCount++;
      }
    });

    const finalScore = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;
    setScore(finalScore);
    setSubmitted(true);
    setGrading(false);

    if (finalScore >= passThreshold) {
      setShowConfetti(true);
    }

    onComplete(finalScore, finalScore >= passThreshold);
  };

  // ===== GRADING SCREEN =====
  if (grading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
        <div className="text-center text-white">
          <Loader2
            size={48}
            className="animate-spin mx-auto mb-4 text-cyan-400"
          />
          <h2 className="text-2xl font-bold">Grading Your Quiz...</h2>
        </div>
      </div>
    );
  }

  // ===== RESULT SCREEN =====
  if (submitted) {
    const isTheory = checkpoint?.checkpoint_number === 5;
    
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        {!isTheory && showConfetti && <Confetti />}
        <div className="bg-slate-900 border border-white/20 p-8 rounded-2xl max-w-md w-full text-center relative z-10">
          <h2 className="text-2xl font-bold text-white mb-4">
            {isTheory ? 'Theory Submitted! 📝' : 
             score >= passThreshold ? 'Checkpoint Passed! 🎉' : 'Keep Practicing'}
          </h2>

          {!isTheory ? (
            <div className="space-y-4 mb-6">
              <div className="text-5xl font-bold text-cyan-400">
                {Math.round(score)}%
              </div>
              <div
                className={`text-lg font-bold ${
                  score >= passThreshold ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {score >= passThreshold
                  ? `✓ Passed (Required: ${passThreshold}%)`
                  : `✗ Need ${passThreshold}% to pass`}
              </div>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              <div className="text-4xl mb-2">📤</div>
              <div className="text-lg font-bold text-purple-400">
                Your theory answer has been submitted
              </div>
              <p className="text-white/60 text-sm">
                Your teacher will review and grade it soon. 
                You'll receive your score and feedback when it's graded.
              </p>
            </div>
          )}

          <p className="text-white/60 mb-6">
            {isTheory 
              ? 'Check back later for your grade and feedback.'
              : score >= passThreshold
                ? 'Great job! You can now continue.'
                : 'Review the material and try again.'}
          </p>

          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const q = questions[currentQ];
  const isTheory = q.type === 'THEORY';

  // ===== QUIZ UI =====
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/20 p-6 rounded-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <h3 className="text-xl font-bold text-white">
            {checkpointTitle}{' '}
            <span className="text-sm opacity-50">
              ({currentQ + 1}/{questions.length})
            </span>
            {isTheory && (
              <span className="ml-2 text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                THEORY
              </span>
            )}
          </h3>

          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full font-mono font-bold border ${
              timeLeft < 60
                ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse'
                : isTheory
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
            }`}
          >
            <Timer size={16} />
            {formatTime(timeLeft)}
          </div>

          <button onClick={onClose} className="text-white/50 hover:text-white">
            Cancel
          </button>
        </div>

        <div className="flex-grow overflow-y-auto mb-6">
          <span
            className={`text-xs px-2 py-1 rounded ${
              isTheory
                ? 'bg-purple-900 text-purple-200'
                : 'bg-cyan-900 text-cyan-200'
            }`}
          >
            {isTheory ? 'THEORY (Teacher Graded)' : 'MCQ (Auto-graded)'}
          </span>

          {isTheory && (
            <div className="mt-2 mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <p className="text-sm text-purple-300">
                📝 <strong>Note:</strong> This is a theory question. Your answer will be reviewed and graded by your teacher.
              </p>
            </div>
          )}

          <p className="text-lg text-white my-6 whitespace-pre-wrap">
            {q.text}
          </p>

          {!isTheory ? (
            <div className="space-y-3">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswerChange(opt)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    answers[currentQ] === opt
                      ? 'bg-cyan-600/30 border-cyan-400 text-white'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <span className="inline-block w-6 font-bold opacity-50 mr-2">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              className="w-full h-48 bg-black/30 border border-white/10 rounded-xl p-4 text-white focus:border-purple-400 outline-none resize-none"
              placeholder="Type your detailed answer here... (Will be graded by teacher)"
              value={answers[currentQ] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
            />
          )}
        </div>

        <div className="flex justify-between pt-4 border-t border-white/10">
          <button
            disabled={currentQ === 0}
            onClick={() => setCurrentQ(prev => prev - 1)}
            className="text-white/50 hover:text-white disabled:opacity-30"
          >
            Previous
          </button>

          {currentQ < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQ(prev => prev + 1)}
              className={`px-6 py-2 rounded-lg font-bold ${
                isTheory
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white'
              }`}
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => handleSubmit(false)}
              className={`px-6 py-2 rounded-lg font-bold shadow-lg ${
                isTheory
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white'
              }`}
            >
              {isTheory ? 'Submit for Teacher Grading' : 'Submit Quiz'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};