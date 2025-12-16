// services/supabaseService.ts
import { supabase } from './supabaseClient';
import { User } from '../types';

// =====================================================
// PASSWORD HASHING (Base64 - matches your console output)
// =====================================================
const simpleHash = (password: string): string => {
  return btoa(password);
};

// =====================================================
// AUTHENTICATION SERVICE
// =====================================================
export const authService = {
  // Login with username/password
  async login(username: string, password: string): Promise<User | null> {
    console.log('🔐 Supabase login attempt:', username);
    
    try {
      // Query user from Supabase
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error) {
        console.log('❌ User not found:', error.message);
        return null;
      }

      if (!data) {
        console.log('❌ No user data returned');
        return null;
      }

      // Verify password using Base64 hash
      const passwordHash = simpleHash(password);
      if (data.password_hash !== passwordHash) {
        console.log('❌ Invalid password');
        console.log('   Input hash:', passwordHash);
        console.log('   Stored hash:', data.password_hash);
        return null;
      }

      console.log('✅ Authentication successful:', username);

      // Return User object
      const user: User = {
        username: data.username,
        role: data.role,
        approved: data.approved,
        securityQuestion: data.security_question || '',
        securityAnswer: data.security_answer || '',
        gradeLevel: data.grade_level || undefined,
        assignedStudents: data.assigned_students || undefined,
        lastLogin: Date.now(),
        loginHistory: data.login_history 
          ? data.login_history.map((d: string) => new Date(d).getTime())
          : []
      };

      // Update last login time
      await this.updateLastLogin(username);
      
      return user;
    } catch (error) {
      console.error('❌ Authentication error:', error);
      return null;
    }
  },

  // Update last login timestamp
  async updateLastLogin(username: string): Promise<void> {
    try {
      // Get current login history
      const { data: userData } = await supabase
        .from('users')
        .select('login_history')
        .eq('username', username)
        .single();

      const currentHistory = userData?.login_history || [];
      const updatedHistory = [
        ...currentHistory,
        new Date().toISOString()
      ].slice(-10); // Keep last 10 logins

      await supabase
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          login_history: updatedHistory
        })
        .eq('username', username);
    } catch (error) {
      console.error('❌ Failed to update last login:', error);
    }
  },

  // Register new user
  async register(userData: {
    username: string;
    password: string;
    role: 'student' | 'teacher' | 'admin';
    gradeLevel?: string;
    securityQuestion: string;
    securityAnswer: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      // Check if user already exists
      const { data: existing } = await supabase
        .from('users')
        .select('username')
        .eq('username', userData.username)
        .single();

      if (existing) {
        return { success: false, message: 'Username already exists' };
      }

      // Create new user
      const { error } = await supabase
        .from('users')
        .insert({
          username: userData.username,
          password_hash: simpleHash(userData.password),
          role: userData.role,
          approved: userData.role === 'admin', // Auto-approve admins
          security_question: userData.securityQuestion,
          security_answer: userData.securityAnswer.toLowerCase(),
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

  // Password recovery
  async recoverPassword(username: string, securityAnswer: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      // Verify user and security answer
      const { data, error } = await supabase
        .from('users')
        .select('security_answer')
        .eq('username', username)
        .single();

      if (error || !data) {
        return { success: false, message: 'User not found' };
      }

      if (data.security_answer !== securityAnswer.toLowerCase()) {
        return { success: false, message: 'Incorrect security answer' };
      }

      // Update password
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: simpleHash(newPassword),
          updated_at: new Date().toISOString()
        })
        .eq('username', username);

      if (updateError) throw updateError;

      return { success: true, message: 'Password reset successful' };
    } catch (error: any) {
      console.error('❌ Password recovery error:', error);
      return { success: false, message: error.message || 'Password recovery failed' };
    }
  },

  // Check if user exists (for registration)
  async checkUserExists(username: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single();

      return !!data && !error;
    } catch {
      return false;
    }
  }
};

// =====================================================
// SESSION MANAGEMENT
// =====================================================
export const sessionService = {
  saveSession(user: User): void {
    localStorage.setItem('newel_currentUser', JSON.stringify(user));
  },

  getSession(): User | null {
    const raw = localStorage.getItem('newel_currentUser');
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  clearSession(): void {
    localStorage.removeItem('newel_currentUser');
  },

  // Validate session against server
  async validateSession(): Promise<User | null> {
    const sessionUser = this.getSession();
    if (!sessionUser) return null;

    try {
      const { data } = await supabase
        .from('users')
        .select('username, role, approved')
        .eq('username', sessionUser.username)
        .single();

      if (!data || !data.approved) return null;

      return {
        ...sessionUser,
        approved: data.approved,
        role: data.role
      };
    } catch {
      return null;
    }
  }
};

// =====================================================
// USER MANAGEMENT
// =====================================================
export const userService = {
  // Get all users
  async getAllUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('username');

      if (error) throw error;

      return (data || []).map((dbUser: any): User => ({
        username: dbUser.username,
        role: dbUser.role,
        approved: dbUser.approved,
        securityQuestion: dbUser.security_question || '',
        securityAnswer: dbUser.security_answer || '',
        gradeLevel: dbUser.grade_level || undefined,
        assignedStudents: dbUser.assigned_students || undefined,
        lastLogin: dbUser.last_login ? new Date(dbUser.last_login).getTime() : undefined,
        loginHistory: dbUser.login_history 
          ? dbUser.login_history.map((d: string) => new Date(d).getTime())
          : undefined
      }));
    } catch (error) {
      console.error('❌ Get users error:', error);
      return [];
    }
  },

  // Approve user (admin only)
  async approveUser(username: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ approved: true })
        .eq('username', username);

      return !error;
    } catch {
      return false;
    }
  },

  // Delete user (admin only)
  async deleteUser(username: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('username', username);

      return !error;
    } catch {
      return false;
    }
  }
};

// =====================================================
// INITIALIZATION
// =====================================================
export const initializeSupabase = async (): Promise<boolean> => {
  console.log('🔄 Initializing Supabase...');
  
  try {
    // Test connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return false;
    }

    console.log('✅ Supabase connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Initialization error:', error);
    return false;
  }
};