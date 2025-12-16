import React, { useState, useEffect } from 'react';
import { Assessment, Submission } from '../types';
import { getAssessments, getSubmissions, deleteAssessment } from '../services/storageService';
import { Trash2, Edit, Eye, Users, BarChart, Calendar } from 'lucide-react';

export const TeacherAssessmentReview: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [assessmentsData, submissionsData] = await Promise.all([
      getAssessments(),
      getSubmissions()
    ]);
    setAssessments(assessmentsData);
    setSubmissions(submissionsData);
  };

  const getAssessmentStats = (assessmentId: string) => {
    const assessmentSubs = submissions.filter(s => s.assessmentId === assessmentId);
    const gradedSubs = assessmentSubs.filter(s => s.graded);
    const avgScore = gradedSubs.length > 0 
      ? Math.round(gradedSubs.reduce((sum, s) => sum + (s.score || 0), 0) / gradedSubs.length)
      : 0;
    
    return {
      totalSubmissions: assessmentSubs.length,
      gradedSubmissions: gradedSubs.length,
      averageScore: avgScore
    };
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this assessment?')) {
      await deleteAssessment(id);
      loadData();
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-white mb-6">Manage Assessments</h2>
      
      <div className="grid gap-4">
        {assessments.map(assessment => {
          const stats = getAssessmentStats(assessment.id);
          
          return (
            <div key={assessment.id} className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{assessment.title}</h3>
                  <p className="text-white/50 text-sm">
                    {assessment.subject} • Grade {assessment.targetGrade} • {assessment.questions.length} questions
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button className="p-2 bg-cyan-600/20 text-cyan-400 rounded-lg hover:bg-cyan-600/40">
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(assessment.id)}
                    className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/40"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-black/20 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                    <Users size={16} /> Total Submissions
                  </div>
                  <div className="text-2xl font-bold text-white">{stats.totalSubmissions}</div>
                </div>
                
                <div className="bg-black/20 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                    <BarChart size={16} /> Average Score
                  </div>
                  <div className={`text-2xl font-bold ${
                    stats.averageScore >= 70 ? 'text-green-400' : 
                    stats.averageScore >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {stats.averageScore}%
                  </div>
                </div>
                
                <div className="bg-black/20 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                    <Eye size={16} /> Graded
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {stats.gradedSubmissions}/{stats.totalSubmissions}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};