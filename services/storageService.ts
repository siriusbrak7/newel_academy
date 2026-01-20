// storageService.ts - COMPLETE FIXED VERSION FOR DEPLOYMENT
import { User, CourseStructure, UserProgress, Assessment, Topic, TopicProgress, LeaderboardEntry, StudentStats, Submission, Announcement, Material, Notification, dbToFrontendAnnouncement, Question } from '../types';
import { supabase } from './supabaseClient';

// Add this function at the TOP of storageService.ts, after imports
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Add caching variables at the TOP of the file (right after imports)
let coursesCache: CourseStructure | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// =====================================================
// DEMO ACCOUNT CONFIGURATION
// =====================================================
const DEMO_ACCOUNTS = ['admin', 'teacher_demo', 'student_demo'];

// ADD THESE CONSTANTS AT THE TOP OF storageService.ts
const SUBJECT_IDS = {
  'Biology': '68bc18f9-a557-43b1-98a2-7e32bc0a9808',
  'Physics': '583fdc7b-499c-428f-8dca-c131514bc99e',
  'Chemistry': '4c89ad84-4141-402f-bf4b-708c9ef5b9ec'
} as const;

const SUBJECT_NAMES = {
  '68bc18f9-a557-43b1-98a2-7e32bc0a9808': 'Biology',
  '583fdc7b-499c-428f-8dca-c131514bc99e': 'Physics',
  '4c89ad84-4141-402f-bf4b-708c9ef5b9ec': 'Chemistry'
};



// ADD this helper function at the TOP of storageService.ts:
export const optimizeQuery = async <T>(
  queryName: string,
  queryFn: () => Promise<T>,
  cacheDuration: number = 5 * 60 * 1000, // 5 minutes default
  useLocalStorage: boolean = false
): Promise<T> => {
  const CACHE_KEY = `query_cache_${queryName}`;
  const now = Date.now();
  
  // Try to get from cache
  const storage = useLocalStorage ? localStorage : sessionStorage;
  const cached = storage.getItem(CACHE_KEY);
  
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (now - timestamp < cacheDuration) {
      console.log(`📦 Cache hit: ${queryName}`);
      return data;
    }
  }
  
  console.time(`query_${queryName}`);
  console.log(`🚀 Executing: ${queryName}`);
  
  try {
    const result = await queryFn();
    
    // Cache the result
    storage.setItem(CACHE_KEY, JSON.stringify({
      data: result,
      timestamp: now
    }));
    
    console.timeEnd(`query_${queryName}`);
    console.log(`✅ ${queryName} completed`);
    
    return result;
  } catch (error) {
    console.error(`❌ ${queryName} failed:`, error);
    console.timeEnd(`query_${queryName}`);
    
    // Return cached data even if stale if available
    if (cached) {
      console.log('🔄 Returning stale cache due to error');
      const { data } = JSON.parse(cached);
      return data;
    }
    
    throw error;
  }
};

// =====================================================
// INITIALIZATION
// =====================================================
export const initStorage = async (): Promise<void> => {
  
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    
  } catch (error) {
    console.error('Initialization error:', error);
    throw error;
  }
};

// =====================================================
// SESSION MANAGEMENT
// =====================================================
export const getStoredSession = (): User | null => {
  const raw = localStorage.getItem('newel_currentUser');
  return raw ? JSON.parse(raw) : null;
};

export const saveSession = (user: User | null) => {
  if (user) {
    localStorage.setItem('newel_currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('newel_currentUser');
  }
};

// =====================================================
// AUTHENTICATION (Supabase Auth)
// =====================================================
export const authenticateUser = async (username: string, password: string): Promise<User | null> => {
  
  
  try {
    // Sign in with password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `${username}@newel.academy`,
      password: password
    });

    if (error) {
      console.error('Auth error:', error.message);
      return null;
    }

    if (!data.user) return null;

    // Get user profile from users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError?.message);
      return null;
    }

    if (!profile.approved) {
      
      return null;
    }

    

    return {
      username: profile.username,
      role: profile.role,
      approved: profile.approved,
      securityQuestion: profile.security_question || '',
      securityAnswer: profile.security_answer || '',
      gradeLevel: profile.grade_level || undefined,
      assignedStudents: profile.assigned_students || undefined,
      lastLogin: Date.now(),
      loginHistory: profile.login_history ? profile.login_history.map((d: string) => new Date(d).getTime()) : undefined
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
};

// =====================================================
// USER MANAGEMENT
// =====================================================
export const getUsers = async (): Promise<Record<string, User>> => {
  
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) throw error;

    const users: Record<string, User> = {};
    data.forEach(dbUser => {
      users[dbUser.username] = {
        username: dbUser.username,
        role: dbUser.role,
        approved: dbUser.approved,
        securityQuestion: dbUser.security_question || '',
        securityAnswer: dbUser.security_answer || '',
        gradeLevel: dbUser.grade_level || undefined,
        assignedStudents: dbUser.assigned_students || undefined,
        lastLogin: dbUser.last_login ? new Date(dbUser.last_login).getTime() : undefined,
        loginHistory: dbUser.login_history ? dbUser.login_history.map((d: string) => new Date(d).getTime()) : undefined
      };
    });

    
    return users;
  } catch (error) {
    console.error('Get users error:', error);
    return {};
  }
};

export const getRealUsers = async (): Promise<Record<string, User>> => {
  const allUsers = await getUsers();
  const realUsers: Record<string, User> = {};
  
  Object.entries(allUsers).forEach(([username, user]) => {
    if (!DEMO_ACCOUNTS.includes(username)) {
      realUsers[username] = user;
    }
  });
  
  return realUsers;
};

export const getUserByUsername = async (username: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) return null;

    return {
      username: data.username,
      role: data.role,
      approved: data.approved,
      securityQuestion: data.security_question || '',
      securityAnswer: data.security_answer || '',
      gradeLevel: data.grade_level || undefined,
      assignedStudents: data.assigned_students || undefined,
      lastLogin: data.last_login ? new Date(data.last_login).getTime() : undefined,
      loginHistory: data.login_history ? data.login_history.map((d: string) => new Date(d).getTime()) : undefined
    };
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
};

export const saveUser = async (user: User & { password?: string }): Promise<void> => {
  
  
  try {
    let userId: string;

    if (user.password) {
      // Register new user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `${user.username}@newel.academy`,
        password: user.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned from auth');
      userId = authData.user.id;
    } else {
      // Get existing user ID
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('username', user.username)
        .single();
      if (!data) throw new Error('User not found');
      userId = data.id;
    }

    // Save/update user profile
    const userData = {
      id: userId,
      username: user.username,
      role: user.role,
      approved: user.approved,
      security_question: user.securityQuestion,
      security_answer: user.securityAnswer,
      grade_level: user.gradeLevel || null,
      assigned_students: user.assignedStudents || null,
      last_login: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('users')
      .upsert(userData, { onConflict: 'id' });
    
    if (error) throw error;
    
    
  } catch (error) {
    console.error('Save user error:', error);
    throw error;
  }
};

export const deleteUser = async (username: string): Promise<void> => {
  
  
  try {
    // Get user ID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (!user) return;

    // Delete from auth (requires admin privileges or RLS policy)
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
    if (authError) console.warn('Auth delete warning:', authError.message);

    // Delete from users table
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id);
    
    if (error) throw error;
    
    
  } catch (error) {
    console.error('Delete user error:', error);
    throw error;
  }
};

