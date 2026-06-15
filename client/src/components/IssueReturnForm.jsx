import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  BookOpen, User, Calendar, CheckCircle2, AlertTriangle, ArrowRightLeft, 
  RefreshCw, X, Hash, BookMarked, RotateCcw, BookCheck, GraduationCap, Package,
  TrendingUp, DollarSign, Activity, ChevronDown
} from 'lucide-react';
import { getStudents, getBooks, getIssuedBooks, issueBook, returnBook, formatDate, getDashboardStats } from '../lib/api';

export default function IssueReturnForm({ defaultTab = 'issue' }) {
  const shouldReduceMotion = useReducedMotion();
  const [mode, setMode] = useState(defaultTab);
  
  // Data lists from backend
  const [students, setStudents] = useState([]);
  const [books, setBooks] = useState([]);
  const [activeTransactions, setActiveTransactions] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Search Autocomplete states
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  const [bookSearch, setBookSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [showBookDropdown, setShowBookDropdown] = useState(false);

  const [txSearch, setTxSearch] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTxDropdown, setShowTxDropdown] = useState(false);

  // Issue Dates
  const [duration, setDuration] = useState('14');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');

  // Return Dates
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [returnPreview, setReturnPreview] = useState(null);

  // Status message
  const [status, setStatus] = useState(null);

  // Sync tab status with defaultTab prop
  useEffect(() => {
    setMode(defaultTab);
    setStatus(null);
  }, [defaultTab]);

  // Load backend data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsData, booksData, issuedData, statsData] = await Promise.all([
        getStudents(),
        getBooks(),
        getIssuedBooks({ status: 'active' }),
        getDashboardStats()
      ]);

      setStudents(studentsData);
      setBooks(booksData);
      setActiveTransactions(issuedData.filter(t => !t.actual_return_date));
      setDashboardStats(statsData);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: 'Failed to load database records.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [mode]);

  // Calculate Due Date dynamically
  useEffect(() => {
    const date = new Date(issueDate);
    date.setDate(date.getDate() + parseInt(duration));
    setDueDate(date.toISOString().split('T')[0]);
  }, [issueDate, duration]);

  // Calculate dynamic return preview details
  useEffect(() => {
    if (!selectedTransaction) {
      setReturnPreview(null);
      return;
    }

    const expected = new Date(selectedTransaction.expected_return_date);
    const actual = new Date(returnDate);
    const diffTime = actual.getTime() - expected.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const overdueDays = diffDays > 0 ? diffDays : 0;
    const currentFine = overdueDays * 10; // ₹10 per day

    setReturnPreview({
      ...selectedTransaction,
      overdueDays,
      currentFine
    });
  }, [selectedTransaction, returnDate]);

  // Handle Autocomplete Clears
  const handleClearStudent = () => {
    setSelectedStudent(null);
    setStudentSearch('');
  };

  const handleClearBook = () => {
    setSelectedBook(null);
    setBookSearch('');
  };

  const handleClearTransaction = () => {
    setSelectedTransaction(null);
    setTxSearch('');
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !selectedBook) {
      setStatus({ type: 'error', text: 'Please select both a student and a book.' });
      return;
    }

    try {
      setStatus({ type: 'processing', text: 'Registering transaction in database...' });
      
      await issueBook({
        userId: selectedStudent.user_id, // Linked to users.id
        bookId: selectedBook.id,
        durationDays: parseInt(duration)
      });

      setStatus({ type: 'success', text: `Book "${selectedBook.title}" successfully issued to ${selectedStudent.name}!` });
      handleClearStudent();
      handleClearBook();
      fetchData();
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: err.message || 'Failed to issue book.' });
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTransaction) {
      setStatus({ type: 'error', text: 'Please select an active transaction.' });
      return;
    }

    try {
      setStatus({ type: 'processing', text: 'Processing asset return in database...' });
      
      const result = await returnBook(selectedTransaction.id);

      setStatus({ 
        type: 'success', 
        text: `Book returned successfully! ${result.fineAccrued > 0 ? `Overdue fee of ₹${result.fineAccrued} posted to database.` : 'No overdue fees.'}`
      });
      handleClearTransaction();
      fetchData();
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: err.message || 'Failed to process return.' });
    }
  };

  // Filter Autocompletes
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
    s.admission_number.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(bookSearch.toLowerCase()) || 
    (b.isbn && b.isbn.toLowerCase().includes(bookSearch.toLowerCase()))
  );

  const filteredTransactions = activeTransactions.filter(t => 
    t.student_name.toLowerCase().includes(txSearch.toLowerCase()) || 
    t.title.toLowerCase().includes(txSearch.toLowerCase())
  );

  // Active book context for right panel status card
  const activeBookContext = selectedBook || (selectedTransaction ? books.find(b => b.title === selectedTransaction.title) : null);
  const copiesTotal = activeBookContext ? (activeBookContext.total_copies ?? 1) : 0;
  const copiesAvailable = activeBookContext ? (activeBookContext.available_copies ?? 0) : 0;
  const copiesIssued = copiesTotal - copiesAvailable;
  const circulationPercentage = copiesTotal > 0 ? Math.round((copiesIssued / copiesTotal) * 100) : 0;

  // Active student context for right panel history card
  const activeStudentName = selectedStudent ? selectedStudent.name : (selectedTransaction ? selectedTransaction.student_name : '');
  const activeStudentHistory = activeTransactions.filter(t => t.student_name === activeStudentName);

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-left">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white m-0 font-heading">Borrow & Returns</h2>
        <p className="text-slate-400 text-xs mt-1 flex items-center gap-1.5">
          Issue and return library catalog items seamlessly.
          <span className="text-emerald-500 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            LMS Server Live
          </span>
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Form (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Mode Switcher Tabs */}
          <div className="bg-white dark:bg-[#1e293b] p-1.5 rounded-[14px] border border-[#E5E7EB] dark:border-slate-800 flex gap-1 w-fit shadow-sm">
            <button
              onClick={() => { setMode('issue'); setStatus(null); }}
              className={`px-6 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 ${
                mode === 'issue' 
                  ? 'bg-[#2563eb] text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
              }`}
            >
              Issue Book
            </button>
            <button
              onClick={() => { setMode('return'); setStatus(null); }}
              className={`px-6 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 ${
                mode === 'return' 
                  ? 'bg-[#2563eb] text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
              }`}
            >
              Return Book
            </button>
          </div>

          {/* Status Toast */}
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
                      : 'bg-blue-50 border-blue-100 text-blue-700 dark:bg-[#2563eb]/10 dark:border-[#2563eb]/20 dark:text-blue-400'
                }`}
              >
                {status.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
                ) : status.type === 'error' ? (
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" />
                ) : (
                  <RefreshCw className="w-5 h-5 flex-shrink-0 animate-spin text-[#2563eb]" />
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

          {/* Main Card */}
          <div className="bg-white dark:bg-[#1e293b] border border-[#E5E7EB] dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                {mode === 'issue' ? <BookMarked size={15} className="text-blue-600 dark:text-blue-400" /> : <RotateCcw size={15} className="text-blue-600 dark:text-blue-400" />}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white font-heading">
                  {mode === 'issue' ? 'Issue a Book' : 'Return a Book'}
                </h2>
                <p className="text-xs text-slate-400">Search and select items to auto-fill the forms</p>
              </div>
            </div>

            <div className="p-6 space-y-6">

              {mode === 'issue' ? (
                <form onSubmit={handleIssueSubmit} className="space-y-6">
                  {/* Student Search Section */}
                  <div>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">Student Information</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Search Student Autocomplete */}
                      <div className="relative">
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Search Student</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50/50">
                          <Hash size={14} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Type student name or admission number..."
                            value={studentSearch}
                            onChange={(e) => {
                              setStudentSearch(e.target.value);
                              setShowStudentDropdown(true);
                            }}
                            onFocus={() => setShowStudentDropdown(true)}
                            className="bg-transparent text-xs outline-none flex-1 text-slate-800 dark:text-white"
                          />
                          {selectedStudent && (
                            <button type="button" onClick={handleClearStudent} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        {/* Dropdown Options */}
                        {showStudentDropdown && studentSearch && (
                          <div className="absolute left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl max-h-48 overflow-y-auto mt-1 shadow-lg divide-y divide-slate-50 dark:divide-slate-800">
                            {filteredStudents.length === 0 ? (
                              <div className="p-3 text-xs text-slate-400 text-center">No matching students found</div>
                            ) : (
                              filteredStudents.map(s => (
                                <button
                                  key={s.student_id}
                                  type="button"
                                  onClick={() => handleStudentSelect(s)}
                                  className="w-full text-left p-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 flex justify-between items-center cursor-pointer"
                                >
                                  <span className="font-semibold">{s.name}</span>
                                  <span className="font-mono text-[10px] text-slate-400">{s.admission_number}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* Display Info */}
                      <div className="opacity-80">
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Class / Grade</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs text-slate-500 font-semibold">
                          <GraduationCap size={14} className="text-slate-400 shrink-0" />
                          <span>{selectedStudent ? selectedStudent.class_grade : 'Auto-filled'}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Student Name</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs text-slate-500 font-semibold">
                          <User size={14} className="text-slate-400 shrink-0" />
                          <span>{selectedStudent ? selectedStudent.name : 'Auto-filled'}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Contact Phone</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs text-slate-500 font-semibold">
                          <User size={14} className="text-slate-400 shrink-0" />
                          <span>{selectedStudent ? selectedStudent.contact : 'Auto-filled'}</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="h-px bg-slate-100 dark:bg-slate-800" />

                  {/* Book Search Section */}
                  <div>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">Book Information</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Search Book Autocomplete */}
                      <div className="relative">
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Search Book</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50/50">
                          <BookOpen size={14} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Type book title or ISBN..."
                            value={bookSearch}
                            onChange={(e) => {
                              setBookSearch(e.target.value);
                              setShowBookDropdown(true);
                            }}
                            onFocus={() => setShowBookDropdown(true)}
                            className="bg-transparent text-xs outline-none flex-1 text-slate-800 dark:text-white"
                          />
                          {selectedBook && (
                            <button type="button" onClick={handleClearBook} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        {/* Dropdown Options */}
                        {showBookDropdown && bookSearch && (
                          <div className="absolute left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl max-h-48 overflow-y-auto mt-1 shadow-lg divide-y divide-slate-50 dark:divide-slate-800">
                            {filteredBooks.length === 0 ? (
                              <div className="p-3 text-xs text-slate-400 text-center">No matching books found</div>
                            ) : (
                              filteredBooks.map(b => {
                                const avail = b.available_copies ?? b.available ?? 0;
                                return (
                                  <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => handleBookSelect(b)}
                                    disabled={avail === 0}
                                    className="w-full text-left p-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-350 flex justify-between items-center cursor-pointer disabled:opacity-50"
                                  >
                                    <span className="font-semibold truncate max-w-[200px]">{b.title}</span>
                                    <span className="font-mono text-[10px] text-slate-400">{avail} available {avail === 0 && '(OUT)'}</span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Book Title</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs text-slate-500 font-semibold truncate">
                          <BookOpen size={14} className="text-slate-400 shrink-0" />
                          <span className="truncate">{selectedBook ? selectedBook.title : 'Auto-filled'}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Author</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs text-slate-500 font-semibold">
                          <User size={14} className="text-slate-400 shrink-0" />
                          <span>{selectedBook ? selectedBook.author : 'Auto-filled'}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Category</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs text-slate-500 font-semibold">
                          <Package size={14} className="text-slate-400 shrink-0" />
                          <span>{selectedBook ? selectedBook.category : 'Auto-filled'}</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="h-px bg-slate-100 dark:bg-slate-800" />

                  {/* Lending Dates Section */}
                  <div>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">Lending & Dates</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Lending Period</label>
                        <div className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400">
                          <Calendar size={14} className="text-slate-400 shrink-0" />
                          <select
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            className="bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none flex-1 py-1.5 cursor-pointer"
                          >
                            <option value="7">7 Days (Weekly Loan)</option>
                            <option value="14">14 Days (Standard Loan)</option>
                            <option value="30">30 Days (Extended Loan)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Issue Date</label>
                        <div className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400">
                          <Calendar size={14} className="text-slate-400 shrink-0" />
                          <input
                            type="date"
                            value={issueDate}
                            onChange={(e) => setIssueDate(e.target.value)}
                            className="bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none flex-1 py-1.5"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Expected Due Date</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs text-slate-500 font-semibold font-mono">
                          <Calendar size={14} className="text-slate-400 shrink-0" />
                          <span>{dueDate}</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Submission actions */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => { handleClearStudent(); handleClearBook(); setStatus(null); }}
                      className="px-4 py-2.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 font-medium transition cursor-pointer"
                    >
                      Clear Form
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !selectedStudent || !selectedBook}
                      className="flex items-center justify-center gap-2 px-6 h-11 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl font-bold cursor-pointer transition shadow-md shadow-[#2563eb]/20 text-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
                    >
                      <BookCheck size={14} />
                      Issue Book Copies
                    </button>
                  </div>

                </form>
              ) : (
                <form onSubmit={handleReturnSubmit} className="space-y-6">
                  {/* Return Select Transaction */}
                  <div>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">Asset Transaction</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Autocomplete Transaction Search */}
                      <div className="relative col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Select Active Issued Book</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50/50">
                          <BookOpen size={14} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Type student name or book title to search active checkouts..."
                            value={txSearch}
                            onChange={(e) => {
                              setTxSearch(e.target.value);
                              setShowTxDropdown(true);
                            }}
                            onFocus={() => setShowTxDropdown(true)}
                            className="bg-transparent text-xs outline-none flex-1 text-slate-800 dark:text-white"
                          />
                          {selectedTransaction && (
                            <button type="button" onClick={handleClearTransaction} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        {/* Dropdown Options */}
                        {showTxDropdown && txSearch && (
                          <div className="absolute left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl max-h-48 overflow-y-auto mt-1 shadow-lg divide-y divide-slate-50 dark:divide-slate-800">
                            {filteredTransactions.length === 0 ? (
                              <div className="p-3 text-xs text-slate-400 text-center">No active checkouts match your query</div>
                            ) : (
                              filteredTransactions.map(tx => (
                                <button
                                  key={tx.id}
                                  type="button"
                                  onClick={() => handleTxSelect(tx)}
                                  className="w-full text-left p-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-350 flex justify-between items-center cursor-pointer"
                                >
                                  <span className="font-semibold">{tx.student_name}</span>
                                  <span className="truncate text-slate-400 font-semibold max-w-[200px]">{tx.title}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                  <div className="h-px bg-slate-100 dark:bg-slate-800" />

                  {/* Return details (Auto-filled) */}
                  <div>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">Transaction Details</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Borrower Student</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs text-slate-500 font-semibold">
                          <User size={14} className="text-slate-400 shrink-0" />
                          <span>{selectedTransaction ? selectedTransaction.student_name : 'Auto-filled'}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Book Title</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs text-slate-500 font-semibold truncate">
                          <BookOpen size={14} className="text-slate-400 shrink-0" />
                          <span className="truncate">{selectedTransaction ? selectedTransaction.title : 'Auto-filled'}</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="h-px bg-slate-100 dark:bg-slate-800" />

                  {/* Return Dates */}
                  <div>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">Return Dates & Fine Calculation</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Issue Date</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs text-slate-500 font-semibold font-mono">
                          <Calendar size={14} className="text-slate-400 shrink-0" />
                          <span>{selectedTransaction ? selectedTransaction.issue_date : 'Auto-filled'}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Expected Due Date</label>
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs text-slate-500 font-semibold font-mono">
                          <Calendar size={14} className="text-slate-400 shrink-0" />
                          <span>{selectedTransaction ? selectedTransaction.expected_return_date : 'Auto-filled'}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Actual Return Date</label>
                        <div className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-blue-400">
                          <Calendar size={14} className="text-slate-400 shrink-0" />
                          <input
                            type="date"
                            value={returnDate}
                            onChange={(e) => setReturnDate(e.target.value)}
                            className="bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none flex-1 py-1.5 font-mono"
                          />
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Return preview / Fines info */}
                  <AnimatePresence>
                    {returnPreview && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Days Late</label>
                            <div className={`px-3.5 py-2.5 border rounded-xl text-xs font-bold ${returnPreview.overdueDays > 0 ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-550/10 dark:border-red-900/30' : 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-550/10 dark:border-emerald-900/30'}`}>
                              {returnPreview.overdueDays} Days
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fine Per Day</label>
                            <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs text-slate-550 font-semibold font-mono">
                              ₹10.00
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Total Overdue Fee</label>
                            <div className={`px-3.5 py-2.5 border rounded-xl text-xs font-bold font-mono ${returnPreview.currentFine > 0 ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-550/10 dark:border-red-900/30' : 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-550/10 dark:border-emerald-900/30'}`}>
                              ₹{returnPreview.currentFine.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submission Actions */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => { handleClearTransaction(); setStatus(null); }}
                      className="px-4 py-2.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 font-medium transition cursor-pointer"
                    >
                      Clear Form
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !selectedTransaction}
                      className="flex items-center justify-center gap-2 px-6 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer transition shadow-md shadow-blue-500/20 text-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
                    >
                      <RotateCcw size={14} />
                      Process Asset Return
                    </button>
                  </div>

                </form>
              )}

            </div>
          </div>
        </div>

        {/* Right Column: Informational Sidebar (1/3 width) */}
        <div className="space-y-6">

          {/* Book Availability Card */}
          <div className="bg-white dark:bg-[#1e293b] border border-[#E5E7EB] dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden text-left">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <BookOpen size={15} className="text-[#2563eb]" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-white m-0 font-heading">Book Inventory Status</h3>
            </div>
            <div className="p-5 space-y-4">
              {activeBookContext ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Selected Title</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-[140px]" title={activeBookContext.title}>
                      {activeBookContext.title}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">ISBN Identifier</span>
                    <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">{activeBookContext.isbn || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Copies</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-white">{copiesTotal}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Available Copies</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{copiesAvailable}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">In Circulation</span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{copiesIssued}</span>
                  </div>
                  <div className="h-px bg-slate-100 dark:bg-slate-800" />
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#2563eb] h-full" style={{ width: `${circulationPercentage}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold m-0">{circulationPercentage}% of copies currently in circulation</p>
                </>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs flex flex-col items-center gap-1.5">
                  <Package size={24} className="text-slate-300 dark:text-slate-700" />
                  <span>No book selected. Select a book from the form to view real-time inventory levels.</span>
                </div>
              )}
            </div>
          </div>

          {/* Student Borrow History Card */}
          <div className="bg-white dark:bg-[#1e293b] border border-[#E5E7EB] dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden text-left">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <User size={15} className="text-[#2563eb]" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-white m-0 font-heading">Student Active Loans</h3>
            </div>
            <div className="p-5 space-y-3">
              {activeStudentName ? (
                <>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">History for {activeStudentName}</p>
                  {activeStudentHistory.length === 0 ? (
                    <div className="text-xs text-slate-400 py-3 text-center">No active book loans found for this student.</div>
                  ) : (
                    activeStudentHistory.map((tx) => (
                      <div key={tx.id} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                          <BookOpen size={13} className="text-[#2563eb] dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0 text-xs">
                          <p className="font-semibold text-slate-700 dark:text-slate-300 truncate m-0">{tx.title}</p>
                          <p className="text-[10px] text-slate-400 m-0 mt-0.5">Due: {tx.expected_return_date}</p>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${tx.status === 'Overdue' ? 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400'}`}>
                          {tx.status}
                        </span>
                      </div>
                    ))
                  )}
                </>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs flex flex-col items-center gap-1.5">
                  <User size={24} className="text-slate-300 dark:text-slate-700" />
                  <span>No student selected. Select a student profile to view active borrowings.</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-sm text-left">
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Activity size={12} />
              Today's Circulation Stats
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-base font-bold m-0 font-heading">
                  {dashboardStats ? dashboardStats.metrics.totalBooks : '-'}
                </p>
                <p className="text-[10px] text-blue-200 m-0 mt-0.5">Total Assets</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-base font-bold m-0 font-heading">
                  {dashboardStats ? dashboardStats.metrics.activeIssues : '-'}
                </p>
                <p className="text-[10px] text-blue-200 m-0 mt-0.5">In Circulation</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-base font-bold m-0 font-heading text-rose-200">
                  {dashboardStats ? dashboardStats.metrics.totalOverdue : '-'}
                </p>
                <p className="text-[10px] text-blue-200 m-0 mt-0.5">Overdue Accounts</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-base font-bold m-0 font-heading text-emerald-200">
                  ₹{dashboardStats ? Math.round(dashboardStats.metrics.totalFines) : '-'}
                </p>
                <p className="text-[10px] text-blue-200 m-0 mt-0.5">Pending Fines</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );

  // Helper selectors
  function handleStudentSelect(student) {
    setSelectedStudent(student);
    setStudentSearch(`${student.name} (${student.admission_number})`);
    setShowStudentDropdown(false);
  }

  function handleBookSelect(book) {
    setSelectedBook(book);
    setBookSearch(`${book.title} (ISBN: ${book.isbn || 'N/A'})`);
    setShowBookDropdown(false);
  }

  function handleTxSelect(tx) {
    setSelectedTransaction(tx);
    setTxSearch(`${tx.student_name} — ${tx.title}`);
    setShowTxDropdown(false);
  }
}
