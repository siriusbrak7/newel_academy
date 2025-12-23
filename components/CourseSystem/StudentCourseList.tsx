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
    console.log('📊 Loading checkpoint progress for all topics...');
    
    for (const subject in coursesData) {
      for (const topicId in coursesData[subject]) {
        try {
          console.log(`📊 Loading checkpoint progress for topic: ${topicId}`);
          const cpProgress = await getStudentCheckpointProgress(username, topicId);
          console.log(`✅ Checkpoint progress for ${topicId}:`, cpProgress);
          progressMap[topicId] = cpProgress;
          
          // Calculate progress percentage immediately for debugging
          const passedCount = Object.values(cpProgress).filter((cp: any) => cp.passed).length;
          console.log(`📈 ${topicId}: ${passedCount}/4 checkpoints passed`);
        } catch (error) {
          console.error(`❌ Error loading checkpoint progress for ${topicId}:`, error);
          progressMap[topicId] = {};
        }
      }
    }
    
    console.log('✅ Final checkpoint progress map:', progressMap);
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
  // Helper function to calculate topic completion percentage using checkpoints
const getTopicCompletion = (subject: string, topicId: string) => {
  console.log(`🔍 getTopicCompletion called for: ${topicId}`);
  
  // Check checkpoint progress first
  const cpProgress = checkpointProgress[topicId];
  console.log(`📊 Checkpoint progress for ${topicId}:`, cpProgress);
  
  if (cpProgress && Object.keys(cpProgress).length > 0) {
    const passedCheckpoints = Object.values(cpProgress).filter((cp: any) => cp.passed).length;
    const totalCheckpoints = 4; // ONLY checkpoints 1-4 count towards progress
    const percentage = Math.round((passedCheckpoints / totalCheckpoints) * 100);
    console.log(`📈 Progress calculation: ${passedCheckpoints}/${totalCheckpoints} = ${percentage}%`);
    return percentage;
  }
  
  console.log(`⚠️ No checkpoint progress found for ${topicId}`);
  
  // Fallback: Check if topic is completed in user_progress
  const topicProgress = progress[subject]?.[topicId];
  if (topicProgress?.mainAssessmentScore) {
    console.log(`📊 Using mainAssessmentScore: ${topicProgress.mainAssessmentScore}%`);
    return topicProgress.mainAssessmentScore;
  }
  
  console.log(`📊 No progress data found, returning 0%`);
  return 0;
};

  function getTopicAccessStatus(subject: string, topicId: string) {
    const key = `${subject}-${topicId}`;
    return topicAccess[key] ?? null; // null means still loading
  }

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
                                {[1, 2, 3, 4].map(num => {
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
      
      {/* Debug Info - Development Only */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-black/20 p-4 rounded-lg border border-white/10 mt-4">
          <h4 className="text-white/60 text-sm mb-2">Debug Info</h4>
          <div className="text-xs text-white/40 space-y-1">
            <div>Checkpoint Progress Keys: {Object.keys(checkpointProgress).length}</div>
            <div>Topics: {Object.keys(courses).reduce((acc, subj) => acc + Object.keys(courses[subj] || {}).length, 0)}</div>
            <div>Cell Biology Progress: {JSON.stringify(checkpointProgress['ebf5e931-f0fb-48df-8dfc-9021d96d2bd6'])}</div>
          </div>
        </div>
      )}
    </div>
  );
};