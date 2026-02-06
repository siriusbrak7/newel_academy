// src/components/CourseSystem/AssessmentManager.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Assessment, Question, Submission } from '../../types';
import { getAITutorResponse } from "../../services/geminiService";
import { 
  getAssessments, 
  getSubmissions, 
  saveAssessment, 
  saveSubmission, 
  getStoredSession,
  createNotification, 
  notifyNewAssessment,
  cache,
  cacheKey
} from '../../services/storageService';
import { 
  Plus, Save, Brain, Eye, Edit, X, CheckCircle, Timer, List, 
  ArrowLeft, Wand2, Loader2, ClipboardList, FileText, PenTool 
} from 'lucide-react';

export const AssessmentManager: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'grade'>('create');
  const [isGrading, setIsGrading] = useState(false);
  const [gradeProgress, setGradeProgress] = useState('');
  const [editingSub, setEditingSub] = useState<Submission | null>(null);
  const [editScore, setEditScore] = useState(0);
  const [editFeedback, setEditFeedback] = useState('');
  const [form, setForm] = useState({ 
    title: '', 
    subject: 'Biology', 
    targetGrade: '9' 
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qForm, setQForm] = useState({ 
    text: '', 
    type: 'MCQ', 
    optA: '', optB: '', optC: '', optD: '', 
    correct: 'A', 
    modelAnswer: ''
  });
  
  const navigate = useNavigate();
  const user = getStoredSession();

  useEffect(() => {
    const loadData = async () => {
      try {
        const aKey = cacheKey('assessments', 'all');
        const sKey = cacheKey('submissions', 'all');

        const cachedA = await cache.get<Assessment[]>(aKey, 30 * 60 * 1000);
        if (cachedA) {
          setAssessments(cachedA);
        } else {
          const a = await getAssessments();
          setAssessments(a);
          try { cache.set(aKey, a, 30 * 60 * 1000); } catch (e) {}
        }

        const cachedS = await cache.get<Submission[]>(sKey, 5 * 60 * 1000);
        if (cachedS) {
          setSubmissions(cachedS);
        } else {
          const s = await getSubmissions();
          setSubmissions(s);
          try { cache.set(sKey, s, 5 * 60 * 1000); } catch (e) {}
        }
      } catch (error) {
        console.error('Error loading assessments:', error);
      }
    };
    loadData();
  }, [activeTab]);

  const handleAddQuestion = () => {
  if (!qForm.text) {
    alert("Question text required");
    return;
  }
  
  const generateId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const newQ: Question = {
    id: generateId(), // UUID format
    text: qForm.text,
    type: qForm.type as 'MCQ' | 'THEORY',
    difficulty: 'IGCSE', 
    topic: form.subject,
    options: qForm.type === 'MCQ' ? [qForm.optA, qForm.optB, qForm.optC, qForm.optD].filter(Boolean) : [],
    correctAnswer: qForm.type === 'MCQ' 
      ? (qForm.correct === 'A' ? qForm.optA : 
         qForm.correct === 'B' ? qForm.optB : 
         qForm.correct === 'C' ? qForm.optC : qForm.optD)
      : '',
    modelAnswer: qForm.type === 'THEORY' ? qForm.modelAnswer : undefined
  };

  if (qForm.type === 'MCQ' && newQ.options.length < 2) {
    alert("MCQs need at least 2 options");
    return;
  }
  
  if (qForm.type === 'THEORY' && !qForm.modelAnswer) {
    alert("Model answer required for auto-grading");
    return;
  }

  setQuestions([...questions, newQ]);
  setQForm({ 
    text: '', type: 'MCQ', 
    optA: '', optB: '', optC: '', optD: '', 
    correct: 'A', modelAnswer: '' 
  });
};

  const handleSave = async () => {
  if (!form.title || !user) {
    alert("Title required");
    return;
  }
  
  if (questions.length === 0) {
    alert("Add at least one question");
    return;
  }

  // Generate UUID-like ID
  const generateId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const newAssessment: Assessment = {
    id: generateId(), // Use UUID format
    title: form.title,
    subject: form.subject,
    questions: questions.map(q => ({
      ...q,
      id: q.id.startsWith('temp_') ? generateId() : q.id // Ensure UUID for questions too
    })),
    assignedTo: ['all'],
    targetGrade: form.targetGrade,
    createdBy: user.username
  };
  
    try {
      await saveAssessment(newAssessment);

      // Invalidate assessments cache so teachers/students see new assessment
      try { cache.clear(cacheKey('assessments', 'all')); } catch (e) {}

      // Add notification trigger after assessment is created
      try {
        const currentUsername = user?.username || (await cache.get('newel_currentUser', 60 * 60 * 1000))?.username || 'teacher_demo';
        await notifyNewAssessment(
          currentUsername,
          newAssessment.title,
          newAssessment.subject,
          newAssessment.targetGrade
        );
      } catch (error) {
        console.error('Failed to send assessment notification:', error);
      }

      console.log('📢 Assessment published:', newAssessment.title);
      alert("Assessment Published! Students can now see this in their 'My Assignments'.");
    } catch (error) {
      console.error('Error saving assessment or sending notification:', error);
      alert("There was an issue publishing the assessment.");
    }
  
  setForm({ title: '', subject: 'Biology', targetGrade: '9' });
  setQuestions([]);
};

  const handleBatchAutoGrade = async () => {
    const ungraded = submissions.filter(s => !s.graded);
    if (ungraded.length === 0) {
      alert("No pending submissions to grade.");
      return;
    }

    setIsGrading(true);
    let count = 0;

    for (const sub of ungraded) {
      setGradeProgress(`Grading ${sub.username}...`);
      const assessment = assessments.find(a => a.id === sub.assessmentId);
      if (!assessment) continue;

      let totalScore = 0;
      let feedbackBuffer = "";

      for (const q of assessment.questions) {
        const studentAns = sub.answers[q.id] || "No Answer";
        
        if (q.type === 'MCQ') {
          if (studentAns === q.correctAnswer) {
            totalScore += (100 / assessment.questions.length);
          }
        } else {
          const prompt = `
            Act as a teacher grading a student answer.
            Question: "${q.text}"
            Model Answer (Rubric): "${q.modelAnswer}"
            Student Answer: "${studentAns}"
            
            Evaluate the student answer against the model answer.
            Return ONLY a JSON object with no markdown formatting:
            {
              "score": number (0-100 integer),
              "feedback": "brief constructive feedback string (max 2 sentences)"
            }
          `;
          
          try {
            const raw = await getAITutorResponse(prompt);
            const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(clean);
            
            totalScore += (result.score / assessment.questions.length);
            feedbackBuffer += `[Q] ${q.text.substring(0,30)}...\n[Feedback] ${result.feedback}\n\n`;
          } catch (e) {
            console.error("AI Grade Error", e);
            feedbackBuffer += `[Q] ${q.text} - Manual Review Needed (AI Error)\n`;
          }
        }
      }

      const gradedSub: Submission = {
        ...sub,
        graded: true,
        score: Math.round(totalScore),
        feedback: feedbackBuffer || "Auto-graded successfully.",
        newelGraded: true
      };
      await saveSubmission(gradedSub);
      // Invalidate submissions cache as we save graded submissions
      try { cache.clear(cacheKey('submissions', 'all')); } catch (e) {}
      count++;
    }

    setIsGrading(false);
    setGradeProgress('');
    
    const sKey = cacheKey('submissions', 'all');
    const refreshed = await getSubmissions();
    setSubmissions(refreshed);
    try { cache.set(sKey, refreshed, 5 * 60 * 1000); } catch (e) {}

    alert(`Batch graded ${count} submissions!`);
  };

  const openReviewModal = (sub: Submission) => {
    setEditingSub(sub);
    setEditScore(sub.score || 0);
    setEditFeedback(sub.feedback || '');
  };

  const handleUpdateGrade = async () => {
    if (!editingSub) return;
    
    const updated: Submission = {
      ...editingSub,
      score: editScore,
      feedback: editFeedback,
      graded: true,
    };
    
    await saveSubmission(updated);
    try { cache.clear(cacheKey('submissions', 'all')); } catch (e) {}
    const refreshed = await getSubmissions();
    setSubmissions(refreshed);

    setEditingSub(null);
    alert("Grade updated successfully!");
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white">Assessment Manager</h2>
        <button 
          onClick={() => navigate('/teacher-dashboard')} 
          className="text-white/50 hover:text-white flex items-center gap-2"
        >
          <ArrowLeft size={18} /> Back
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('create')} 
          className={`px-4 py-2 rounded-lg font-bold ${
            activeTab === 'create' 
              ? 'bg-purple-600 text-white' 
              : 'bg-white/10 text-white/50'
          }`}
        >
          Create & Assign
        </button>
        <button 
          onClick={() => setActiveTab('grade')} 
          className={`px-4 py-2 rounded-lg font-bold ${
            activeTab === 'grade' 
              ? 'bg-cyan-600 text-white' 
              : 'bg-white/10 text-white/50'
          }`}
        >
          Grade Submissions
        </button>
      </div>

      {/* REVIEW MODAL */}
      {editingSub && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-white/20 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">Review & Edit Grade</h3>
                <p className="text-white/50 text-sm">
                  Student: <span className="text-cyan-300">{editingSub.username}</span>
                </p>
              </div>
              <button onClick={() => setEditingSub(null)}>
                <X className="text-white/50 hover:text-white"/>
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              {/* Questions Review */}
              {(() => {
                const assessment = assessments.find(a => a.id === editingSub.assessmentId);
                if (!assessment) return <p>Assessment data not found.</p>;
                
                return assessment.questions.map((q, idx) => {
                  const studentAnswer = editingSub.answers[q.id] || "No Answer";
                  const isCorrect = q.type === 'MCQ' && studentAnswer === q.correctAnswer;
                  
                  return (
                    <div key={q.id} className="bg-white/5 border border-white/10 p-4 rounded-xl">
                      <div className="flex justify-between mb-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          q.type === 'MCQ' ? 'bg-blue-900 text-blue-200' : 'bg-orange-900 text-orange-200'
                        }`}>
                          {q.type}
                        </span>
                        {q.type === 'MCQ' && (
                          <span className={isCorrect ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                            {isCorrect ? "Correct (+1)" : "Incorrect"}
                          </span>
                        )}
                      </div>
                      <p className="text-white font-medium mb-3">{idx + 1}. {q.text}</p>
                      
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                          <p className="text-white/50 text-xs uppercase mb-1">Student Answer</p>
                          <p className="text-white whitespace-pre-wrap">{studentAnswer}</p>
                        </div>
                        {q.type === 'MCQ' ? (
                          <div className="bg-green-900/10 p-3 rounded-lg border border-green-500/20">
                            <p className="text-green-400/50 text-xs uppercase mb-1">Correct Answer</p>
                            <p className="text-green-300">{q.correctAnswer}</p>
                          </div>
                        ) : (
                          <div className="bg-orange-900/10 p-3 rounded-lg border border-orange-500/20">
                            <p className="text-orange-400/50 text-xs uppercase mb-1">Model Answer / Rubric</p>
                            <p className="text-orange-200 whitespace-pre-wrap">{q.modelAnswer}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="p-6 border-t border-white/10 bg-black/20">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-white text-sm font-bold mb-2">Final Score (%)</label>
                  <input 
                    type="number" 
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-xl font-bold focus:border-cyan-500 outline-none"
                    value={editScore}
                    onChange={e => setEditScore(Number(e.target.value))}
                    min="0" max="100"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-white text-sm font-bold mb-2">Feedback to Student</label>
                  <textarea 
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm h-24 focus:border-cyan-500 outline-none"
                    value={editFeedback}
                    onChange={e => setEditFeedback(e.target.value)}
                  />
                </div>
              </div>
              <button 
                onClick={handleUpdateGrade}
                className="w-full mt-4 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle size={20}/> Save & Finalize Grade
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6 animate-fade-in">
          <div className="grid md:grid-cols-2 gap-4">
            <input 
              className="bg-black/20 border border-white/10 rounded-lg p-3 text-white" 
              placeholder="Assessment Title" 
              value={form.title} 
              onChange={e => setForm({...form, title: e.target.value})} 
            />
            <select 
              className="bg-black/20 border border-white/10 rounded-lg p-3 text-white" 
              value={form.subject} 
              onChange={e => setForm({...form, subject: e.target.value})}
            >
              <option value="Biology">Biology</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
            </select>
            <select 
              className="bg-black/20 border border-white/10 rounded-lg p-3 text-white" 
              value={form.targetGrade} 
              onChange={e => setForm({...form, targetGrade: e.target.value})}
            >
              <option value="9">Grade 9</option>
              <option value="10">Grade 10</option>
              <option value="11">Grade 11</option>
              <option value="12">Grade 12</option>
              <option value="all">All Grades</option>
            </select>
          </div>

          <div className="bg-black/20 p-4 rounded-xl border border-white/5">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-white font-bold text-sm uppercase">Add Question</h4>
              <div className="bg-white/10 p-1 rounded-lg flex text-xs">
                <button 
                  onClick={() => setQForm({...qForm, type: 'MCQ'})}
                  className={`px-3 py-1 rounded ${
                    qForm.type === 'MCQ' ? 'bg-blue-600 text-white' : 'text-white/50'
                  }`}
                >
                  MCQ
                </button>
                <button 
                  onClick={() => setQForm({...qForm, type: 'THEORY'})}
                  className={`px-3 py-1 rounded ${
                    qForm.type === 'THEORY' ? 'bg-orange-600 text-white' : 'text-white/50'
                  }`}
                >
                  Theory
                </button>
              </div>
            </div>
            
            <textarea 
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm mb-3 h-24 focus:border-cyan-500 outline-none" 
              placeholder="Type question here..." 
              value={qForm.text} 
              onChange={e => setQForm({...qForm, text: e.target.value})} 
            />

            {qForm.type === 'MCQ' ? (
              <div className="animate-fade-in">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {['a','b','c','d'].map(opt => (
                    <input 
                      key={opt} 
                      className="bg-white/5 border border-white/10 rounded p-2 text-white text-xs" 
                      placeholder={`Option ${opt.toUpperCase()}`} 
                      value={(qForm as any)[`opt${opt.toUpperCase()}`]} 
                      onChange={e => setQForm({...qForm, [`opt${opt.toUpperCase()}`]: e.target.value})} 
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-white/50">Correct Answer:</span>
                  <select 
                    className="bg-white/5 border border-white/10 rounded p-1 text-white text-xs" 
                    value={qForm.correct} 
                    onChange={e => setQForm({...qForm, correct: e.target.value})}
                  >
                    {['A','B','C','D'].map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="animate-fade-in">
                <label className="text-xs text-orange-300 mb-1 block">
                  Model Answer / Rubric (for Newel Grading)
                </label>
                <textarea 
                  className="w-full bg-orange-900/10 border border-orange-500/30 rounded-lg p-3 text-orange-100 text-sm mb-2 h-32 placeholder-orange-100/30 focus:border-orange-500 outline-none" 
                  placeholder="Enter the expected answer or key points. The AI will use this to grade the student's response." 
                  value={qForm.modelAnswer} 
                  onChange={e => setQForm({...qForm, modelAnswer: e.target.value})} 
                />
              </div>
            )}

            <button 
              onClick={handleAddQuestion} 
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold w-full mt-2 transition-colors shadow-lg"
            >
              Add Question
            </button>
          </div>

          {questions.length > 0 && (
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <h5 className="text-white font-bold mb-3 text-sm">
                Added Questions ({questions.length})
              </h5>
              <ul className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {questions.map((q, i) => (
                  <li key={i} className="text-white/70 text-xs border-b border-white/5 pb-2 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                        q.type === 'MCQ' ? 'bg-blue-900 text-blue-200' : 'bg-orange-900 text-orange-200'
                      }`}>
                        {q.type}
                      </span>
                      <span className="font-medium truncate">{q.text}</span>
                    </div>
                    {q.type === 'MCQ' ? (
                      <span className="text-green-400 opacity-70 ml-1">
                        Correct: {q.correctAnswer}
                      </span>
                    ) : (
                      <p className="text-white/30 italic truncate ml-1">
                        Model: {q.modelAnswer}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button 
            onClick={handleSave} 
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Save size={18} /> Publish Assessment
          </button>
        </div>
      )}

      {activeTab === 'grade' && (
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Pending Submissions</h3>
            <button 
              onClick={handleBatchAutoGrade} 
              disabled={isGrading || submissions.filter(s => !s.graded).length === 0}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-purple-900/20"
            >
              {isGrading ? <Loader2 className="animate-spin" size={16}/> : <Wand2 size={16}/>}
              {isGrading ? 'AI Grading in Progress...' : 'Auto-Grade All'}
            </button>
          </div>

          {isGrading && (
            <p className="text-cyan-400 text-center mb-4 text-sm animate-pulse">
              {gradeProgress}
            </p>
          )}

          <div className="space-y-3 max-h-[500px] overflow-y-auto mb-8">
            {submissions.filter(s => !s.graded).length === 0 && (
              <div className="text-white/30 italic text-center py-12 border border-dashed border-white/10 rounded-xl">
                No pending submissions to grade.
              </div>
            )}
            {submissions.filter(s => !s.graded).map((sub, i) => {
              const assessment = assessments.find(a => a.id === sub.assessmentId);
              return (
                <div key={i} className="bg-black/20 p-4 rounded-xl border border-white/5 flex justify-between items-center">
                  <div>
                    <h4 className="text-white font-bold text-sm">
                      {assessment?.title || 'Unknown Quiz'}
                    </h4>
                    <p className="text-white/50 text-xs mt-1">
                      Student: <span className="text-cyan-300">{sub.username}</span> • 
                      Submitted: {new Date(sub.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openReviewModal(sub)}
                      className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg border border-white/10 flex items-center gap-2"
                    >
                      <Eye size={14}/> Review / Grade
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <h3 className="text-xl font-bold text-white mb-4 pt-4 border-t border-white/10">
            Graded History
          </h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {submissions.filter(s => s.graded).map((sub, i) => {
              const assessment = assessments.find(a => a.id === sub.assessmentId);
              return (
                <div key={i} className="bg-black/20 p-4 rounded-xl border border-white/5 flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity">
                  <div>
                    <h4 className="text-white font-bold text-sm">
                      {assessment?.title || 'Unknown Quiz'}
                    </h4>
                    <p className="text-white/50 text-xs mt-1">
                      {sub.username} • {new Date(sub.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className={`text-lg font-bold ${
                        sub.score && sub.score >= 50 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {sub.score}%
                      </span>
                      {sub.ai_graded && (
                        <p className="text-[10px] text-purple-400 flex items-center gap-1 justify-end uppercase tracking-widest">
                          <Brain size={10}/> Newel Graded
                        </p>
                      )}
                    </div>
                    <button 
                      onClick={() => openReviewModal(sub)}
                      className="text-white/30 hover:text-white transition-colors"
                      title="Review & Edit"
                    >
                      <Edit size={16}/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};