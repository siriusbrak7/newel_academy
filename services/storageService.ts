// storageService.ts - COMPLETE FIXED VERSION FOR DEPLOYMENT
import { User, CourseStructure, UserProgress, Assessment, Topic, TopicProgress, LeaderboardEntry, StudentStats, Submission, Announcement, Material } from '../types';
import { supabase } from './supabaseClient';

// =====================================================
// DEMO ACCOUNT CONFIGURATION
// =====================================================
const DEMO_ACCOUNTS = ['admin', 'teacher_demo', 'student_demo'];

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
export const getCourses = async (): Promise<CourseStructure> => {
  console.log('Fetching courses...');
  
  try {
    // Fetch topics with their materials from the database
    const { data: topicsData, error: topicsError } = await supabase
      .from('topics')
      .select(`
        *,
        materials (*),
        subtopics (*),
        subject:subject_id (name)
      `)
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true });

    if (topicsError) throw topicsError;

    // Get questions for topics
    const { data: questionsData } = await supabase
      .from('questions')
      .select('*');

    const courses: CourseStructure = {};
    
    (topicsData || []).forEach(topic => {
      const subjectName = topic.subject?.name || 'Uncategorized';
      
      if (!courses[subjectName]) {
        courses[subjectName] = {};
      }

      // Get subtopics from subtopics table
      const subtopics: string[] = (topic.subtopics || [])
        .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((s: any) => s.name);

      // ✅ CRITICAL FIX: Get materials from database with proper content
      const materials: Material[] = (topic.materials || []).map((m: any) => {
        // For files, use storage_path if available, otherwise content
        const content = m.type === 'file' 
          ? (m.storage_path || m.content || '')
          : (m.content || '');
        
        return {
          id: m.id,
          title: m.title,
          type: m.type as 'text' | 'link' | 'file',
          content: content
        };
      });

      // Organize questions by subtopic
      const topicQuestions = (questionsData || []).filter(q => q.topic_id === topic.id);
      const subtopicQuestions: Record<string, any[]> = {};
      
      topicQuestions.forEach(q => {
        const subtopic = q.subtopic_name || 'general';
        if (!subtopicQuestions[subtopic]) {
          subtopicQuestions[subtopic] = [];
        }
        
        subtopicQuestions[subtopic].push({
          id: q.id,
          text: q.text,
          type: q.type,
          difficulty: q.difficulty || 'IGCSE',
          topic: topic.title,
          options: q.options || [],
          correctAnswer: q.correct_answer || '',
          modelAnswer: q.model_answer
        });
      });

      courses[subjectName][topic.id] = {
        id: topic.id,
        title: topic.title,
        gradeLevel: topic.grade_level || '9',
        description: topic.description || '',
        subtopics: subtopics,
        materials: materials,
        subtopicQuestions,
        checkpoints_required: topic.checkpoints_required || 3,
        checkpoint_pass_percentage: topic.checkpoint_pass_percentage || 85,
        final_assessment_required: topic.final_assessment_required !== false
      };
    });

    console.log(`✅ Courses fetched: ${Object.keys(courses).length} subjects`);
    return courses;
  } catch (error) {
    console.error('❌ Get courses error:', error);
    return {};
  }
}; // <-- This closes the getCourses function

