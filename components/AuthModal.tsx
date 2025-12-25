// components/AuthModal.tsx
import React, { useState } from 'react';
import { User, Role } from '../types';
import { SECURITY_QUESTIONS } from '../constants';
import { authenticateUser, registerUser, recoverPassword } from '../services/storageService';
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
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await authenticateUser(formData.username, formData.password);
      
      if (!user) {
        setError('Invalid username or password');
        return;
      }

      if (!user.approved) {
        setError('Account pending admin approval');
        return;
      }

      onLogin(user);
    } catch (err: any) {
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

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const result = await registerUser({
        username: formData.username,
        password: formData.password,
        role: formData.role,
        gradeLevel: formData.role === 'student' ? formData.gradeLevel : undefined,
        securityQuestion: formData.securityQuestion,
        securityAnswer: formData.securityAnswer
      });

      if (result.success) {
        setSuccess(result.message);
        
        if (formData.role === 'admin') {
          const adminUser: User = {
            username: formData.username,
            role: 'admin',
            approved: true,
            securityQuestion: formData.securityQuestion,
            securityAnswer: formData.securityAnswer.toLowerCase(),
            lastLogin: Date.now()
          };
          setTimeout(() => onLogin(adminUser), 1500);
        } else {
          setTimeout(() => {
            setSuccess('');
            setMode('login');
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
          }, 2000);
        }
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError('Registration failed.');
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
      const result = await recoverPassword(
        formData.username,
        formData.securityAnswer,
        formData.password
      );

      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => setMode('login'), 2000);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError('Recovery failed.');
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