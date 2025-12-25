import React, { useState, useEffect, useCallback } from 'react';
import { Question, Submission } from '../../types';
import { getAITutorResponse } from "../../services/geminiService";
import { saveSubmission } from '../../services/storageService';
import { Timer, CheckCircle, Loader2, X, AlertCircle } from 'lucide-react';
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

  // --- STEP 1: LOCAL PERSISTENCE (DRAFT SAVE) ---
  const storageKey = `quiz_draft_${username}_${assessmentId || 'temp'}`;

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(storageKey);
    if (savedDraft) {
      try {
        setAnswers(JSON.parse(savedDraft));
      } catch (e) {
        console.error("Failed to load quiz draft");
      }
    }
  }, [storageKey]);

  // Save draft whenever answers change
  const handleAnswerChange = (val: string) => {
    const updatedAnswers = { ...answers, [currentQ]: val };
    setAnswers(updatedAnswers);
    localStorage.setItem(storageKey, JSON.stringify(updatedAnswers));
  };

  // --- STEP 2: RELIABLE AI GRADING ---
  const handleCourseAssessmentSubmit = async () => {
    setGrading(true);
    let mcqPoints = 0;
    let mcqTotal = 0;
    let finalScore = 0;
    let aiFeedback = "Assessment completed.";

    try {
      // 1. Grade MCQs locally for speed
      questions.forEach((q, idx) => {
        if (q.type === 'MCQ') {
          mcqTotal++;
          if (answers[idx] === q.correctAnswer) mcqPoints++;
        }
      });

      // 2. Grade Theory with Structured JSON AI
      const theoryIdx = questions.findIndex(q => q.type === 'THEORY');
      if (theoryIdx !== -1) {
        const q = questions[theoryIdx];
        const ans = answers[theoryIdx] || "No answer provided.";
        
        const prompt = `Grade this student science essay. 
        Question: ${q.text}
        Student Answer: ${ans}
        Return JSON ONLY: { "score": number(0-100), "feedback": "string(max 2 sentences)" }`;

        // Using the isJson = true flag we added to geminiService
        const aiRaw = await getAITutorResponse(prompt, 'grading_assistant', true);
        const aiResult = JSON.parse(aiRaw);
        
        const theoryScore = aiResult.score || 0;
        aiFeedback = aiResult.feedback || "Newel has graded your reflection.";

        // Weighting: 70% MCQ, 30% Theory (or 100% if only one type exists)
        if (mcqTotal > 0) {
          finalScore = ((mcqPoints / mcqTotal) * 70) + (theoryScore * 0.3);
        } else {
          finalScore = theoryScore;
        }
      } else {
        finalScore = mcqTotal > 0 ? (mcqPoints / mcqTotal) * 100 : 0;
      }

      const roundedScore = Math.round(finalScore);
      setScore(roundedScore);
      setFeedback(aiFeedback);
      setSubmitted(true);

      // Save to Database
      if (username && assessmentId) {
        await saveSubmission({
          assessmentId,
          username,
          answers: Object.entries(answers).reduce((acc, [k, v]) => ({...acc, [questions[Number(k)].id]: v}), {}),
          submittedAt: Date.now(),
          graded: true,
          score: roundedScore,
          feedback: aiFeedback,
          newelGraded: true
        });
      }

      // CLEAR DRAFT ON SUCCESS
      localStorage.removeItem(storageKey);
      
      if (roundedScore >= passThreshold) setShowConfetti(true);
      onComplete(roundedScore, roundedScore >= passThreshold);

    } catch (error) {
      console.error("Submission Error:", error);
      alert("Something went wrong with grading. Your progress is saved, please try submitting again.");
    } finally {
      setGrading(false);
    }
  };

  // --- UI RENDER (Kept similar to your blueprint but cleaner) ---

  if (grading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm">
        <div className="text-center text-white">
          <Loader2 size={48} className="animate-spin mx-auto mb-4 text-cyan-400" />
          <h2 className="text-2xl font-bold">Newel is Analyzing Your Work...</h2>
          <p className="text-white/50">Consulting the scientific archives.</p>
        </div>
      </div>
    );
  }

  // Inside QuizInterface.tsx results section
  if (submitted) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-white/20 p-8 rounded-2xl max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Results Submitted</h2>
          <div className="text-5xl font-bold text-cyan-400 mb-6">{score}%</div>
          
          {feedback && (
            <div className="text-left bg-white/5 p-4 rounded-xl border border-white/10 mb-6">
              <p className="text-cyan-400 text-[10px] font-bold uppercase mb-2">Newel's Feedback</p>
              <p className="text-white/80 text-sm italic">"{feedback}"</p>
            </div>
          )}

          <button 
            onClick={onClose} 
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-xl font-bold"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  const q = questions[currentQ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
      <div className="bg-slate-900 border border-white/20 w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div>
            <h3 className="text-white font-bold">{title}</h3>
            <p className="text-white/40 text-xs">Question {currentQ + 1} of {questions.length}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white"><X /></button>
        </div>

        {/* Content */}
        <div className="p-8 flex-grow overflow-y-auto">
          <div className="bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded inline-block mb-4">
            {q.type} Question
          </div>
          <h2 className="text-xl text-white font-medium leading-relaxed mb-8">{q.text}</h2>

          {q.type === 'MCQ' ? (
            <div className="space-y-3">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswerChange(opt)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    answers[currentQ] === opt 
                    ? 'bg-cyan-600 border-cyan-400 text-white' 
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <span className="opacity-40 mr-3">{String.fromCharCode(65+i)}.</span> {opt}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl p-6 text-white focus:border-cyan-500 outline-none transition-all resize-none leading-relaxed"
              placeholder="Start typing your response..."
              value={answers[currentQ] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-between bg-white/5">
          <button 
            disabled={currentQ === 0}
            onClick={() => setCurrentQ(prev => prev - 1)}
            className="text-white/40 hover:text-white disabled:opacity-0 transition-all"
          >
            ← Previous
          </button>
          
          {currentQ < questions.length - 1 ? (
            <button 
              onClick={() => setCurrentQ(prev => prev + 1)}
              className="bg-white text-black px-8 py-2 rounded-xl font-bold hover:bg-cyan-400 transition-all"
            >
              Next
            </button>
          ) : (
            <button 
              onClick={handleCourseAssessmentSubmit}
              className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-8 py-2 rounded-xl font-bold shadow-lg shadow-cyan-900/20"
            >
              Submit Mission
            </button>
          )}
        </div>
      </div>
    </div>
  );
};