// services/checkpointService.ts - OPTIMIZED VERSION
import { supabase } from './supabaseClient';
import { Checkpoint, Question, QuestionFormat } from '../types';



// Cache for checkpoint questions (5-minute cache)
const checkpointCache = new Map<string, {
  questions: Question[];
  timestamp: number;
  checkpointNumber: number;
}>();

// Cache for topic checkpoints (2-minute cache)
const topicCheckpointsCache = new Map<string, {
  checkpoints: Checkpoint[];
  timestamp: number;
}>();

// =====================================================
// OPTIMIZATION 1: GET TOPIC CHECKPOINTS WITH CACHING
// =====================================================
export const getTopicCheckpoints = async (topicId: string): Promise<Checkpoint[]> => {
  const cacheKey = `topic_${topicId}_checkpoints`;
  const now = Date.now();
  const cacheDuration = 2 * 60 * 1000; // 2 minutes
  
  // Check cache first
  const cached = topicCheckpointsCache.get(cacheKey);
  if (cached && (now - cached.timestamp < cacheDuration)) {
    console.log(`📦 Using cached checkpoints for topic ${topicId}`);
    return cached.checkpoints;
  }
  
  console.time(`getTopicCheckpoints-${topicId}`);
  
  try {
    const { data, error } = await supabase
      .from('checkpoints')
      .select('*')
      .eq('topic_id', topicId)
      .order('checkpoint_number', { ascending: true });

    if (error) {
      console.error('❌ Error getting topic checkpoints:', error);
      throw error;
    }
    
    const checkpoints = data || [];
    
    // Update cache
    topicCheckpointsCache.set(cacheKey, {
      checkpoints,
      timestamp: now
    });
    
    console.timeEnd(`getTopicCheckpoints-${topicId}`);
    console.log(`✅ Found ${checkpoints.length} checkpoints for topic ${topicId}`);
    
    return checkpoints;
  } catch (error) {
    console.error('❌ getTopicCheckpoints error:', error);
    console.timeEnd(`getTopicCheckpoints-${topicId}`);
    return [];
  }
};

// =====================================================
// OPTIMIZATION 2: GET CHECKPOINT BY TOPIC AND NUMBER
// =====================================================
export const getCheckpointByTopicAndNumber = async (topicId: string, checkpointNumber: number) => {
  const cacheKey = `topic_${topicId}_checkpoint_${checkpointNumber}`;
  const now = Date.now();
  const cacheDuration = 5 * 60 * 1000; // 5 minutes
  
  // Check cache first
  const cached = checkpointCache.get(cacheKey);
  if (cached && (now - cached.timestamp < cacheDuration)) {
    console.log(`📦 Using cached checkpoint ${checkpointNumber} for topic ${topicId}`);
    return cached;
  }
  
  console.time(`getCheckpointByTopicAndNumber-${topicId}-${checkpointNumber}`);
  
  try {
    const { data, error } = await supabase
      .from('checkpoints')
      .select('*')
      .eq('topic_id', topicId)
      .eq('checkpoint_number', checkpointNumber)
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) {
      console.error('❌ Error getting checkpoint by number:', error);
      throw error;
    }
    
    const result = data?.[0] || null;
    
    console.timeEnd(`getCheckpointByTopicAndNumber-${topicId}-${checkpointNumber}`);
    
    return result;
  } catch (error) {
    console.error('Error getting checkpoint:', error);
    console.timeEnd(`getCheckpointByTopicAndNumber-${topicId}-${checkpointNumber}`);
    return null;
  }
};

