// components/AuthModal.tsx - COMPLETE FIXED VERSION
import React, { useState } from 'react';
import { User, Role } from '../types';
import { SECURITY_QUESTIONS } from '../constants';
import { supabase } from '../services/supabaseClient';
import { X } from 'lucide-react';

interface AuthModalProps {
  onLogin: (user: User) => void;
  onClose?: () => void;
}

type Mode = 'login' | 'register' | 'recover';

const AuthModal: React.FC<AuthModalProps> = ({ onLogin, onClose }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'student' as Role,
    gradeLevel: '9',
    securityQuestion: SECURITY_QUESTIONS[0],
    securityAnswer: ''
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  // --------------------
  // LOGIN
  // --------------------
  // In your AuthModal.tsx handleLogin function, use this instead:

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  try {
    console.log('🔐 Custom auth login for:', formData.username);
    
    // Query your custom users table directly
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', formData.username.trim())
      .single();

    if (error || !profile) {
      console.error('❌ User not found:', error?.message);
      setError('Invalid username or password');
      setLoading(false);
      return;
    }

    // Check password (base64 comparison)
    const inputHash = btoa(formData.password);
    if (profile.password_hash !== inputHash) {
      console.log('❌ Password mismatch');
      console.log('   Input hash:', inputHash);
      console.log('   Stored hash:', profile.password_hash);
      setError('Invalid username or password');
      setLoading(false);
      return;
    }

    if (!profile.approved) {
      console.log('⚠️ Account not approved');
      setError('Account pending admin approval');
      setLoading(false);
      return;
    }

    // Update last login
    await supabase
      .from('users')
      .update({ 
        last_login: new Date().toISOString(),
        login_history: [...(profile.login_history || []), new Date().toISOString()].slice(-10)
      })
      .eq('id', profile.id);

    // Create User object
    const user: User = {
      id: profile.id,
      username: profile.username,
      role: profile.role as Role,
      approved: profile.approved,
      securityQuestion: profile.security_question || '',
      securityAnswer: profile.security_answer || '',
      gradeLevel: profile.grade_level || undefined,
      assignedStudents: profile.assigned_students || undefined,
      lastLogin: Date.now(),
      createdAt: new Date(profile.created_at).getTime(),
      loginHistory: profile.login_history 
        ? profile.login_history.map((d: string) => new Date(d).getTime())
        : []
    };

    console.log('✅ Login successful, calling onLogin');
    onLogin(user);
  } catch (err: any) {
    console.error('❌ Login error:', err);
    setError(err.message || 'Login failed. Please try again.');
  } finally {
    setLoading(false);
  }
};

  // --------------------
  // REGISTER
  // --------------------
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate required fields
    if (!formData.username || !formData.password || !formData.securityAnswer) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    try {
      console.log('📝 Starting registration for:', formData.username);

      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('username')
        .eq('username', formData.username)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Username check error:', checkError);
        setError('Error checking username availability');
        setLoading(false);
        return;
      }

      if (existingUser) {
        console.log('❌ Username already exists');
        setError('Username already exists');
        setLoading(false);
        return;
      }

      // Create user in Supabase Auth
      const email = `${formData.username.toLowerCase()}@newel.academy`;
      console.log('📧 Creating auth user with email:', email);
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: {
          data: {
            username: formData.username,
            role: formData.role
          }
        }
      });

      if (authError) {
        console.error('❌ Supabase auth error:', authError.message);
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        console.error('❌ No user created in auth');
        setError('Registration failed - no user created');
        setLoading(false);
        return;
      }

      console.log('✅ Auth user created, ID:', authData.user.id);

      // Create profile in your users table
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          username: formData.username,
          password_hash: btoa(formData.password),
          role: formData.role,
          approved: formData.role === 'admin',
          security_question: formData.securityQuestion,
          security_answer: formData.securityAnswer.toLowerCase(),
          grade_level: formData.role === 'student' ? formData.gradeLevel : null,
          created_at: new Date().toISOString(),
          last_login: formData.role === 'admin' ? new Date().toISOString() : null,
          login_history: formData.role === 'admin' ? [new Date().toISOString()] : []
        });

      if (profileError) {
        console.error('❌ Profile creation error:', profileError);
        setError('Profile creation failed: ' + profileError.message);
        setLoading(false);
        return;
      }

      console.log('✅ Profile created successfully');

      const successMessage = formData.role === 'admin' 
        ? 'Admin account created successfully!' 
        : 'Registration successful! Awaiting admin approval.';
      
      setSuccess(successMessage);

      // If admin, auto-login
      if (formData.role === 'admin') {
        console.log('🔄 Auto-logging in admin...');
        setTimeout(async () => {
          const { data: loginData } = await supabase.auth.signInWithPassword({
            email,
            password: formData.password
          });
          
          if (loginData?.user) {
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', loginData.user.id)
              .single();
              
            if (profile) {
              const adminUser: User = {
                id: loginData.user.id,
                username: profile.username,
                role: profile.role as Role,
                approved: profile.approved,
                securityQuestion: profile.security_question || '',
                securityAnswer: profile.security_answer || '',
                gradeLevel: profile.grade_level || undefined,
                lastLogin: Date.now(),
                createdAt: new Date(profile.created_at).getTime()
              };
              onLogin(adminUser);
            }
          }
        }, 1500);
      } else {
        // Switch to login for regular users
        setTimeout(() => {
          setSuccess('');
          setMode('login');
          setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        }, 2000);
      }
    } catch (err: any) {
      console.error('❌ Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --------------------
  // RECOVER PASSWORD
  // --------------------
  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      console.log('🔐 Starting password recovery for:', formData.username);

      // Find user by username and verify security answer
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', formData.username)
        .single();

      if (userError || !userProfile) {
        console.error('❌ User not found:', userError?.message);
        setError('User not found');
        setLoading(false);
        return;
      }

      if (userProfile.security_answer !== formData.securityAnswer.toLowerCase()) {
        console.error('❌ Incorrect security answer');
        setError('Incorrect security answer');
        setLoading(false);
        return;
      }

      // For password reset, we need to be authenticated
      console.log('⚠️ Password reset requires user to be logged in');
      setError('Please contact admin for password reset, or use email recovery');
      setLoading(false);
      return;

    } catch (err: any) {
      console.error('❌ Recovery error:', err);
      setError(err.message || 'Password recovery failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-900 border border-white/20 p-8 rounded-2xl shadow-2xl relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white"
        >
          <X size={24} />
        </button>
      )}

      <h2 className="text-2xl font-bold mb-6 text-center text-white">
        {mode === 'login' && 'Welcome Back'}
        {mode === 'register' && 'Join Newel Academy'}
        {mode === 'recover' && 'Reset Password'}
      </h2>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded mb-4 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-2 rounded mb-4 text-sm">
          {success}
        </div>
      )}

      <form
        onSubmit={
          mode === 'login'
            ? handleLogin
            : mode === 'register'
            ? handleRegister
            : handleRecover
        }
        className="space-y-4"
      >
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          className="w-full p-3 rounded bg-black/40 border border-white/10 text-white"
          required
          disabled={loading}
          autoComplete="username"
        />

        <input
          type="password"
          name="password"
          placeholder={mode === 'recover' ? 'New Password' : 'Password'}
          value={formData.password}
          onChange={handleChange}
          className="w-full p-3 rounded bg-black/40 border border-white/10 text-white"
          required
          disabled={loading}
          autoComplete={mode === 'recover' ? 'new-password' : 'current-password'}
        />

        {(mode === 'register' || mode === 'recover') && (
          <>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full p-3 rounded bg-black/40 border border-white/10 text-white"
              required
              disabled={loading}
              autoComplete="new-password"
            />

            <select
              name="securityQuestion"
              value={formData.securityQuestion}
              onChange={handleChange}
              className="w-full p-3 rounded bg-black/40 border border-white/10 text-white"
              disabled={loading}
            >
              {SECURITY_QUESTIONS.map(q => (
                <option key={q} value={q} className="bg-slate-800">
                  {q}
                </option>
              ))}
            </select>

            <input
              type="text"
              name="securityAnswer"
              placeholder="Security Answer"
              value={formData.securityAnswer}
              onChange={handleChange}
              className="w-full p-3 rounded bg-black/40 border border-white/10 text-white"
              required
              disabled={loading}
              autoComplete="off"
            />
          </>
        )}

        {mode === 'register' && (
          <div className="flex gap-4">
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="flex-1 p-3 rounded bg-black/40 border border-white/10 text-white"
              disabled={loading}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>

            {formData.role === 'student' && (
              <select
                name="gradeLevel"
                value={formData.gradeLevel}
                onChange={handleChange}
                className="flex-1 p-3 rounded bg-black/40 border border-white/10 text-white"
                disabled={loading}
              >
                {['9', '10', '11', '12'].map(g => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 
           mode === 'login' ? 'Login' :
           mode === 'register' ? 'Register' : 'Reset Password'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-white/60">
        {mode === 'login' && (
          <>
            <p>
              Don't have an account?{' '}
              <button 
                onClick={() => setMode('register')} 
                className="text-cyan-400 hover:text-cyan-300"
                disabled={loading}
              >
                Register
              </button>
            </p>
            <p className="mt-2">
              Forgot password?{' '}
              <button 
                onClick={() => setMode('recover')} 
                className="text-purple-400 hover:text-purple-300"
                disabled={loading}
              >
                Recover
              </button>
            </p>
          </>
        )}

        {(mode === 'register' || mode === 'recover') && (
          <p>
            Back to{' '}
            <button 
              onClick={() => setMode('login')} 
              className="text-cyan-400 hover:text-cyan-300"
              disabled={loading}
            >
              Login
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthModal;