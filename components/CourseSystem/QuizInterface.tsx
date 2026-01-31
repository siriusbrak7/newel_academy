// components/CourseSystem/QuizInterface.tsx
import React, { useState, useEffect } from 'react';
import { Question, Submission } from '../../types';
import { getAITutorResponse } from "../../services/geminiService";
import { saveSubmission } from '../../services/storageService';
import { Timer, CheckCircle, Loader2, X } from 'lucide-react';
import Confetti from '../Confetti';

interface QuizProps {
  title: string;
  questions: Question[];
  onComplete: (score: number, passed: boolean) => void;
  passThreshold: number;
  onClose: () => void;
  isAssessment?: boolean;
  isCourseFinal?: boolean;
  assessmentId?: string;
  username?: string;
}

export const QuizInterface: React.FC<QuizProps> = ({ 
  title, questions, onComplete, passThreshold, onClose, 
  isAssessment, isCourseFinal, assessmentId, username 
}) => {
  const [currentQ, setCurrentQ] = useState(0);
  // Store answers keyed by question ID. For MCQ store the selected index (number). For THEORY store the text (string).
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [grading, setGrading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [totalDuration, setTotalDuration] = useState(0);

  useEffect(() => {
    console.log('QuizInterface mounted:', { 
      title, 
      questionCount: questions.length,
      questionTypes: questions.map(q => q.type),
      isCourseFinal,
      isAssessment 
    });
    
    if (isAssessment || isCourseFinal) {
      let seconds = 0;
      questions.forEach(q => {
        if (q.type === 'MCQ') {
          seconds += 25; // 25 seconds per MCQ
          console.log('Added 25 seconds for MCQ question');
        }
        if (q.type === 'THEORY') {
          seconds += (25 * 60); // 25 minutes per theory question (25 × 60 = 1500 seconds)
          console.log('Added 25 minutes (1500 seconds) for THEORY question');
        }
      });
      
      // Ensure minimum 1 minute timer
      if (seconds < 60) seconds = 60;
      
      
      
      setTimeLeft(seconds);
      setTotalDuration(seconds);
    }
  }, [questions, isAssessment, isCourseFinal]);

  useEffect(() => {
    if (timeLeft === null || submitted || grading) return;
    
    if (timeLeft <= 0) {
      
      handleSubmit(true);
      return;
    }
    
    const timerId = setInterval(() => {
      setTimeLeft(prev => (prev !== null ? prev - 1 : 0));
    }, 1000);
    
    return () => clearInterval(timerId);
  }, [timeLeft, submitted, grading]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (val: number | string, questionId?: string) => {
    const qId = questionId || questions[currentQ]?.id;
    if (!qId) return;
    setAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const handleTeacherAssignedSubmit = () => {
    
    
    if (assessmentId && username) {
      const answersMap: Record<string, string> = {};
      questions.forEach((q) => {
        const val = answers[q.id];
        if (q.type === 'MCQ' && typeof val === 'number' && Array.isArray(q.options)) {
          answersMap[q.id] = q.options[val];
        } else {
          answersMap[q.id] = String(val || '');
        }
      });
      
      const submission: Submission = {
        assessmentId,
        username,
        answers: answersMap,
        submittedAt: Date.now(),
        graded: false
      };
      
      
      saveSubmission(submission);
      setSubmitted(true);
    } else {
      console.error('Missing data for teacher submission:', { assessmentId, username });
      alert('Missing assessment data. Please contact your teacher.');
    }
  };

   const handleCourseAssessmentSubmit = async () => {
  console.log('=== FINAL ASSESSMENT SUBMISSION START ===');
  console.log('handleCourseAssessmentSubmit called', {
    questionCount: questions.length,
    isCourseFinal,
    assessmentId,
    username
  });
  
  setGrading(true);
  let mcqScore = 0;
  let mcqCount = 0;
  let theoryScore = 0;
  let theoryFeedback = '';

  try {
    // Grade MCQ questions (use indices/text conversion)
    questions.forEach((q) => {
      if (q.type === 'MCQ') {
        mcqCount++;
        const sel = answers[q.id];
        const userSelectedText = (typeof sel === 'number' && Array.isArray(q.options)) ? q.options[sel] : String(sel || '');

        let correctOptionText = String(q.correctAnswer || '');
        if (typeof q.correctAnswer === 'string' && q.correctAnswer.length === 1) {
          const letterIndex = 'ABCD'.indexOf(q.correctAnswer.toUpperCase());
          if (letterIndex >= 0 && letterIndex < q.options.length) {
            correctOptionText = q.options[letterIndex];
          }
        }

        if (userSelectedText === correctOptionText) {
          mcqScore++;
          console.log(`MCQ: Correct! Answer: ${userSelectedText}, Correct: ${correctOptionText}`);
        } else {
          console.log(`MCQ: Incorrect. Answer: ${userSelectedText}, Correct: ${correctOptionText}`);
        }
      }
    });

    console.log('MCQ Results:', { mcqScore, mcqCount });

    // Grade theory question
    const theoryQIndex = questions.findIndex(q => q.type === 'THEORY');
    console.log('Theory question search:', { theoryQIndex, questions: questions.map(q => q.type) });
    
    if (theoryQIndex >= 0) {
      const q = questions[theoryQIndex];
      const studentAns = String(answers[q.id] || "No answer provided.");
      console.log('Theory question found:', {
        questionText: q.text?.substring(0, 100) + '...',
        answerLength: studentAns.length,
        hasAnswer: !!answers[q.id]
      });
      
      try {
        console.log('Calling Gemini AI for grading...');
        const aiResponse = await getAITutorResponse(
          `Grade this essay. Question: "${q.text}" Answer: "${studentAns}" Return ONLY JSON: {"score": 85, "feedback": "Good..."}`
        );
        console.log('Gemini raw response:', aiResponse);
        
        // Clean JSON response
        const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        console.log('Cleaned JSON:', cleanJson);
        
        const result = JSON.parse(cleanJson);
        theoryScore = result.score || 0;
        theoryFeedback = result.feedback || "Newel Graded.";
        
        console.log('AI Grading result:', { theoryScore, feedbackLength: theoryFeedback.length });
      } catch (e) {
        console.error('Gemini API error:', e);
        // Fallback scoring based on answer length
        theoryScore = studentAns.length > 50 ? 70 : 40;
        theoryFeedback = "Newel grading unavailable. Score based on answer length.";
        console.log('Using fallback scoring:', { theoryScore, answerLength: studentAns.length });
      }
    } else {
      console.log('No theory question found in this assessment');
    }

    // Calculate final score
    let finalPercent = 0;
    console.log('Score calculation inputs:', { theoryQIndex, mcqCount, theoryScore, mcqScore });
    
    // IMPORTANT: For YOUR system, final assessments should be 100% theory or 100% MCQ
    // Check if this is a THEORY-only final assessment
    const hasTheory = theoryQIndex >= 0;
    const hasMCQ = mcqCount > 0;
    
    if (hasTheory && hasMCQ) {
      // Mixed assessment - use 70% MCQ, 30% Theory weighting
      const mcqPercent = (mcqScore / mcqCount) * 100;
      finalPercent = (mcqPercent * 0.7) + (theoryScore * 0.3);
      console.log('Mixed assessment (70% MCQ, 30% Theory):', { 
        mcqPercent, theoryScore, finalPercent 
      });
    } else if (hasMCQ) {
      // MCQ-only assessment
      finalPercent = (mcqScore / mcqCount) * 100;
      console.log('MCQ-only assessment:', { finalPercent });
    } else if (hasTheory) {
      // Theory-only assessment (YOUR FINAL ASSESSMENTS)
      finalPercent = theoryScore;
      console.log('Theory-only assessment (Final Assessment):', { finalPercent });
    } else {
      // No questions - this shouldn't happen
      finalPercent = 0;
      console.error('No questions found in assessment!');
    }

    console.log('Final score calculated:', { finalPercent, rounded: Math.round(finalPercent) });
    
    // Update UI state
    setScore(finalPercent);
    setFeedback(theoryFeedback);
    setSubmitted(true);
    
    if (finalPercent >= passThreshold) {
      console.log('Passed! Showing confetti');
      setShowConfetti(true);
    } else {
      console.log('Not passed:', { finalPercent, passThreshold });
    }
    
    // Save submission to database
    if (username && assessmentId) {
      const answersMap: Record<string, string> = {};
      questions.forEach((q, idx) => {
        const val = answers[q.id];
        if (q.id) {
          if (q.type === 'MCQ' && typeof val === 'number' && Array.isArray(q.options)) {
            answersMap[q.id] = q.options[val];
          } else {
            answersMap[q.id] = String(val || '');
          }
        } else {
          console.error('Question missing ID:', q);
          answersMap[`q${idx}`] = String(answers[q.id] || '');
        }
      });

      // Build submission object - match what your database expects
      const submission: Submission = {
        assessmentId: assessmentId,
        username: username,
        answers: answersMap,
        submittedAt: Date.now(), // timestamp in milliseconds
        graded: true,
        score: Math.round(finalPercent),
        feedback: theoryFeedback || `Auto-graded with score: ${Math.round(finalPercent)}%`,
        ai_graded: true
      };
      
      console.log('Saving final assessment submission:', submission);
      
      try {
        await saveSubmission(submission);
        console.log('Submission saved successfully');
      } catch (saveError) {
        console.error('Failed to save submission:', saveError);
        // Continue anyway - the UI should still update
      }
    } else {
      console.error('Missing username or assessmentId:', { username, assessmentId });
    }
    
    console.log('=== FINAL ASSESSMENT SUBMISSION END ===');
    
    // Call the completion callback
    onComplete(finalPercent, finalPercent >= passThreshold);
    
  } catch (error) {
    console.error('Critical error in handleCourseAssessmentSubmit:', error);
    alert('An error occurred while submitting your assessment. Please try again.');
  } finally {
    setGrading(false);
  }
};

  const handleCheckpointSubmit = () => {
  let rawScore = 0;
  let mcqCount = 0;

  questions.forEach((q) => {
    if (q.type === 'MCQ') {
      mcqCount++;
      const sel = answers[q.id];
      const selectedText = (typeof sel === 'number' && Array.isArray(q.options)) ? q.options[sel] : String(sel || '');

      let correctOptionText = String(q.correctAnswer || '');
      if (typeof q.correctAnswer === 'string' && q.correctAnswer.length === 1) {
        const letterIndex = 'ABCD'.indexOf(q.correctAnswer.toUpperCase());
        if (letterIndex >= 0 && letterIndex < q.options.length) {
          correctOptionText = q.options[letterIndex];
        }
      }

      if (selectedText === correctOptionText) rawScore++;
    }
  });
  
  const finalScore = mcqCount > 0 ? (rawScore / mcqCount) * 100 : 0;
  
  setScore(finalScore);
  setSubmitted(true);
  
  if (finalScore >= passThreshold) {
    setShowConfetti(true);
  }
  
  onComplete(finalScore, finalScore >= passThreshold);
};

  const handleSubmit = (forced = false) => {
    
    
    if (forced && !submitted) {
      
      alert("Time's up! Submitting now.");
    }
    
    if (isAssessment) {
      
      handleTeacherAssignedSubmit();
    } else if (isCourseFinal) {
      
      handleCourseAssessmentSubmit();
    } else {
      
      handleCheckpointSubmit();
    }
  };

  if (grading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
        <div className="text-center text-white">
          <Loader2 size={48} className="animate-spin mx-auto mb-4 text-cyan-400"/>
          <h2 className="text-2xl font-bold">Newel is Grading your Essay...</h2>
          <p className="text-white/50">Analyzing your reflection. This may take a moment.</p>
          <div className="mt-4 text-sm text-white/30">
            <p>Questions: {questions.length}</p>
            <p>Type: {isCourseFinal ? 'Final Assessment' : 'Regular Quiz'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        {showConfetti && <Confetti />}
        <div className="bg-slate-900 border border-white/20 p-8 rounded-2xl max-w-md w-full text-center relative z-10">
          <h2 className="text-2xl font-bold text-white mb-4">
            {isAssessment ? 'Assessment Submitted' : (score >= passThreshold ? 'Passed! 🎉' : 'Keep Trying')}
          </h2>
          {!isAssessment && (
            <div className="space-y-4 mb-6">
              <div className="text-5xl font-bold text-cyan-400">{Math.round(score)}%</div>
              <div className="text-sm text-white/60">
                Passing threshold: {passThreshold}%
              </div>
              {feedback && (
                <div className="bg-white/10 p-3 rounded text-sm text-left text-white/80 max-h-32 overflow-y-auto">
                  <strong>Newel Feedback:</strong><br/>{feedback}
                </div>
              )}
            </div>
          )}
          <p className="text-white/60 mb-6">
            {isAssessment 
              ? 'Answers sent to teacher for grading.' 
              : (score >= passThreshold ? 'Great job!' : 'Review and try again.')}
          </p>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg">
            Close
          </button>
        </div>
      </div>
    );
  }

  // Safety check - if no questions or current question doesn't exist
  if (questions.length === 0) {
    console.error('No questions provided to QuizInterface');
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-white/20 p-8 rounded-2xl max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-white mb-4">No Questions Available</h2>
          <p className="text-white/60 mb-6">No questions were loaded for this quiz.</p>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg">
            Close
          </button>
        </div>
      </div>
    );
  }

  const q = questions[currentQ];
  
  if (!q) {
    console.error('Current question is undefined:', { currentQ, questions });
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-white/20 p-8 rounded-2xl max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-white mb-4">Question Error</h2>
          <p className="text-white/60 mb-6">Could not load question {currentQ + 1}.</p>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/20 p-6 rounded-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <h3 className="text-xl font-bold text-white">
            {title} <span className="text-sm font-normal opacity-50">({currentQ + 1}/{questions.length})</span>
          </h3>
          
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full font-mono font-bold border ${
              timeLeft < 60 ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' : 
              timeLeft < 300 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 
              'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
            }`}>
              <Timer size={16} />
              {formatTime(timeLeft)}
              <span className="text-xs opacity-70">
                ({Math.floor(timeLeft / 60)}m)
              </span>
            </div>
          )}

          <button onClick={onClose} className="text-white/50 hover:text-white">Cancel</button>
        </div>

        <div className="flex-grow overflow-y-auto mb-6">
          <div className="flex justify-between mb-2">
            <span className={`text-xs px-2 py-1 rounded ${
              q.type === 'MCQ' ? 'bg-cyan-900 text-cyan-200' : 
              q.type === 'THEORY' ? 'bg-purple-900 text-purple-200' :
              'bg-white/10 text-white'
            }`}>
              {q.type}
            </span>
            {q.difficulty && (
              <span className="text-xs text-white/50">
                Difficulty: {q.difficulty}
              </span>
            )}
          </div>
          <p className="text-lg text-white mb-6 font-medium whitespace-pre-wrap">{q.text}</p>
          
          {q.type === 'MCQ' ? (
            <div className="space-y-3">
              {q.options && q.options.map((opt, i) => {
                const isSelected = answers[q.id] === i;
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswerChange(i, q.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-cyan-600/30 border-cyan-400 text-white'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                    role="radio"
                    aria-checked={isSelected ? 'true' : 'false'}
                  >
                    <span className="inline-block w-6 font-bold opacity-50 mr-2">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <textarea
                className="w-full h-48 bg-black/30 border border-white/10 rounded-xl p-4 text-white focus:border-cyan-400 outline-none resize-none"
                placeholder="Type your detailed reflective essay here..."
                value={String(answers[q.id] || '')}
                onChange={(e) => handleAnswerChange(e.target.value, q.id)}
              />
              <div className="text-xs text-white/50 mt-2">
                Answer length: {String(answers[q.id])?.length || 0} characters
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t border-white/10">
          <button 
            disabled={currentQ === 0}
            onClick={() => setCurrentQ(prev => prev - 1)}
            className="text-white/50 hover:text-white disabled:opacity-30 px-4 py-2 rounded"
          >
            ← Previous
          </button>
          
          <div className="text-xs text-white/50">
            Question {currentQ + 1} of {questions.length}
          </div>
          
          {currentQ < questions.length - 1 ? (
            <button 
              onClick={() => setCurrentQ(prev => prev + 1)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-bold"
            >
              Next →
            </button>
          ) : (
            <button 
              onClick={() => handleSubmit(false)}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg"
            >
              {isAssessment ? 'Submit for Grading' : 'Finish & Grade'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};