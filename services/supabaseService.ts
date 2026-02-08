// services/supabaseService.ts
import { supabase } from './supabaseClient';
import { User } from '../types';

// =====================================================
// PASSWORD HASHING (Base64 – dev only)
// =====================================================
const simpleHash = (password: string): string => btoa(password);

// =====================================================
// AUTHENTICATION SERVICE
// =====================================================
export const authService = {
  async login(username: string, password: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !data) return null;

      if (data.password_hash !== simpleHash(password)) return null;

      const user: User = {
        id: data.id,
        username: data.username,
        role: data.role,
        approved: data.approved,
        status: data.status,
        createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
        registrationDate: data.registration_date,
        fullName: data.full_name || undefined,
        email: data.email || undefined,
        gradeLevel: data.grade_level || undefined,
        securityQuestion: data.security_question,
        securityAnswer: data.security_answer,
        lastLogin: Date.now(),
        loginHistory: data.login_history
          ? data.login_history.map((d: string) => new Date(d).getTime())
          : [],
        tier: data.tier || 'free',
        queryCount: data.query_count || 0,
        queryResetTime: data.query_reset_time || new Date().toISOString(),
        isPremium: data.is_premium || false,
        subscriptionEndsAt: data.subscription_ends_at || undefined,
        paystackSubscriptionCode: data.paystack_subscription_code || undefined,
      };

      await this.updateLastLogin(username);
      return user;
    } catch (err) {
      console.error('Login failed:', err);
      return null;
    }
  },

  async updateLastLogin(username: string): Promise<void> {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, login_history')
        .eq('username', username)
        .single();

      if (!data) return;

      const history = [...(data.login_history || []), new Date().toISOString()].slice(-10);

      await supabase
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          login_history: history,
        })
        .eq('id', data.id);
    } catch {}
  },

  // =====================================================
  // REGISTRATION (UPDATED)
  // =====================================================
  async register(userData: {
    username: string;
    password: string;
    role: 'student' | 'teacher' | 'admin';
    gradeLevel?: string;
    securityQuestion: string;
    securityAnswer: string;
    fullName?: string;
    email?: string;
    isPremium: boolean;
    approved: boolean;
    status: string;
    registrationDate: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const { data: existing } = await supabase
        .from('users')
        .select('username')
        .eq('username', userData.username)
        .single();

      if (existing) {
        return { success: false, message: 'Username already exists' };
      }

      const tier =
        userData.role === 'admin' ? 'admin_free' : userData.isPremium ? 'premium' : 'free';

      const { error } = await supabase.from('users').insert({
        username: userData.username,
        password_hash: simpleHash(userData.password),
        role: userData.role,
        grade_level: userData.gradeLevel || null,
        security_question: userData.securityQuestion,
        security_answer: userData.securityAnswer.toLowerCase(),
        approved: userData.approved,
        status: userData.status,
        registration_date: userData.registrationDate,
        full_name: userData.fullName || null,
        email: userData.email || null,
        is_premium: userData.isPremium,
        tier,
        query_count: 0,
        query_reset_time: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      return { success: true, message: 'Registration successful' };
    } catch (err: any) {
      console.error('Registration error:', err);
      return { success: false, message: err.message || 'Registration failed' };
    }
  },

  async recoverPassword(
    username: string,
    securityAnswer: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data } = await supabase
        .from('users')
        .select('security_answer')
        .eq('username', username)
        .single();

      if (!data || data.security_answer !== securityAnswer.toLowerCase()) {
        return { success: false, message: 'Invalid credentials' };
      }

      await supabase
        .from('users')
        .update({
          password_hash: simpleHash(newPassword),
          updated_at: new Date().toISOString(),
        })
        .eq('username', username);

      return { success: true, message: 'Password reset successful' };
    } catch {
      return { success: false, message: 'Password recovery failed' };
    }
  },
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
    return raw ? JSON.parse(raw) : null;
  },

  clearSession(): void {
    localStorage.removeItem('newel_currentUser');
  },

  async validateSession(): Promise<User | null> {
    const session = this.getSession();
    if (!session) return null;

    const { data } = await supabase
      .from('users')
      .select('role, approved')
      .eq('username', session.username)
      .single();

    if (!data || !data.approved) return null;
    return { ...session, role: data.role, approved: data.approved };
  },
};

// =====================================================
// USER MANAGEMENT (ADMIN)
// =====================================================
export const userService = {
  async getAllUsers(): Promise<User[]> {
    try {
      const { data } = await supabase.from('users').select('*').order('username');

      return (data || []).map((u: any): User => ({
        id: u.id,
        username: u.username,
        role: u.role,
        approved: u.approved,
        status: u.status,
        createdAt: u.created_at ? new Date(u.created_at).getTime() : Date.now(),
        registrationDate: u.registration_date,
        gradeLevel: u.grade_level || undefined,
        fullName: u.full_name || undefined,
        email: u.email || undefined,
        securityQuestion: u.security_question || '',
        securityAnswer: u.security_answer || '',
        lastLogin: u.last_login ? new Date(u.last_login).getTime() : undefined,
        tier: u.tier,
        queryCount: u.query_count,
        queryResetTime: u.query_reset_time,
        isPremium: u.is_premium,
      }));
    } catch {
      return [];
    }
  },

  async saveUser(user: User): Promise<boolean> {
    const { error } = await supabase.from('users').update({
      approved: user.approved,
      status: user.status,
      is_premium: user.isPremium,
    }).eq('username', user.username);

    return !error;
  },

  async deleteUser(username: string): Promise<boolean> {
    const { error } = await supabase.from('users').delete().eq('username', username);
    return !error;
  },
};

// =====================================================
// INITIALIZATION
// =====================================================
export const initializeSupabase = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
};