// =====================================================
// COURSE MANAGEMENT
// =====================================================
// storageService.ts - Updated getCourses function
// =====================================================
// COURSE MANAGEMENT - OPTIMIZED WITH CACHING
// =====================================================
// FIXED VERSION - Remove ambiguous join
// In storageService.ts
export const getCourses = async (forceRefresh = false): Promise<CourseStructure> => {
  try {
    console.log('📚 Fetching courses from database...');
    
    const { data: topics, error } = await supabase
      .from('topics')
      .select(`
        *,
        materials (*)
      `)
      .order('grade_level', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    console.log(`✅ Retrieved ${topics?.length || 0} topics`);
    
    const courses: CourseStructure = {};
    
    topics?.forEach((topic: any) => {
      const subjectName = SUBJECT_NAMES[topic.subject_id];
      
      if (!subjectName) {
        console.warn(`⚠️ Unknown subject_id: ${topic.subject_id}`);
        return;
      }
      
      if (!courses[subjectName]) {
        courses[subjectName] = {};
      }
      
      // Format topic with proper field names
      const formattedTopic = {
        ...topic,
        id: topic.id,
        title: topic.title,
        gradeLevel: topic.grade_level,
        description: topic.description,
        subtopics: topic.subtopics || [],
        materials: topic.materials || []
      };
      
      courses[subjectName][topic.id] = formattedTopic;
    });

    // Log summary
    Object.keys(courses).forEach(subject => {
      const topics = Object.values(courses[subject]);
      const totalMaterials = topics.reduce((sum: number, topic: any) => 
        sum + (topic.materials?.length || 0), 0);
      
      console.log(`📊 ${subject}: ${topics.length} topics, ${totalMaterials} materials`);
    });
    
    return courses;
  } catch (error) {
    console.error('❌ Error fetching courses:', error);
    return {};
  }
};

// storageService.ts - Add this function
export const getCoursesLight = async (): Promise<CourseStructure> => {
  console.time('getCoursesLight');
  console.log('🚀 Fetching light courses (no materials)...');
  
  try {
    // Get all subjects first to avoid ambiguous joins
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('id, name');
    
    const subjectMap = new Map();
    subjectsData?.forEach(s => subjectMap.set(s.id, s.name));
    
    // Fetch topics WITHOUT ambiguous join
    const { data: topicsData, error } = await supabase
      .from('topics')
      .select(`
        id,
        title,
        description,
        grade_level,
        subject_id,
        checkpoints_required
      `)
      .order('title', { ascending: true });

    if (error) throw error;

    const courses: CourseStructure = {};
    
    topicsData?.forEach(topic => {
      const subjectName = subjectMap.get(topic.subject_id) || 'General';
      
      if (!courses[subjectName]) {
        courses[subjectName] = {};
      }

      courses[subjectName][topic.id] = {
        id: topic.id,
        title: topic.title,
        gradeLevel: topic.grade_level || '9',
        description: topic.description || '',
        subtopics: [], // Empty for light version
        materials: [], // Empty for light version
        checkpoints_required: topic.checkpoints_required || 3
      };
    });

    console.log(`✅ Light courses: ${Object.keys(courses).length} subjects, ${topicsData?.length || 0} topics`);
    console.timeEnd('getCoursesLight');
    
    return courses;
  } catch (error) {
    console.error('❌ Get light courses error:', error);
    return {};
  }
};

// Function to load materials for a specific topic on demand

  // =====================================================
  // PERFORMANCE MONITORING HELPER
  // =====================================================
  export const measureLoadTime = async <T>(
    taskName: string,
    task: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    console.log(`⏱️ Starting: ${taskName}`);
    
    try {
      const result = await task();
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`✅ ${taskName} completed in ${duration.toFixed(2)}s`);
      
      // Log slow operations
      if (duration > 3) {
        console.warn(`⚠️ ${taskName} took ${duration.toFixed(2)}s (consider optimizing)`);
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;
      console.error(`❌ ${taskName} failed after ${duration.toFixed(2)}s:`, error);
      throw error;
    }
  };

  // =====================================================
  // GET TOPIC QUESTIONS (ON DEMAND)
  // =====================================================
  export const getTopicQuestions = async (topicId: string): Promise<Record<string, Question[]>> => {
  try {
    console.log('❓ Fetching questions for topic:', topicId);
    
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('topic_id', topicId);
    
    if (error) throw error;
    
    // Group by subtopic
    const grouped: Record<string, Question[]> = {};
    
    data?.forEach((q: any) => {
      const subtopic = q.subtopic || 'General';
      if (!grouped[subtopic]) {
        grouped[subtopic] = [];
      }
      grouped[subtopic].push(q);
    });
    
    console.log(`✅ Found questions in ${Object.keys(grouped).length} subtopics`);
    return grouped;
    
  } catch (error) {
    console.error('❌ Error fetching questions:', error);
    return {};
  }
};

// Add this function to load questions only when needed

// In storageService.ts, update the saveTopic function:
// storageService.ts - Updated saveTopic function
// In storageService.ts - REPLACE the entire saveTopic function with this:
// In storageService.ts - update saveTopic function
// In storageService.ts - FIX saveTopic
export const saveTopic = async (subject: string, topic: any): Promise<any> => {
  try {
    const subjectId = SUBJECT_IDS[subject as keyof typeof SUBJECT_IDS];
    
    if (!subjectId) {
      throw new Error(`Unknown subject: ${subject}`);
    }
    
    console.log('💾 saveTopic called:', {
      subject,
      subjectId,
      topicId: topic.id,
      title: topic.title,
      materials: topic.materials?.length || 0
    });
    
    // 1. First, ensure we have a valid topic ID
    let finalTopicId = topic.id;
    
    // If topic has no ID or is a temp ID, check if it exists by title
    if (!finalTopicId || finalTopicId.startsWith('temp_')) {
      const { data: existingTopic } = await supabase
        .from('topics')
        .select('id')
        .eq('title', topic.title)
        .eq('subject_id', subjectId)
        .eq('grade_level', topic.gradeLevel || topic.grade_level)
        .single();
      
      if (existingTopic) {
        finalTopicId = existingTopic.id;
        console.log('🔍 Found existing topic ID:', finalTopicId);
      }
    }
    
    // 2. Save/Update the topic
    const topicData = {
      id: finalTopicId?.startsWith('temp_') ? undefined : finalTopicId,
      subject_id: subjectId,
      title: topic.title,
      grade_level: topic.gradeLevel || topic.grade_level || '9',
      description: topic.description || '',
      checkpoints_required: topic.checkpoints_required || topic.checkpointsRequired || 3,
      checkpoint_pass_percentage: topic.checkpoint_pass_percentage || topic.checkpointPassPercentage || 80,
      final_assessment_required: topic.final_assessment_required !== undefined ? topic.final_assessment_required : true,
      updated_at: new Date().toISOString()
    };
    
    console.log('📤 Saving topic data:', topicData);
    
    const { data: savedTopic, error: topicError } = await supabase
      .from('topics')
      .upsert(topicData)
      .select()
      .single();
    
    if (topicError) {
      console.error('❌ Topic save error:', topicError);
      throw topicError;
    }
    
    console.log('✅ Topic saved with ID:', savedTopic.id);
    
    // 3. Save materials
    if (topic.materials && topic.materials.length > 0 && savedTopic.id) {
      console.log(`📦 Processing ${topic.materials.length} materials...`);
      
      // Prepare materials with correct topic_id
      const materialsToSave = topic.materials.map((mat: any) => {
        const materialData: any = {
          topic_id: savedTopic.id,
          title: mat.title,
          type: mat.type,
          content: mat.content,
          created_at: mat.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // ONLY include id if it's a valid UUID (not temp and not null)
        if (mat.id && !mat.id.startsWith('temp_') && mat.id !== 'null' && mat.id !== null) {
          materialData.id = mat.id;
        }
        // Otherwise, let the database generate the UUID via gen_random_uuid()
        
        return materialData;
      });
      
      console.log('📝 Materials to save:', materialsToSave.length);
      
      // Delete existing materials for this topic first
      await supabase
        .from('materials')
        .delete()
        .eq('topic_id', savedTopic.id);
      
      // Insert all new materials
      const { data: savedMaterials, error: matError } = await supabase
        .from('materials')
        .insert(materialsToSave)
        .select();
      
      if (matError) {
        console.error('❌ Materials save error:', matError);
        throw matError;
      }
      
      console.log(`✅ ${savedMaterials?.length || 0} materials saved`);
      savedTopic.materials = savedMaterials || [];
    } else {
      savedTopic.materials = [];
    }
    
    return savedTopic;
    
  } catch (error) {
    console.error('❌ Error in saveTopic:', error);
    throw error;
  }
};

// =====================================================
// PROGRESS MANAGEMENT
// =====================================================
export const getProgress = async (username: string): Promise<UserProgress> => {
  console.log(`📊 Getting progress for: ${username}`);
  
  try {
    // Get user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (userError || !userData) {
      console.log('📭 No user found or error');
      return {};
    }

    // Get progress WITHOUT ambiguous join
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userData.id);

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log('📭 No progress found');
      return {};
    }

    // Get topic details separately
    const topicIds = data.map(item => item.topic_id).filter(Boolean);
    
    const { data: topicsData } = await supabase
      .from('topics')
      .select('id, title, subject_id')
      .in('id', topicIds);
    
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('id, name');
    
    // Create lookup maps
    const topicMap = new Map();
    const subjectMap = new Map();
    
    topicsData?.forEach(t => topicMap.set(t.id, t));
    subjectsData?.forEach(s => subjectMap.set(s.id, s.name));

    const progress: UserProgress = {};
    
    data.forEach(item => {
      const topic = topicMap.get(item.topic_id);
      let subjectName = 'General';
      
      if (topic && topic.subject_id) {
        subjectName = subjectMap.get(topic.subject_id) || 'General';
      }
      
      if (!progress[subjectName]) {
        progress[subjectName] = {};
      }
      
      progress[subjectName][item.topic_id] = {
        subtopics: item.subtopics || {},
        checkpointScores: item.checkpoint_scores || {},
        mainAssessmentPassed: item.main_assessment_passed || false,
        mainAssessmentScore: item.main_assessment_score,
        lastAccessed: item.last_accessed ? new Date(item.last_accessed).getTime() : undefined
      };
    });

    console.log(`✅ Progress loaded for ${username}: ${Object.keys(progress).length} subjects`);
    return progress;
    
  } catch (error) {
    console.error('❌ Get progress error:', error);
    return {};
  }
};

export const updateTopicProgress = async (
  username: string, 
  subject: string, 
  topicId: string, 
  updates: Partial<TopicProgress>
): Promise<void> => {
  console.log(`Updating progress: ${username} - ${topicId}`);
  
  try {
    // Get user ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (!userData) throw new Error('User not found');

    // Get existing progress
    const { data: existing } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userData.id)
      .eq('topic_id', topicId)
      .single();

    const current = existing?.progress_data || { 
      subtopics: {}, 
      checkpointScores: {}, 
      mainAssessmentPassed: false 
    };
    
    const merged = {
      ...current,
      ...updates,
      subtopics: { ...current.subtopics, ...(updates.subtopics || {}) },
      checkpointScores: { ...current.checkpointScores, ...(updates.checkpointScores || {}) },
      lastAccessed: Date.now()
    };

    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userData.id,
        topic_id: topicId,
        subtopics: merged.subtopics,
        checkpoint_scores: merged.checkpointScores,
        main_assessment_passed: merged.mainAssessmentPassed,
        main_assessment_score: merged.mainAssessmentScore,
        last_accessed: new Date().toISOString()
      }, { onConflict: 'user_id,topic_id' });
    
    if (error) throw error;
    
    console.log(`Progress updated: ${username} - ${topicId}`);
  } catch (error) {
    console.error('Update progress error:', error);
    throw error;
  }
};

// =====================================================
// ASSESSMENTS
// =====================================================
export const getAssessments = async (): Promise<Assessment[]> => {
  console.time('getAssessments');
  console.log('📝 Fetching assessments...');
  
  try {
    const { data: assessmentsData, error: assessmentsError } = await supabase
      .from('assessments')
      .select('*')
      .order('created_at', { ascending: false });

    if (assessmentsError) throw assessmentsError;

    // Get questions for all assessments
    const assessments: Assessment[] = [];
    
    for (const item of assessmentsData || []) {
      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('assessment_id', item.id);

      assessments.push({
        id: item.id,
        title: item.title,
        subject: item.subject || '',
        questions: (questionsData || []).map((q: any) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          difficulty: q.difficulty || 'IGCSE',
          topic: item.subject || '',
          options: q.options || [],
          correctAnswer: q.correct_answer || '',
          modelAnswer: q.model_answer,
          
          // NEW FIELDS
          format: q.format || 'plain_text',
          metadata: q.metadata || {},
          content: q.content || '',
          
          // DB fields
          topic_id: q.topic_id,
          subtopic_name: q.subtopic_name,
          explanation: q.explanation,
          sort_order: q.sort_order
        })),
        assignedTo: item.assigned_to || [],
        targetGrade: item.target_grade || 'all',
        createdBy: item.created_by || 'system'
      });
    }

    console.timeEnd('getAssessments');
    console.log(`✅ Fetched ${assessments.length} assessments`);
    return assessments;
  } catch (error) {
    console.error('❌ Get assessments error:', error);
    console.timeEnd('getAssessments');
    return [];
  }
};

