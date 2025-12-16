// src/components/CourseSystem/StudentCourseList.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CourseStructure, User, UserProgress } from '../../types';
import { getCourses, getProgress } from '../../services/storageService';
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
        const coursesData = await getCourses();
        setCourses(coursesData);
        const progressData = await getProgress(user.username);
        setProgress(progressData);
      } catch (error) {
        console.error('Error loading courses:', error);
      }
    };
    loadData();
  }, [user.username]);

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
        {Object.keys(courses).map(subject => (
          <div key={subject} className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 mb-4">
              {subject}
            </h3>
            <div className="space-y-3">
              {Object.values(courses[subject] || {}).map((topic: any) => (
                <Link 
                  to={`/topic/${subject}/${topic.id}`} 
                  key={topic.id} 
                  className="block group"
                >
                  <div className="bg-black/20 p-3 rounded-lg flex justify-between items-center group-hover:bg-black/40">
                    <div>
                      <p className="text-white font-medium text-sm">{topic.title}</p>
                      <div className="w-24 h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: '0%' }}></div>
                      </div>
                    </div>
                    <ChevronRight className="text-white/30 group-hover:text-cyan-400" size={16} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};