import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  LayoutDashboard, 
  BookOpen, 
  ArrowRightLeft, 
  Sparkles, 
  HelpCircle, 
  Users, 
  Tags, 
  UserSquare2, 
  CalendarCheck, 
  DollarSign, 
  BarChart3, 
  Settings, 
  Search, 
  Bell, 
  Mail, 
  Sun, 
  Moon, 
  Plus, 
  Menu, 
  ChevronLeft, 
  ChevronRight,
  BookMarked,
  User,
  ExternalLink,
  X,
  Clock,
  UserPlus,
  Activity,
  CheckCircle,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import BookCatalog from './components/BookCatalog';
import IssueReturnForm from './components/IssueReturnForm';
import AIStudentCounselor from './components/AIStudentCounselor';
import UserGuide from './components/UserGuide';
import ProfileView from './components/ProfileView';

import { getDashboardStats, getStudents, markReminderSent, addStudent, deleteStudent } from './lib/api';

const fadeVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberFormData, setMemberFormData] = useState({
    name: '',
    contact: '',
    admission_number: '',
    class_grade: 'Class 10',
    parent_name: '',
    parent_contact: '',
    campus_id: '1'
  });

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    try {
      await addStudent(memberFormData);
      alert('Member added successfully!');
      setShowAddMemberModal(false);
      setMemberFormData({
        name: '',
        contact: '',
        admission_number: '',
        class_grade: 'Class 10',
        parent_name: '',
        parent_contact: '',
        campus_id: '1'
      });
      getStudents()
        .then(data => setStudents(data))
        .catch(err => console.error(err));
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to add member.');
    }
  };
  const [inboxMessages, setInboxMessages] = useState([
    {
      id: 1,
      sender: 'Sita Rama',
      subject: 'Doubt about Recursion',
      preview: 'I am unable to understand the base case in recursion...',
      time: '15m ago',
      read: false,
    },
    {
      id: 2,
      sender: 'Gowthami Admin',
      subject: 'Weekly Catalog Audit',
      preview: 'Please audit the Computer Science inventory this Friday.',
      time: '2h ago',
      read: false,
    },
    {
      id: 3,
      sender: 'Sri Gowthami System',
      subject: 'Database Backup Complete',
      preview: 'Automated backup successfully uploaded to secure cloud storage.',
      time: '1d ago',
      read: true,
    }
  ]);
  
  // State to trigger the "Add Book" modal inside BookCatalog
  const [addBookTrigger, setAddBookTrigger] = useState(0);

  // Stats loaded from dashboard (used globally for member/fine management shortcuts)
  const [globalStats, setGlobalStats] = useState(null);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    // Fetch global stats and student lists on mount or tab change
    getDashboardStats()
      .then(data => { if (data) setGlobalStats(data); })
      .catch(err => console.error('Stats load error:', err));

    getStudents()
      .then(data => setStudents(data))
      .catch(err => console.error('Students load error:', err));
  }, [activeTab]);


  // Dark mode toggler
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  const shouldReduceMotion = useReducedMotion();

  // Sidebar Links Configuration
  const sidebarLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'books', label: 'Books', icon: BookMarked },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'issue-book', label: 'Borrowing', icon: ArrowRightLeft },
    { id: 'return-book', label: 'Returns', icon: ArrowRightLeft },
    { id: 'reservations', label: 'Reservations', icon: CalendarCheck },
    { id: 'fines', label: 'Fines & Payments', icon: DollarSign },
    { id: 'counselor', label: 'Analytics', icon: Sparkles },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'users', label: 'Users', icon: UserSquare2 },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  // Active Tab view rendering
  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'books':
      case 'categories':
        return (
          <BookCatalog 
            defaultCategory={activeTab === 'categories' ? 'Computer Science' : ''} 
            addBookTrigger={addBookTrigger}
          />
        );
      case 'members':
        return (
          <MembersView 
            students={students} 
            onRefresh={() => {
              getStudents()
                .then(data => setStudents(data))
                .catch(err => console.error('Students load error:', err));
            }} 
          />
        );
      case 'issue-book':
        return <IssueReturnForm defaultTab="issue" />;
      case 'return-book':
        return <IssueReturnForm defaultTab="return" />;
      case 'reservations':
        return <ReservationsView />;
      case 'fines':
        return <FinesView overdueList={globalStats?.overdueList || []} onUpdate={() => setActiveTab('dashboard')} />;
      case 'reports':
        return <ReportsView categoryStats={globalStats?.categoryStats || []} metrics={globalStats?.metrics} />;
      case 'counselor':
        return <AIStudentCounselor />;
      case 'settings':
        return <SettingsView isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />;
      case 'users':
        return <UsersView students={students} />;
      case 'profile':
        return <ProfileView />;
      default:
        return <Dashboard />;
    }
  };

  const handleGlobalAddBook = () => {
    setActiveTab('books');
    setAddBookTrigger(prev => prev + 1);
  };

  const staticNotifications = [
    {
      title: 'Due books today',
      description: '14 books are scheduled to be returned by students today.',
      time: '10m ago',
      status: 'Action Required',
      badgeClass: 'badge-danger',
      icon: Clock,
      iconBg: 'bg-red-50 dark:bg-red-500/10',
      iconColor: 'text-red-500'
    },
    {
      title: 'New member registration',
      description: 'Srinivas Rao (Class 10) requested library membership access.',
      time: '45m ago',
      status: 'Pending',
      badgeClass: 'badge-warning',
      icon: UserPlus,
      iconBg: 'bg-amber-50 dark:bg-amber-500/10',
      iconColor: 'text-amber-500'
    },
    {
      title: 'Payment received',
      description: 'Overdue fee of ₹150.00 paid by Sita Rama for "Clean Code".',
      time: '2h ago',
      status: 'Completed',
      badgeClass: 'badge-success',
      icon: DollarSign,
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
      iconColor: 'text-emerald-500'
    },
    {
      title: 'Reservation approved',
      description: '"Introduction to Algorithms" copy allocated for Ramesh Kumar.',
      time: '3h ago',
      status: 'Approved',
      badgeClass: 'badge-info',
      icon: CheckCircle,
      iconBg: 'bg-blue-50 dark:bg-blue-550/10',
      iconColor: 'text-[#2563eb]'
    },
    {
      title: 'System updates',
      description: 'Database maintenance completed successfully at 04:00 AM.',
      time: '1d ago',
      status: 'Info',
      badgeClass: 'badge-info',
      icon: Activity,
      iconBg: 'bg-blue-50 dark:bg-blue-500/10',
      iconColor: 'text-blue-500'
    }
  ];

  // Dynamic notifications from active overdue books
  const overdueNotifications = (globalStats?.overdueList || []).map(item => ({
    title: 'Overdue Asset Warning',
    description: `${item.student_name} has not returned "${item.book_title}". Fine accrued: ₹${item.fine_amount}.`,
    time: 'Due ' + item.expected_return_date,
    status: 'Overdue',
    badgeClass: 'badge-danger',
    icon: AlertTriangle,
    iconBg: 'bg-red-50 dark:bg-red-500/10',
    iconColor: 'text-red-500'
  }));

  const allNotifications = [...overdueNotifications, ...staticNotifications];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#060b18] text-slate-900 dark:text-slate-100 flex transition-colors duration-300">
      
      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-[#071A3D] border-r border-[#E5E7EB] dark:border-[#102856] transition-all duration-300 flex flex-col ${
          isSidebarOpen ? 'w-[260px]' : 'w-[80px]'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-[#E5E7EB] dark:border-[#102856]">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="text-2xl flex-shrink-0 text-blue-600 font-bold">|||</span>
            {isSidebarOpen && (
              <div className="text-left">
                <span className="font-bold text-slate-900 dark:text-white tracking-tight text-sm block font-heading">Library Suite</span>
                <span className="text-[10px] text-slate-500 dark:text-[#2563eb] font-medium block uppercase tracking-wider">Management System</span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeTab === link.id || (link.id === 'books' && activeTab === 'categories');
            return (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 text-left relative ${
                  isActive 
                    ? 'bg-blue-50/70 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#102856]'
                }`}
                aria-label={link.label}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 dark:bg-blue-400 rounded-r-full" />
                )}
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                {isSidebarOpen && <span>{link.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* bottom Librarian Profile Card */}
        <div className="p-4 border-t border-[#E5E7EB] dark:border-[#102856] mt-auto">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-[#102856]/40 text-slate-800 dark:text-white transition-colors cursor-pointer text-left ${
              activeTab === 'profile' ? 'bg-blue-50/70 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold' : ''
            }`}
          >
            <div className="h-9 w-9 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center font-bold text-xs flex-shrink-0">
               LG
            </div>
            {isSidebarOpen && (
              <div className="text-left min-w-0 flex-1">
                <p className="text-xs font-bold truncate">Librarian Gowthami</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block leading-none mt-0.5">ADMIN</p>
              </div>
            )}
          </button>
        </div>

        {/* Sidebar Collapse Toggle Button */}
        <div className="p-4 border-t border-[#E5E7EB] dark:border-[#102856]">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-[#102856]/30 hover:bg-slate-100 dark:hover:bg-[#102856]/60 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white cursor-pointer transition-colors"
            aria-label="Collapse Menu"
          >
            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* Main Container Wrapper */}
      <div className={`flex-1 min-w-0 flex flex-col min-h-screen transition-all duration-300 ${
        isSidebarOpen ? 'pl-[260px]' : 'pl-[80px]'
      }`}>
        
        {/* 2. TOP NAVIGATION BAR */}
        <header className="sticky top-0 z-40 bg-white dark:bg-[#111a35] border-b border-[#E5E7EB] dark:border-slate-800 h-20 flex items-center justify-between px-6 lg:px-8 shadow-sm transition-colors duration-300">
          {/* Global Search bar */}
          <div className="relative w-64 md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-455 w-4 h-4" />
            <input
              type="text"
              placeholder="Search books, members, categories..."
              className="w-full pl-12 pr-4 h-[46px] rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-[#0b132b] text-xs focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] transition-all"
            />
          </div>

          {/* Action icons, dark mode toggler, profile */}
          <div className="flex items-center gap-4">
            {/* Quickstart guide toggle */}
            <button 
              onClick={() => setIsGuideOpen(true)}
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              title="Open Tour Guide"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            {/* Dark Mode Toggle */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              title="Toggle Dark/Light Mode"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Mail Icon */}
            <button 
              onClick={() => setIsInboxOpen(true)}
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors relative"
              title="Open Inbox"
            >
              <Mail className="w-5 h-5" />
              {inboxMessages.some(m => !m.read) && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-white dark:border-[#111a35] animate-pulse" />
              )}
            </button>

            {/* Notifications */}
            <button 
              onClick={() => setIsNotificationsOpen(true)}
              className="p-2 text-slate-400 hover:text-[#2563eb] rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors relative"
              title="Open Notifications"
            >
              <Bell className="w-5 h-5" />
              {globalStats?.overdueList?.length > 0 && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white dark:border-[#111a35] animate-pulse" />
              )}
            </button>

            {/* Divider */}
            <span className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700" />

            {/* User Profile */}
            <button 
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 p-1.5 rounded-xl transition-all cursor-pointer text-left"
            >
              <div className="h-9 w-9 rounded-full bg-[#2563eb]/10 text-[#2563eb] dark:text-[#a78bfa] border border-[#2563eb]/20 flex items-center justify-center font-bold text-sm">
                LG
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight">Librarian Gowthami</p>
                <p className="text-[10px] text-slate-400 uppercase font-semibold block leading-none mt-0.5">Admin</p>
              </div>
            </button>
          </div>
        </header>

        {/* 3. MAIN DASHBOARD CONTENT */}
        <main className="flex-1 px-6 lg:px-8 py-8 space-y-6 min-w-0">
          {/* Dashboard Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0 font-heading">
                {sidebarLinks.find(l => l.id === activeTab)?.label || 'Dashboard'}
              </h1>
            </div>

            {/* Action button */}
            {activeTab === 'books' && (
              <button
                onClick={handleGlobalAddBook}
                className="flex items-center justify-center gap-2 px-6 h-11 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl font-semibold transition-all duration-300 cursor-pointer shadow-lg shadow-[#2563eb]/20 text-xs active:scale-95 hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" />
                + Add New Book
              </button>
            )}
            {activeTab === 'members' && (
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="flex items-center justify-center gap-2 px-6 h-11 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl font-semibold transition-all duration-300 cursor-pointer shadow-lg shadow-[#2563eb]/20 text-xs active:scale-95 hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" />
                + Add Member
              </button>
            )}
          </div>

          {/* Active View Container */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={fadeVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-100 dark:border-slate-800 py-6 text-center text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-[#111a35]/50">
          <p>© 2026 Sri Gowthami Educational Institutions. All rights reserved.</p>
        </footer>
      </div>

      {/* User Guide Interactive Overlay */}
      <AnimatePresence>
        {isGuideOpen && (
          <UserGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
        )}
      </AnimatePresence>

       {/* Right Side Overlay Drawer for Inbox */}
      <AnimatePresence>
        {isInboxOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInboxOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 cursor-pointer"
            />

            {/* Right Sliding Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-[360px] max-w-[calc(100vw-40px)] bg-white dark:bg-[#111a35] shadow-2xl z-50 border-l border-[#E5E7EB] dark:border-slate-800 flex flex-col"
            >
              {/* Header */}
              <div className="h-20 px-6 border-b border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#2563eb]" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-white m-0 font-heading">
                    Inbox Messages
                  </h3>
                </div>
                <button
                  onClick={() => setIsInboxOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-850 dark:hover:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  aria-label="Close inbox"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-left">
                {inboxMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 gap-2">
                    <Mail className="w-8 h-8 text-slate-350 dark:text-slate-655" />
                    <p className="text-sm font-semibold">Inbox is empty</p>
                    <p className="text-xs text-slate-400">All student queries and messages have been handled.</p>
                  </div>
                ) : (
                  inboxMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col gap-1 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border transition-all hover:shadow-sm ${
                        msg.read 
                          ? 'border-slate-100 dark:border-slate-800/80' 
                          : 'border-blue-100 dark:border-blue-900/40 hover:border-blue-200 bg-blue-50/10 dark:bg-blue-950/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                          {msg.sender}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{msg.time}</span>
                      </div>
                      <p className="text-[11px] font-semibold text-[#2563eb] truncate">{msg.subject}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                        {msg.preview}
                      </p>
                      <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-100/50 dark:border-slate-800/50">
                        {!msg.read && (
                          <button
                            onClick={() => {
                              setInboxMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
                            }}
                            className="text-[10px] font-bold text-[#2563eb] hover:underline cursor-pointer"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setInboxMessages(prev => prev.filter(m => m.id !== msg.id));
                          }}
                          className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Dismiss all */}
              {inboxMessages.length > 0 && (
                <div className="p-4 border-t border-[#E5E7EB] dark:border-slate-800 bg-slate-50/50 dark:bg-[#111a35]/50 flex items-center justify-center">
                  <button
                    onClick={() => {
                      setInboxMessages(prev => prev.map(m => ({ ...m, read: true })));
                    }}
                    className="text-xs font-bold text-[#2563eb] hover:text-[#1d4ed8] hover:underline cursor-pointer"
                  >
                    Mark all as read
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Right Side Overlay Drawer for Notifications */}
      <AnimatePresence>
        {isNotificationsOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNotificationsOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 cursor-pointer"
            />

            {/* Right Sliding Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-[360px] max-w-[calc(100vw-40px)] bg-white dark:bg-[#111a35] shadow-2xl z-50 border-l border-[#E5E7EB] dark:border-slate-800 flex flex-col"
            >
              {/* Header */}
              <div className="h-20 px-6 border-b border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[#2563eb]" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-white m-0 font-heading">
                    Notification Center
                  </h3>
                </div>
                <button
                  onClick={() => setIsNotificationsOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-850 dark:hover:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  aria-label="Close notifications"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-left">
                {allNotifications.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 gap-2">
                    <Bell className="w-8 h-8 text-slate-350 dark:text-slate-650" />
                    <p className="text-sm font-semibold">All caught up!</p>
                    <p className="text-xs text-slate-400">No new notifications at this time.</p>
                  </div>
                ) : (
                  allNotifications.map((notif, idx) => {
                    const Icon = notif.icon;
                    return (
                      <div 
                        key={idx} 
                        className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 transition-all hover:border-blue-200 dark:hover:border-blue-900/50 hover:shadow-sm"
                      >
                        <div className={`p-2.5 rounded-xl ${notif.iconBg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-4 h-4 ${notif.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                              {notif.title}
                            </span>
                            <span className="text-[9px] font-semibold text-slate-400 flex-shrink-0">
                              {notif.time}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {notif.description}
                          </p>
                          <span className={`badge ${notif.badgeClass} mt-2 text-[8px]`}>
                            {notif.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer / Dismiss */}
              <div className="p-4 border-t border-[#E5E7EB] dark:border-slate-800 bg-slate-50/50 dark:bg-[#111a35]/50 flex items-center justify-center">
                <button
                  onClick={() => setIsNotificationsOpen(false)}
                  className="text-xs font-bold text-[#2563eb] hover:text-[#1d4ed8] hover:underline cursor-pointer"
                >
                  Dismiss all notifications
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ADD MEMBER MODAL */}
      <AnimatePresence>
        {showAddMemberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddMemberModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-[#1e293b] w-full max-w-md rounded-2xl p-6 relative z-50 border border-slate-100 dark:border-slate-800 shadow-xl text-left"
            >
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-800 dark:text-white m-0 font-heading">Register New Member</h3>
                <button onClick={() => setShowAddMemberModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddMemberSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-450 dark:text-slate-400 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={memberFormData.name}
                      onChange={(e) => setMemberFormData({ ...memberFormData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:border-[#2563eb]"
                      placeholder="e.g. Ramesh Kumar"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-450 dark:text-slate-400 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      required
                      value={memberFormData.contact}
                      onChange={(e) => setMemberFormData({ ...memberFormData, contact: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:border-[#2563eb]"
                      placeholder="e.g. 9988776655"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-455 dark:text-slate-400 mb-1">Admission Number</label>
                    <input
                      type="text"
                      required
                      value={memberFormData.admission_number}
                      onChange={(e) => setMemberFormData({ ...memberFormData, admission_number: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-mono focus:outline-none focus:border-[#2563eb]"
                      placeholder="e.g. SG-2024-004"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-455 dark:text-slate-400 mb-1">Class / Grade</label>
                    <input
                      type="text"
                      required
                      value={memberFormData.class_grade}
                      onChange={(e) => setMemberFormData({ ...memberFormData, class_grade: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:border-[#2563eb]"
                      placeholder="e.g. Class 10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-455 dark:text-slate-400 mb-1">Parent/Guardian Name</label>
                    <input
                      type="text"
                      required
                      value={memberFormData.parent_name}
                      onChange={(e) => setMemberFormData({ ...memberFormData, parent_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:border-[#2563eb]"
                      placeholder="e.g. Koteswara Rao"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-455 dark:text-slate-400 mb-1">Parent Phone</label>
                    <input
                      type="text"
                      required
                      value={memberFormData.parent_contact}
                      onChange={(e) => setMemberFormData({ ...memberFormData, parent_contact: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:border-[#2563eb]"
                      placeholder="e.g. 9000012345"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-450 dark:text-slate-400 mb-1">Campus Location</label>
                  <select
                    value={memberFormData.campus_id}
                    onChange={(e) => setMemberFormData({ ...memberFormData, campus_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs cursor-pointer focus:outline-none focus:border-[#2563eb]"
                  >
                    <option value="1">Main Campus, Rajahmundry</option>
                    <option value="2">City Campus, Kakinada</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full h-11 py-2 mt-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl font-bold cursor-pointer transition shadow-lg shadow-[#2563eb]/20 text-xs flex items-center justify-center active:scale-95"
                >
                  Save Member Profile
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// SUB-VIEWS FOR OTHER SIDEBAR DIRECTIVES
// ==========================================

// Members View Component
function MembersView({ students, onRefresh }) {
  const handleDelete = async (student) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete member "${student.name}"?`);
    if (!confirmDelete) return;

    try {
      await deleteStudent(student.student_id);
      alert(`Member "${student.name}" successfully deleted!`);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to delete member.');
    }
  };

  return (
    <div className="card-panel p-6 text-left">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white m-0">Library Member Directory</h2>
          <p className="text-xs text-slate-400 mt-0.5">List of students and members currently registered in Sri Gowthami LMS.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-6 py-3 font-semibold">Member Name</th>
              <th className="px-6 py-3 font-semibold">Admission Number</th>
              <th className="px-6 py-3 font-semibold">Class / Grade</th>
              <th className="px-6 py-3 font-semibold">Contact Phone</th>
              <th className="px-6 py-3 font-semibold">Parent Name</th>
              <th className="px-6 py-3 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {students.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                  No library members registered.
                </td>
              </tr>
            ) : (
              students.map((std) => (
                <tr key={std.user_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-white flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 text-xs">
                      {std.name[0]}
                    </div>
                    {std.name}
                  </td>
                  <td className="px-6 py-4 font-mono font-semibold text-slate-600 dark:text-slate-300">{std.admission_number}</td>
                  <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">{std.class_grade}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{std.contact}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{std.parent_name || 'N/A'}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleDelete(std)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Delete Member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Reservations View Component
function ReservationsView() {
  const dummyReservations = [
    { id: 1, title: "Clean Code", member: "Ramesh Kumar", date: "2026-06-12", status: "Active" },
    { id: 2, title: "Introduction to Algorithms", member: "Anjali Devi", date: "2026-06-13", status: "Pending Pickup" }
  ];

  return (
    <div className="card-panel p-6 text-left">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white m-0">Library Book Reservations</h2>
          <p className="text-xs text-slate-400 mt-0.5">Track reserved copies and pickup status logs.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-6 py-3 font-semibold">Book Title</th>
              <th className="px-6 py-3 font-semibold">Reserving Member</th>
              <th className="px-6 py-3 font-semibold">Reservation Date</th>
              <th className="px-6 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {dummyReservations.map((res) => (
              <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{res.title}</td>
                <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">{res.member}</td>
                <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">{res.date}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    res.status === 'Active' 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                  }`}>
                    {res.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Fines View Component
function FinesView({ overdueList, onUpdate }) {
  const [loadingId, setLoadingId] = useState(null);

  const handleAlert = async (item) => {
    try {
      setLoadingId(item.transaction_id);
      await markReminderSent(
        item.transaction_id,
        item.ledger_id,
        item.student_name,
        item.student_contact,
        item.title || item.book_title,
        item.fine_amount
      );
      alert(`Reminder logged for ${item.student_name}!`);
      onUpdate();
    } catch (err) {
      console.error(err);
      alert('Failed to send reminder. Check console for details.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="card-panel p-6 text-left">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white m-0">Library Overdue Fee Management</h2>
        <p className="text-xs text-slate-400 mt-0.5">Collect pending overdue fines and dispatch automated alert notifications.</p>
      </div>

      <div className="overflow-x-auto mt-6">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-6 py-3 font-semibold">Student Name</th>
              <th className="px-6 py-3 font-semibold">Overdue Book</th>
              <th className="px-6 py-3 font-semibold">Due Date</th>
              <th className="px-6 py-3 font-semibold">Accumulated Fine</th>
              <th className="px-6 py-3 font-semibold text-center">Alert Reminders</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {overdueList.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                  No active overdue fines found.
                </td>
              </tr>
            ) : (
              overdueList.map((item) => (
                <tr key={item.transaction_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{item.student_name}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{item.book_title}</td>
                  <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">{item.expected_return_date}</td>
                  <td className="px-6 py-4 text-red-600 font-bold">₹{item.fine_amount}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleAlert(item)}
                      disabled={loadingId === item.transaction_id || item.automated_reminder_sent === 1}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all duration-200 ${
                        item.automated_reminder_sent === 1 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30' 
                          : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-md'
                      }`}
                    >
                      {item.automated_reminder_sent === 1 ? 'Sent Reminded' : loadingId === item.transaction_id ? 'Sending...' : 'Send WhatsApp Alert'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Reports View Component
function ReportsView({ categoryStats, metrics }) {
  return (
    <div className="grid grid-cols-12 gap-6 text-left">
      <div className="col-span-12 lg:col-span-4 card-panel p-6 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white m-0">Library Health Index</h3>
          <p className="text-xs text-slate-400 mt-1">Institutional checkout-to-return index aggregates.</p>
        </div>
        <div className="space-y-4 my-6">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Inventory Utilization Rate</span>
            <span className="font-bold text-slate-800 dark:text-white">
              {metrics ? Math.round((metrics.activeIssues / metrics.totalBooks) * 100) : 0}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-[#2563eb] h-full" 
              style={{ width: `${metrics ? Math.round((metrics.activeIssues / metrics.totalBooks) * 100) : 0}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs pt-2">
            <span className="text-slate-500">Overdue Asset Risk</span>
            <span className="font-bold text-red-500">
              {metrics ? Math.round((metrics.totalOverdue / (metrics.activeIssues || 1)) * 100) : 0}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-red-500 h-full" 
              style={{ width: `${metrics ? Math.round((metrics.totalOverdue / (metrics.activeIssues || 1)) * 100) : 0}%` }}
            />
          </div>
        </div>
        <div className="text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl">
          Aggregated across 2 Sri Gowthami institutional campuses. Data refreshes dynamically.
        </div>
      </div>

      <div className="col-span-12 lg:col-span-8 card-panel p-6 flex flex-col min-h-[300px]">
        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-6">Catalog Genre Split</h3>
        <div className="flex-1 flex flex-col justify-center">
          <div className="space-y-4">
            {categoryStats.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700 dark:text-slate-300">{item.category}</span>
                  <span className="text-slate-500">{item.total_copies} copies ({item.count} distinct books)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-850 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#2563eb] h-full"
                    style={{ width: `${Math.min(100, (item.total_copies / 20) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Settings View Component
function SettingsView({ isDarkMode, setIsDarkMode }) {
  return (
    <div className="card-panel p-6 text-left max-w-xl">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">LMS System Configurations</h2>
      <p className="text-xs text-slate-400 mb-6">Configure system variables, database connection routing, and local theme styling preferences.</p>

      <div className="space-y-6">
        {/* Toggle Theme */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white m-0">Theme Customization</h4>
            <p className="text-xs text-slate-400 mt-0.5">Toggle between modern Light background or slate Dark Mode.</p>
          </div>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold cursor-pointer transition"
          >
            {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </button>
        </div>

        {/* Database Mode */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white m-0">Backend Database Driver</h4>
          <p className="text-xs text-slate-400">
            Running in local Flask mode. API requests routed via Vite proxy to localhost:5000.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold uppercase">
              Flask + SQLite (Local Dev)
            </span>
          </div>
        </div>

        {/* System Version */}
        <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>Software Suite Version</span>
          <span className="font-mono">v2.0.4-SaaS-Redesign</span>
        </div>
      </div>
    </div>
  );
}

// Users View Component
function UsersView({ students }) {
  const allUsers = [
    { user_id: 'admin-1', name: 'Librarian Gowthami', role: 'Librarian/Admin', contact: '9876543210', status: 'Active' },
    ...students.map(s => ({ user_id: s.user_id, name: s.name, role: 'Student', contact: s.contact, status: 'Active' }))
  ];

  return (
    <div className="card-panel p-6 text-left">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white m-0 font-heading">Library System Users</h2>
          <p className="text-xs text-slate-400 mt-0.5">Management directory of all system accounts (Administrators, Librarians, and Students).</p>
        </div>
      </div>

      <div className="table-container">
        <table className="premium-table">
          <thead>
            <tr>
              <th>User Name</th>
              <th>System Role</th>
              <th>Contact Number</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.map((user) => (
              <tr key={user.user_id}>
                <td className="font-bold text-slate-800 dark:text-white flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#2563eb]/15 text-[#2563eb] flex items-center justify-center font-bold text-xs">
                    {user.name[0]}
                  </div>
                  {user.name}
                </td>
                <td className="font-semibold text-slate-600 dark:text-slate-350">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${user.role.includes('Librarian') ? 'bg-[#2563eb]/10 text-[#2563eb]' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="font-mono text-slate-600 dark:text-slate-300">{user.contact}</td>
                <td>
                  <span className="badge badge-success">Active</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