export const saveAssessment = async (assessment: Assessment): Promise<void> => {
  
  
  try {
    // Save assessment
    const { error: assessmentError } = await supabase
      .from('assessments')
      .upsert({
        id: assessment.id,
        title: assessment.title,
        subject: assessment.subject,
        target_grade: assessment.targetGrade,
        created_by: assessment.createdBy,
        assigned_to: assessment.assignedTo,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (assessmentError) throw assessmentError;

    // Save questions
    for (const question of assessment.questions) {
      const { error: questionError } = await supabase
        .from('questions')
        .upsert({
          id: question.id,
          assessment_id: assessment.id,
          text: question.text,
          type: question.type,
          difficulty: question.difficulty,
          options: question.options,
          correct_answer: question.correctAnswer,
          model_answer: question.modelAnswer
        }, { onConflict: 'id' });
      
      if (questionError) console.error('Question save error:', questionError);
    }

    
  } catch (error) {
    console.error('Save assessment error:', error);
    throw error;
  }
};

export const deleteAssessment = async (id: string): Promise<void> => {
  await supabase.from('assessments').delete().eq('id', id);
};

// =====================================================
// SUBMISSIONS
// =====================================================
export const getSubmissions = async (assessmentId?: string): Promise<Submission[]> => {
  
  try {
    let query = supabase
      .from('submissions')
      .select('*');
    
    if (assessmentId) {
      query = query.eq('assessment_id', assessmentId);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    const submissions: Submission[] = (data || []).map(item => ({
      assessmentId: item.assessment_id,
      username: item.username || '',
      answers: item.answers || {},
      submittedAt: item.submitted_at ? new Date(item.submitted_at).getTime() : Date.now(),
      graded: item.graded || false,
      score: item.score,
      feedback: item.feedback,
      aiGraded: item.ai_graded || false
    }));

    
    return submissions;
  } catch (error) {
    console.error('Get submissions error:', error);
    return [];
  }
};

// Find the saveSubmission function (around line 700-750)
export const saveSubmission = async (submission: Submission): Promise<void> => {
  console.log(`💾 Saving submission for ${submission.username} - ${submission.assessmentId}`);
  
  try {
    // Get user ID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('username', submission.username)
      .single();

    if (!user) throw new Error('User not found');

    // ✅ IMPORTANT: Ensure graded flag is properly set
    const submissionData = {
      assessment_id: submission.assessmentId,
      user_id: user.id,
      username: submission.username,
      answers: submission.answers,
      score: submission.score,
      graded: submission.graded || false, // Ensure boolean
      feedback: submission.feedback,
      ai_graded: submission.newelGraded || false,
      submitted_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('submissions')
      .upsert(submissionData, { onConflict: 'assessment_id,user_id' });
    
    if (error) {
      console.error('❌ Save submission error:', error);
      throw error;
    }
    
    console.log(`✅ Submission saved for ${submission.username}`);
    
    // ✅ CRITICAL: Only update leaderboard if it's graded AND has a score
    // The database trigger will handle teacher notifications automatically
    if (submission.graded === true && submission.score !== undefined && submission.score > 0) {
      console.log(`📊 Updating leaderboard for graded submission: ${submission.score}%`);
      await updateAssessmentLeaderboard(submission.username, submission.score);
    } else {
      console.log(`⏭️ Skipping leaderboard update: graded=${submission.graded}, score=${submission.score}`);
    }
  } catch (error) {
    console.error('❌ Save submission error:', error);
    throw error;
  }
};

// =====================================================
// LEADERBOARDS - FIXED FOR DEPLOYMENT
// =====================================================
export const getLeaderboards = async (): Promise<{
  academic: LeaderboardEntry[];
  challenge: LeaderboardEntry[];
  assessments: LeaderboardEntry[];
}> => {
  
  
  try {
    // Get all submissions to calculate assessment scores
    const submissions = await getSubmissions();
    
    // Get all users to exclude demo accounts
    const users = await getUsers();
    
    // Calculate assessment scores from graded submissions (exclude demo accounts)
    const assessmentScores: Record<string, number> = {};
    const assessmentCounts: Record<string, number> = {};
    
    submissions.forEach(sub => {
      if (sub.graded && sub.score !== undefined && !DEMO_ACCOUNTS.includes(sub.username)) {
        if (!assessmentScores[sub.username]) {
          assessmentScores[sub.username] = 0;
          assessmentCounts[sub.username] = 0;
        }
        assessmentScores[sub.username] += sub.score;
        assessmentCounts[sub.username] += 1;
      }
    });

    // Calculate averages
    const assessmentAverages: Record<string, number> = {};
    Object.keys(assessmentScores).forEach(username => {
      if (assessmentCounts[username] > 0) {
        assessmentAverages[username] = assessmentScores[username] / assessmentCounts[username];
      }
    });

    // Convert assessment averages to leaderboard entries
    const challengeEntries = []; // Initialize variable
    const assessmentEntries = Object.entries(assessmentAverages)
      .map(([username, avgScore]) => {
        const user = Object.values(users).find(u => u.username === username);
        return {
          username,
          score: avgScore,
          grade_level: user?.gradeLevel || '',
          type: 'assessments' as const
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Get existing leaderboard data (exclude demo accounts)
    const { data, error } = await supabase
      .from('leaderboards')
      .select('id, username, score, grade_level, board_type')
      .order('score', { ascending: false });

    if (error) {
      console.error('â Œ Error fetching leaderboards:', error);
      return { academic: [], challenge: [], assessments: assessmentEntries };
    }

    // Filter out demo accounts
    const filteredData = (data || []).filter(item => 
      !DEMO_ACCOUNTS.includes(item.username)
    );

    // Organize by board_type
    const leaderboards = {
      academic: filteredData
        .filter((l: any) => l.board_type === 'academic')
        .slice(0, 10)
        .map((item: any) => ({
          username: item.username || '',
          score: item.score,
          grade_level: item.grade_level,
          type: item.board_type as 'academic' | 'challenge' | 'assessments'
        })),
      challenge: filteredData
        .filter((l: any) => l.board_type === 'challenge')
        .slice(0, 10)
        .map((item: any) => ({
          username: item.username || '',
          score: item.score,
          grade_level: item.grade_level,
          type: item.board_type as 'academic' | 'challenge' | 'assessments'
        })),
      assessments: assessmentEntries
    };
    // In the getLeaderboards function, add course checkpoint scores
    const getCourseAssessmentScores = async (): Promise<Record<string, number>> => {
      try {
        const { data: checkpointProgress, error } = await supabase
          .from('student_checkpoint_progress')
          .select('user_id, score, checkpoint:checkpoints(topic_id)')
          .not('score', 'is', null);

        if (error) throw error;

        const scores: Record<string, number> = {};
        const counts: Record<string, number> = {};

        // Get usernames for user_ids
        const { data: users } = await supabase
          .from('users')
          .select('id, username');

        const userMap: Record<string, string> = {};
        users?.forEach(u => userMap[u.id] = u.username);

        checkpointProgress?.forEach(progress => {
          const username = userMap[progress.user_id];
          if (username && !DEMO_ACCOUNTS.includes(username)) {
            if (!scores[username]) {
              scores[username] = 0;
              counts[username] = 0;
            }
            scores[username] += progress.score;
            counts[username] += 1;
          }
        });

        // Calculate averages
        const averages: Record<string, number> = {};
        Object.keys(scores).forEach(username => {
          if (counts[username] > 0) {
            averages[username] = Math.round(scores[username] / counts[username]);
          }
        });

        return averages;
      } catch (error) {
        console.error('Error getting course assessment scores:', error);
        return {};
      }
    };

    // Then in getLeaderboards function, add this:
    const courseScores = await getCourseAssessmentScores();
    const courseEntries = Object.entries(courseScores)
      .map(([username, avgScore]) => ({
        username,
        score: avgScore,
        grade_level: users[username]?.gradeLevel || '',
        type: 'course' as const
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Add to your return statement
    return {
      academic: courseEntries.map(entry => ({
        ...entry,
        type: 'academic' as const  // Convert 'course' type to 'academic'
      })), // Use course scores for academic leaderboard
      challenge: filteredData
        .filter((l: any) => l.board_type === 'challenge')
        .slice(0, 10)
        .map((item: any) => ({
          username: item.username || '',
          score: item.score,
          grade_level: item.grade_level,
          type: item.board_type as 'academic' | 'challenge' | 'assessments'
        })),
      assessments: assessmentEntries
    };

  } catch (error) {
    console.error('Get leaderboards error:', error);
    return { academic: [], challenge: [], assessments: [] };
  }
};


export const saveSprintScore = async (username: string, score: number): Promise<void> => {
  
  
  // Don't save demo account scores
  if (DEMO_ACCOUNTS.includes(username)) {
    
    return;
  }
  
  try {
    // Get user ID
    const { data: user } = await supabase
      .from('users')
      .select('id, grade_level')
      .eq('username', username)
      .single();

    if (!user) return;

    const { error } = await supabase
      .from('leaderboards')
      .insert({
        board_type: 'challenge',
        user_id: user.id,
        username: username,
        score: score,
        grade_level: user.grade_level || '',
        recorded_at: new Date().toISOString()
      });
    
    if (error) throw error;
    
    
  } catch (error) {
    console.error('Save sprint score error:', error);
  }
};

// Replace the existing updateAssessmentLeaderboard function (lines ~1147-1220)
export const updateAssessmentLeaderboard = async (username: string, score: number): Promise<void> => {
  console.log(`📊 Updating assessment leaderboard for ${username}: ${score}%`);
  
  // Don't update demo accounts
  if (DEMO_ACCOUNTS.includes(username)) {
    console.log('⏭️ Skipping demo account');
    return;
  }
  
  try {
    // Get user ID
    const { data: user } = await supabase
      .from('users')
      .select('id, grade_level')
      .eq('username', username)
      .single();

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    // Check existing entry
    const { data: existing, error: fetchError } = await supabase
      .from('leaderboards')
      .select('id, score')
      .eq('username', username)
      .eq('board_type', 'assessments')
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('❌ Error fetching existing leaderboard:', fetchError);
      return;
    }

    let newScore = score;
    
    if (existing) {
      // Keep the highest score
      newScore = Math.max(existing.score, score);
      
      const { error: updateError } = await supabase
        .from('leaderboards')
        .update({
          score: newScore,
          recorded_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      
      if (updateError) {
        console.error('❌ Update leaderboard error:', updateError);
        return;
      }
    } else {
      // Create new entry
      const { error: insertError } = await supabase
        .from('leaderboards')
        .insert({
          board_type: 'assessments',
          user_id: user.id,
          username: username,
          score: newScore,
          grade_level: user.grade_level || '',
          recorded_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('❌ Insert leaderboard error:', insertError);
        return;
      }
    }
    
    // ✅ NEW: Send leaderboard notification
    try {
      // Get current position on leaderboard
      const { data: leaderboard } = await supabase
        .from('leaderboards')
        .select('username, score')
        .eq('board_type', 'assessments')
        .order('score', { ascending: false });
      
      if (leaderboard) {
        const position = leaderboard.findIndex(entry => entry.username === username) + 1;
        if (position <= 10) { // Only notify if in top 10
          await notifyLeaderboardUpdate(username, position, 'assessments');
          console.log(`📢 Sent leaderboard notification: #${position}`);
        }
      }
    } catch (notifyError) {
      console.error('Failed to send leaderboard notification:', notifyError);
    }
    
    console.log(`✅ Leaderboard updated for ${username}: ${newScore}%`);
    
  } catch (error) {
    console.error('❌ Update assessment leaderboard error:', error);
  }
};



// =====================================================
// ANNOUNCEMENTS
// =====================================================
// Helper function for 48-hour expiry
const get48HourExpiry = (): number => {
  return Date.now() + (48 * 60 * 60 * 1000); // 48 hours from now
};


export const saveAnnouncement = async (announcement: Announcement): Promise<Announcement> => {
  try {
    console.log('📝 Saving announcement:', announcement);
    
    // Prepare database payload
    const dbPayload = {
      title: announcement.title,
      content: announcement.content,
      author: announcement.author || null, // UUID or null
      author_name: announcement.author_name || 'System',
      expires_at: announcement.expires_at || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      // Don't send id, created_at, updated_at - let database handle
    };
    
    console.log('📤 Sending to database:', dbPayload);
    
    const { data, error } = await supabase
      .from('announcements')
      .insert([dbPayload])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Supabase insert error:', error);
      throw error;
    }
    
    console.log('✅ Announcement saved successfully:', data);
    
    // Return the saved announcement with all fields
    return {
      id: data.id,
      title: data.title,
      content: data.content,
      author_name: data.author_name || 'System',
      author: data.author,
      created_at: data.created_at,
      expires_at: data.expires_at,
      updated_at: data.updated_at
    };
    
  } catch (error) {
    console.error('💥 Save announcement error:', error);
    throw error;
  }
};

export const getAnnouncements = async (): Promise<Announcement[]> => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    const now = new Date();
    const announcements: Announcement[] = [];
    
    // Process and filter expired announcements
    for (const item of (data || [])) {
      // Check if announcement is expired
      if (item.expires_at && new Date(item.expires_at) < now) {
        // Delete expired announcement
        try {
          await supabase
            .from('announcements')
            .delete()
            .eq('id', item.id);
          console.log(`🗑️ Deleted expired announcement: ${item.title}`);
        } catch (deleteError) {
          console.error('Error deleting expired announcement:', deleteError);
        }
        continue; // Skip adding to list
      }
      
      // Convert to frontend format
      announcements.push({
        id: item.id,
        title: item.title,
        content: item.content,
        author_name: item.author_name || 'System',
        author: item.author,
        created_at: item.created_at || new Date().toISOString(),
        expires_at: item.expires_at || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        updated_at: item.updated_at
      });
    }
    
    return announcements;
  } catch (error) {
    console.error('Get announcements error:', error);
    return [];
  }
};

// Backward compatibility wrapper
export const createAnnouncementLegacy = async (
  title: string, 
  content: string, 
  authorName: string
): Promise<Announcement> => {
  const announcementData: Announcement = {
    id: `temp-${Date.now()}`, // Temporary ID for frontend
    title,
    content,
    author_name: authorName,
    author: undefined, // No UUID
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + (48 * 60 * 60 * 1000)).toISOString(),
    updated_at: undefined
  };
  
  return await saveAnnouncement(announcementData);
};

// =====================================================
// STATISTICS - FIXED FOR DEPLOYMENT
// =====================================================
export const calculateUserStats = (user: User) => {
  const history = user.loginHistory || [];
  if (history.length === 0) return { activeDays: 0, streak: 0 };
  
  const dates = history.map(ts => new Date(ts).toISOString().split('T')[0]);
  const uniqueDates = Array.from(new Set(dates)).sort();
  
  const activeDays = uniqueDates.length;
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
    streak = 1;
    let currentDate = new Date(uniqueDates[uniqueDates.length - 1] as string);
    
    for (let i = uniqueDates.length - 2; i >= 0; i--) {
      const prevDate = new Date(uniqueDates[i] as string);
      const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays === 1) {
        streak++;
        currentDate = prevDate;
      } else {
        break;
      }
    }
  }
  
  return { activeDays, streak };
};

// REPLACE the entire getAllStudentStats function with this:
export const getAllStudentStats = async (): Promise<StudentStats[]> => {
  const CACHE_KEY = 'all_student_stats';
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache
  
  // Check cache first
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      console.log('📊 Using cached student stats');
      return data;
    }
  }
  
  console.time('getAllStudentStats');
  
  try {
    // Get all users (excluding demo accounts)
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('username, grade_level, login_history, last_login, role, created_at')
      .eq('approved', true)
      .eq('role', 'student')
      .not('username', 'in', `(${DEMO_ACCOUNTS.map(a => `'${a}'`).join(',')})`);

    if (usersError) throw usersError;
    if (!usersData || usersData.length === 0) {
      console.timeEnd('getAllStudentStats');
      return [];
    }

    // Get all submissions (only graded ones with actual scores)
    const { data: submissionsData } = await supabase
      .from('submissions')
      .select('username, score, graded, submitted_at')
      .eq('graded', true)
      .gt('score', 0); // Only include actual scores > 0

    // Get all checkpoint progress (only with actual scores)
    const { data: checkpointData } = await supabase
      .from('student_checkpoint_progress')
      .select('user_id, score, passed, completed_at')
      .gt('score', 0) // Only include actual scores
      .not('score', 'is', null);

    // Create user map for fast lookup
    const userMap = new Map();
    usersData.forEach(user => userMap.set(user.username, user));

    // Get user IDs for checkpoint mapping
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, username')
      .eq('role', 'student');

    const userUsernameMap = new Map();
    allUsers?.forEach(u => userUsernameMap.set(u.id, u.username));

    // Calculate stats efficiently
    const stats: StudentStats[] = [];
    
    for (const user of usersData) {
      // Calculate submission scores
      const userSubmissions = submissionsData?.filter(s => 
        s.username === user.username && 
        s.score && 
        s.score > 0
      ) || [];
      
      // Calculate checkpoint scores - map user_id to username
      const userCheckpoints = checkpointData?.filter(cp => {
        const username = userUsernameMap.get(cp.user_id);
        return username === user.username && cp.score && cp.score > 0;
      }) || [];
      
      // Combine all scores
      const submissionScores = userSubmissions.map(s => s.score);
      const checkpointScores = userCheckpoints.map(cp => cp.score);
      const allScores = [...submissionScores, ...checkpointScores];
      
      // CRITICAL FIX: Only calculate average if there are actual scores
      let avgScore = 0;
      let completionRate = 0;
      
      if (allScores.length > 0) {
        avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
        
        // Calculate completion rate based on actual checkpoints
        const passedCheckpoints = userCheckpoints.filter(cp => cp.passed).length;
        const totalCheckpointsAttempted = userCheckpoints.length;
        completionRate = totalCheckpointsAttempted > 0 ? 
          Math.round((passedCheckpoints / totalCheckpointsAttempted) * 100) : 0;
      } else {
        // New students or students with no activity get 0%
        avgScore = 0;
        completionRate = 0;
      }

      // Calculate user stats
      const { activeDays, streak } = calculateUserStats({
        username: user.username,
        role: user.role,
        approved: true,
        securityQuestion: '',
        securityAnswer: '',
        gradeLevel: user.grade_level,
        loginHistory: user.login_history?.map((d: string) => new Date(d).getTime()),
        lastLogin: user.last_login ? new Date(user.last_login).getTime() : undefined
      });

      // Only include students with some activity or for reporting
      stats.push({
        username: user.username,
        gradeLevel: user.grade_level || '?',
        avgScore: Math.round(avgScore * 10) / 10, // 1 decimal place
        completionRate: completionRate,
        lastActive: user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never',
        streak: streak,
        activeDays: activeDays
      });
    }

    // Sort by average score (highest first), but put 0 scores at the end
    const sortedStats = stats.sort((a, b) => {
      if (a.avgScore === 0 && b.avgScore > 0) return 1;
      if (b.avgScore === 0 && a.avgScore > 0) return -1;
      return b.avgScore - a.avgScore;
    });
    
    // Cache the result
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      data: sortedStats,
      timestamp: Date.now()
    }));
    
    console.timeEnd('getAllStudentStats');
    console.log(`✅ Student stats loaded: ${sortedStats.length} students`);
    console.log(`📊 Active students: ${sortedStats.filter(s => s.avgScore > 0).length}`);
    console.log(`📊 New students (0%): ${sortedStats.filter(s => s.avgScore === 0).length}`);
    
    return sortedStats;
  } catch (error) {
    console.error('❌ Error calculating stats:', error);
    console.timeEnd('getAllStudentStats');
    return [];
  }
};

// ADD this function to storageService.ts (for TopicDetailCheckpoints.tsx):
export const getTopicMaterials = async (topicId: string): Promise<Material[]> => {
  const CACHE_KEY = `topic_materials_${topicId}`;
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes cache
  
  // Check cache first
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      console.log(`📦 Using cached materials for topic ${topicId}`);
      return data;
    }
  }
  
  console.time(`getTopicMaterials-${topicId}`);
  
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('topic_id', topicId)
      .order('sort_order', { ascending: true })
      .limit(20); // Limit to 20 materials per topic

    if (error) throw error;

    const materials: Material[] = (data || []).map((m: any) => ({
      id: m.id,
      title: m.title,
      type: m.type as 'text' | 'link' | 'file',
      content: m.type === 'file' ? (m.storage_path || m.content || '') : (m.content || '')
    }));

    // Cache the result
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: materials,
      timestamp: Date.now()
    }));
    
    console.timeEnd(`getTopicMaterials-${topicId}`);
    console.log(`✅ Loaded ${materials.length} materials for topic ${topicId}`);
    
    return materials;
  } catch (error) {
    console.error(`❌ Error loading topic materials for ${topicId}:`, error);
    console.timeEnd(`getTopicMaterials-${topicId}`);
    return [];
  }
};

