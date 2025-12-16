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
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [grading, setGrading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [totalDuration, setTotalDuration] = useState(0);

  useEffect(() => {
    if (isAssessment || isCourseFinal) {
      let seconds = 0;
      questions.forEach(q => {
        if (q.type === 'MCQ') seconds += 25;
        if (q.type === 'THEORY') seconds += (20 * 60);
      });
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

  const handleAnswerChange = (val: string) => {
    setAnswers({ ...answers, [currentQ]: val });
  };

  const handleTeacherAssignedSubmit = () => {
    if (assessmentId && username) {
      const answersMap: Record<string, string> = {};
      questions.forEach((q, idx) => {
        answersMap[q.id] = answers[idx] || '';
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
    }
  };

  const handleCourseAssessmentSubmit = async () => {
    setGrading(true);
    let mcqScore = 0;
    let mcqCount = 0;
    let theoryScore = 0;
    let theoryFeedback = '';

    questions.forEach((q, idx) => {
      if (q.type === 'MCQ') {
        mcqCount++;
        if (answers[idx] === q.correctAnswer) mcqScore++;
      }
    });

    const theoryQIndex = questions.findIndex(q => q.type === 'THEORY');
    if (theoryQIndex >= 0) {
      const q = questions[theoryQIndex];
      const studentAns = answers[theoryQIndex] || "No answer provided.";
      try {
        const aiResponse = await getAITutorResponse(
          `Grade this essay. Question: "${q.text}" Answer: "${studentAns}" Return ONLY JSON: {"score": 85, "feedback": "Good..."}`
        );
        const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanJson);
        theoryScore = result.score || 0;
        theoryFeedback = result.feedback || "AI Graded.";
      } catch (e) {
        theoryScore = studentAns.length > 50 ? 70 : 40;
        theoryFeedback = "AI grading unavailable.";
      }
    }

    let finalPercent = 0;
    if (theoryQIndex >= 0 && mcqCount > 0) {
      const mcqPercent = (mcqScore / mcqCount) * 100;
      finalPercent = (mcqPercent * 0.7) + (theoryScore * 0.3);
    } else if (mcqCount > 0) {
      finalPercent = (mcqScore / mcqCount) * 100;
    } else {
      finalPercent = theoryScore;
    }

    setScore(finalPercent);
    setFeedback(theoryFeedback);
    setSubmitted(true);
    setGrading(false);
    if (finalPercent >= passThreshold) setShowConfetti(true);
    
    if (username) {
      const answersMap: Record<string, string> = {};
      questions.forEach((q, idx) => {
        answersMap[q.id] = answers[idx] || '';
      });
      const submission: Submission = {
        assessmentId: assessmentId || `course_final_${title.replace(/\s/g, '_')}`,
        username,
        answers: answersMap,
        submittedAt: Date.now(),
        graded: true,
        score: Math.round(finalPercent),
        feedback: `[AI AUTO-GRADE]\nTheory Feedback: ${theoryFeedback}`,
        aiGraded: true
      };
      saveSubmission(submission);
    }
    onComplete(finalPercent, finalPercent >= passThreshold);
  };

  const handleCheckpointSubmit = () => {
    let rawScore = 0;
    questions.forEach((q, idx) => {
      if (q.type === 'MCQ' && answers[idx] === q.correctAnswer) rawScore++;
    });
    const finalScore = questions.length > 0 ? (rawScore / questions.length) * 100 : 0;
    setScore(finalScore);
    setSubmitted(true);
    if (finalScore >= passThreshold) setShowConfetti(true);
    onComplete(finalScore, finalScore >= passThreshold);
  };

  const handleSubmit = (forced = false) => {
    if (forced && !submitted) alert("Time's up! Submitting now.");
    if (isAssessment) handleTeacherAssignedSubmit();
    else if (isCourseFinal) handleCourseAssessmentSubmit();
    else handleCheckpointSubmit();
  };

  if (grading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
        <div className="text-center text-white">
          <Loader2 size={48} className="animate-spin mx-auto mb-4 text-cyan-400"/>
          <h2 className="text-2xl font-bold">AI is Grading your Essay...</h2>
          <p className="text-white/50">Analyzing your reflection.</p>
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
              {feedback && (
                <div className="bg-white/10 p-3 rounded text-sm text-left text-white/80 max-h-32 overflow-y-auto">
                  <strong>AI Feedback:</strong><br/>{feedback}
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

  const q = questions[currentQ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/20 p-6 rounded-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <h3 className="text-xl font-bold text-white">
            {title} <span className="text-sm font-normal opacity-50">({currentQ + 1}/{questions.length})</span>
          </h3>
          
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full font-mono font-bold border ${
              timeLeft < 60 ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
            }`}>
              <Timer size={16} />
              {formatTime(timeLeft)}
            </div>
          )}

          <button onClick={onClose} className="text-white/50 hover:text-white">Cancel</button>
        </div>

        <div className="flex-grow overflow-y-auto mb-6">
          <div className="flex justify-between mb-2">
            <span className={`text-xs px-2 py-1 rounded ${
              q.type === 'MCQ' ? 'bg-cyan-900 text-cyan-200' : 'bg-purple-900 text-purple-200'
            }`}>
              {q.type}
            </span>
          </div>
          <p className="text-lg text-white mb-6 font-medium whitespace-pre-wrap">{q.text}</p>
          
          {q.type === 'MCQ' ? (
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
              className="w-full h-48 bg-black/30 border border-white/10 rounded-xl p-4 text-white focus:border-cyan-400 outline-none resize-none"
              placeholder="Type your detailed reflective essay here..."
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
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-bold"
            >
              Next
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