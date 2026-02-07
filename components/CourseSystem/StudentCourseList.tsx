import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CourseStructure, User } from '../../types';
import { 
  getTopicsForStudent, 
  getProgress, 
  canAccessTopic,
  getStudentCheckpointProgress,
  getCourses,
  isPremiumUser // Add this function to storageService.ts
} from '../../services/storageService';
import { cache, cacheKey } from '../../services/storageService';
import { 
  ChevronRight, FileText, ArrowLeft, Lock, Crown, Zap,
  AlertCircle, CheckCircle, Star
} from 'lucide-react';
import { CourseSkeleton } from './CourseSkeleton';

interface StudentCourseListProps {
  user: User;
}

export const StudentCourseList: React.FC<StudentCourseListProps> = ({ user }) => {
  const [courses, setCourses] = useState<CourseStructure>({});
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('Initializing...');
  const [userProgress, setUserProgress] = useState<any>({});
  const [checkpointProgress, setCheckpointProgress] = useState<Record<string, any>>({});
  const [topicAccess, setTopicAccess] = useState<Record<string, boolean>>({});
  const [isPremium, setIsPremium] = useState(false);
  const navigate = useNavigate();

  // Check if user is premium or registered before cutoff
  useEffect(() => {
    const checkUserStatus = () => {
      // Premium users have full access
      const isUserPremium = user.isPremium || 
                          (user.registrationDate && 
                           new Date(user.registrationDate) < new Date('2024-01-01')); // Legacy users
      setIsPremium(isUserPremium);
    };
    checkUserStatus();
  }, [user]);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        setProgress(10);
        setLoadingStage('Fetching your grade level...');
        
        // Get grade-specific topics
        setProgress(30);
        setLoadingStage('Loading grade-appropriate content...');
        
        const gradeSpecificCourses = await getTopicsForStudent(user.gradeLevel);
        
        setProgress(50);
        setLoadingStage('Loading your progress...');
        
        // Filter topics based on user status
        const filteredCourses: CourseStructure = {};
        Object.entries(gradeSpecificCourses).forEach(([subject, topics]) => {
          const topicEntries = Object.entries(topics);
          
          if (isPremium) {
            // Premium users get all topics
            filteredCourses[subject] = Object.fromEntries(topicEntries);
          } else {
            // Free users get first 2 topics per subject
            const firstTwoTopics = topicEntries.slice(0, 2);
            filteredCourses[subject] = Object.fromEntries(firstTwoTopics);
          }
        });
        
        setCourses(filteredCourses);
        
        setProgress(70);
        setLoadingStage('Loading your progress...');
        
        // Load user progress
        const progressData = await getProgress(user.username);
        setUserProgress(progressData);
        
        // Load checkpoint progress for each topic
        const checkpointData: Record<string, any> = {};
        for (const subject in filteredCourses) {
          for (const topicId in filteredCourses[subject]) {
            try {
              const key = cacheKey('progress', `${user.username}_${topicId}`);
              const cached = await cache.get(key, 2 * 60 * 1000);
              let cpProgress = cached;
              if (!cpProgress) {
                cpProgress = await getStudentCheckpointProgress(user.username, topicId);
                try { cache.set(key, cpProgress, 2 * 60 * 1000); } catch (e) {}
              }
              checkpointData[topicId] = cpProgress;
            } catch (error) {
              console.error(`Error loading checkpoint progress for ${topicId}:`, error);
            }
          }
        }
        setCheckpointProgress(checkpointData);
        
        setProgress(90);
        setLoadingStage('Checking topic access...');
        
        // Check access for each topic
        const accessMap: Record<string, boolean> = {};
        for (const subject in filteredCourses) {
          for (const topicId in filteredCourses[subject]) {
            try {
              const canAccess = await canAccessTopic(user.username, topicId);
              accessMap[`${subject}-${topicId}`] = canAccess;
            } catch (error) {
              console.error(`Error checking access for topic ${topicId}:`, error);
              accessMap[`${subject}-${topicId}`] = false;
            }
          }
        }
        setTopicAccess(accessMap);
        
        setProgress(100);
        setLoadingStage('Finalizing...');
        
        setTimeout(() => {
          setLoading(false);
        }, 500); // Small delay for smooth transition
        
      } catch (error) {
        console.error('Error loading courses:', error);
        setLoading(false);
      }
    };

    loadAllData();
  }, [user.gradeLevel, user.username, isPremium]);

  // Helper function to calculate topic completion percentage using checkpoints
  const getTopicCompletion = (subject: string, topicId: string) => {
    // Check checkpoint progress first
    const cpProgress = checkpointProgress[topicId];
    
    if (cpProgress && Object.keys(cpProgress).length > 0) {
      const passedCheckpoints = Object.values(cpProgress).filter((cp: any) => cp.passed).length;
      const totalCheckpoints = 4; // ONLY checkpoints 1-4 count towards progress
      const percentage = Math.round((passedCheckpoints / totalCheckpoints) * 100);
      return percentage;
    }
    
    // Fallback: Check if topic is completed in user_progress
    const topicProgress = userProgress[subject]?.[topicId];
    if (topicProgress?.mainAssessmentScore) {
      return topicProgress.mainAssessmentScore;
    }
    
    return 0;
  };

  const getTopicAccessStatus = (subject: string, topicId: string) => {
    const key = `${subject}-${topicId}`;
    return topicAccess[key] ?? null; // null means still loading
  };

  // Check if a topic is locked due to premium status
  const isTopicLocked = (subject: string, topicId: string, topicIndex: number) => {
    // Premium users have access to all topics
    if (isPremium) return false;
    
    // Free users only get first 2 topics per subject
    return topicIndex >= 2;
  };

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Progress Bar */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>{loadingStage}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        {/* Skeleton Screen */}
        <CourseSkeleton />
        
        {/* Loading Tips */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6">
            <h4 className="text-white font-medium mb-3">Why does loading take time?</h4>
            <ul className="text-gray-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-1"></div>
                <span>Fetching personalized content for Grade {user.gradeLevel}</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-1"></div>
                <span>Loading interactive materials and assessments</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt=1"></div>
                <span>First load is slower - subsequent visits will be faster</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Upgrade Banner for Free Users */}
      {!isPremium && Object.keys(courses).length > 0 && (
        <div className="mb-8 bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-500/30 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-xl">
                <Crown className="text-yellow-400" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Unlock Full Access</h3>
                <p className="text-white/70">
                  You're viewing the first 2 topics per subject. 
                  Upgrade to Premium for complete access to all {Object.values(courses).reduce((total, topics) => total + Object.keys(topics).length, 0)}+ topics!
                </p>
              </div>
            </div>
            <button 
              onClick={() => alert('Contact admin at bbrak1235@gmail.com to upgrade to Premium')}
              className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-amber-600 text-white font-bold rounded-lg hover:from-yellow-500 hover:to-amber-500 transition-all flex items-center gap-2"
            >
              <Zap size={18} /> Upgrade to Premium
            </button>
          </div>
        </div>
      )}

      {/* Premium User Badge */}
      {isPremium && (
        <div className="mb-6 bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-cyan-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Crown className="text-yellow-400" size={24} />
            <div>
              <h4 className="font-bold text-white">Premium Account</h4>
              <p className="text-white/60 text-sm">Full access to all topics and features</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">My Courses</h2>
            <p className="text-white/60">
              Grade {user.gradeLevel} Curriculum • {isPremium ? 'Premium Access' : 'Free Tier'}
            </p>
          </div>
          <button 
            onClick={() => navigate('/student-dashboard')} 
            className="text-white/50 hover:text-white flex items-center gap-2"
          >
            <ArrowLeft size={18} /> Back to Dashboard
          </button>
        </div>

        {/* Render courses */}
        {Object.keys(courses).length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-bold text-white mb-2">No Courses Available</h3>
            <p className="text-white/60 mb-6">No courses found for Grade {user.gradeLevel}.</p>
            <button 
              onClick={() => navigate('/student-dashboard')}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          Object.entries(courses).map(([subject, topics]) => (
            <div key={subject} className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-white">
                  {subject}
                  {!isPremium && (
                    <span className="ml-3 text-sm font-normal text-yellow-400">
                      (2 of {Object.keys(topics).length} topics available)
                    </span>
                  )}
                </h3>
                {!isPremium && Object.keys(topics).length > 2 && (
                  <button
                    onClick={() => alert(`Upgrade to Premium to access all ${Object.keys(topics).length} topics in ${subject}`)}
                    className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <Lock size={14} /> Unlock All
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(topics).map(([topicId, topic], index) => {
                  const completion = getTopicCompletion(subject, topicId);
                  const canAccess = getTopicAccessStatus(subject, topicId);
                  const isLockedByPremium = isTopicLocked(subject, topicId, index);
                  const isLocked = canAccess === false || isLockedByPremium;
                  
                  return (
                    <div
                      key={topicId}
                      className={`bg-white/5 border rounded-xl p-5 transition-all ${
                        isLocked 
                          ? 'border-red-500/30 opacity-60' 
                          : 'border-white/10 hover:border-cyan-500/50 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-white text-lg">{topic.title}</h4>
                          <p className="text-white/60 text-sm">
                            Grade {topic.gradeLevel} • {topic.subtopics?.length || 0} subtopics
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isLockedByPremium && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded-full">
                              <Lock className="text-yellow-400" size={12} />
                              <span className="text-yellow-400 text-xs">Premium</span>
                            </div>
                          )}
                          {isLocked && !isLockedByPremium && <Lock className="text-red-400" size={20} />}
                        </div>
                      </div>
                      
                      <p className="text-white/70 text-sm mb-4 line-clamp-2">
                        {topic.description || 'No description available'}
                      </p>
                      
                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-white/50 mb-1">
                          <span>Progress</span>
                          <span>{completion}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                            style={{ width: `${completion}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-white/40">
                          {topic.materials?.length || 0} materials
                        </div>
                        <Link
                          to={isLocked ? '#' : `/topic/${encodeURIComponent(subject)}/${topicId}`}
                          onClick={(e) => {
                            if (isLocked) {
                              e.preventDefault();
                              if (isLockedByPremium) {
                                alert('This topic requires Premium access. Contact admin at bbrak1235@gmail.com to upgrade.');
                              } else {
                                alert('Complete previous topics to unlock this one');
                              }
                            } else {
                              // Force topic load by clearing cache
                              try { cache.clear(cacheKey('progress', `${user.username}_${topicId}`)); } catch (e) {}
                            }
                          }}
                          className={`flex items-center gap-1 text-sm font-medium ${
                            isLocked 
                              ? 'text-red-400 cursor-not-allowed' 
                              : 'text-cyan-400 hover:text-cyan-300'
                          }`}
                        >
                          {isLocked ? (isLockedByPremium ? 'Premium' : 'Locked') : 'Continue'}
                          {!isLocked && <ChevronRight size={16} />}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};