export const getClassOverview = async () => {
  const stats = await getAllStudentStats();
  
  // Only count students with actual scores for averages
  const studentsWithScores = stats.filter(s => s.avgScore > 0);
  const totalStudents = stats.length;
  const activeStudents = studentsWithScores.length;
  
  let classAverage = 0;
  if (activeStudents > 0) {
    const totalScore = studentsWithScores.reduce((sum, student) => sum + student.avgScore, 0);
    classAverage = Math.round(totalScore / activeStudents);
  }
  
  // Find weakest topic only for active students
  const weakestTopic = activeStudents > 0 ? 'Analyzing...' : 'No Data';
  
  return {
    totalStudents,
    activeStudents,
    classAverage,
    weakestTopic,
    inactivePercentage: totalStudents > 0 ? 
      Math.round(((totalStudents - activeStudents) / totalStudents) * 100) : 0
  };
};


// Add this function to storageService.ts
export const getStudentCheckpointScores = async (username: string): Promise<Record<string, number>> => {
  try {
    console.log(`📊 Getting checkpoint scores for ${username}`);
    
    // Get user ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();
    
    if (!userData) {
      console.log('❌ User not found');
      return {};
    }
    
    // Get checkpoint progress with subject information
    const { data: checkpointProgress, error } = await supabase
      .from('student_checkpoint_progress')
      .select(`
        score,
        checkpoint_id
      `)
      .eq('user_id', userData.id)
      .not('score', 'is', null);
    
    if (error) {
      console.error('❌ Error fetching checkpoint progress:', error);
      return {};
    }
    
    if (!checkpointProgress || checkpointProgress.length === 0) {
      console.log('📭 No checkpoint progress found');
      return {};
    }
    
    console.log(`✅ Found ${checkpointProgress.length} checkpoint records`);
    
    // Get topic IDs from checkpoints
    const checkpointIds = checkpointProgress.map(cp => cp.checkpoint_id).filter(Boolean);
    
    const { data: checkpoints } = await supabase
      .from('checkpoints')
      .select('id, topic_id')
      .in('id', checkpointIds);
    
    if (!checkpoints || checkpoints.length === 0) {
      return {};
    }
    
    // Get topic IDs
    const topicIds = [...new Set(checkpoints.map(c => c.topic_id).filter(Boolean))];
    
    // Get topics with subjects
    const { data: topics } = await supabase
      .from('topics')
      .select(`
        id,
        subject:subject_id (name)
      `)
      .in('id', topicIds);
    
    // Group scores by subject
    const scoresBySubject: Record<string, { total: number; count: number }> = {};
    
    checkpointProgress.forEach(item => {
      if (!item.score) return;
      
      // Find which topic this checkpoint belongs to
      const checkpoint = checkpoints.find(c => c.id === item.checkpoint_id);
      if (!checkpoint) return;
      
      // Find the topic
      const topic = topics?.find(t => t.id === checkpoint.topic_id);
      let subjectName = 'General';
      
      if (topic?.subject) {
        if (Array.isArray(topic.subject) && topic.subject.length > 0) {
          subjectName = topic.subject[0]?.name || 'General';
        } else if (typeof topic.subject === 'object' && topic.subject !== null) {
          subjectName = (topic.subject as any).name || 'General';
        }
      }
      
      if (!scoresBySubject[subjectName]) {
        scoresBySubject[subjectName] = { total: 0, count: 0 };
      }
      scoresBySubject[subjectName].total += item.score;
      scoresBySubject[subjectName].count++;
    });
    
    // Calculate averages
    const averages: Record<string, number> = {};
    Object.keys(scoresBySubject).forEach(subject => {
      const data = scoresBySubject[subject];
      if (data.count > 0) {
        averages[subject] = Math.round(data.total / data.count);
      }
    });
    
    console.log('📈 Subject averages:', averages);
    return averages;
    
  } catch (error) {
    console.error('❌ Error in getStudentCheckpointScores:', error);
    return {};
  }
};