// =====================================================
// OPTIMIZATION 3: GET CHECKPOINT QUESTIONS WITH CACHING
// =====================================================
export const getCheckpointQuestions = async (checkpointId: string): Promise<Question[]> => {
  const cacheKey = `checkpoint_${checkpointId}_questions`;
  const now = Date.now();
  const cacheDuration = 10 * 60 * 1000; // 10 minutes for questions
  
  // Check cache first
  const cached = checkpointCache.get(cacheKey);
  if (cached && (now - cached.timestamp < cacheDuration)) {
    console.log(`📦 Using cached questions for checkpoint ${checkpointId}`);
    return cached.questions;
  }
  
  console.time(`getCheckpointQuestions-${checkpointId}`);
  console.log('🔍 getCheckpointQuestions for:', checkpointId);
  
  try {
    // OPTIMIZATION: Get checkpoint info and questions in parallel
    const [checkpointInfo, questionsData] = await Promise.all([
      // Get checkpoint info
      supabase
        .from('checkpoints')
        .select('checkpoint_number')
        .eq('id', checkpointId)
        .single(),
      
      // Get questions with ALL FIELDS including format, metadata, content
      supabase
        .from('checkpoint_questions')
        .select(`
          id,
          sort_order,
          questions!inner(
            id, 
            text, 
            type, 
            difficulty, 
            correct_answer, 
            options, 
            model_answer,
            explanation,
            format,
            metadata,
            content
          )
        `)
        .eq('checkpoint_id', checkpointId)
        .order('sort_order', { ascending: true })
        .limit(30) // Limit to 30 questions max per checkpoint
    ]);

    const checkpointError = checkpointInfo.error;
    const questionsError = questionsData.error;

    if (checkpointError) {
      console.error('❌ Error fetching checkpoint info:', checkpointError);
      throw checkpointError;
    }

    if (questionsError) {
      console.error('❌ Error fetching questions:', questionsError);
      throw questionsError;
    }

    const checkpointNumber = checkpointInfo.data?.checkpoint_number;
    console.log(`📊 Checkpoint ${checkpointId} is number: ${checkpointNumber}`);

    // Process questions data
    if (!questionsData.data || questionsData.data.length === 0) {
      console.warn('⚠️ No questions found for checkpoint:', checkpointId);
      
      // Cache empty result to prevent repeated queries
      checkpointCache.set(cacheKey, {
        questions: [],
        timestamp: now,
        checkpointNumber: checkpointNumber || 0
      });
      
      return [];
    }
    
    // Map questions efficiently with ALL FIELDS
    const questions: Question[] = questionsData.data
      .map(item => {
        // Handle the nested questions data properly
        let questionData: any;
        
        if (item.questions) {
          // If it's an array, take the first one
          if (Array.isArray(item.questions)) {
            questionData = item.questions[0];
          } else if (typeof item.questions === 'object') {
            questionData = item.questions;
          }
        }
        
        if (!questionData) {
          // Return a simple fallback question
          return {
            id: `fallback-${item.id || Date.now()}`,
            text: 'Question not available',
            type: 'MCQ' as const,
            difficulty: 'IGCSE' as const,
            topic: 'General',
            correctAnswer: '',
            options: [] as string[],
            modelAnswer: '',
            explanation: '',
            format: 'plain_text' as const,
            metadata: {},
            content: ''
          } as Question;
        }
        
        return {
          id: questionData.id,
          text: questionData.text || 'Question text not available',
          type: (questionData.type as 'MCQ' | 'THEORY') || 'MCQ',
          difficulty: (questionData.difficulty as 'IGCSE' | 'AS' | 'A_LEVEL') || 'IGCSE',
          topic: 'General', // Will be set by parent component
          correctAnswer: questionData.correct_answer || '',
          options: questionData.options || [] as string[],
          modelAnswer: questionData.model_answer || '',
          explanation: questionData.explanation || '',
          
          // NEW FIELDS
          format: (questionData.format as QuestionFormat) || 'plain_text',
          metadata: questionData.metadata || {},
          content: questionData.content || ''
        } as Question;
      })
      .filter((q): q is Question => q !== null);

    console.log(`✅ Processed ${questions.length} questions for checkpoint ${checkpointId}`);

    // Cache the result
    checkpointCache.set(cacheKey, {
      questions,
      timestamp: now,
      checkpointNumber: checkpointNumber || 0
    });

    console.timeEnd(`getCheckpointQuestions-${checkpointId}`);
    
    return questions;
  } catch (error) {
    console.error('❌ getCheckpointQuestions error:', error);
    console.timeEnd(`getCheckpointQuestions-${checkpointId}`);
    
    // Return cached data if available (even if stale)
    const cached = checkpointCache.get(cacheKey);
    if (cached) {
      console.log('🔄 Returning stale cache due to error');
      return cached.questions;
    }
    
    return [];
  }
};

