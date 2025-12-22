// src/components/CourseSystem/StudentCourseList.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CourseStructure, User, UserProgress } from '../../types';
import { getTopicsForStudent, getProgress, canAccessTopic, getStudentCheckpointProgress } from '../../services/storageService';
import { ChevronRight, FileText, ArrowLeft, Lock } from 'lucide-react';

interface StudentCourseListProps {
  user: User;
}

export const StudentCourseList: React.FC<StudentCourseListProps> = ({ user }) => {
  const [courses, setCourses] = useState<CourseStructure>({});
  const [progress, setProgress] = useState<UserProgress>({});
  const [checkpointProgress, setCheckpointProgress] = useState<Record<string, any>>({});
  const [topicAccess, setTopicAccess] = useState<Record<string, boolean>>({});
  const [loadingAccess, setLoadingAccess] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        // Use new function to get grade-level appropriate topics
        const coursesData = await getTopicsForStudent(user.gradeLevel || '9');
        setCourses(coursesData);
        
        const progressData = await getProgress(user.username);
        setProgress(progressData);
        
        // Load checkpoint progress for all topics
        await loadCheckpointProgress(coursesData, user.username);
        
        // Load topic access permissions
        await loadTopicAccess(coursesData, user.username);
      } catch (error) {
        console.error('Error loading courses:', error);
      } finally {
        setLoadingAccess(false);
      }
    };
    loadData();
  }, [user.username, user.gradeLevel]);

  const loadCheckpointProgress = async (coursesData: CourseStructure, username: string) => {
    const progressMap: Record<string, any> = {};
    
    for (const subject in coursesData) {
      for (const topicId in coursesData[subject]) {
        try {
          const cpProgress = await getStudentCheckpointProgress(username, topicId);
          progressMap[topicId] = cpProgress;
        } catch (error) {
          console.error(`Error loading checkpoint progress for ${topicId}:`, error);
          progressMap[topicId] = {};
        }
      }
    }
    
    setCheckpointProgress(progressMap);
  };

  const loadTopicAccess = async (coursesData: CourseStructure, username: string) => {
    const accessMap: Record<string, boolean> = {};
    
    // Check access for each topic
    for (const subject in coursesData) {
      for (const topicId in coursesData[subject]) {
        try {
          const canAccess = await canAccessTopic(username, topicId);
          accessMap[`${subject}-${topicId}`] = canAccess;
        } catch (error) {
          console.error(`Error checking access for topic ${topicId}:`, error);
          accessMap[`${subject}-${topicId}`] = false;
        }
      }
    }
    
    setTopicAccess(accessMap);
  };

  // Helper function to calculate topic completion percentage using checkpoints
  const getTopicCompletion = (subject: string, topicId: string) => {
    // Method 1: Use checkpoint progress
    const cpProgress = checkpointProgress[topicId];
    if (cpProgress && Object.keys(cpProgress).length > 0) {
      const passedCheckpoints = Object.values(cpProgress).filter((cp: any) => cp.passed).length;
      // Each topic has 5 checkpoints total (4 MCQ + 1 Final Theory)
      const totalCheckpoints = 5;
      const percentage = Math.round((passedCheckpoints / totalCheckpoints) * 100);
      console.log(`📊 Progress for ${topicId}: ${passedCheckpoints}/${totalCheckpoints} = ${percentage}%`);
      return percentage;
    }
    
    // Method 2: Fallback to subtopic progress
    const topicProgress = progress[subject]?.[topicId];
    if (!topicProgress) return 0;
    
    const subtopics = Object.keys(topicProgress.subtopics || {});
    if (subtopics.length === 0) return 0;
    
    const completed = subtopics.filter(key => topicProgress.subtopics[key]).length;
    return Math.round((completed / subtopics.length) * 100);
  };

  const getTopicAccessStatus = (subject: string, topicId: string) => {
    const key = `${subject}-${topicId}`;
    return topicAccess[key] ?? null; // null means still loading
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
                  const isAccessible = getTopicAccessStatus(subject, topic.id);
                  
                  if (isAccessible === null) {
                    // Loading state
                    return (
                      <div key={topic.id} className="bg-black/20 p-3 rounded-lg flex justify-between items-center">
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
                        <div className="w-4 h-4 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin"></div>
                      </div>
                    );
                  }
                  
                  if (!isAccessible) {
                    // Locked state
                    return (
                      <div key={topic.id} className="bg-black/20 p-3 rounded-lg flex justify-between items-center opacity-50 cursor-not-allowed">
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm mb-1 flex items-center gap-1">
                            <Lock size={12} /> {topic.title}
                          </p>
                          <p className="text-xs text-yellow-400 mb-2">Complete previous topic first</p>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-gray-400 to-gray-600 transition-all duration-500" 
                                style={{ width: `${completion}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-white/60">
                              {completion}%
                            </span>
                          </div>
                        </div>
                        <Lock className="text-white/30" size={16} />
                      </div>
                    );
                  }
                  
                  // Accessible state
                  return (
                    <Link 
                      to={`/topic/${subject}/${topic.id}`} 
                      key={topic.id} 
                      className="block group"
                    >
                      <div className="bg-black/20 p-3 rounded-lg flex justify-between items-center group-hover:bg-black/40 transition-colors">
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm mb-1">{topic.title}</p>
                          
                          {/* Show checkpoint progress */}
                          {checkpointProgress[topic.id] && Object.keys(checkpointProgress[topic.id]).length > 0 && (
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(num => {
                                  const checkpointKey = Object.keys(checkpointProgress[topic.id] || {}).find(
                                    key => checkpointProgress[topic.id][key].checkpointNumber === num
                                  );
                                  const passed = checkpointKey ? checkpointProgress[topic.id][checkpointKey].passed : false;
                                  return (
                                    <div 
                                      key={num}
                                      className={`w-2 h-2 rounded-full ${passed ? 'bg-green-500' : 'bg-white/20'}`}
                                      title={`Checkpoint ${num}: ${passed ? 'Passed' : 'Not passed'}`}
                                    />
                                  );
                                })}
                              </div>
                              <span className="text-xs text-white/40">
                                {Object.values(checkpointProgress[topic.id] || {}).filter((cp: any) => cp.passed).length}/5
                              </span>
                            </div>
                          )}
                          
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
      
      {/* Loading indicator for topic access */}
      {loadingAccess && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-cyan-500 mr-2"></div>
          <span className="text-white/60 text-sm">Checking topic access permissions...</span>
        </div>
      )}
    </div>
  );
};