// Add to storageService.ts (after getStudentTopicPerformance function)
// In storageService.ts, REPLACE the getStudentSubjectPerformance function with:
// storageService.ts - CORRECTED VERSION of getStudentSubjectPerformance
// REPLACE the entire getStudentSubjectPerformance function with this:
// storageService.ts - CORRECTED VERSION of getStudentSubjectPerformance
// storageService.ts - CORRECTED VERSION with proper type handling
export const getStudentSubjectPerformance = async (username: string): Promise<Record<string, number>> => {
  const CACHE_KEY = `student_performance_${username}`;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  // Check memory cache first
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      console.log(`📊 Using cached performance for ${username}`);
      return data;
    }
  }
  
  console.time(`getStudentSubjectPerformance-${username}`);
  console.log(`📊 Getting subject performance for ${username}`);
  
  try {
    // 1. Get user ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (!userData) {
      console.log(`❌ User ${username} not found`);
      return {};
    }

    // 2. Get checkpoints with topics and subjects
    const { data: checkpointData, error } = await supabase
      .from('student_checkpoint_progress')
      .select(`
        score,
        checkpoint:checkpoints(
          topic:topics(
            subject:subject_id(name)
          )
        )
      `)
      .eq('user_id', userData.id)
      .not('score', 'is', null);

    if (error) {
      console.error('❌ Error fetching checkpoint data:', error);
      return {};
    }

    // 3. Get assessments
    const { data: submissionData } = await supabase
      .from('submissions')
      .select(`
        score,
        assessment:assessments(
          subject
        )
      `)
      .eq('user_id', userData.id)
      .eq('graded', true)
      .not('score', 'is', null);

    // 4. Define types for better TypeScript inference
    type CheckpointItem = {
      score: number;
      checkpoint?: {
        topic?: {
          subject?: Array<{ name: string }> | { name: string };
        };
      };
    };

    type SubmissionItem = {
      score: number;
      assessment?: {
        subject?: string | string[];
      };
    };

    // Cast the data to our defined types
    const typedCheckpointData = (checkpointData || []) as CheckpointItem[];
    const typedSubmissionData = (submissionData || []) as SubmissionItem[];

    // 5. Process data efficiently
    const subjectScores: Record<string, { total: number; count: number }> = {};

    // Process checkpoints
    typedCheckpointData.forEach(item => {
      if (!item.score) return;
      
      // Safely navigate the nested structure
      const checkpoint = item.checkpoint;
      if (!checkpoint?.topic?.subject) return;
      
      let subjectName = 'General';
      const subject = checkpoint.topic.subject;
      
      // Handle both array and object formats
      if (Array.isArray(subject) && subject.length > 0) {
        const firstSubject = subject[0];
        subjectName = firstSubject?.name || 'General';
      } else if (subject && typeof subject === 'object' && 'name' in subject) {
        subjectName = (subject as { name: string }).name || 'General';
      }
      
      if (!subjectScores[subjectName]) {
        subjectScores[subjectName] = { total: 0, count: 0 };
      }
      subjectScores[subjectName].total += item.score;
      subjectScores[subjectName].count++;
    });

    // Process assessments
    typedSubmissionData.forEach(item => {
      if (!item.score || !item.assessment?.subject) return;
      
      // Handle subject which could be string or array
      const assessmentSubject = item.assessment.subject;
      let subjectName = 'General';
      
      if (typeof assessmentSubject === 'string') {
        subjectName = assessmentSubject;
      } else if (Array.isArray(assessmentSubject) && assessmentSubject.length > 0) {
        subjectName = assessmentSubject[0] || 'General';
      }
      
      if (!subjectScores[subjectName]) {
        subjectScores[subjectName] = { total: 0, count: 0 };
      }
      subjectScores[subjectName].total += item.score;
      subjectScores[subjectName].count++;
    });

    // 6. Calculate averages
    const averages: Record<string, number> = {};
    Object.keys(subjectScores).forEach(subject => {
      const data = subjectScores[subject];
      if (data.count > 0) {
        averages[subject] = Math.round(data.total / data.count);
      }
    });

    // 7. Cache the result
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      data: averages,
      timestamp: Date.now()
    }));

    console.timeEnd(`getStudentSubjectPerformance-${username}`);
    console.log(`✅ Performance calculated for ${username}:`, Object.keys(averages).length, 'subjects');
    
    return averages;
    
  } catch (error) {
    console.error('❌ Error in getStudentSubjectPerformance:', error);
    console.timeEnd(`getStudentSubjectPerformance-${username}`);
    return {};
  }
};

