// services/supabaseService.ts
import { supabase } from './supabaseClient';
import { User, Role } from '../types';

// Password hashing (base64)
const hashPassword = (password: string): string => {
  return btoa(password);
};

export const authService = {
  async login(username: string, password: string): Promise<User | null> {
    console.log('🔐 Login attempt for:', username);
    
    try {
      // Query user from your custom users table
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.trim())
        .single();

      if (error || !data) {
        console.log('❌ User not found:', error?.message);
        return null;
      }

      // Check password (base64 comparison)
      const inputHash = hashPassword(password);
      if (data.password_hash !== inputHash) {
        console.log('❌ Password mismatch');
        console.log('   Input hash:', inputHash);
        console.log('   Stored hash:', data.password_hash);
        return null;
      }

      console.log('✅ Authentication successful');

      // Map database fields to User type
      const user: User = {
        id: data.id,
        username: data.username,
        role: data.role as Role,
        approved: data.approved,
        securityQuestion: data.security_question || '',
        securityAnswer: data.security_answer || '',
        gradeLevel: data.grade_level || undefined,
        assignedStudents: data.assigned_students || undefined,
        lastLogin: Date.now(),
        loginHistory: data.login_history 
          ? data.login_history.map((d: string) => new Date(d).getTime())
          : [],
        createdAt: new Date(data.created_at).getTime()
      };

      // Update last login
      await this.updateLastLogin(data.id);
      
      return user;
    } catch (error) {
      console.error('❌ Login error:', error);
      return null;
    }
  },

  async updateLastLogin(userId: string): Promise<void> {
    try {
      // Get current login history
      const { data: userData } = await supabase
        .from('users')
        .select('login_history')
        .eq('id', userId)
        .single();

      const currentHistory = userData?.login_history || [];
      const updatedHistory = [
        ...currentHistory,
        new Date().toISOString()
      ].slice(-10);

      await supabase
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          login_history: updatedHistory
        })
        .eq('id', userId);
    } catch (error) {
      console.error('❌ Failed to update last login:', error);
    }
  },

  async register(userData: {
    username: string;
    password: string;
    role: Role;
    gradeLevel?: string;
    securityQuestion: string;
    securityAnswer: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      // Check if username exists
      const { data: existing } = await supabase
        .from('users')
        .select('username')
        .eq('username', userData.username.trim())
        .single();

      if (existing) {
        return { success: false, message: 'Username already exists' };
      }

      // Insert new user
      const { error } = await supabase
        .from('users')
        .insert({
          username: userData.username.trim(),
          password_hash: hashPassword(userData.password),
          role: userData.role,
          approved: userData.role === 'admin',
          security_question: userData.securityQuestion,
          security_answer: userData.securityAnswer.toLowerCase().trim(),
          grade_level: userData.gradeLevel || null,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      return { 
        success: true, 
        message: userData.role === 'admin' 
          ? 'Admin account created successfully!' 
          : 'Registration successful! Awaiting admin approval.' 
      };
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      return { success: false, message: error.message || 'Registration failed' };
    }
  },

  async recoverPassword(username: string, securityAnswer: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find user
      const { data, error } = await supabase
        .from('users')
        .select('id, security_answer')
        .eq('username', username.trim())
        .single();

      if (error || !data) {
        return { success: false, message: 'User not found' };
      }

      if (data.security_answer !== securityAnswer.toLowerCase().trim()) {
        return { success: false, message: 'Incorrect security answer' };
      }

      // Update password
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: hashPassword(newPassword),
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);

      if (updateError) throw updateError;

      return { success: true, message: 'Password reset successfully!' };
    } catch (error: any) {
      console.error('❌ Password recovery error:', error);
      return { success: false, message: error.message || 'Password recovery failed' };
    }
  }
};

// Session management
export const sessionService = {
  saveSession(user: User): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
  },

  getSession(): User | null {
    try {
      const data = localStorage.getItem('currentUser');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  clearSession(): void {
    localStorage.removeItem('currentUser');
  }
};