// =====================================================
// OPTIMIZATION 4: GET RANDOM CHECKPOINT QUESTIONS (FOR QUIZZES)
// =====================================================
export const getRandomCheckpointQuestions = async (
  checkpointId: string, 
  count: number = 5
): Promise<Question[]> => {
  const cacheKey = `checkpoint_${checkpointId}_random_${count}`;
  const now = Date.now();
  const cacheDuration = 5 * 60 * 1000; // 5 minutes
  
  // Check cache first
  const cached = checkpointCache.get(cacheKey);
  if (cached && (now - cached.timestamp < cacheDuration)) {
    console.log(`📦 Using cached random questions for checkpoint ${checkpointId}`);
    return cached.questions;
  }
  
  console.time(`getRandomCheckpointQuestions-${checkpointId}`);
  
  try {
    // Get all questions first
    const allQuestions = await getCheckpointQuestions(checkpointId);
    
    if (allQuestions.length === 0) {
      console.timeEnd(`getRandomCheckpointQuestions-${checkpointId}`);
      return [];
    }
    
    // If we need fewer questions than available, randomize
    let selectedQuestions = allQuestions;
    if (allQuestions.length > count) {
      // Fisher-Yates shuffle
      const shuffled = [...allQuestions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      selectedQuestions = shuffled.slice(0, count);
    }
    
    // Cache the randomized result
    checkpointCache.set(cacheKey, {
      questions: selectedQuestions,
      timestamp: now,
      checkpointNumber: 0 // Not needed for random cache
    });
    
    console.timeEnd(`getRandomCheckpointQuestions-${checkpointId}`);
    console.log(`✅ Selected ${selectedQuestions.length} random questions for checkpoint ${checkpointId}`);
    
    return selectedQuestions;
  } catch (error) {
    console.error('❌ getRandomCheckpointQuestions error:', error);
    console.timeEnd(`getRandomCheckpointQuestions-${checkpointId}`);
    return [];
  }
};

// =====================================================
// OPTIMIZATION 5: SAVE CHECKPOINT PROGRESS WITH BATCH
// =====================================================
export const saveCheckpointProgress = async (
  userId: string,
  checkpointId: string,
  score: number,
  passed: boolean
): Promise<void> => {
  console.time(`saveCheckpointProgress-${checkpointId}`);
  console.log(`💾 Saving checkpoint progress: user=${userId}, checkpoint=${checkpointId}, score=${score}, passed=${passed}`);
  
  try {
    const { error } = await supabase
      .from('student_checkpoint_progress')
      .upsert({
        user_id: userId,
        checkpoint_id: checkpointId,
        score: Math.round(score),
        passed: passed,
        completed_at: new Date().toISOString()
      }, { onConflict: 'user_id,checkpoint_id' });

    if (error) {
      console.error('❌ Error saving checkpoint progress:', error);
      throw error;
    }
    
    // Clear relevant caches
    const progressCacheKey = `progress_${userId}_*`;
    clearUserProgressCache(userId);
    
    console.timeEnd(`saveCheckpointProgress-${checkpointId}`);
    console.log(`✅ Checkpoint progress saved successfully`);
  } catch (error) {
    console.error('❌ saveCheckpointProgress error:', error);
    console.timeEnd(`saveCheckpointProgress-${checkpointId}`);
    throw error;
  }
};

// =====================================================
// OPTIMIZATION 6: UNLOCK FINAL ASSESSMENT WITH CACHE
// =====================================================
export const unlockFinalAssessment = async (
  userId: string,
  topicId: string
): Promise<boolean> => {
  const cacheKey = `final_unlock_${userId}_${topicId}`;
  const now = Date.now();
  const cacheDuration = 60 * 1000; // 1 minute cache
  
  // Check cache first
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    const { unlocked, timestamp } = JSON.parse(cached);
    if (now - timestamp < cacheDuration) {
      console.log(`📦 Using cached unlock status for user ${userId}, topic ${topicId}`);
      return unlocked;
    }
  }
  
  console.time(`unlockFinalAssessment-${topicId}`);
  console.log(`🔓 Checking if final assessment can be unlocked for user ${userId}, topic ${topicId}`);
  
  try {
    // Get checkpoints for this topic
    const checkpoints = await getTopicCheckpoints(topicId);
    const checkpointIds = checkpoints.map(cp => cp.id);
    
    // Get progress for these checkpoints
    const { data: progress, error } = await supabase
      .from('student_checkpoint_progress')
      .select('checkpoint_id, passed, score')
      .eq('user_id', userId)
      .in('checkpoint_id', checkpointIds);

    if (error) {
      console.error('❌ Error fetching checkpoint progress:', error);
      throw error;
    }

    const passedCheckpoints = (progress || []).filter(p => p.passed).length;
    
    // Get required checkpoints from topic or use default
    const { data: topic } = await supabase
      .from('topics')
      .select('checkpoints_required')
      .eq('id', topicId)
      .single();

    const requiredCheckpoints = topic?.checkpoints_required || 3;
    const canUnlock = passedCheckpoints >= requiredCheckpoints;

    console.log(`📊 Checkpoint status: ${passedCheckpoints}/${requiredCheckpoints} passed, canUnlock=${canUnlock}`);

    if (canUnlock) {
      await supabase
        .from('user_progress')
        .update({ 
          final_assessment_unlocked: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('topic_id', topicId);
        
      console.log(`✅ Final assessment unlocked for user ${userId}, topic ${topicId}`);
    }

    // Cache the result
    sessionStorage.setItem(cacheKey, JSON.stringify({
      unlocked: canUnlock,
      timestamp: now
    }));
    
    console.timeEnd(`unlockFinalAssessment-${topicId}`);
    
    return canUnlock;
  } catch (error) {
    console.error('❌ unlockFinalAssessment error:', error);
    console.timeEnd(`unlockFinalAssessment-${topicId}`);
    return false;
  }
};

// =====================================================
// OPTIMIZATION 7: GET CHECKPOINT COMPLETION STATUS
// =====================================================
export const getCheckpointCompletionStatus = async (
  userId: string,
  topicId: string
): Promise<{completed: number, total: number, percentage: number}> => {
  const cacheKey = `completion_${userId}_${topicId}`;
  const now = Date.now();
  const cacheDuration = 2 * 60 * 1000; // 2 minutes
  
  // Check cache first
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (now - timestamp < cacheDuration) {
      return data;
    }
  }
  
  console.time(`getCheckpointCompletionStatus-${topicId}`);
  
  try {
    // Get checkpoints 1-4 for this topic
    const checkpoints = await getTopicCheckpoints(topicId);
    const standardCheckpoints = checkpoints.filter(cp => cp.checkpoint_number <= 4);
    
    if (!standardCheckpoints || standardCheckpoints.length === 0) {
      const result = { completed: 0, total: 0, percentage: 0 };
      sessionStorage.setItem(cacheKey, JSON.stringify({ data: result, timestamp: now }));
      return result;
    }

    const checkpointIds = standardCheckpoints.map(cp => cp.id);
    
    // Get progress for these checkpoints
    const { data: progressData } = await supabase
      .from('student_checkpoint_progress')
      .select('checkpoint_id, passed')
      .eq('user_id', userId)
      .in('checkpoint_id', checkpointIds);

    const completedCheckpoints = (progressData || []).filter(p => p.passed).length;
    const totalCheckpoints = standardCheckpoints.length;
    const percentage = totalCheckpoints > 0 ? (completedCheckpoints / totalCheckpoints) * 100 : 0;

    const result = {
      completed: completedCheckpoints,
      total: totalCheckpoints,
      percentage: Math.round(percentage)
    };
    
    // Cache the result
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: result,
      timestamp: now
    }));
    
    console.timeEnd(`getCheckpointCompletionStatus-${topicId}`);
    
    return result;
  } catch (error) {
    console.error('❌ getCheckpointCompletionStatus error:', error);
    console.timeEnd(`getCheckpointCompletionStatus-${topicId}`);
    return { completed: 0, total: 0, percentage: 0 };
  }
};

// =====================================================
// OPTIMIZATION 8: CHECK IF TOPIC IS COMPLETED
// =====================================================
export const isTopicCompleted = async (
  userId: string,
  topicId: string
): Promise<boolean> => {
  const cacheKey = `topic_completed_${userId}_${topicId}`;
  const now = Date.now();
  const cacheDuration = 5 * 60 * 1000; // 5 minutes
  
  // Check cache first
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    const { completed, timestamp } = JSON.parse(cached);
    if (now - timestamp < cacheDuration) {
      return completed;
    }
  }
  
  console.time(`isTopicCompleted-${topicId}`);
  
  try {
    // Get checkpoint 4 for this topic
    const checkpoints = await getTopicCheckpoints(topicId);
    const checkpoint4 = checkpoints.find(cp => cp.checkpoint_number === 4);

    if (!checkpoint4) {
      console.log(`⚠️ No checkpoint 4 found for topic ${topicId}`);
      sessionStorage.setItem(cacheKey, JSON.stringify({ completed: false, timestamp: now }));
      return false;
    }

    // Check if checkpoint 4 is passed
    const { data: progress } = await supabase
      .from('student_checkpoint_progress')
      .select('passed, score')
      .eq('user_id', userId)
      .eq('checkpoint_id', checkpoint4.id)
      .single();

    const isPassed = progress?.passed || false;
    const hasHighScore = progress?.score >= 80;
    const isCompleted = isPassed && hasHighScore;
    
    console.log(`📊 Topic ${topicId} completion check: passed=${isPassed}, score=${progress?.score}%, completed=${isCompleted}`);
    
    // Cache the result
    sessionStorage.setItem(cacheKey, JSON.stringify({
      completed: isCompleted,
      timestamp: now
    }));
    
    console.timeEnd(`isTopicCompleted-${topicId}`);
    
    return isCompleted;
  } catch (error) {
    console.error('❌ isTopicCompleted error:', error);
    console.timeEnd(`isTopicCompleted-${topicId}`);
    return false;
  }
};