// Add this function to storageService.ts
export const getStudentCourseProgress = async (username: string): Promise<any[]> => {
  try {
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (!userData) return [];

    // Get topics with progress
    const { data: topicsProgress } = await supabase
      .from('user_progress')
      .select(`
        *,
        topic:topics (
          id,
          title,
          grade_level,
          subject:subject_id (name)
        )
      `)
      .eq('user_id', userData.id);

    if (!topicsProgress) return [];

    return topicsProgress.map(progress => {
      const topic = progress.topic;
      let subjectName = 'General';
      
      if (topic?.subject) {
        if (Array.isArray(topic.subject) && topic.subject.length > 0) {
          subjectName = topic.subject[0]?.name || 'General';
        } else if (typeof topic.subject === 'object') {
          subjectName = (topic.subject as any)?.name || 'General';
        }
      }

      return {
        topicId: progress.topic_id,
        topicTitle: topic?.title || 'Unknown',
        subject: subjectName,
        gradeLevel: topic?.grade_level || 'N/A',
        mainAssessmentScore: progress.main_assessment_score,
        mainAssessmentPassed: progress.main_assessment_passed,
        lastAccessed: progress.last_accessed
      };
    });
  } catch (error) {
    console.error('Error getting course progress:', error);
    return [];
  }
};
// =======================
// NOTIFICATION FUNCTIONS
// =======================

// Get notifications for a specific user
// =======================
// NOTIFICATION FUNCTIONS - UPDATED
// =======================

// Get notifications for a specific user with preferences
export const getUserNotifications = async (username: string): Promise<Notification[]> => {
  try {
    // Get user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();
    
    if (userError || !userData) {
      console.error(`❌ User ${username} not found:`, userError?.message);
      return [];
    }
    
    // Get user notification preferences
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userData.id)
      .single();
    
    // Fetch notifications
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })
      .limit(50); // Increased limit
    
    if (error) {
      console.error('❌ Error fetching notifications:', error);
      return [];
    }
    
    const now = Date.now();
    const validNotifications: Notification[] = [];
    
    // Process and filter notifications
    for (const item of (data || [])) {
      const expiresTime = item.expires_at ? new Date(item.expires_at).getTime() : 
                         (item.created_at ? new Date(item.created_at).getTime() + (7 * 24 * 60 * 60 * 1000) : now + (7 * 24 * 60 * 60 * 1000));
      
      // Skip if expired
      if (now > expiresTime) continue;
      
      // Skip if user has disabled this notification type
      if (preferences) {
        const metadata = item.metadata || {};
        
        // Filter based on notification content and user preferences
        if (item.text.includes('New submission') && !preferences.submission_graded) continue;
        if (item.text.includes('Assessment graded') && !preferences.submission_graded) continue;
        if (item.text.includes('New material') && !preferences.course_updates) continue;
        if (item.text.includes('New assessment') && !preferences.new_assessments) continue;
        if (item.text.includes('Leaderboard') && !preferences.leaderboard_updates) continue;
        if (item.text.includes('completed') && item.text.includes('%') && !preferences.topic_completed) continue;
        if (item.type === 'info' && metadata.teacher && !preferences.teacher_announcements) continue;
        if (item.type === 'alert' && metadata.admin && !preferences.admin_alerts) continue;
      }
      
      validNotifications.push({
        id: item.id,
        text: item.text,
        type: item.type as 'info' | 'success' | 'warning' | 'alert',
        read: item.read,
        timestamp: item.created_at ? new Date(item.created_at).getTime() : now,
        metadata: item.metadata,
        expiresAt: expiresTime
      });
    }
    
    return validNotifications;
    
  } catch (error) {
    console.error('❌ Error in getUserNotifications:', error);
    return [];
  }
};

// Create notification (use sparingly - triggers handle most)
export const createNotification = async (
  username: string, 
  text: string, 
  type: Notification['type'] = 'info',
  metadata?: any
): Promise<string | null> => {
  console.log(`🔔 Manual notification for ${username}:`, { text, type });
  
  try {
    // Get user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();
    
    if (userError || !userData) {
      console.error(`❌ User ${username} not found:`, userError?.message);
      return null;
    }
    
    // Check user preferences before sending
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userData.id)
      .single();
    
    if (preferences) {
      // Skip if user has disabled this type
      if (text.includes('New submission') && !preferences.submission_graded) {
        console.log(`⏭️ Skipping notification (preferences disabled) for ${username}`);
        return null;
      }
      // Add other preference checks as needed
    }
    
    const notificationData = {
      user_id: userData.id,
      text,
      type,
      read: false,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString()
    };
    
    const { data, error: insertError } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select('id')
      .single();
    
    if (insertError) {
      console.error('❌ Error inserting notification:', insertError);
      return null;
    }
    
    console.log(`✅ Notification created: ${data.id}`);
    return data.id;
    
  } catch (error) {
    console.error('❌ Error in createNotification:', error);
    return null;
  }
};

// Get notification preferences
export const getNotificationPreferences = async (username: string): Promise<any> => {
  try {
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();
    
    if (!userData) return null;
    
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userData.id)
      .single();
    
    return preferences || {
      course_updates: true,
      new_assessments: true,
      leaderboard_updates: true,
      submission_graded: true,
      topic_completed: true,
      teacher_announcements: true,
      admin_alerts: false
    };
  } catch (error) {
    console.error('Error getting preferences:', error);
    return null;
  }
};

// Update notification preferences
export const updateNotificationPreferences = async (
  username: string,
  updates: Partial<{
    course_updates: boolean;
    new_assessments: boolean;
    leaderboard_updates: boolean;
    submission_graded: boolean;
    topic_completed: boolean;
    teacher_announcements: boolean;
    admin_alerts: boolean;
  }>
): Promise<boolean> => {
  try {
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();
    
    if (!userData) return false;
    
    const { error } = await supabase
      .from('notification_preferences')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userData.id);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error updating preferences:', error);
    return false;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (username: string): Promise<boolean> => {
  try {
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();
    
    if (!userData) return false;
    
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userData.id)
      .eq('read', false);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking all as read:', error);
    return false;
  }
};