// In storageService.ts, update the saveTopic function:
// storageService.ts - Updated saveTopic function
export const saveTopic = async (subject: string, topic: Topic): Promise<void> => {
  
  
  try {
    // Get or create subject
    const { data: subjectData } = await supabase
      .from('subjects')
      .select('id')
      .eq('name', subject)
      .single();

    let subjectId: string;
    
    if (!subjectData) {
      const { data: newSubject } = await supabase
        .from('subjects')
        .insert({ name: subject })
        .select('id')
        .single();
      subjectId = newSubject.id;
    } else {
      subjectId = subjectData.id;
    }

    // Prepare topic data
    const topicData: any = {
      subject_id: subjectId,
      title: topic.title,
      description: topic.description,
      grade_level: topic.gradeLevel,
      checkpoints_required: topic.checkpoints_required || 3,
      checkpoint_pass_percentage: topic.checkpoint_pass_percentage || 85,
      final_assessment_required: topic.final_assessment_required !== false,
      updated_at: new Date().toISOString()
    };

    let topicId: string;
    
    // Save topic and get ID
    if (topic.id) {
      // Update existing topic
      const { error: updateError } = await supabase
        .from('topics')
        .update(topicData)
        .eq('id', topic.id);
      
      if (updateError) throw updateError;
      topicId = topic.id;
    } else {
      // Insert new topic
      const { data: newTopic, error: insertError } = await supabase
        .from('topics')
        .insert([topicData])
        .select('id')
        .single();
      
      if (insertError) throw insertError;
      if (!newTopic) throw new Error('Failed to create topic');
      topicId = newTopic.id;
    }

    // ✅ CRITICAL FIX: Save materials to materials table
    if (topic.materials && topic.materials.length > 0) {
      console.log(`Saving ${topic.materials.length} materials to database`);
      
      const materialsToInsert = topic.materials.map((material, index) => ({
        topic_id: topicId,
        title: material.title,
        type: material.type,
        content: material.content,
        storage_path: material.type === 'file' ? material.content : null,
        sort_order: index,
        created_at: new Date().toISOString()
      }));
      
      const { error: materialsError } = await supabase
        .from('materials')
        .insert(materialsToInsert);
      
      if (materialsError) {
        console.error('Error saving materials:', materialsError);
        // Don't throw - topic is saved, materials might fail but we continue
      }
    }

    
  } catch (error) {
    console.error('❌ Save topic error:', error);
    throw error;
  }
};

