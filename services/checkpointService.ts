// services/checkpointService.ts
import { supabase } from './supabaseClient';
import { Checkpoint, Question } from '../types';

export const getTopicCheckpoints = async (topicId: string): Promise<Checkpoint[]> => {
  const { data, error } = await supabase
    .from('checkpoints')
    .select('*')
    .eq('topic_id', topicId)
    .order('checkpoint_number', { ascending: true });

  if (error) throw error;
  return data || [];
};

// Add to services/checkpointService.ts
export const getCheckpointByTopicAndNumber = async (topicId: string, checkpointNumber: number) => {
  try {
    const { data, error } = await supabase
      .from('checkpoints')
      .select('*')
      .eq('topic_id', topicId)
      .eq('checkpoint_number', checkpointNumber)
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Error getting checkpoint:', error);
    return null;
  }
};

// In checkpointService.ts - Add debugging
export const getCheckpointQuestions = async (checkpointId: string): Promise<Question[]> => {
  console.log('🔍 getCheckpointQuestions for:', checkpointId);
  
  // TRY BOTH QUERY FORMATS:
  
  // Format 1: With join
  const { data, error } = await supabase
    .from('checkpoint_questions')
    .select(`
      question_id,
      questions (
        id, text, type, difficulty, correct_answer, options
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
    const q = item.questions;
    return {
      id: q.id,
      text: q.text,
      type: q.type || 'MCQ',
      difficulty: q.difficulty || 'IGCSE',
      correctAnswer: q.correct_answer, // Note: correct_answer vs correctAnswer
      options: q.options || []
    } as Question;
  });
  
  console.log('✅ Processed questions:', questions);
  return questions;
};

export const saveCheckpointProgress = async (
  userId: string,
  checkpointId: string,
  score: number,
  passed: boolean
): Promise<void> => {
  const { error } = await supabase
    .from('student_checkpoint_progress')
    .upsert({
      user_id: userId,
      checkpoint_id: checkpointId,
      score,
      passed,
      completed_at: new Date().toISOString()
    }, { onConflict: 'user_id,checkpoint_id' });

  if (error) throw error;
};

export const unlockFinalAssessment = async (
  userId: string,
  topicId: string
): Promise<boolean> => {
  // Check if student passed required number of checkpoints
  const { data: progress, error } = await supabase
    .from('student_checkpoint_progress')
    .select('checkpoint_id, passed, score')
    .eq('user_id', userId)
    .in('checkpoint_id', 
      (await supabase.from('checkpoints').select('id').eq('topic_id', topicId)).data?.map(c => c.id) || []
    );

  if (error) throw error;

  const passedCheckpoints = (progress || []).filter(p => p.passed).length;
  const { data: topic } = await supabase
    .from('topics')
    .select('checkpoints_required')
    .eq('id', topicId)
    .single();

  const canUnlock = passedCheckpoints >= (topic?.checkpoints_required || 3);

  if (canUnlock) {
    await supabase
      .from('user_progress')
      .update({ final_assessment_unlocked: true })
      .eq('user_id', userId)
      .eq('topic_id', topicId);
  }

  return canUnlock;
};