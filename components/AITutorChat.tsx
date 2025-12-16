import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User as UserIcon } from 'lucide-react';
import { getAITutorResponse } from '../services/geminiService';
import { ChatMessage } from '../types';

const AITutorChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hi! I'm your AI Science Tutor. Ask me anything about Biology, Physics, or Chemistry!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build simple context from last 2 messages
      const context = messages.slice(-2).map(m => `${m.role}: ${m.text}`).join('\n');
      const responseText = await getAITutorResponse(userMsg.text, context);
      
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting to the network." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full shadow-lg shadow-purple-500/50 flex items-center justify-center text-white hover:scale-110 transition-transform z-50"
      >
        <MessageCircle size={28} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-cyan-900/50 to-purple-900/50 border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bot className="text-cyan-400" size={20} />
          <h3 className="font-bold text-white">AI Science Tutor</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-cyan-900/50 flex items-center justify-center shrink-0 border border-cyan-500/30">
                <Bot size={14} className="text-cyan-400" />
              </div>
            )}
            <div 
              className={`max-w-[80%] p-3 rounded-xl text-sm ${
                m.role === 'user' 
                  ? 'bg-purple-600 text-white rounded-tr-none' 
                  : 'bg-white/10 text-white/90 rounded-tl-none border border-white/5'
              }`}
            >
              {m.text}
            </div>
            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center shrink-0 border border-purple-500/30">
                <UserIcon size={14} className="text-purple-400" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-white/50 text-xs ml-11">
            <span className="animate-pulse">Thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10 bg-black/20">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500/50 text-sm"
            placeholder="Ask about mitosis, velocity..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <button 
            onClick={handleSend}
            disabled={loading}
            className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg disabled:opacity-50 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AITutorChat;
