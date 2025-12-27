// Gamification.tsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trophy, Zap, TrendingUp, Users, Star, Award, Timer, Target, 
  Brain, Crown, BookOpen, ClipboardList, AlertCircle 
} from 'lucide-react';
import { getLeaderboards, saveSprintScore } from '../services/storageService';

interface LeaderboardEntry {
  username: string;
  score: number;
  grade_level?: string;
  
}

interface LeaderboardData {
  academic: LeaderboardEntry[];
  challenge: LeaderboardEntry[];
  assessments: LeaderboardEntry[];
}

export const SprintChallenge: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(222);
  const [isRunning, setIsRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [username, setUsername] = useState('');

  // Initialize questions
  useEffect(() => {
    const sampleQuestions = [
      { id: 1, text: "What is the chemical symbol for water?", answer: "H2O" },
      { id: 2, text: "Who discovered gravity?", answer: "Newton" },
      { id: 3, text: "What planet is known as the Red Planet?", answer: "Mars" },
      { id: 4, text: "What is the largest organ in the human body?", answer: "Skin" },
      { id: 5, text: "What gas do plants absorb from the atmosphere?", answer: "CO2" },
    ];
    setQuestions(sampleQuestions);
    
    // Get username from localStorage
    const storedUser = localStorage.getItem('newel_currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUsername(user.username);
      } catch (e) {
        console.error('Failed to parse user:', e);
      }
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            setGameOver(true);
            saveScore();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const startGame = () => {
    setTimeLeft(222);
    setScore(0);
    setCurrentQuestion(0);
    setGameOver(false);
    setUserAnswer('');
    setIsRunning(true);
  };

  const checkAnswer = () => {
    if (!isRunning || gameOver) return;
    
    const correct = userAnswer.trim().toLowerCase() === 
                   questions[currentQuestion]?.answer?.toLowerCase();
    
    if (correct) {
      setScore(prev => prev + 100);
    }
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setGameOver(true);
      setIsRunning(false);
      saveScore();
    }
    
    setUserAnswer('');
  };

  const saveScore = async () => {
    if (!username) {
      console.log('No username found, score not saved');
      return;
    }
    
    try {
      await saveSprintScore(username, score);
      console.log('✅ Score saved to leaderboard');
    } catch (error) {
      console.error('❌ Failed to save score:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      checkAnswer();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold text-white mb-2">222-Sprint Challenge</h1>
      <p className="text-white/60 mb-8">Answer as many questions correctly in 222 seconds!</p>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Game Panel */}
        <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-white/20 p-8 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-cyan-400 font-mono">{timeLeft}</div>
              <div className="text-white/60 text-sm">seconds left</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-yellow-400 font-mono">{score}</div>
              <div className="text-white/60 text-sm">points</div>
            </div>
          </div>
          
          {!gameOver ? (
            <>
              <div className="bg-black/30 p-6 rounded-xl mb-6">
                <div className="text-white/50 text-sm mb-2">Question {currentQuestion + 1} of {questions.length}</div>
                <div className="text-white text-xl font-bold mb-4">
                  {questions[currentQuestion]?.text || "Loading question..."}
                </div>
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your answer..."
                  className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white text-lg"
                  disabled={!isRunning}
                />
              </div>
              
              <div className="flex gap-4">
                {!isRunning ? (
                  <button
                    onClick={startGame}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold py-4 rounded-lg text-lg hover:scale-105 transition-transform"
                  >
                    <Zap className="inline mr-2" /> Start Sprint!
                  </button>
                ) : (
                  <button
                    onClick={checkAnswer}
                    className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-500 text-white font-bold py-4 rounded-lg text-lg hover:scale-105 transition-transform"
                  >
                    Submit Answer →
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Game Over!</h3>
              <p className="text-white/70 mb-6">Final Score: <span className="text-3xl font-bold text-yellow-400">{score}</span></p>
              <button
                onClick={startGame}
                className="bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-3 px-8 rounded-lg text-lg"
              >
                Play Again
              </button>
            </div>
          )}
        </div>
        
        {/* Right: Instructions & Stats */}
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Target className="text-red-400" /> How to Play
            </h3>
            <ul className="space-y-3 text-white/70">
              <li className="flex items-start gap-2">
                <Zap className="text-yellow-400 mt-1" size={16} />
                <span>You have 222 seconds (3:42) to answer questions</span>
              </li>
              <li className="flex items-start gap-2">
                <Star className="text-yellow-400 mt-1" size={16} />
                <span>Each correct answer: +100 points</span>
              </li>
              <li className="flex items-start gap-2">
                <Timer className="text-cyan-400 mt-1" size={16} />
                <span>Timer stops when you run out of time or questions</span>
              </li>
              <li className="flex items-start gap-2">
                <Trophy className="text-yellow-400 mt-1" size={16} />
                <span>Top scores appear on the global leaderboard</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="text-green-400" /> Tips
            </h3>
            <ul className="space-y-2 text-white/60 text-sm">
              <li>• Press Enter to quickly submit answers</li>
              <li>• Don't overthink - trust your first instinct</li>
              <li>• Practice with different subjects for better scores</li>
              <li>• Check leaderboard for competitive targets</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Updated LeaderboardView with renderTable function inside
export const LeaderboardView: React.FC = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData>({
    academic: [],
    challenge: [],
    assessments: []
  });
  const [activeTab, setActiveTab] = useState<'academic' | 'challenge' | 'assessments'>('academic');
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLeaderboards = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get username from localStorage
        const storedUser = localStorage.getItem('newel_currentUser');
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            setUsername(user.username);
          } catch (e) {
            console.error('Failed to parse user:', e);
          }
        }
        
        // Fetch leaderboards - ONLY REAL DATA
        const data = await getLeaderboards();
        console.log('📊 Leaderboard data loaded:', data);
        
        // Ensure data structure
        const safeData = {
          academic: Array.isArray(data?.academic) ? data.academic : [],
          challenge: Array.isArray(data?.challenge) ? data.challenge : [],
          assessments: Array.isArray(data?.assessments) ? data.assessments : []
        };
        
        // Set only real data - NO DEMO DATA
        setLeaderboardData(safeData);
        
        // Log if any leaderboard is empty
        if (safeData.academic.length === 0) {
          console.log('Academic leaderboard is empty - no academic data yet');
        }
        if (safeData.challenge.length === 0) {
          console.log('Challenge leaderboard is empty - no challenge data yet');
        }
        if (safeData.assessments.length === 0) {
          console.log('Assessments leaderboard is empty - no assessment data yet');
        }
        
      } catch (error) {
        console.error('❌ Error loading leaderboards:', error);
        setError('Failed to load leaderboards. Please try again later.');
        // Set empty data on error - NO DEMO DATA
        setLeaderboardData({
          academic: [],
          challenge: [],
          assessments: []
        });
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboards();
  }, []);

  const getCurrentUserRank = (entries: LeaderboardEntry[]) => {
    if (!username) return null;
    return entries.findIndex(entry => entry.username === username) + 1;
  };

  // In the renderTable function, update the table header and cell:
  const renderTable = (entries: LeaderboardEntry[]) => {
    if (!entries || entries.length === 0) {
      return (
        <div className="text-center py-8 text-white/40">
          No data available yet. Be the first to score!
        </div>
      );
    }

    return (
      <table className="w-full text-left text-sm text-white/70">
        <thead className="bg-white/5 text-white uppercase font-bold text-xs">
          <tr>
            <th className="p-4">Rank</th>
            <th className="p-4">Student</th>
            <th className="p-4">Score</th>
            <th className="p-4">Grade</th> {/* Changed from Type to Grade */}
            <th className="p-4 text-right">Badge</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {entries.slice(0, 20).map((entry, index) => {
            const isCurrentUser = entry.username === username;
            return (
              <tr 
                key={`${entry.username}-${index}`} 
                className={`hover:bg-white/5 transition-colors ${isCurrentUser ? 'bg-cyan-500/10 border-l-4 border-cyan-500' : ''}`}
              >
                <td className="p-4 text-white font-mono">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">#{index + 1}</span>
                    {index < 3 && (
                      <Crown className={`${
                        index === 0 ? 'text-yellow-400' : 
                        index === 1 ? 'text-gray-300' : 
                        'text-amber-700'
                      }`} size={16} />
                    )}
                  </div>
                </td>
                <td className="p-4 font-bold">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <Users size={16} />
                    </div>
                    <span className={`${isCurrentUser ? 'text-cyan-300' : 'text-white'}`}>
                      {entry.username}
                      {isCurrentUser && <span className="ml-2 text-xs bg-cyan-500/20 px-2 py-0.5 rounded">You</span>}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500" 
                        style={{ width: `${Math.min((entry.score / 1000) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-cyan-300">{Math.round(entry.score)}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-white/10">
                    Grade {entry.grade_level || 'N/A'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {index === 0 && <Award className="inline text-yellow-400" size={20} />}
                  {index === 1 && <Award className="inline text-gray-300" size={20} />}
                  {index === 2 && <Award className="inline text-amber-700" size={20} />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const getActiveEntries = () => {
    switch (activeTab) {
      case 'academic': return leaderboardData.academic;
      case 'challenge': return leaderboardData.challenge;
      case 'assessments': return leaderboardData.assessments;
      default: return [];
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
        <p className="mt-4 text-white/60">Loading leaderboards...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-white mb-2">Unable to Load Leaderboards</h3>
          <p className="text-white/70 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const currentData = leaderboardData[activeTab];
  const currentUserRank = getCurrentUserRank(currentData);
  const totalEntries = currentData.length;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Class Leaderboards</h1>
          <p className="text-white/60">Compete with classmates and track your progress</p>
        </div>
        <Link 
          to="/sprint-challenge" 
          className="bg-gradient-to-r from-cyan-600 to-blue-500 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Zap size={20} /> Join 222-Sprint
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <Trophy className="text-yellow-400" size={32} />
            <span className="text-3xl font-bold text-white">{leaderboardData.academic.length}</span>
          </div>
          <p className="text-white/60 text-sm">Academic Leaders</p>
        </div>
        
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <Zap className="text-purple-400" size={32} />
            <span className="text-3xl font-bold text-white">{leaderboardData.challenge.length}</span>
          </div>
          <p className="text-white/60 text-sm">Challenge Champions</p>
        </div>
        
        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <Brain className="text-green-400" size={32} />
            <span className="text-3xl font-bold text-white">{leaderboardData.assessments.length}</span>
          </div>
          <p className="text-white/60 text-sm">Assessment Aces</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/5 rounded-2xl overflow-hidden">
        <div className="flex border-b border-white/10">
          {[
            { id: 'academic', label: 'Academic Scores', icon: <Trophy size={18} /> },
            { id: 'challenge', label: '222-Sprint', icon: <Zap size={18} /> },
            { id: 'assessments', label: 'Assessments', icon: <Brain size={18} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-6 py-4 font-semibold transition flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-cyan-600 text-white'
                  : 'text-white/60 hover:bg-white/5'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'challenge' && leaderboardData.challenge.length > 0 && (
                <span className="ml-2 px-2 py-1 bg-yellow-500 text-black text-xs rounded-full">
                  Live
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-x-auto">
          {renderTable(getActiveEntries())}
        </div>
      </div>

      {/* How to Improve Section */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-white/10 p-8 rounded-2xl">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <TrendingUp className="text-green-400" /> How to Rise in the Ranks
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-cyan-500/20 p-2 rounded-lg">
                <Target className="text-cyan-400" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-white">Complete Assessments</h4>
                <p className="text-white/60 text-sm">Every graded assessment adds to your academic score</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-purple-500/20 p-2 rounded-lg">
                <Zap className="text-purple-400" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-white">Master the Sprint</h4>
                <p className="text-white/60 text-sm">High scores in the 222-Sprint boost your challenge rank</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-green-500/20 p-2 rounded-lg">
                <Star className="text-green-400" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-white">Consistency Matters</h4>
                <p className="text-white/60 text-sm">Daily practice improves both speed and accuracy</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-yellow-500/20 p-2 rounded-lg">
                <Award className="text-yellow-400" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-white">Review Weak Areas</h4>
                <p className="text-white/60 text-sm">Use the AI Tutor to strengthen challenging topics</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};