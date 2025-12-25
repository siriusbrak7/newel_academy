// services/authService.ts
import { supabase } from './supabaseClient';
import { User, Role } from '../types';

interface RegistrationData {
  username: string;
  password: string;
  role: Role;
  gradeLevel?: string;
  securityQuestion: string;
  securityAnswer: string;
}

// --------------------
// AUTHENTICATE USER
// --------------------
export const authenticateUser = async (username: string, password: string): Promise<User> => {
  try {
    console.log('🔐 Custom auth login for:', username);
    
    // Query your custom users table directly
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.trim())
      .single();

    if (error || !profile) {
      console.error('❌ User not found:', error?.message);
      throw new Error('Invalid username or password');
    }

    // Check password (base64 comparison)
    const inputHash = btoa(password);
    if (profile.password_hash !== inputHash) {
      console.log('❌ Password mismatch');
      console.log('   Input hash:', inputHash);
      console.log('   Stored hash:', profile.password_hash);
      throw new Error('Invalid username or password');
    }

    if (!profile.approved) {
      console.log('⚠️ Account not approved');
      throw new Error('Account pending admin approval');
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

    console.log('✅ Login successful');
    return user;
  } catch (err: any) {
    console.error('❌ Login error:', err);
    throw new Error(err.message || 'Login failed. Please try again.');
  }
};

// --------------------
// REGISTER USER
// --------------------
export const registerUser = async (data: RegistrationData): Promise<{ message: string }> => {
  try {
    console.log('📝 Starting registration for:', data.username);

    // Check if username already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('username')
      .eq('username', data.username)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Username check error:', checkError);
      throw new Error('Error checking username availability');
    }

    if (existingUser) {
      console.log('❌ Username already exists');
      throw new Error('Username already exists');
    }

    // Create user in Supabase Auth
    const email = `${data.username.toLowerCase()}@newel.academy`;
    console.log('📧 Creating auth user with email:', email);
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: data.password,
      options: {
        data: {
          username: data.username,
          role: data.role
        }
      }
    });

    if (authError) {
      console.error('❌ Supabase auth error:', authError.message);
      throw new Error(authError.message);
    }

    if (!authData.user) {
      console.error('❌ No user created in auth');
      throw new Error('Registration failed - no user created');
    }

    console.log('✅ Auth user created, ID:', authData.user.id);

    // Create profile in your users table
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        username: data.username,
        password_hash: btoa(data.password),
        role: data.role,
        approved: data.role === 'admin',
        security_question: data.securityQuestion,
        security_answer: data.securityAnswer.toLowerCase(),
        grade_level: data.role === 'student' ? data.gradeLevel : null,
        created_at: new Date().toISOString(),
        last_login: data.role === 'admin' ? new Date().toISOString() : null,
        login_history: data.role === 'admin' ? [new Date().toISOString()] : []
      });

    if (profileError) {
      console.error('❌ Profile creation error:', profileError);
      throw new Error('Profile creation failed: ' + profileError.message);
    }

    console.log('✅ Profile created successfully');

    const successMessage = data.role === 'admin' 
      ? 'Admin account created successfully!' 
      : 'Registration successful! Awaiting admin approval.';
    
    return { message: successMessage };
  } catch (err: any) {
    console.error('❌ Registration error:', err);
    throw new Error(err.message || 'Registration failed. Please try again.');
  }
};

// Optional: You can add more auth-related functions here
export const logoutUser = async (): Promise<void> => {
  await supabase.auth.signOut();
};

export const checkAuthStatus = async (): Promise<User | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) return null;
  
  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (!profile) return null;

  return {
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
};