// =====================================================
// OPTIMIZATION 9: GET LATEST CHECKPOINT ATTEMPT
// =====================================================
export const getLatestCheckpointAttempt = async (
  userId: string,
  topicId: string,
  checkpointNumber: number
): Promise<any> => {
  const cacheKey = `latest_attempt_${userId}_${topicId}_${checkpointNumber}`;
  const now = Date.now();
  const cacheDuration = 60 * 1000; // 1 minute
  
  // Check cache first
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (now - timestamp < cacheDuration) {
      return data;
    }
  }
  
  console.time(`getLatestCheckpointAttempt-${topicId}-${checkpointNumber}`);
  
  try {
    // Get checkpoint ID for this number
    const checkpoints = await getTopicCheckpoints(topicId);
    const checkpoint = checkpoints.find(cp => cp.checkpoint_number === checkpointNumber);

    if (!checkpoint) {
      console.timeEnd(`getLatestCheckpointAttempt-${topicId}-${checkpointNumber}`);
      return null;
    }

    // Get latest attempt for this checkpoint
    const { data: progress } = await supabase
      .from('student_checkpoint_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('checkpoint_id', checkpoint.id)
      .order('completed_at', { ascending: false })
      .limit(1);

    const result = progress?.[0] || null;
    
    // Cache the result
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: result,
      timestamp: now
    }));
    
    console.timeEnd(`getLatestCheckpointAttempt-${topicId}-${checkpointNumber}`);
    
    return result;
  } catch (error) {
    console.error('❌ getLatestCheckpointAttempt error:', error);
    console.timeEnd(`getLatestCheckpointAttempt-${topicId}-${checkpointNumber}`);
    return null;
  }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Clear user progress cache
const clearUserProgressCache = (userId: string) => {
  // Clear all session storage items for this user
  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.includes(`progress_${userId}`)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => sessionStorage.removeItem(key));
  console.log(`🧹 Cleared ${keysToRemove.length} cache items for user ${userId}`);
};

// Clear all caches (for development/debugging)
export const clearAllCheckpointCaches = () => {
  checkpointCache.clear();
  topicCheckpointsCache.clear();
  
  // Clear session storage items related to checkpoints
  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (
      key.includes('checkpoint_') || 
      key.includes('topic_') ||
      key.includes('progress_') ||
      key.includes('completion_') ||
      key.includes('final_unlock_') ||
      key.includes('topic_completed_') ||
      key.includes('latest_attempt_')
    )) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => sessionStorage.removeItem(key));
  console.log(`🧹 Cleared all checkpoint caches: ${checkpointCache.size} memory, ${keysToRemove.length} session`);
};

// Get cache statistics (for debugging)
export const getCacheStats = () => {
  return {
    memoryCacheSize: checkpointCache.size,
    topicCheckpointsCacheSize: topicCheckpointsCache.size,
    sessionStorageItems: sessionStorage.length
  };
};