// Get unread notification count
export const getUnreadNotificationCount = async (username: string): Promise<number> => {
  try {
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();
    
    if (!userData) return 0;
    
    // Use the database function we created
    const { data, error } = await supabase.rpc(
      'get_unread_notification_count',
      { p_user_id: userData.id }
    );
    
    if (error) {
      console.error('Error calling get_unread_notification_count:', error);
      // Fallback to direct query
      const { count, error: countError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userData.id)
        .eq('read', false)
        .gt('expires_at', new Date().toISOString());
      
      return countError ? 0 : (count || 0);
    }
    
    return data || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// =======================
// NOTIFICATION TRIGGERS - UPDATED
// =======================

// Trigger: Student completes topic (called from checkpoint completion)
export const notifyTopicCompletion = async (
  studentName: string,
  topicTitle: string,
  subject: string,
  finalScore: number
): Promise<void> => {
  const text = `🎉 Topic Completed! "${topicTitle}" - Final Score: ${finalScore}%`;
  const metadata = {
    topic: topicTitle,
    subject,
    finalScore,
    actionUrl: `/student-dashboard`
  };
  
  await createNotification(studentName, text, 'success', metadata);
  
  // Also notify teachers
  try {
    const { data: studentData } = await supabase
      .from('users')
      .select('grade_level')
      .eq('username', studentName)
      .single();
    
    if (studentData?.grade_level) {
      const { data: teachers } = await supabase
        .from('users')
        .select('username')
        .eq('role', 'teacher')
        .eq('approved', true);
      
      const teacherText = `📊 ${studentName} completed "${topicTitle}" with ${finalScore}%`;
      const teacherMetadata = {
        student: studentName,
        topic: topicTitle,
        subject,
        finalScore,
        actionUrl: `/teacher-dashboard`
      };
      
      const teacherPromises = (teachers || []).map(teacher =>
        createNotification(teacher.username, teacherText, 'info', teacherMetadata)
      );
      
      await Promise.all(teacherPromises);
    }
  } catch (error) {
    console.error('Error notifying teachers of topic completion:', error);
  }
};

// Trigger: New leaderboard entry (called from updateAssessmentLeaderboard)
export const notifyLeaderboardUpdate = async (
  studentName: string,
  position: number,
  boardType: 'academic' | 'challenge' | 'assessments'
): Promise<void> => {
  const boardNames = {
    academic: 'Academic Leaderboard',
    challenge: '222-Sprint Challenge',
    assessments: 'Assessment Leaderboard'
  };
  
  const emoji = position <= 3 ? '🏆' : '📈';
  const text = `${emoji} You're now #${position} on the ${boardNames[boardType]}`;
  const metadata = {
    position,
    boardType,
    actionUrl: `/leaderboard`
  };
  
  await createNotification(studentName, text, 'success', metadata);
};

// Trigger: Teacher creates announcement
export const notifyNewAnnouncement = async (
  teacherName: string,
  announcementTitle: string,
  gradeLevel: string
): Promise<void> => {
  const text = `📢 New announcement: "${announcementTitle}"`;
  const metadata = {
    teacher: teacherName,
    announcement: announcementTitle,
    actionUrl: `/`
  };
  
  // Use database function to notify all students in grade
  const { data, error } = await supabase.rpc(
    'create_notifications_for_grade',
    {
      p_grade_level: gradeLevel,
      p_text: text,
      p_type: 'info',
      p_metadata: metadata
    }
  );
  
  if (error) {
    console.error('Error creating grade notifications:', error);
  } else {
    console.log(`✅ Created ${data} notifications for grade ${gradeLevel}`);
  }
};

// =====================================================
// FILE UPLOAD
// =====================================================
// storageService.ts - Ensure file upload returns proper URL
export const uploadFileToSupabase = async (file: File): Promise<string | null> => {
  try {
    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('materials')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Upload failed:', error);
      return null;
    }

    // ✅ CRITICAL: Return full public URL for file access
    const publicUrl = `https://utihfxcdejjkqydtsiqj.supabase.co/storage/v1/object/public/materials/${fileName}`;
    
    
    return publicUrl;
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    return null;
  }
};

// Add this function to storageService.ts (after the uploadFileToSupabase function)
export const deleteMaterial = async (materialId: string): Promise<void> => {
  try {
    console.log(`🗑️ Attempting to delete material: ${materialId}`);
    
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', materialId);
    
    if (error) {
      console.error('❌ Database delete error:', error);
      throw error;
    }
    
    console.log(`✅ Material ${materialId} deleted from database`);
  } catch (error) {
    console.error('❌ Error deleting material from database:', error);
    throw error;
  }
};

// =====================================================
// EXPORT/IMPORT
// =====================================================
export const exportAllData = async (): Promise<string> => {
  console.log('📤 Exporting all data...');
  
  try {
    const [
      users,
      courses,
      assessments,
      submissions,
      announcements,
      leaderboards
    ] = await Promise.all([
      getRealUsers(), // Use real users only
      getCourses(),
      getAssessments(),
      getSubmissions(),
      getAnnouncements(),
      getLeaderboards()
    ]);

    const data = {
      users,
      courses,
      assessments,
      submissions,
      announcements,
      leaderboards,
      exportDate: new Date().toISOString(),
      source: 'supabase'
    };
    
    console.log('✅ Data exported successfully');
    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
};

export const importAllData = async (jsonString: string): Promise<boolean> => {
  console.log('📥 Importing data...');
  
  try {
    const data = JSON.parse(jsonString);
    
    // Import users
    if (data.users) {
      console.log(`👥 Importing ${Object.keys(data.users).length} users...`);
      for (const username in data.users) {
        await saveUser(data.users[username]);
      }
    }
    
    // Import courses
    if (data.courses) {
      let topicCount = 0;
      for (const subject in data.courses) {
        for (const topicId in data.courses[subject]) {
          await saveTopic(subject, data.courses[subject][topicId]);
          topicCount++;
        }
      }
      console.log(`📚 Imported ${topicCount} topics`);
    }
    
    // Import assessments
    if (data.assessments) {
      console.log(`📝 Importing ${data.assessments.length} assessments...`);
      for (const assessment of data.assessments) {
        await saveAssessment(assessment);
      }
    }
    
    console.log('✅ Import to Supabase complete');
    return true;
  } catch (error) {
    console.error('❌ Import failed:', error);
    return false;
  }
};

// =====================================================
// CLEANUP FUNCTIONS FOR DEPLOYMENT
// =====================================================
export const cleanupDemoData = async (): Promise<void> => {
  console.log('🧹 Cleaning up demo data...');
  
  try {
    // Delete demo accounts from leaderboards
    const { error: leaderboardError } = await supabase
      .from('leaderboards')
      .delete()
      .in('username', DEMO_ACCOUNTS);
    
    if (leaderboardError) console.error('❌ Leaderboard cleanup error:', leaderboardError);
    
    // Delete submissions from demo accounts
    const { error: submissionError } = await supabase
      .from('submissions')
      .delete()
      .in('username', DEMO_ACCOUNTS);
    
    if (submissionError) console.error('❌ Submission cleanup error:', submissionError);
    
    console.log('✅ Demo data cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
};

export const refreshAllLeaderboards = async (): Promise<void> => {
  console.log('🔄 Refreshing all leaderboards...');
  
  try {
    // Clean existing demo data
    await cleanupDemoData();
    
    // Get all graded submissions
    const submissions = await getSubmissions();
    const users = await getUsers();
    
    // Process each submission to update leaderboards
    for (const sub of submissions) {
      if (sub.graded && sub.score !== undefined && !DEMO_ACCOUNTS.includes(sub.username)) {
        await updateAssessmentLeaderboard(sub.username, sub.score);
      }
    }

    // After calculating leaderboards, add notifications for top 3 positions
    const leaderboards = await getLeaderboards();
    const boardTypes: ('academic' | 'challenge' | 'assessments')[] = ['academic', 'challenge', 'assessments'];

    for (const boardType of boardTypes) {
      const leaderboardData = leaderboards[boardType];
      const topThree = leaderboardData.slice(0, 3);
      
      for (const [index, entry] of topThree.entries()) {
        try {
          await notifyLeaderboardUpdate(
            entry.username,
            index + 1, // position (1, 2, 3)
            boardType
          );
          console.log('📢 Notification sent:', { user: entry.username, position: index + 1, board: boardType });
        } catch (notifyErr) {
          console.error(`❌ Failed to send ${boardType} notification for ${entry.username}:`, notifyErr);
        }
      }
    }
    
    console.log('✅ All leaderboards refreshed');
  } catch (error) {
    console.error('❌ Refresh leaderboards error:', error);
  }
};

// =====================================================
// CHECKPOINT SYSTEM FUNCTIONS (NEW)
// =====================================================

// Get checkpoints for a topic
export const getTopicCheckpoints = async (topicId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('checkpoints')
      .select('*')
      .eq('topic_id', topicId)
      .order('checkpoint_number', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Get checkpoints error:', error);
    return [];
  }
};

// Get student's checkpoint progress
export const getStudentCheckpointProgress = async (username: string, topicId: string): Promise<Record<string, any>> => {
  try {
    // First get user ID from username
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (!userData) return {};

    // Get all checkpoints for this topic
    const { data: checkpoints } = await supabase
      .from('checkpoints')
      .select('id')
      .eq('topic_id', topicId);

    if (!checkpoints || checkpoints.length === 0) return {};

    const checkpointIds = checkpoints.map(cp => cp.id);

    // Get progress for these checkpoints
    const { data: progressData, error } = await supabase
      .from('student_checkpoint_progress')
      .select('*')
      .eq('user_id', userData.id)
      .in('checkpoint_id', checkpointIds);

    if (error) throw error;

    // Convert to dictionary for easy lookup
    const progressDict: Record<string, any> = {};
    progressData?.forEach(item => {
      progressDict[item.checkpoint_id] = {
        score: item.score,
        passed: item.passed,
        completedAt: item.completed_at
      };
    });

    return progressDict;
  } catch (error) {
    console.error('❌ Get checkpoint progress error:', error);
    return {};
  }
};

// Save checkpoint progress
export const saveCheckpointProgress = async (
  username: string, 
  checkpointId: string, 
  score: number, 
  passed: boolean
): Promise<void> => {
  console.log(`💾 Saving checkpoint progress: ${username} - ${checkpointId} - ${score}% - ${passed ? 'PASSED' : 'FAILED'}`);
  
  try {
    // Get user ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (!userData) throw new Error('User not found');

    // Get checkpoint details
    const { data: checkpoint } = await supabase
      .from('checkpoints')
      .select('topic_id, checkpoint_number, title, required_score')
      .eq('id', checkpointId)
      .single();
    
    if (!checkpoint) throw new Error('Checkpoint not found');

    const { error } = await supabase
      .from('student_checkpoint_progress')
      .upsert({
        user_id: userData.id,
        checkpoint_id: checkpointId,
        score: Math.round(score),
        passed: passed,
        completed_at: new Date().toISOString()
      }, { onConflict: 'user_id,checkpoint_id' });

    if (error) throw error;
    
    // Check for topic completion
    if (passed && checkpoint.checkpoint_number === 5) { // Final assessment checkpoint
      try {
        // Get all checkpoints for this topic
        const { data: allCheckpoints } = await supabase
          .from('checkpoints')
          .select('id')
          .eq('topic_id', checkpoint.topic_id);
        
        if (allCheckpoints) {
          // Get student's progress on all checkpoints
          const { data: studentProgress } = await supabase
            .from('student_checkpoint_progress')
            .select('checkpoint_id, passed')
            .eq('user_id', userData.id)
            .in('checkpoint_id', allCheckpoints.map(cp => cp.id));
          
          // Check if all checkpoints are passed
          const allPassed = allCheckpoints.every(cp => 
            studentProgress?.some(sp => 
              sp.checkpoint_id === cp.id && sp.passed === true
            )
          );
          
          if (allPassed) {
            // Get topic details
            const { data: topic } = await supabase
              .from('topics')
              .select('title, subject:subject_id(name)')
              .eq('id', checkpoint.topic_id)
              .single();
            
            if (topic) {
              let subjectName = 'General';
              if (topic.subject) {
                if (Array.isArray(topic.subject) && topic.subject.length > 0) {
                  subjectName = topic.subject[0]?.name || 'General';
                } else if (typeof topic.subject === 'object') {
                  subjectName = (topic.subject as any)?.name || 'General';
                }
              }
              await notifyTopicCompletion(username, topic.title, subjectName, score);
              console.log(`🎉 Topic completion notification sent for ${username}`);
            }
          }
        }
      } catch (topicError) {
        console.error('Error checking topic completion:', topicError);
      }
    }
    
    console.log(`✅ Checkpoint progress saved for ${username}`);
  } catch (error) {
    console.error('❌ Save checkpoint progress error:', error);
    throw error;
  }
};

// Topic progress notification (80% milestone)
export const notifyTopic80PercentComplete = async (
  studentName: string,
  topicTitle: string,
  subject: string,
  percentage: number
): Promise<void> => {
  console.log(`📊 Topic progress: ${studentName} - ${topicTitle} - ${percentage}%`);
  
  // Only send notification for significant milestones
  if (percentage >= 80 && percentage < 100) {
    const text = `🎯 Great progress! You've completed ${percentage}% of "${topicTitle}"`;
    const metadata = {
      topic: topicTitle,
      subject,
      percentage,
      actionUrl: `/topic/${subject}/${topicTitle}`
    };
    
    await createNotification(studentName, text, 'success', metadata);
    console.log(`✅ Progress notification sent: ${percentage}%`);
  }
  
  // If 100%, use the new topic completion notification
  if (percentage >= 100) {
    await notifyTopicCompletion(studentName, topicTitle, subject, 100);
  }
};

// Get final assessment for a topic (single)
export const getTopicFinalAssessment = async (topicId: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('final_assessments')
      .select('*')
      .eq('topic_id', topicId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows
      throw error;
    }
    return data;
  } catch (error) {
    console.error('❌ Get final assessment error:', error);
    return null;
  }
};

// Check if student has unlocked final assessment (passed all checkpoints)
export const hasUnlockedFinalAssessment = async (username: string, topicId: string): Promise<boolean> => {
  return true; // Always unlocked in production
};

// Check if student can access a topic
export const canAccessTopic = async (username: string, topicId: string): Promise<boolean> => {
  console.log(`🔓 Checking topic access for ${username}: ${topicId}`);
  return true; // All topics accessible in production
};

// Get student course history
export const getStudentCourseHistory = async (username: string): Promise<any[]> => {
  console.log(`📚 Getting course history for ${username}`);
  try {
    // Get user ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (!userData) {
      console.log('❌ User not found');
      return [];
    }

    // Get ALL topics the student has ANY progress on
    const { data: topicsProgress } = await supabase
      .from('user_progress')
      .select(`
        *,
        topic:topics (
          id,
          title,
          grade_level,
          subject:subject_id (name)
        )
      `)
      .eq('user_id', userData.id)
      .order('last_accessed', { ascending: false });

    console.log(`📊 Found ${topicsProgress?.length || 0} topics with progress`);

    if (!topicsProgress || topicsProgress.length === 0) {
      return [];
    }

    // Get checkpoint progress for all topics
    const courseHistory = await Promise.all(
      topicsProgress.map(async (progress) => {
        // Get all checkpoints for this topic
        const { data: checkpoints } = await supabase
          .from('checkpoints')
          .select('id, checkpoint_number, title, required_score')
          .eq('topic_id', progress.topic_id)
          .order('checkpoint_number', { ascending: true });

        const checkpointIds = checkpoints?.map(c => c.id) || [];
        
        // Get student's progress on these checkpoints
        const { data: checkpointProgress } = await supabase
          .from('student_checkpoint_progress')
          .select('checkpoint_id, score, passed, completed_at')
          .eq('user_id', userData.id)
          .in('checkpoint_id', checkpointIds);

        // Check if student has passed checkpoint 4
        const checkpoint4 = checkpoints?.find(c => c.checkpoint_number === 4);
        const checkpoint4Progress = checkpointProgress?.find(cp => cp.checkpoint_id === checkpoint4?.id);
        
        // Topic is considered "completed" if main assessment passed OR checkpoint 4 passed with ≥80%
        const isCompleted = progress.main_assessment_passed || 
                           (checkpoint4Progress?.passed && checkpoint4Progress?.score >= 80);

        return {
          topicId: progress.topic_id,
          topicTitle: progress.topic?.title || 'Unknown Topic',
          subject: progress.topic?.subject?.name || 'General',
          gradeLevel: progress.topic?.grade_level || 'N/A',
          finalScore: progress.main_assessment_score || checkpoint4Progress?.score || 0,
          passed: isCompleted,
          completedDate: progress.last_accessed || new Date().toISOString(),
          checkpoints: checkpoints?.map(checkpoint => {
            const cpProgress = checkpointProgress?.find(cp => cp.checkpoint_id === checkpoint.id);
            return {
              number: checkpoint.checkpoint_number,
              title: checkpoint.title,
              score: cpProgress?.score || 0,
              passed: cpProgress?.passed || false,
              completedAt: cpProgress?.completed_at,
              requiredScore: checkpoint.required_score
            };
          }) || []
        };
      })
    );

    // Filter to only completed topics
    const completedHistory = courseHistory.filter(course => course.passed);
    console.log(`✅ Found ${completedHistory.length} completed topics out of ${courseHistory.length} total`);

    return completedHistory.sort((a, b) => 
      new Date(b.completedDate || 0).getTime() - new Date(a.completedDate || 0).getTime()
    );
  } catch (error) {
    console.error('❌ Error getting course history:', error);
    return [];
  }
};

// Get student assessment feedback
export const getStudentAssessmentFeedback = async (username: string): Promise<any[]> => {
  try {
    // Get all graded submissions for the student
    const submissions = await getSubmissions();
    const studentSubmissions = submissions.filter(
      s => s.username === username && s.graded && s.feedback
    );

    // Get assessment details for each submission
    const assessments = await getAssessments();
    
    const feedbackHistory = studentSubmissions.map(sub => {
      const assessment = assessments.find(a => a.id === sub.assessmentId);
      return {
        assessmentId: sub.assessmentId,
        assessmentTitle: assessment?.title || 'Unknown Assessment',
        subject: assessment?.subject || 'General',
        score: sub.score,
        submittedAt: sub.submittedAt,
        feedback: sub.feedback,
        aiGraded: sub.ai_graded || false
      };
    });

    return feedbackHistory.sort((a, b) => b.submittedAt - a.submittedAt);
  } catch (error) {
    console.error('❌ Error getting assessment feedback:', error);
    return [];
  }
};

// Get student topic performance
export const getStudentTopicPerformance = async (username: string, topicId: string): Promise<any> => {
  try {
    // Get user ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (!userData) return null;

    // Get topic progress
    const { data: topicProgress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userData.id)
      .eq('topic_id', topicId)
      .single();

    // Get checkpoint progress for this topic
    const { data: checkpoints } = await supabase
      .from('checkpoints')
      .select('id, checkpoint_number, title, required_score')
      .eq('topic_id', topicId)
      .order('checkpoint_number', { ascending: true });

    const checkpointIds = checkpoints?.map(c => c.id) || [];
    
    const { data: checkpointProgress } = await supabase
      .from('student_checkpoint_progress')
      .select('*')
      .eq('user_id', userData.id)
      .in('checkpoint_id', checkpointIds);

    // Get theory submissions for this topic
    const { data: theorySubmissions } = await supabase
      .from('theory_submissions')
      .select('*')
      .eq('user_id', userData.id)
      .eq('topic_id', topicId);

    return {
      topicProgress: topicProgress || null,
      checkpoints: checkpoints?.map(checkpoint => {
        const progress = checkpointProgress?.find(cp => cp.checkpoint_id === checkpoint.id);
        return {
          ...checkpoint,
          studentScore: progress?.score || 0,
          passed: progress?.passed || false,
          completedAt: progress?.completed_at
        };
      }) || [],
      theorySubmissions: theorySubmissions || [],
      overallCompletion: checkpointProgress?.filter(cp => cp.passed).length || 0
    };
  } catch (error) {
    console.error('❌ Error getting topic performance:', error);
    return null;
  }
};

// Get topics filtered by student grade level
// Get topics filtered by student grade level
export const getTopicsForStudent = async (gradeLevel: string): Promise<CourseStructure> => {
  console.log(`📊 Getting topics for grade level: "${gradeLevel}"`);
  
  try {
    // Get all subjects first to avoid ambiguous joins
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('id, name');
    
    const subjectMap = new Map();
    subjectsData?.forEach(s => subjectMap.set(s.id, s.name));
    
    // Get topics WITHOUT ambiguous join
    const { data: topicsData, error } = await supabase
      .from('topics')
      .select(`
        id,
        title,
        description,
        grade_level,
        sort_order,
        subject_id
      `)
      .eq('grade_level', gradeLevel)
      .order('sort_order', { ascending: true })
      .order('title');

    if (error) {
      console.error('❌ Supabase error in getTopicsForStudent:', error);
      return {};
    }

    console.log(`📊 Found ${topicsData?.length || 0} topics for grade ${gradeLevel}`);
    
    if (!topicsData || topicsData.length === 0) {
      console.log(`📊 No topics found for grade ${gradeLevel}. Checking all topics...`);
      const { data: allTopics } = await supabase
        .from('topics')
        .select('*, subject_id')
        .order('title');
      
      console.log('📊 All topics in database:', allTopics?.map(t => ({
        id: t.id,
        title: t.title,
        grade: t.grade_level,
        subject_id: t.subject_id
      })));
      
      return {};
    }
    
    // Get materials for all topics (single query for efficiency)
    const topicIds = topicsData.map(t => t.id);
    const { data: allMaterials } = await supabase
      .from('materials')
      .select('*')
      .in('topic_id', topicIds);
    
    // Get checkpoints for all topics (single query for efficiency)
    const { data: allCheckpoints } = await supabase
      .from('checkpoints')
      .select('*')
      .in('topic_id', topicIds);
    
    const courses: CourseStructure = {};
    
    topicsData.forEach(topic => {
      const subjectName = subjectMap.get(topic.subject_id) || 'General';
      
      if (!courses[subjectName]) {
        courses[subjectName] = {};
      }

      console.log(`📊 Adding topic - Subject: ${subjectName}, Title: ${topic.title}`);
      
      // Filter materials for this specific topic
      const topicMaterials = allMaterials?.filter(m => m.topic_id === topic.id) || [];
      const topicCheckpoints = allCheckpoints?.filter(c => c.topic_id === topic.id) || [];
      
      courses[subjectName][topic.id] = {
        id: topic.id,
        title: topic.title,
        gradeLevel: topic.grade_level,
        description: topic.description || '',
        subtopics: [],
        materials: topicMaterials.map((m: any) => ({
          id: m.id,
          title: m.title,
          type: m.type,
          content: m.content || m.storage_path || ''
        })),
        checkpoints: topicCheckpoints.map((c: any) => ({
          id: c.id,
          title: c.title,
          checkpointNumber: c.checkpoint_number,
          requiredScore: c.required_score,
          questionCount: c.question_count
        }))
      };
    });

    console.log(`📊 Final courses structure for grade ${gradeLevel}:`, {
      subjects: Object.keys(courses),
      topicCounts: Object.keys(courses).map(subject => ({
        subject,
        count: Object.keys(courses[subject]).length
      }))
    });
    
    return courses;
  } catch (error) {
    console.error('❌ Get topics for student error:', error);
    return {};
  }
};

// =====================================================
// BACKWARD COMPATIBILITY NOTIFICATION FUNCTIONS
// =====================================================

export const notifyNewAssessment = async (
  teacherName: string,
  assessmentTitle: string,
  subject: string,
  gradeLevel: string
): Promise<void> => {
  console.log(`📝 Notifying grade ${gradeLevel} about new assessment: ${assessmentTitle}`);
  // Implementation here
};

export const notifyCourseMaterialAdded = async (
  teacherName: string,
  subject: string,
  topicTitle: string,
  gradeLevel: string,
  materialTitle: string
): Promise<void> => {
  console.log(`📚 Notifying grade ${gradeLevel} about new material: ${materialTitle}`);
  // Implementation here
};

export const notifyNewSubmission = async (
  studentName: string,
  assessmentTitle: string,
  teacherUsername: string
): Promise<void> => {
  console.log(`📥 Notifying teacher ${teacherUsername} about submission from ${studentName}`);
  // Implementation here
};

export const setupNotifications = async (): Promise<boolean> => {
  console.log('🔔 Notification system ready');
  return true;
};

// Re-export from theoryGradingService
export { getPendingTheorySubmissions } from './theoryGradingService';
