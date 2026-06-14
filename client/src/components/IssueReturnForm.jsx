import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { BookOpen, User, Calendar, CheckCircle2, AlertTriangle, ArrowRightLeft, RefreshCw, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

export default function IssueReturnForm({ defaultTab = 'issue' }) {
  const shouldReduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Data lists
  const [students, setStudents] = useState([]);
  const [books, setBooks] = useState([]);
  const [activeTransactions, setActiveTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Form states - Issue
  const [issueForm, setIssueForm] = useState({
    user_id: '',
    book_id: '',
    duration: '14'
  });

  // Form states - Return
  const [selectedTransactionId, setSelectedTransactionId] = useState('');
  const [returnPreview, setReturnPreview] = useState(null);
  
  // Feedback states
  const [status, setStatus] = useState(null);

  // Sync tab status with defaultTab prop
  useEffect(() => {
    setActiveTab(defaultTab);
    setStatus(null);
  }, [defaultTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch students
      const stdRes = await fetch(`${API_BASE}/students`);
      const stdData = await stdRes.json();
      setStudents(stdData);

      // Fetch books
      const bookRes = await fetch(`${API_BASE}/books`);
      const bookData = await bookRes.json();
      setBooks(bookData);

      // Fetch active transactions for returns
      const statsRes = await fetch(`${API_BASE}/dashboard/stats`);
      const statsData = await statsRes.json();
      
      // Extract active transactions
      const activeTrans = statsData.recentTransactions.filter(t => !t.actual_return_date);
      setActiveTransactions(activeTrans);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Load preview data when selecting transaction for return
  useEffect(() => {
    if (!selectedTransactionId) {
      setReturnPreview(null);
      return;
    }

    const tx = activeTransactions.find(t => t.id.toString() === selectedTransactionId);
    if (!tx) return;

    // Calculate current simulated fine dynamically
    const today = new Date();
    const expected = new Date(tx.expected_return_date);
    const diffTime = today.getTime() - expected.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const currentFine = diffDays > 0 ? diffDays * 10 : 0;

    setReturnPreview({
      ...tx,
      overdueDays: diffDays > 0 ? diffDays : 0,
      currentFine
    });

  }, [selectedTransactionId, activeTransactions]);

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!issueForm.user_id || !issueForm.book_id) {
      setStatus({ type: 'error', text: 'Please select both a student and a book.' });
      return;
    }

    try {
      setStatus({ type: 'processing', text: 'Registering transaction...' });
      const res = await fetch(`${API_BASE}/transactions/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: parseInt(issueForm.book_id),
          user_id: parseInt(issueForm.user_id),
          expected_return_days: parseInt(issueForm.duration)
        })
      });
      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', text: 'Book issued successfully! The ledger has been updated.' });
        setIssueForm({ user_id: '', book_id: '', duration: '14' });
        fetchData();
      } else {
        setStatus({ type: 'error', text: data.error || 'Failed to issue book.' });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: 'Server connection error.' });
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTransactionId) {
      setStatus({ type: 'error', text: 'Please select an active transaction.' });
      return;
    }

    try {
      setStatus({ type: 'processing', text: 'Processing asset return...' });
      const res = await fetch(`${API_BASE}/transactions/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: parseInt(selectedTransactionId)
        })
      });
      const data = await res.json();

      if (res.ok) {
        setStatus({ 
          type: 'success', 
          text: `Book returned successfully! ${data.fine_accrued > 0 ? `Overdue fee of ₹${data.fine_accrued} posted to ledger.` : 'No overdue fees.'}` 
        });
        setSelectedTransactionId('');
        setReturnPreview(null);
        fetchData();
      } else {
        setStatus({ type: 'error', text: data.error || 'Failed to process return.' });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: 'Server connection error.' });
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 text-left">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white m-0 font-heading">Circulation Manager</h2>
        <p className="text-slate-400 text-xs mt-1">Issue and return library catalog items seamlessly.</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#F8FAFC] dark:bg-slate-850 p-1.5 rounded-[14px] border border-[#E5E7EB] dark:border-slate-800">
        <button
          onClick={() => { setActiveTab('issue'); setStatus(null); }}
          className={`flex-1 py-2.5 rounded-[10px] text-xs font-semibold cursor-pointer transition-all duration-200 ${
            activeTab === 'issue' 
              ? 'bg-[#6D5EF4] text-white shadow-sm' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
          }`}
        >
          Issue Book
        </button>
        <button
          onClick={() => { setActiveTab('return'); setStatus(null); }}
          className={`flex-1 py-2.5 rounded-[10px] text-xs font-semibold cursor-pointer transition-all duration-200 ${
            activeTab === 'return' 
              ? 'bg-[#6D5EF4] text-white shadow-sm' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
          }`}
        >
          Return Book
        </button>
      </div>

      {/* Status Toasts */}
      <AnimatePresence mode="wait">
        {status && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl flex items-start gap-3 border text-xs font-semibold ${
              status.type === 'success' 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' 
                : status.type === 'error'
                  ? 'bg-red-50 border-red-100 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400'
                  : 'bg-violet-50 border-violet-100 text-violet-700 dark:bg-[#8b5cf6]/10 dark:border-[#8b5cf6]/20 dark:text-[#a78bfa]'
            }`}
          >
            {status.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
            ) : status.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" />
            ) : (
              <RefreshCw className="w-5 h-5 flex-shrink-0 animate-spin text-[#6D5EF4]" />
            )}
            <div className="flex-1">
              <p className="m-0 leading-relaxed">{status.text}</p>
            </div>
            <button onClick={() => setStatus(null)} className="text-slate-400 hover:text-slate-650 cursor-pointer self-start">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Form Panel */}
      <div className="bg-white dark:bg-[#1e293b] border border-[#E5E7EB] dark:border-slate-800 rounded-[20px] p-6 shadow-sm">
        {activeTab === 'issue' ? (
          <form onSubmit={handleIssueSubmit} className="space-y-5">
            {/* Student Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-450 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Select Student Profile
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={issueForm.user_id}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, user_id: e.target.value }))}
                  className="w-full pl-11 pr-3 h-12 rounded-[14px] border border-[#E5E7EB] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 text-xs cursor-pointer focus:outline-none focus:border-[#6D5EF4]"
                  required
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(s => (
                    <option key={s.user_id} value={s.user_id}>
                      {s.name} ({s.class_grade} - {s.admission_number})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Book Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-450 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Select Book from Catalog
              </label>
              <div className="relative">
                <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={issueForm.book_id}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, book_id: e.target.value }))}
                  className="w-full pl-11 pr-3 h-12 rounded-[14px] border border-[#E5E7EB] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 text-xs cursor-pointer focus:outline-none focus:border-[#6D5EF4]"
                  required
                >
                  <option value="">-- Choose Book --</option>
                  {books.map(b => (
                    <option key={b.id} value={b.id} disabled={b.available_copies === 0}>
                      {b.title} ({b.available_copies} available / {b.total_copies} total) {b.available_copies === 0 ? '- OUT OF STOCK' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duration Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-450 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Lending Period Duration
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={issueForm.duration}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full pl-11 pr-3 h-12 rounded-[14px] border border-[#E5E7EB] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 text-xs cursor-pointer focus:outline-none focus:border-[#6D5EF4]"
                  required
                >
                  <option value="7">7 Days (Weekly Loan)</option>
                  <option value="14">14 Days (Standard Loan)</option>
                  <option value="30">30 Days (Extended Loan)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#6D5EF4] hover:bg-[#5A4BE8] text-white rounded-[14px] font-bold cursor-pointer transition-all duration-300 shadow-lg shadow-[#6D5EF4]/20 text-xs flex items-center justify-center gap-2 active:scale-98 hover:-translate-y-0.5"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Process Book Issue
            </button>

          </form>
        ) : (
          <form onSubmit={handleReturnSubmit} className="space-y-5">
            {/* Active Transaction Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-455 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Select Active Issued Book
              </label>
              <select
                value={selectedTransactionId}
                onChange={(e) => setSelectedTransactionId(e.target.value)}
                className="w-full px-4 h-12 rounded-[14px] border border-[#E5E7EB] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 text-xs cursor-pointer focus:outline-none focus:border-[#6D5EF4]"
                required
              >
                <option value="">-- Choose Transaction --</option>
                {activeTransactions.map(tx => (
                  <option key={tx.id} value={tx.id}>
                    {tx.student_name} — {tx.title} (Issued: {tx.issue_date})
                  </option>
                ))}
              </select>
            </div>

            {/* Return Preview Panel */}
            <AnimatePresence>
              {returnPreview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[#E5E7EB] dark:border-slate-800/80 text-xs space-y-2.5 overflow-hidden text-left"
                >
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Borrower Student:</span>
                    <strong className="text-slate-800 dark:text-white">{returnPreview.student_name}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Book Title:</span>
                    <strong className="text-slate-800 dark:text-white">{returnPreview.title}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Issue Date:</span>
                    <span className="text-slate-650 dark:text-slate-300 font-mono">{returnPreview.issue_date}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Expected Return:</span>
                    <span className="text-slate-650 dark:text-slate-300 font-mono">{returnPreview.expected_return_date}</span>
                  </div>
                  
                  {returnPreview.overdueDays > 0 ? (
                    <div className="p-3 bg-red-50 border border-red-100 dark:bg-red-550/10 dark:border-red-500/20 rounded-lg flex items-center justify-between text-red-650 dark:text-red-400 font-bold mt-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 animate-bounce" />
                        <span>OVERDUE BY {returnPreview.overdueDays} DAYS</span>
                      </div>
                      <span>Fee Due: ₹{returnPreview.currentFine}</span>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 dark:bg-emerald-550/10 dark:border-emerald-500/20 rounded-lg flex items-center gap-2 text-emerald-650 dark:text-emerald-400 font-semibold mt-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>On-Time Return (No Fees Accrued)</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading || !selectedTransactionId}
              className="w-full h-12 bg-[#6D5EF4] hover:bg-[#5A4BE8] text-white rounded-[14px] font-bold cursor-pointer transition-all duration-300 shadow-lg shadow-[#6D5EF4]/20 text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 hover:-translate-y-0.5"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Process Book Return
            </button>

          </form>
        )}
      </div>
    </div>
  );
}
