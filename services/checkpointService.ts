// services/checkpointService.ts
import { supabase } from './supabaseClient';
import { Checkpoint, Question } from '../types';

export const getTopicCheckpoints = async (topicId: string): Promise<Checkpoint[]> => {
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
    
    console.log(`✅ Found ${data?.length || 0} checkpoints for topic ${topicId}`);
    return data || [];
  } catch (error) {
    console.error('❌ getTopicCheckpoints error:', error);
    return [];
  }
};

export const getCheckpointByTopicAndNumber = async (topicId: string, checkpointNumber: number) => {
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
    
    return data?.[0] || null;
  } catch (error) {
    console.error('Error getting checkpoint:', error);
    return null;
  }
};

export const getCheckpointQuestions = async (checkpointId: string): Promise<Question[]> => {
  console.log('🔍 getCheckpointQuestions for:', checkpointId);
  
  try {
    // First, get checkpoint info to know its type
    const { data: checkpointData, error: checkpointError } = await supabase
      .from('checkpoints')
      .select('checkpoint_number')
      .eq('id', checkpointId)
      .single();

    if (checkpointError) {
      console.error('❌ Error fetching checkpoint info:', checkpointError);
      throw checkpointError;
    }

    const checkpointNumber = checkpointData?.checkpoint_number;
    console.log(`📊 Checkpoint ${checkpointId} is checkpoint number: ${checkpointNumber}`);

    // Format 1: With join
    const { data, error } = await supabase
      .from('checkpoint_questions')
      .select(`
        question_id,
        questions (
          id, text, type, difficulty, correct_answer, options, model_answer
        )
      `)
      .eq('checkpoint_id', checkpointId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }
    
    console.log('📊 Raw data:', data);
    
    if (!data || data.length === 0) {
      console.warn('⚠️ No questions found for checkpoint:', checkpointId);
      return [];
    }
    
    // Map data correctly - adjust based on actual structure
    const questions = data.map(item => {
      const q = Array.isArray(item.questions) ? item.questions[0] : item.questions;
      if (!q) {
        // Return a fallback question if q is null/undefined
        return {
          id: `fallback-${Math.random()}`,
          text: 'Question not available',
          type: 'MCQ' as const,
          difficulty: 'IGCSE' as const,
          correctAnswer: '',
          options: [] as string[],
          modelAnswer: ''
        } as Question;
      }
      
      return {
        id: q.id,
        text: q.text || 'Question text not available',
        type: (q.type as 'MCQ' | 'THEORY') || 'MCQ',
        difficulty: (q.difficulty as 'IGCSE' | 'AS' | 'A_LEVEL') || 'IGCSE',
        correctAnswer: q.correct_answer || '',
        options: q.options || [] as string[],
        modelAnswer: q.model_answer || ''
      } as Question;
    });

    console.log(`✅ Returning ${questions.length} questions for checkpoint ${checkpointId}`);
    return questions;
  } catch (error) {
    console.error('❌ getCheckpointQuestions error:', error);
    return [];
  }
};

export const saveCheckpointProgress = async (
  userId: string,
  checkpointId: string,
  score: number,
  passed: boolean
): Promise<void> => {
  try {
    console.log(`💾 Saving checkpoint progress: user=${userId}, checkpoint=${checkpointId}, score=${score}, passed=${passed}`);
    
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
    
    console.log(`✅ Checkpoint progress saved successfully`);
  } catch (error) {
    console.error('❌ saveCheckpointProgress error:', error);
    throw error;
  }
};

export const unlockFinalAssessment = async (
  userId: string,
  topicId: string
): Promise<boolean> => {
  try {
    console.log(`🔓 Checking if final assessment can be unlocked for user ${userId}, topic ${topicId}`);
    
    // Check if student passed required number of checkpoints
    const { data: progress, error } = await supabase
      .from('student_checkpoint_progress')
      .select('checkpoint_id, passed, score')
      .eq('user_id', userId)
      .in('checkpoint_id', 
        (await supabase.from('checkpoints').select('id').eq('topic_id', topicId)).data?.map(c => c.id) || []
      );

    if (error) {
      console.error('❌ Error fetching checkpoint progress:', error);
      throw error;
    }

    const passedCheckpoints = (progress || []).filter(p => p.passed).length;
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

    return canUnlock;
  } catch (error) {
    console.error('❌ unlockFinalAssessment error:', error);
    return false;
  }
};

// Helper function to get checkpoint completion status
export const getCheckpointCompletionStatus = async (
  userId: string,
  topicId: string
): Promise<{completed: number, total: number, percentage: number}> => {
  try {
    // Get all checkpoints for this topic (only checkpoints 1-4 now)
    const { data: checkpoints } = await supabase
      .from('checkpoints')
      .select('id, checkpoint_number')
      .eq('topic_id', topicId)
      .lte('checkpoint_number', 4) // Only include checkpoints 1-4
      .order('checkpoint_number', { ascending: true });

    if (!checkpoints || checkpoints.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    const checkpointIds = checkpoints.map(cp => cp.id);
    
    // Get progress for these checkpoints
    const { data: progressData } = await supabase
      .from('student_checkpoint_progress')
      .select('checkpoint_id, passed')
      .eq('user_id', userId)
      .in('checkpoint_id', checkpointIds);

    const completedCheckpoints = (progressData || []).filter(p => p.passed).length;
    const totalCheckpoints = checkpoints.length;
    const percentage = totalCheckpoints > 0 ? (completedCheckpoints / totalCheckpoints) * 100 : 0;

    return {
      completed: completedCheckpoints,
      total: totalCheckpoints,
      percentage: Math.round(percentage)
    };
  } catch (error) {
    console.error('❌ getCheckpointCompletionStatus error:', error);
    return { completed: 0, total: 0, percentage: 0 };
  }
};

// Check if topic is completed (checkpoint 4 passed)
export const isTopicCompleted = async (
  userId: string,
  topicId: string
): Promise<boolean> => {
  try {
    // Get checkpoint 4 for this topic
    const { data: checkpoint4 } = await supabase
      .from('checkpoints')
      .select('id')
      .eq('topic_id', topicId)
      .eq('checkpoint_number', 4)
      .single();

    if (!checkpoint4) {
      console.log(`⚠️ No checkpoint 4 found for topic ${topicId}`);
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
    const hasHighScore = progress?.score >= 85;
    
    console.log(`📊 Topic ${topicId} completion check: passed=${isPassed}, score=${progress?.score}%, completed=${isPassed && hasHighScore}`);
    
    return isPassed && hasHighScore;
  } catch (error) {
    console.error('❌ isTopicCompleted error:', error);
    return false;
  }
};

// Get user's latest checkpoint attempt for a specific checkpoint number
export const getLatestCheckpointAttempt = async (
  userId: string,
  topicId: string,
  checkpointNumber: number
): Promise<any> => {
  try {
    // Get checkpoint ID for this number
    const { data: checkpoint } = await supabase
      .from('checkpoints')
      .select('id')
      .eq('topic_id', topicId)
      .eq('checkpoint_number', checkpointNumber)
      .single();

    if (!checkpoint) return null;

    // Get latest attempt for this checkpoint
    const { data: progress } = await supabase
      .from('student_checkpoint_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('checkpoint_id', checkpoint.id)
      .order('completed_at', { ascending: false })
      .limit(1);

    return progress?.[0] || null;
  } catch (error) {
    console.error('❌ getLatestCheckpointAttempt error:', error);
    return null;
  }
};