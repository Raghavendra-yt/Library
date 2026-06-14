import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sparkles, Send, Bot, User, RefreshCw, MessageSquare } from 'lucide-react';

// AI Counselor uses local response generation (no backend required)
// For production: connect to Gemini API or other LLM via a Firebase Cloud Function


export default function AIStudentCounselor() {
  const shouldReduceMotion = useReducedMotion();
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Namaste! I am the Gowthami Educational AI Assistant. How can I help you today? You can ask me academic doubts in English or Telugu! (e.g., 'What is recursion?' or 'డేటాబేస్ అంటే ఏమిటి?')"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Local AI response generation (no server required)
      // Simulates educational AI responses based on question keywords
      await new Promise(resolve => setTimeout(resolve, 900));

      const q = userMessage.text.toLowerCase();
      let answer = '';

      if (q.includes('recursion') || q.includes('రికర్శన్')) {
        answer = 'Recursion is a technique where a function calls itself to solve smaller instances of the same problem.\n\nExample: factorial(n) = n × factorial(n-1)\n\nBase case: factorial(0) = 1\n\nKey rule: Every recursion must have a base case to avoid infinite loops!\n\nTelugu: రికర్శన్ అంటే ఒక ఫంక్షన్ తనను తాను పిలుచుకోవడం. ముఖ్యంగా base case ఉండాలి.';
      } else if (q.includes('database') || q.includes('డేటాబేస్')) {
        answer = 'A Database is an organized collection of structured data stored electronically.\n\nTypes:\n• Relational (SQL): MySQL, PostgreSQL\n• NoSQL: MongoDB, Firebase Firestore ← we use this!\n• In-memory: Redis\n\nFirestore (used in this app) is a cloud NoSQL database by Google — perfect for real-time applications!';
      } else if (q.includes('algorithm') || q.includes('అల్గారిథమ్')) {
        answer = 'An Algorithm is a step-by-step set of instructions to solve a problem.\n\nKey properties:\n• Input: Takes defined inputs\n• Output: Produces a result\n• Definiteness: Each step is clear\n• Finiteness: Terminates in finite steps\n\nExamples: Sorting (QuickSort, MergeSort), Searching (Binary Search), Graph traversal (BFS, DFS)';
      } else if (q.includes('firebase') || q.includes('firestore')) {
        answer = 'Firebase is a platform by Google for building web and mobile applications.\n\nKey services used in this Library System:\n🔥 Firestore — NoSQL cloud database (real-time data)\n📦 Collections: users, books, issuedBooks, returns\n\nFirestore stores data as Documents inside Collections. Each document has fields like name, title, status etc.';
      } else if (q.includes('linked list') || q.includes('లింక్డ్ లిస్ట్')) {
        answer = 'A Linked List is a linear data structure where elements are stored in nodes, each pointing to the next.\n\nTypes:\n• Singly Linked: A → B → C → NULL\n• Doubly Linked: NULL ← A ↔ B ↔ C → NULL\n• Circular: A → B → C → A\n\nAdvantage: Dynamic size, efficient insertions/deletions\nDisadvantage: No random access';
      } else if (q.includes('hello') || q.includes('hi') || q.includes('namaste') || q.includes('నమస్తే')) {
        answer = 'నమస్తే! 🙏\n\nI am the Gowthami Educational AI Assistant. I can help you with:\n• Computer Science concepts\n• Data Structures & Algorithms\n• Database theory\n• Programming questions\n• Library system guidance\n\nAsk me anything in English or Telugu! What would you like to learn today?';
      } else {
        answer = `Great question about "${userMessage.text}"!\n\nAs an educational assistant for Sri Gowthami Institutions, I can help with:\n• Programming concepts (Python, Java, C++)\n• Data Structures & Algorithms\n• Database Management (SQL, Firestore)\n• Mathematics & Engineering subjects\n• Library system usage\n\nPlease ask a specific academic question and I'll provide a detailed explanation! You can also ask in Telugu (తెలుగులో అడగవచ్చు).`;
      }

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: answer
        }
      ]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: "I'm sorry, I encountered an error. Please try again."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="max-w-2xl mx-auto space-y-6 text-left flex flex-col h-[520px]">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white m-0 flex items-center gap-2 font-heading">
          <Sparkles className="w-5 h-5 text-[#6D5EF4]" />
          AI Academic Counselor
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          Ask doubts, explain concepts in English/Telugu, or generate placement pathway guides.
        </p>
      </div>

      {/* Chat Window Box */}
      <div className="flex-1 bg-white dark:bg-[#111A35] border border-[#E5E7EB] dark:border-slate-800 rounded-[20px] p-5 flex flex-col justify-between overflow-hidden shadow-sm">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 scrollbar-thin">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className={`flex items-start gap-3 max-w-[85%] ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div className={`p-2.5 rounded-xl border flex-shrink-0 ${
                  msg.sender === 'bot' 
                    ? 'bg-[#6D5EF4]/10 border-transparent text-[#6D5EF4] dark:bg-[#6D5EF4]/10 dark:text-[#a78bfa]' 
                    : 'bg-blue-50 border-blue-100 text-blue-500 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400'
                }`}>
                  {msg.sender === 'bot' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Message Balloon */}
                <div className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line border ${
                  msg.sender === 'bot'
                    ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                    : 'bg-[#6D5EF4] border-[#6D5EF4] text-white shadow-md shadow-[#6D5EF4]/10'
                }`}>
                  {msg.text}
                </div>
              </motion.div>
            ))}

            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3"
              >
                <div className="p-2.5 rounded-xl bg-[#6D5EF4]/10 border-transparent text-[#6D5EF4]">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-[#6D5EF4] animate-spin" />
                  <span className="text-xs text-slate-400">Formulating explanation...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Bar Form */}
        <form onSubmit={handleSend} className="flex gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="flex-1 relative">
            <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask an academic query (e.g. What is recursion? / రికర్శన్ అంటే ఏమిటి?)..."
              className="w-full pl-11 pr-4 h-12 rounded-[14px] border border-[#E5E7EB] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 text-xs focus:outline-none focus:border-[#6D5EF4]"
              disabled={loading}
              required
              aria-label="Ask counselor"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-12 h-12 bg-[#6D5EF4] hover:bg-[#5A4BE8] disabled:opacity-50 text-white rounded-[14px] font-bold cursor-pointer transition shadow-lg shadow-[#6D5EF4]/20 flex items-center justify-center active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
