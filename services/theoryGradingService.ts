// services/theoryGradingService.ts
import { supabase } from './supabaseClient';
import { TheorySubmission } from '../types';
import { getAITutorResponse } from './geminiService';

// Save a theory question submission
export const saveTheorySubmission = async (
  userId: string,
  checkpointId: string,
  topicId: string,
  questionText: string,
  studentAnswer: string
): Promise<TheorySubmission> => {
  const { data, error } = await supabase
    .from('theory_submissions')
    .insert({
      user_id: userId,
      checkpoint_id: checkpointId,
      topic_id: topicId,
      question_text: questionText,
      student_answer: studentAnswer,
      status: 'pending',
      submitted_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Get theory submissions that need grading
export const getPendingTheorySubmissions = async (): Promise<TheorySubmission[]> => {
  const { data, error } = await supabase
    .from('theory_submissions')
    .select(`
      *,
      user:users(username),
      topic:topics(title),
      checkpoint:checkpoints(title, checkpoint_number)
    `)
    .in('status', ['pending', 'ai_graded'])
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Get submissions for a specific student
export const getStudentTheorySubmissions = async (userId: string): Promise<TheorySubmission[]> => {
  const { data, error } = await supabase
    .from('theory_submissions')
    .select('*')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// AI Auto-grading for theory questions
export const aiGradeTheoryAnswer = async (
  submissionId: string,
  questionText: string,
  studentAnswer: string,
  modelAnswer?: string
): Promise<number> => {
  try {
    const prompt = `Please grade this student's answer to a science theory question.

QUESTION: ${questionText}

MODEL ANSWER (if available): ${modelAnswer || 'Not provided'}

STUDENT'S ANSWER: ${studentAnswer}

Please provide:
1. A score from 0-100 based on accuracy, completeness, and understanding
2. Brief feedback (max 100 words)

Format your response as:
SCORE: [number]
FEEDBACK: [text]`;

    const response = await getAITutorResponse(prompt, 'grading');
    
    // Parse the response
    const scoreMatch = response.match(/SCORE:\s*(\d+)/i);
    const feedbackMatch = response.match(/FEEDBACK:\s*(.+)/i);
    
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 50; // Default 50 if parsing fails
    const feedback = feedbackMatch ? feedbackMatch[1].trim() : 'AI grading completed.';

    // Update the submission with AI grading
    const { error } = await supabase
      .from('theory_submissions')
      .update({
        ai_suggested_score: Math.min(100, Math.max(0, score)),
        status: 'ai_graded'
      })
      .eq('id', submissionId);

    if (error) throw error;

    return score;
  } catch (error) {
    console.error('AI grading error:', error);
    throw error;
  }
};

// Teacher manual grading
export const teacherGradeTheoryAnswer = async (
  submissionId: string,
  teacherScore: number,
  teacherFeedback: string,
  gradedBy: string
): Promise<void> => {
  const { error } = await supabase
    .from('theory_submissions')
    .update({
      teacher_score: teacherScore,
      teacher_feedback: teacherFeedback,
      graded_by: gradedBy,
      graded_at: new Date().toISOString(),
      status: 'teacher_graded'
    })
    .eq('id', submissionId);

  if (error) throw error;
};

// Final approval (teacher confirms AI grade or modifies it)
export const approveTheoryGrade = async (
  submissionId: string,
  finalScore: number,
  feedback: string,
  approvedBy: string
): Promise<void> => {
  const { error } = await supabase
    .from('theory_submissions')
    .update({
      teacher_score: finalScore,
      teacher_feedback: feedback,
      graded_by: approvedBy,
      graded_at: new Date().toISOString(),
      status: 'approved'
    })
    .eq('id', submissionId);

  if (error) throw error;
};