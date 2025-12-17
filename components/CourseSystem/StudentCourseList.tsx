// src/components/CourseSystem/StudentCourseList.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CourseStructure, User, UserProgress } from '../../types';
import { getTopicsForStudent, getProgress } from '../../services/storageService'; // ADD getTopicsForStudent import
import { ChevronRight, FileText, ArrowLeft } from 'lucide-react';

interface StudentCourseListProps {
  user: User;
}

export const StudentCourseList: React.FC<StudentCourseListProps> = ({ user }) => {
  const [courses, setCourses] = useState<CourseStructure>({});
  const [progress, setProgress] = useState<UserProgress>({});
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        // Use new function to get grade-level appropriate topics
        const coursesData = await getTopicsForStudent(user.gradeLevel || '9');
        setCourses(coursesData);
        
        const progressData = await getProgress(user.username);
        setProgress(progressData);
      } catch (error) {
        console.error('Error loading courses:', error);
      }
    };
    loadData();
  }, [user.username, user.gradeLevel]);

  // Helper function to calculate topic completion percentage
  const getTopicCompletion = (subject: string, topicId: string) => {
    const topicProgress = progress[subject]?.[topicId];
    if (!topicProgress) return 0;
    
    const subtopics = Object.keys(topicProgress.subtopics || {});
    if (subtopics.length === 0) return 0;
    
    const completed = subtopics.filter(key => topicProgress.subtopics[key]).length;
    return Math.round((completed / subtopics.length) * 100);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">My Courses</h2>
          <p className="text-white/60">Grade {user.gradeLevel} Curriculum</p>
        </div>
        <button 
          onClick={() => navigate('/student-dashboard')} 
          className="text-white/50 hover:text-white flex items-center gap-2"
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Course cards rendering */}
        {Object.keys(courses).length > 0 ? (
          Object.keys(courses).map(subject => (
            <div key={subject} className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 mb-4">
                {subject}
              </h3>
              <div className="space-y-3">
                {Object.values(courses[subject] || {}).map((topic: any) => {
                  const completion = getTopicCompletion(subject, topic.id);
                  return (
                    <Link 
                      to={`/topic/${subject}/${topic.id}`} 
                      key={topic.id} 
                      className="block group"
                    >
                      <div className="bg-black/20 p-3 rounded-lg flex justify-between items-center group-hover:bg-black/40 transition-colors">
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm mb-1">{topic.title}</p>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-green-400 to-cyan-400 transition-all duration-500" 
                                style={{ width: `${completion}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-white/60">
                              {completion}%
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="text-white/30 group-hover:text-cyan-400 transition-colors" size={16} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center py-12">
            <div className="text-white/40 mb-4">No courses available for your grade level.</div>
            <p className="text-white/60 text-sm">Please contact your teacher for assistance.</p>
          </div>
        )}
      </div>
    </div>
  );
};

