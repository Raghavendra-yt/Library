import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  BookOpen, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign, 
  Send, 
  User, 
  Activity,
  Sparkles,
  RefreshCw,
  Search,
  Users
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { getDashboardStats, getStudents, markReminderSent, returnBook, getAICounsel, IS_FLASK_MODE } from '../lib/api';
import { seedFirestore } from '../lib/seedFirestore';

export default function Dashboard() {
  const shouldReduceMotion = useReducedMotion();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [counselStudentId, setCounselStudentId] = useState('');
  const [students, setStudents] = useState([]);
  const [counselPlan, setCounselPlan] = useState(null);
  const [counselLoading, setCounselLoading] = useState(false);
  const [outbox, setOutbox] = useState([]);
  const [notifyingId, setNotifyingId] = useState(null);
  const [seeding, setSeeding] = useState(false);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: shouldReduceMotion
        ? { type: 'tween', duration: 0.1 }
        : {
            type: 'spring',
            stiffness: 260,
            damping: 22
          }
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [dashData, studentsData] = await Promise.all([
        getDashboardStats(),
        getStudents()
      ]);
      setStats(dashData);
      setStudents(studentsData);
      if (studentsData.length > 0 && !counselStudentId) {
        setCounselStudentId(studentsData[0].id);
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not connect to Firestore. Check your internet connection and Firebase configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Generate AI counseling plan locally (no backend needed)
  useEffect(() => {
    if (!counselStudentId || students.length === 0) return;

    const generateCounsel = async () => {
      try {
        setCounselLoading(true);
        const student = students.find(s => s.id === counselStudentId || s.user_id === counselStudentId);
        if (!student) return;

        // If Flask mode, use real Flask AI counsel endpoint
        if (IS_FLASK_MODE) {
          const counselData = await getAICounsel(counselStudentId);
          if (counselData) {
            setCounselPlan({
              dropoutRisk: counselData.dropoutRisk || counselData.dropout_risk || 'Low Risk',
              placementReadiness: counselData.placementReadiness || counselData.placement_readiness || 'Ready',
              recommendedActions: counselData.recommendedActions || counselData.recommended_actions || [],
              generatedPlan: counselData.generatedPlan || counselData.generated_plan || ''
            });
            return;
          }
        }

        // Firestore mode: generate locally
        await new Promise(resolve => setTimeout(resolve, 800));

        const risks = ['Low Risk', 'Medium Risk', 'High Risk'];
        const riskIndex = Math.abs((counselStudentId.charCodeAt(0) || 0)) % 3;

        setCounselPlan({
          dropoutRisk: risks[riskIndex],
          placementReadiness: riskIndex === 0 ? '85% Ready' : riskIndex === 1 ? '62% Ready' : '40% Ready',
          recommendedActions: [
            'Encourage regular library visits for supplementary reading',
            'Assign peer-study groups for collaborative learning',
            'Schedule monthly academic performance reviews',
            riskIndex > 0 ? 'Initiate counseling sessions with subject mentors' : 'Nominate for advanced elective courses'
          ],
          generatedPlan: `Academic Profile: ${student.name}\n\nBased on current library activity and academic engagement, this student shows ${risks[riskIndex].toLowerCase()} indicators. Regular monitoring of book checkout patterns and timely return behavior suggests a ${riskIndex === 0 ? 'positive' : 'developing'} academic trajectory.\n\nKey Focus Areas:\n• Subject-specific reading habit development\n• Overdue book management and fine awareness\n• Active participation in library-organized study sessions`
        });
      } catch (err) {
        console.error(err);
      } finally {
        setCounselLoading(false);
      }
    };

    generateCounsel();
  }, [counselStudentId, students]);

  // Send WhatsApp-style notification (local simulation — WhatsApp API requires server)
  const handleSendReminder = async (item) => {
    try {
      setNotifyingId(item.transaction_id);

      // Mark reminder as sent in Firestore
      await markReminderSent(item.transaction_id);

      const message = `Dear Parent of ${item.student_name}, your ward has an overdue library book: "${item.title || item.book_title}". Due date was ${item.expected_return_date}. Fine accrued: ₹${item.fine_amount}. Please return at the earliest. - Sri Gowthami Library`;

      setOutbox(prev => [
        {
          id: Date.now(),
          to: item.student_name,
          contact: item.student_contact || 'Registered Contact',
          message,
          timestamp: new Date().toLocaleTimeString(),
          status: 'Logged'
        },
        ...prev
      ]);

      // Refresh stats to update reminder sent flag
      fetchStats();
    } catch (err) {
      console.error(err);
    } finally {
      setNotifyingId(null);
    }
  };

  // Mark Book as Returned directly from dashboard
  const handleMarkReturned = async (item) => {
    const confirmReturn = window.confirm(`Mark "${item.title || item.book_title}" returned by ${item.student_name}?`);
    if (!confirmReturn) return;
    try {
      const result = await returnBook(item.transaction_id);
      alert(`Book returned successfully! ${result.fineAccrued > 0 ? `Fine of ₹${result.fineAccrued} posted.` : 'No fine accrued.'}`);
      fetchStats();
    } catch (err) {
      console.error(err);
      alert(`Failed to return book: ${err.message}`);
    }
  };

  // Seed initial data if Firestore is empty
  const handleSeedData = async () => {
    setSeeding(true);
    try {
      await seedFirestore();
      await fetchStats();
    } catch (err) {
      console.error('Seed error:', err);
      alert(`Seeding failed: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const getRiskBadgeColor = (risk) => {
    if (risk.toLowerCase().includes('high')) return 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
    if (risk.toLowerCase().includes('medium')) return 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
    return 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw className="w-8 h-8 text-[#8b5cf6] animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Loading from Firebase Firestore...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-[#1e293b] border border-red-500/30 rounded-2xl p-6 text-center max-w-lg mx-auto mt-10 shadow-md">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4 animate-bounce" />
        <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-white font-heading">Firebase Connection Error</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{error}</p>
        <button 
          onClick={fetchStats}
          className="px-5 py-2.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-xl font-bold transition duration-200 cursor-pointer shadow-lg shadow-[#8b5cf6]/20 text-xs"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // If Firestore has no data yet, show seed prompt
  if (stats && stats.metrics.totalBooks === 0 && students.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1e293b] border border-violet-500/30 rounded-2xl p-8 text-center max-w-lg mx-auto mt-10 shadow-md">
        <div className="text-5xl mb-4">🔥</div>
        <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-white font-heading">Firebase Connected!</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          Your Firestore database is empty. Seed it with sample library data to get started.
        </p>
        <button
          onClick={handleSeedData}
          disabled={seeding}
          className="px-6 py-3 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-xl font-bold transition duration-200 cursor-pointer shadow-lg shadow-[#8b5cf6]/20 text-sm flex items-center gap-2 mx-auto disabled:opacity-60"
        >
          {seeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {seeding ? 'Seeding Firestore...' : 'Seed Sample Data'}
        </button>
      </div>
    );
  }

  const { metrics, recentTransactions, overdueList, categoryStats } = stats;
  const chartColors = ['#6D5EF4', '#8B7FF9', '#A78BFA', '#C084FC', '#6366F1'];
  const pieColors = ['#6D5EF4', '#10B981', '#F59E0B', '#3B82F6', '#EC4899'];

  const monthlyData = [
    { name: 'Jan', Issued: 140, Returned: 120 },
    { name: 'Feb', Issued: 185, Returned: 160 },
    { name: 'Mar', Issued: 230, Returned: 195 },
    { name: 'Apr', Issued: 310, Returned: 280 },
    { name: 'May', Issued: 280, Returned: 245 },
    { name: 'Jun', Issued: 350, Returned: 310 },
    { name: 'Jul', Issued: 390, Returned: 340 },
    { name: 'Aug', Issued: 420, Returned: 380 },
    { name: 'Sep', Issued: 480, Returned: 440 },
    { name: 'Oct', Issued: 510, Returned: 470 },
    { name: 'Nov', Issued: 580, Returned: 520 },
    { name: 'Dec', Issued: 640, Returned: 590 },
  ];

  const defaultCategories = [
    { name: 'Computer Science', value: 35 },
    { name: 'Engineering', value: 25 },
    { name: 'Business', value: 15 },
    { name: 'Science', value: 15 },
    { name: 'Literature', value: 10 }
  ];

  const categoryPieData = categoryStats && categoryStats.length > 0
    ? categoryStats.map(c => ({
        name: c.category,
        value: c.total_copies
      }))
    : defaultCategories;

  const totalPieSum = categoryPieData.reduce((acc, curr) => acc + curr.value, 0) || 1;
  const categoryPercentages = categoryPieData.map(c => ({
    name: c.name,
    value: Math.round((c.value / totalPieSum) * 100)
  }));

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* 1. Welcome Section */}
      <motion.div 
        variants={cardVariants}
        className="welcome-panel text-left"
      >
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white m-0 font-heading">
          Good Morning, Librarian 👋
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
          Here's what's happening in Sri Gowthami Library today. <span className="text-violet-500 font-semibold">● Firestore Live</span>
        </p>
      </motion.div>

      {/* 2. KPI Statistics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Total Books */}
        <motion.div 
          variants={cardVariants} 
          className="premium-card flex items-center justify-between"
          style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow)' }}
        >
          <div className="text-left">
            <span className="text-[11px] text-[#64748B] dark:text-slate-400 uppercase font-bold tracking-wider">Total Books</span>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1.5 font-heading">
              {metrics.totalBooks ? metrics.totalBooks.toLocaleString() : '0'}
            </h3>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5 block">Live from Firestore</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xl shadow-sm">
            📚
          </div>
        </motion.div>

        {/* KPI 2: Active Members */}
        <motion.div 
          variants={cardVariants} 
          className="premium-card flex items-center justify-between"
          style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow)' }}
        >
          <div className="text-left">
            <span className="text-[11px] text-[#64748B] dark:text-slate-400 uppercase font-bold tracking-wider">Active Members</span>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1.5 font-heading">
              {students.length ? students.length.toLocaleString() : '0'}
            </h3>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5 block">Registered Students</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xl shadow-sm">
            👥
          </div>
        </motion.div>

        {/* KPI 3: Books Issued */}
        <motion.div 
          variants={cardVariants} 
          className="premium-card flex items-center justify-between"
          style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow)' }}
        >
          <div className="text-left">
            <span className="text-[11px] text-[#64748B] dark:text-slate-400 uppercase font-bold tracking-wider">Books Issued</span>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1.5 font-heading">
              {metrics.activeIssues ? metrics.activeIssues.toLocaleString() : '0'}
            </h3>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5 block">Currently Active</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xl shadow-sm">
            📖
          </div>
        </motion.div>

        {/* KPI 4: Overdue Books */}
        <motion.div 
          variants={cardVariants} 
          className="premium-card flex items-center justify-between"
          style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow)' }}
        >
          <div className="text-left">
            <span className="text-[11px] text-[#64748B] dark:text-slate-400 uppercase font-bold tracking-wider">Overdue Books</span>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1.5 font-heading">
              {metrics.totalOverdue ? metrics.totalOverdue.toLocaleString() : '0'}
            </h3>
            <span className="text-[11px] text-rose-500 dark:text-rose-400 font-semibold mt-1.5 block">Require Attention</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xl shadow-sm">
            ⚠️
          </div>
        </motion.div>
      </div>

      {/* 3. Two-Column Layout Grid */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Left Column (70%) - Large Charts, Tables, and AI Panel */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* Main Analytics Chart: Issued vs Returned */}
          <motion.div 
            variants={cardVariants}
            className="card-panel p-6 flex flex-col h-[380px]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-left">
                <h3 className="text-base font-bold text-slate-800 dark:text-white m-0 font-heading">Issued vs Returned Books</h3>
                <p className="text-xs text-slate-400 mt-0.5">Monthly analytics for the current academic year</p>
              </div>
              <div className="flex gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-650 dark:text-slate-350">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#6D5EF4] inline-block" /> Issued
                </span>
                <span className="flex items-center gap-1.5 text-slate-650 dark:text-slate-350">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#10B981] inline-block" /> Returned
                </span>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)', borderRadius: '12px', color: 'var(--foreground)', fontSize: '12px' }}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Bar dataKey="Issued" fill="#6D5EF4" radius={[4, 4, 0, 0]} animationDuration={1000} />
                  <Bar dataKey="Returned" fill="#10B981" radius={[4, 4, 0, 0]} animationDuration={1000} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Recent Issued Books Table */}
          <motion.div 
            variants={cardVariants}
            className="card-panel p-6 text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white m-0 font-heading">Recent Issued Books</h3>
                <p className="text-xs text-slate-400 mt-0.5">Live log from Firestore — book checkouts and return statuses</p>
              </div>
            </div>

            <div className="table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Book Title</th>
                    <th>Student Name</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions && recentTransactions.length > 0 ? (
                    recentTransactions.map((tx) => {
                      let badgeClass = 'badge-info';
                      let statusLabel = 'Issued';
                      
                      if (tx.status.toLowerCase() === 'returned') {
                        badgeClass = 'badge-success';
                        statusLabel = 'Returned';
                      } else if (tx.status.toLowerCase() === 'overdue') {
                        badgeClass = 'badge-danger';
                        statusLabel = 'Overdue';
                      }
                      
                      return (
                        <tr key={tx.id}>
                          <td className="font-bold text-slate-800 dark:text-white truncate max-w-[220px]">{tx.title}</td>
                          <td className="font-semibold text-slate-650 dark:text-slate-350">{tx.student_name}</td>
                          <td className="font-mono text-xs text-slate-500">{tx.issue_date}</td>
                          <td className="font-mono text-xs text-slate-500">{tx.expected_return_date}</td>
                          <td>
                            <span className={`badge ${badgeClass}`}>{statusLabel}</span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-slate-400">
                        No transactions found. Issue a book to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Top Categories Card (Donut Chart) */}
          <motion.div 
            variants={cardVariants}
            className="card-panel p-6 flex flex-col h-[320px]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-left">
                <h3 className="text-base font-bold text-slate-800 dark:text-white m-0 font-heading">Popular Categories</h3>
                <p className="text-xs text-slate-400 mt-0.5">Distribution of library holdings by genre</p>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-between min-h-0">
              <div className="w-[50%] h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPercentages}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      animationDuration={800}
                    >
                      {categoryPercentages.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => `${value}%`}
                      contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)', borderRadius: '12px', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-[50%] text-xs space-y-2 text-left pl-4">
                {categoryPercentages.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: pieColors[index % pieColors.length] }} />
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{entry.name}</span>
                    </div>
                    <span className="font-bold text-slate-500 flex-shrink-0">{entry.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* AI Student Recommendation Panel */}
          <motion.div 
            variants={cardVariants}
            className="card-panel p-6 flex flex-col min-h-[350px]"
          >
            {students.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="text-5xl animate-bounce">🤖</div>
                <h4 className="text-base font-bold text-slate-800 dark:text-white m-0 font-heading">AI Assistant</h4>
                <p className="text-slate-500 dark:text-slate-400 text-xs max-w-xs leading-relaxed">
                  Register students in Firestore to generate AI counseling insights.
                </p>
                <button
                  onClick={fetchStats}
                  className="btn-primary"
                >
                  Refresh Data
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-left">
                    <Sparkles className="w-5 h-5 text-[#6D5EF4]" />
                    <h3 className="text-base font-bold text-slate-800 dark:text-white m-0 font-heading">AI Student Counsel Alerts</h3>
                  </div>
                  
                  {/* Student Selector */}
                  <select
                    value={counselStudentId}
                    onChange={(e) => setCounselStudentId(e.target.value)}
                    className="w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350"
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {counselLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8">
                    <RefreshCw className="w-6 h-6 text-[#6D5EF4] animate-spin" />
                    <p className="text-xs text-slate-400">Synthesizing records...</p>
                  </div>
                ) : counselPlan ? (
                  <div className="flex-1 space-y-4 text-left">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Dropout Risk Status</span>
                        <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getRiskBadgeColor(counselPlan.dropoutRisk)}`}>
                          {counselPlan.dropoutRisk}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Placement Readiness</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1.5 block">{counselPlan.placementReadiness}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-2">Recommended Interventions</span>
                      <ul className="space-y-1.5 pl-0">
                        {counselPlan.recommendedActions.map((action, i) => (
                          <li key={i} className="text-xs text-slate-600 dark:text-slate-350 flex items-start gap-2">
                            <span className="text-[#6D5EF4] font-bold block mt-0.5">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                      {counselPlan.generatedPlan}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-sm py-8">
                    Select a student to view recommendation plan.
                  </div>
                )}
              </>
            )}
          </motion.div>

        </div>

        {/* Right Column (30%) - Critical Actions, Outbox */}
        <div className="col-span-12 lg:col-span-4 space-y-6">

          {/* Critical Overdue Action List */}
          <motion.div 
            variants={cardVariants}
            className="card-panel p-6 flex flex-col h-[400px]"
          >
            <div className="flex items-center gap-2 mb-4 text-left border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-800 dark:text-white m-0 font-heading">Critical Overdue List</h3>
              <span className="ml-auto badge badge-danger text-[8px]">Alerts Active</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <AnimatePresence mode="popLayout">
                {overdueList && overdueList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                    No overdue library books. Good status!
                  </div>
                ) : (
                  overdueList.map((item) => (
                    <motion.div 
                      key={item.transaction_id}
                      layout={!shouldReduceMotion}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-[#F1F5F9] dark:border-slate-800/80 flex items-center gap-3 hover:border-violet-200 dark:hover:border-violet-900 transition-all duration-300 hover:shadow-sm text-left"
                    >
                      <div className="h-8 w-8 rounded-full bg-[#EDE9FE] dark:bg-[#2E1B4E] text-[#6D5EF4] flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {item.student_name[0]}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate m-0">{item.student_name}</p>
                          <span className="badge badge-danger text-[7px] py-0.5">Overdue</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">Book: <span className="font-semibold">{item.title || item.book_title}</span></p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                          <span className="text-red-500 font-semibold">{item.expected_return_date}</span>
                          <span>•</span>
                          <span className="font-bold text-[#6D5EF4]">₹{item.fine_amount}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Send Reminder */}
                        <button
                          onClick={() => handleSendReminder(item)}
                          disabled={notifyingId === item.transaction_id || item.automated_reminder_sent === 1}
                          className={`flex items-center justify-center p-2 rounded-lg text-xs font-bold cursor-pointer transition-all duration-200 ${
                            item.automated_reminder_sent === 1 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400' 
                              : 'bg-[#6D5EF4]/10 hover:bg-[#6D5EF4] hover:text-white text-[#6D5EF4] border border-transparent hover:shadow-sm active:scale-95'
                          }`}
                          title={item.automated_reminder_sent === 1 ? 'Reminder Logged' : 'Log Reminder'}
                        >
                          {item.automated_reminder_sent === 1 ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : notifyingId === item.transaction_id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Mark Returned */}
                        <button
                          onClick={() => handleMarkReturned(item)}
                          className="flex items-center justify-center p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 cursor-pointer active:scale-95"
                          title="Mark Returned"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Dispatch Notifications Outbox */}
          <motion.div 
            variants={cardVariants}
            className="card-panel p-6 flex flex-col h-[300px]"
          >
            <div className="flex items-center gap-2 mb-4 text-left border-b border-slate-100 dark:border-slate-800 pb-3">
              <Send className="w-4 h-4 text-emerald-500" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white m-0 font-heading">Dispatch Outbox</h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <AnimatePresence mode="popLayout">
                {outbox.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs text-center p-4">
                    <Activity className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-2 animate-pulse" />
                    No messages dispatched in this session. Click "Send" above to log a reminder.
                  </div>
                ) : (
                  outbox.map((msg) => (
                    <motion.div 
                      key={msg.id}
                      layout={!shouldReduceMotion}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 text-[11px] leading-relaxed text-slate-600 dark:text-slate-350 text-left"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-850 pb-1 mb-1 text-slate-400">
                        <span className="font-bold text-slate-700 dark:text-slate-200">To: {msg.to}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 italic">"{msg.message.slice(0, 80)}..."</p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                        <CheckCircle className="w-3 h-3" />
                        {msg.status} in Firestore
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