// =====================================================
// PROGRESS MANAGEMENT
// =====================================================
export const getProgress = async (username: string): Promise<UserProgress> => {
  
  
  try {
    // Get user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (userError || !userData) {
    
      return {};
    }

    const { data, error } = await supabase
      .from('user_progress')
      .select('*, topic:topics(title, subject:subject_id(name))')
      .eq('user_id', userData.id);

    if (error) throw error;

    const progress: UserProgress = {};
    data.forEach(item => {
      const subject = item.topic?.subject?.name || 'General';
      if (!progress[subject]) {
        progress[subject] = {};
      }
      
      progress[subject][item.topic_id] = {
        subtopics: item.subtopics || {},
        checkpointScores: item.checkpoint_scores || {},
        mainAssessmentPassed: item.main_assessment_passed || false,
        mainAssessmentScore: item.main_assessment_score,
        lastAccessed: item.last_accessed ? new Date(item.last_accessed).getTime() : undefined
      };
    });

    
    return progress;
  } catch (error) {
    console.error('Get progress error:', error);
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
 
  
  try {
    const { data: assessmentsData, error: assessmentsError } = await supabase
      .from('assessments')
      .select('*')
      .order('created_at', { ascending: false });

    if (assessmentsError) throw assessmentsError;

    // Get questions
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
          modelAnswer: q.model_answer
        })),
        assignedTo: item.assigned_to || [],
        targetGrade: item.target_grade || 'all',
        createdBy: item.created_by || 'system'
      });
    }

    console.log(`Fetched ${assessments.length} assessments`);
    return assessments;
  } catch (error) {
    console.error('Get assessments error:', error);
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

export const saveSubmission = async (submission: Submission): Promise<void> => {
  
  
  try {
    // Get user ID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('username', submission.username)
      .single();

    const { error } = await supabase
      .from('submissions')
      .upsert({
        assessment_id: submission.assessmentId,
        user_id: user?.id,
        username: submission.username,
        answers: submission.answers,
        score: submission.score,
        graded: submission.graded,
        feedback: submission.feedback,
        ai_graded: submission.newelGraded || false,
        submitted_at: new Date().toISOString()
      }, { onConflict: 'assessment_id,user_id' });
    
    if (error) throw error;
    
   
    
    // ALWAYS update leaderboard if graded and has score
    if (submission.graded && submission.score !== undefined) {
      
      await updateAssessmentLeaderboard(submission.username, submission.score);
    } else {
      
    }
  } catch (error) {
    console.error('Save submission error:', error);
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
      console.error('âŒ Error fetching leaderboards:', error);
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
      academic: courseEntries, // Use course scores for academic leaderboard
      challenge: [], // Placeholder - will be populated below
      assessments: assessmentEntries
    };

    console.log('Leaderboards fetched: ${assessmentEntries.length} real assessment entries');
    return leaderboards;
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

// In storageService.ts, find the updateAssessmentLeaderboard function
export const updateAssessmentLeaderboard = async (username: string, score: number): Promise<void> => {
  
  
  // Don't update demo accounts
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

    if (!user) {
      
      return;
    }

    // Check existing entry
    const { data: existing, error: fetchError } = await supabase
      .from('leaderboards')
      .select('id, score')
      .eq('username', username)
      .eq('board_type', 'assessments')
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means "no rows returned"
      console.error('Error fetching existing leaderboard:', fetchError);
      return;
    }

    if (existing) {
      // Calculate new average with the new score
      const submissionCount = 1; // You might want to track this separately
      const newScore = Math.max(existing.score, score); // Keep highest OR calculate average
      
      
      
      const { error: updateError } = await supabase
        .from('leaderboards')
        .update({
          score: newScore,
          recorded_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      
      if (updateError) {
        console.error('Update leaderboard error:', updateError);
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
          score: score,
          grade_level: user.grade_level || '',
          recorded_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('Insert leaderboard error:', insertError);
        return;
      }
    }
    
    
  } catch (error) {
    console.error('Update assessment leaderboard error:', error);
  }
};



// =====================================================
// ANNOUNCEMENTS
// =====================================================
export const getAnnouncements = async (): Promise<Announcement[]> => {
  
  
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*, author_user:users(username)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    const announcements: Announcement[] = (data || []).map(item => ({
      id: item.id,
      title: item.title,
      content: item.content,
      timestamp: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
      author: item.author_user?.username || item.author_name || 'System'
    }));

    
    return announcements;
  } catch (error) {
    console.error('Get announcements error:', error);
    return [];
  }
};

export const saveAnnouncement = async (announcement: Announcement): Promise<void> => {
  
  try {
    const { error } = await supabase
      .from('announcements')
      .insert({
        title: announcement.title,
        content: announcement.content,
        author_name: announcement.author,
        created_at: new Date().toISOString()
      });
    
    if (error) throw error;
    
    
  } catch (error) {
    console.error('Save announcement error:', error);
    throw error;
  }
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

export const getAllStudentStats = async (): Promise<StudentStats[]> => {
  try {
    
    // Get all users (excluding demo accounts)
    const users = await getRealUsers();
    
    
    const students = Object.values(users).filter(u => u.role === 'student');
    
    
    // Get all submissions
    const submissions = await getSubmissions();
    
    
    const stats: StudentStats[] = [];
    
    for (const user of students) {
      
      const userSubs = submissions.filter(s => 
        s.username === user.username && s.graded
      );
      
      console.log(`DEBUG: Graded submissions for ${user.username}:`, userSubs.length);
      userSubs.forEach((sub, i) => {
        
      });
      
      let totalScore = 0;
      userSubs.forEach(s => totalScore += (s.score || 0));
      
      const { activeDays, streak } = calculateUserStats(user);

      const studentStat = {
        username: user.username,
        gradeLevel: user.gradeLevel || '?',
        avgScore: userSubs.length > 0 ? totalScore / userSubs.length : 0,
        completionRate: 0,
        lastActive: user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never',
        streak: streak,
        activeDays: activeDays
      };
      
      
      stats.push(studentStat);
    }
    
    const sortedStats = stats.sort((a, b) => b.avgScore - a.avgScore);
    
    
    return sortedStats;
  } catch (error) {
    console.error('Error calculating stats:', error);
    return [];
  }
};

export const getClassOverview = async () => {
  const stats = await getAllStudentStats();
  
  const totalStudents = stats.length;
  
  let totalScore = 0;
  let studentCount = 0;
  
  stats.forEach(s => {
    if (s.avgScore > 0) {
      totalScore += s.avgScore;
      studentCount++;
    }
  });
  
  const classAverage = studentCount > 0 ? Math.round(totalScore / studentCount) : 0;
  
  // Find weakest topic (simplified)
  const weakestTopic = totalStudents > 0 ? 'General Science' : 'No Data';
  
  return {
    totalStudents,
    classAverage,
    weakestTopic
  };
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

// =====================================================
// EXPORT/IMPORT
// =====================================================
export const exportAllData = async (): Promise<string> => {
  
  
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
    
    
    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
};

export const importAllData = async (jsonString: string): Promise<boolean> => {
  
  
  try {
    const data = JSON.parse(jsonString);
    
    // Import users
    if (data.users) {
      
      for (const username in data.users) {
        await saveUser(data.users[username]);
      }
    }
    
    // Import courses
    if (data.courses) {
      
      for (const subject in data.courses) {
        for (const topicId in data.courses[subject]) {
          await saveTopic(subject, data.courses[subject][topicId]);
        }
      }
    }
    
    // Import assessments
    if (data.assessments) {
      
      for (const assessment of data.assessments) {
        await saveAssessment(assessment);
      }
    }
    
    console.log('Import to Supabase complete');
    return true;
  } catch (error) {
    console.error('Import failed:', error);
    return false;
  }
};

// =====================================================
// CLEANUP FUNCTIONS FOR DEPLOYMENT
// =====================================================
export const cleanupDemoData = async (): Promise<void> => {
  
  
  try {
    // Delete demo accounts from leaderboards
    const { error: leaderboardError } = await supabase
      .from('leaderboards')
      .delete()
      .in('username', DEMO_ACCOUNTS);
    
    if (leaderboardError) console.error('Leaderboard cleanup error:', leaderboardError);
    
    // Delete submissions from demo accounts
    const { error: submissionError } = await supabase
      .from('submissions')
      .delete()
      .in('username', DEMO_ACCOUNTS);
    
    if (submissionError) console.error('Submission cleanup error:', submissionError);
    
    
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

export const refreshAllLeaderboards = async (): Promise<void> => {
  
  
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

    
  } catch (error) {
    console.error('Refresh leaderboards error:', error);
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
    console.error('âŒ Get checkpoints error:', error);
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
    console.error('âŒ Get checkpoint progress error:', error);
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
  try {
    // Get user ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (!userData) throw new Error('User not found');

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
    
  } catch (error) {
    console.error('âŒ Save checkpoint progress error:', error);
    throw error;
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
    console.error('âŒ Get final assessment error:', error);
    return null;
  }
};

// Check if student has unlocked final assessment (passed all checkpoints)
// Also update the hasUnlockedFinalAssessment function:
export const hasUnlockedFinalAssessment = async (username: string, topicId: string): Promise<boolean> => {
  return true; // Always unlocked in production
};

// Add this function to check if student can access a topic
// Add this function to your storageService.ts file if it doesn't exist:
// In storageService.ts, replace canAccessTopic function:
// REPLACE ENTIRE canAccessTopic function in storageService.ts with:
export const canAccessTopic = async (username: string, topicId: string): Promise<boolean> => {
  
  return true; // All topics accessible in production
};



// Add to storageService.ts
export const getStudentCourseHistory = async (username: string): Promise<any[]> => {
  try {
   
    
    // Get user ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (!userData) return [];

    // Get all topics the student has accessed
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
      .not('main_assessment_score', 'is', null);

    if (!topicsProgress) return [];

    // Get checkpoint progress for each topic
    const courseHistory = await Promise.all(
      topicsProgress.map(async (progress) => {
        // Get checkpoint progress for this topic
        const { data: checkpoints } = await supabase
          .from('checkpoints')
          .select('id, checkpoint_number, title')
          .eq('topic_id', progress.topic_id);

        const checkpointIds = checkpoints?.map(c => c.id) || [];
        
        const { data: checkpointProgress } = await supabase
          .from('student_checkpoint_progress')
          .select('checkpoint_id, score, passed, completed_at')
          .eq('user_id', userData.id)
          .in('checkpoint_id', checkpointIds);

        return {
          topicId: progress.topic_id,
          topicTitle: progress.topic?.title || 'Unknown Topic',
          subject: progress.topic?.subject?.name || 'General',
          gradeLevel: progress.topic?.grade_level || 'N/A',
          finalScore: progress.main_assessment_score,
          passed: progress.main_assessment_passed,
          completedDate: progress.last_accessed,
          checkpoints: checkpoints?.map(checkpoint => {
            const cpProgress = checkpointProgress?.find(cp => cp.checkpoint_id === checkpoint.id);
            return {
              number: checkpoint.checkpoint_number,
              title: checkpoint.title,
              score: cpProgress?.score || 0,
              passed: cpProgress?.passed || false,
              completedAt: cpProgress?.completed_at
            };
          }) || []
        };
      })
    );

    return courseHistory.sort((a, b) => 
      new Date(b.completedDate || 0).getTime() - new Date(a.completedDate || 0).getTime()
    );
  } catch (error) {
    console.error('❌ Error getting course history:', error);
    return [];
  }
};

// Add to storageService.ts
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

// Add to storageService.ts
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

// Helper function to check if a topic was passed
const hasPassedTopic = async (username: string, topicId: string): Promise<boolean> => {
  try {
    // Get checkpoint progress for this topic
    const progress = await getStudentCheckpointProgress(username, topicId);
    
    // Check if final MCQ (checkpoint 4) is passed with ≥85%
    const checkpoint4Id = '6ad5399c-c1d0-4de1-8d36-8ecf2fd1dc3e';
    const checkpoint4Progress = progress[checkpoint4Id];
    
    if (!checkpoint4Progress) {
      
      return false;
    }

    const isMcqPassed = checkpoint4Progress.passed && checkpoint4Progress.score >= 85;
    
    if (!isMcqPassed) {
      
      return false;
    }

    // Check if final theory (checkpoint 5) exists and is passed
    const { data: checkpoint5 } = await supabase
      .from('checkpoints')
      .select('id')
      .eq('topic_id', topicId)
      .eq('checkpoint_number', 5)
      .single();

    if (checkpoint5) {
      const checkpoint5Progress = progress[checkpoint5.id];
      if (!checkpoint5Progress) {
        
        return false;
      }
      
      const isTheoryPassed = checkpoint5Progress.passed && checkpoint5Progress.score >= 85;
      if (!isTheoryPassed) {
        
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking if topic passed:', error);
    return false;
  }
};



// Get topics filtered by student grade level
export const getTopicsForStudent = async (gradeLevel: string): Promise<CourseStructure> => {
  console.log(`📊 DEBUG: Getting topics for grade level: "${gradeLevel}"`);
  
  try {
    const { data: topicsData, error } = await supabase
      .from('topics')
      .select(`
        id,
        title,
        description,
        grade_level,
        sort_order,
        subject:subject_id (name),
        materials (*),
        checkpoints (*)
      `)
      .eq('grade_level', gradeLevel)
      .order('sort_order', { ascending: true })
      .order('title');

    if (error) {
      console.error('❌ Supabase error in getTopicsForStudent:', error);
      return {};
    }

    console.log(`📊 DEBUG: Found ${topicsData?.length || 0} topics for grade ${gradeLevel}`);
    
    if (!topicsData || topicsData.length === 0) {
      console.log(`📊 DEBUG: No topics found for grade ${gradeLevel}. Checking all topics...`);
      // Fallback: Get all topics to debug
      const { data: allTopics } = await supabase
        .from('topics')
        .select('*, subject:subject_id (name)')
        .order('title');
      
      console.log('📊 DEBUG: All topics in database:', allTopics?.map(t => ({
        id: t.id,
        title: t.title,
        grade: t.grade_level,
        subject: t.subject?.name
      })));
      
      return {};
    }
    
    const courses: CourseStructure = {};
    
    topicsData.forEach(topic => {
  // Extract subject name safely
  let subjectName = 'General';
  
  try {
    if (topic.subject) {
      if (Array.isArray(topic.subject) && topic.subject.length > 0) {
        subjectName = (topic.subject[0] as any)?.name || 'General';
      } else if (typeof topic.subject === 'object' && topic.subject !== null) {
        subjectName = (topic.subject as any)?.name || 'General';
      }
    }
  } catch (error) {
    console.warn('Could not extract subject name for topic:', topic.id);
    subjectName = 'General';
  }
  
  if (!courses[subjectName]) {
    courses[subjectName] = {};
  }

  console.log(`📊 DEBUG: Adding topic - Subject: ${subjectName}, Title: ${topic.title}`);
  
  courses[subjectName][topic.id] = {
    id: topic.id,
    title: topic.title,
    gradeLevel: topic.grade_level,
    description: topic.description || '',
    subtopics: [],
    materials: (topic.materials || []).map((m: any) => ({
      id: m.id,
      title: m.title,
      type: m.type,
      content: m.content || m.storage_path || ''
    })),
    checkpoints: (topic.checkpoints || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      checkpointNumber: c.checkpoint_number,
      requiredScore: c.required_score,
      questionCount: c.question_count
    }))
  };
});

    console.log(`📊 DEBUG: Final courses structure for grade ${gradeLevel}:`, {
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

// Re-export theory grading functions
export { 
  getPendingTheorySubmissions,
  aiGradeTheoryAnswer,
  teacherGradeTheoryAnswer,
  approveTheoryGrade,
  saveTheorySubmission
} from './theoryGradingService';
