import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  Search, 
  Plus, 
  BookOpen, 
  User, 
  Hash, 
  Tag, 
  RefreshCw, 
  AlertCircle, 
  X, 
  Check,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  SlidersHorizontal
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.endsWith('.github.io') ? 'http://localhost:5000/api' : '/api');

export default function BookCatalog({ defaultCategory = '', addBookTrigger = 0 }) {
  const shouldReduceMotion = useReducedMotion();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Selected book for details, edit, delete
  const [selectedBook, setSelectedBook] = useState(null);
  
  const [message, setMessage] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: 'Computer Science',
    total_copies: 1
  });

  // Bulk Selection and Sorting
  const [selectedBookIds, setSelectedBookIds] = useState([]);
  const [sortKey, setSortKey] = useState('title');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const categories = [
    'All',
    'Computer Science',
    'Physics',
    'Mathematics',
    'Chemistry',
    'Fiction',
    'History'
  ];

  // Map defaults if they change from props
  useEffect(() => {
    if (defaultCategory) {
      setCategory(defaultCategory);
      setCurrentPage(1);
    }
  }, [defaultCategory]);

  // Open add modal when global Add Book trigger fires
  useEffect(() => {
    if (addBookTrigger > 0) {
      setShowAddModal(true);
    }
  }, [addBookTrigger]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const url = new URL(`${API_BASE}/books`);
      if (search) url.searchParams.append('search', search);
      if (category && category !== 'All') url.searchParams.append('category', category);
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Could not fetch catalog records');
      const data = await res.json();
      setBooks(data);
      // Reset selected ids on refetch
      setSelectedBookIds([]);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to connect to backend server.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchBooks();
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search, category]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Add Book Action
  const handleAddBook = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Book added to catalog successfully!' });
        resetForm();
        setShowAddModal(false);
        fetchBooks();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add book.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Server communication error.' });
    }
  };

  // Edit Book Action
  const handleEditBook = async (e) => {
    e.preventDefault();
    if (!selectedBook) return;
    try {
      const res = await fetch(`${API_BASE}/books/${selectedBook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Book modified successfully!' });
        resetForm();
        setShowEditModal(false);
        fetchBooks();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to modify book.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Server communication error.' });
    }
  };

  // Delete Book Action
  const handleDeleteBook = async () => {
    if (!selectedBook) return;
    try {
      const res = await fetch(`${API_BASE}/books/${selectedBook.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Book deleted from catalog successfully.' });
        setShowDeleteConfirm(false);
        setSelectedBook(null);
        fetchBooks();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete book.' });
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Server communication error.' });
      setShowDeleteConfirm(false);
    }
  };

  // Bulk Delete Action
  const handleBulkDelete = async () => {
    if (selectedBookIds.length === 0) return;
    const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedBookIds.length} books?`);
    if (!confirmDelete) return;

    try {
      let successCount = 0;
      let failMessage = '';
      
      for (const id of selectedBookIds) {
        const res = await fetch(`${API_BASE}/books/${id}`, { method: 'DELETE' });
        if (res.ok) {
          successCount++;
        } else {
          const data = await res.json();
          failMessage = data.error || 'Some books could not be deleted.';
        }
      }
      
      if (successCount === selectedBookIds.length) {
        setMessage({ type: 'success', text: `Successfully deleted ${successCount} books.` });
      } else {
        setMessage({ type: 'error', text: `Deleted ${successCount} of ${selectedBookIds.length} books. Error: ${failMessage}` });
      }
      fetchBooks();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Bulk delete encountered network error.' });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      author: '',
      isbn: '',
      category: 'Computer Science',
      total_copies: 1
    });
    setSelectedBook(null);
  };

  const triggerAddOpen = () => {
    resetForm();
    setShowAddModal(true);
  };

  const triggerEditOpen = (book) => {
    setSelectedBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category,
      total_copies: book.total_copies
    });
    setShowEditModal(true);
  };

  const triggerViewOpen = (book) => {
    setSelectedBook(book);
    setShowViewModal(true);
  };

  const triggerDeleteConfirm = (book) => {
    setSelectedBook(book);
    setShowDeleteConfirm(true);
  };

  // Mock Published Date
  const getPublishedDate = (book) => {
    const year = 2018 + (book.id % 7);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[book.id % 12];
    const day = (book.id % 28) + 1;
    return `${month} ${day}, ${year}`;
  };

  // Status mapping
  const getBookStatus = (book) => {
    if (book.available_copies === 0) {
      return { label: 'Out of Stock', style: 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' };
    }
    if (book.available_copies < book.total_copies) {
      return { label: 'Issued', style: 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' };
    }
    return { label: 'Available', style: 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' };
  };

  // Sorting Handler
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Apply Sorting
  const sortedBooks = [...books].sort((a, b) => {
    let valA = a[sortKey];
    let valB = b[sortKey];

    if (sortKey === 'copies') {
      valA = a.available_copies;
      valB = b.available_copies;
    }

    if (typeof valA === 'string') {
      return sortDirection === 'asc' 
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    } else {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }
  });

  // Pagination Logic
  const totalBooks = sortedBooks.length;
  const totalPages = Math.ceil(totalBooks / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedBooks = sortedBooks.slice(startIndex, startIndex + pageSize);

  // Bulk Selection Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const visibleIds = paginatedBooks.map(b => b.id);
      setSelectedBookIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    } else {
      const visibleIds = paginatedBooks.map(b => b.id);
      setSelectedBookIds(prev => prev.filter(id => !visibleIds.includes(id)));
    }
  };

  const handleSelectRow = (e, bookId) => {
    if (e.target.checked) {
      setSelectedBookIds(prev => [...prev, bookId]);
    } else {
      setSelectedBookIds(prev => prev.filter(id => id !== bookId));
    }
  };

  const isAllVisibleSelected = () => {
    if (paginatedBooks.length === 0) return false;
    return paginatedBooks.every(b => selectedBookIds.includes(b.id));
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white m-0 font-heading">Library Book Catalog</h2>
          <p className="text-slate-400 text-xs mt-1">Search, filter, edit, and organize Sri Gowthami library assets.</p>
        </div>
        
        <button
          onClick={triggerAddOpen}
          className="flex items-center justify-center gap-2 px-6 h-12 bg-[#6D5EF4] hover:bg-[#5A4BE8] text-white rounded-[14px] font-semibold transition-all duration-300 cursor-pointer shadow-lg shadow-[#6D5EF4]/20 text-xs self-start sm:self-center active:scale-95"
        >
          <Plus className="w-4 h-4" />
          + Add New Book
        </button>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="bg-white dark:bg-[#1e293b] border border-[#E5E7EB] dark:border-slate-800 rounded-[20px] p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by book title, author, or ISBN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 h-12 rounded-[14px] border border-[#E5E7EB] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 text-xs focus:outline-none focus:border-[#6D5EF4] focus:ring-1 focus:ring-[#6D5EF4] transition-all"
              aria-label="Search Catalog"
            />
          </div>
          
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 h-12 rounded-[14px] border border-[#E5E7EB] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 text-xs cursor-pointer focus:outline-none focus:border-[#6D5EF4]"
              aria-label="Filter by Category"
            >
              <option value="">All Categories</option>
              {categories.filter(c => c !== 'All').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Items Actions Panel */}
        {selectedBookIds.length > 0 && (
          <div className="flex items-center justify-between bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 p-3 rounded-xl text-xs font-semibold text-violet-750 dark:text-violet-300">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#6D5EF4]" />
              <span>{selectedBookIds.length} books selected</span>
            </div>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-[10px] transition font-medium cursor-pointer"
            >
              Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* Message Banner */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-3.5 rounded-xl flex items-center justify-between text-xs font-semibold ${
              message.type === 'success' 
                ? 'bg-emerald-50 border border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' 
                : 'bg-red-50 border border-red-100 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Table Grid Container */}
      <div className="bg-white dark:bg-[#1e293b] border border-[#E5E7EB] dark:border-slate-800 rounded-[20px] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-2">
            <RefreshCw className="w-6 h-6 text-[#6D5EF4] animate-spin" />
            <p className="text-slate-400 text-xs font-medium">Updating catalog assets...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-sm font-semibold">No books match your search queries.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-500 dark:text-slate-400 border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      checked={isAllVisibleSelected()} 
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-[#6D5EF4] focus:ring-[#6D5EF4] h-4 w-4 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4">Cover</th>
                  
                  {/* Sortable headers */}
                  <th className="px-6 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => handleSort('title')}>
                    <div className="flex items-center gap-1">
                      <span>Book Title</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => handleSort('author')}>
                    <div className="flex items-center gap-1">
                      <span>Author</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4">ISBN</th>
                  <th className="px-6 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => handleSort('category')}>
                    <div className="flex items-center gap-1">
                      <span>Category</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => handleSort('copies')}>
                    <div className="flex items-center gap-1 justify-end">
                      <span>Available</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Published Date</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedBooks.map((book) => {
                  const statusInfo = getBookStatus(book);
                  const isSelected = selectedBookIds.includes(book.id);
                  return (
                    <tr 
                      key={book.id} 
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                        isSelected ? 'bg-violet-50/20 dark:bg-violet-900/10' : ''
                      }`}
                    >
                      <td className="px-6 py-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={isSelected} 
                          onChange={(e) => handleSelectRow(e, book.id)}
                          className="rounded border-slate-300 text-[#6D5EF4] focus:ring-[#6D5EF4] h-4 w-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-11 w-8 rounded-md bg-gradient-to-br from-[#6D5EF4] to-[#a78bfa] flex items-center justify-center text-[10px] font-bold text-white shadow-sm flex-shrink-0">
                          {book.title.slice(0, 2).toUpperCase()}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-white max-w-[200px] truncate">
                        {book.title}
                      </td>
                      <td className="px-6 py-4 text-slate-650 dark:text-slate-300 font-medium">
                        {book.author}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-450">
                        {book.isbn}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {book.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800 dark:text-slate-200">
                        {book.available_copies} <span className="text-slate-400 dark:text-slate-500 font-normal">/ {book.total_copies}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusInfo.style}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium">
                        {getPublishedDate(book)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => triggerViewOpen(book)}
                            title="View Book"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#6D5EF4] hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => triggerEditOpen(book)}
                            title="Edit Book"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => triggerDeleteConfirm(book)}
                            title="Delete Book"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalBooks > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800/20 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
              <span>entries of <strong>{totalBooks}</strong> items</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-[#6D5EF4] disabled:opacity-40 transition cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                    currentPage === idx + 1
                      ? 'bg-[#6D5EF4] text-white'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-[#6D5EF4]'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-[#6D5EF4] disabled:opacity-40 transition cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ======================================= */}
      {/* MODALS SECTION */}
      {/* ======================================= */}

      <AnimatePresence>
        {/* 1. ADD BOOK MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-[#1e293b] w-full max-w-md rounded-2xl p-6 relative z-10 border border-slate-100 dark:border-slate-800 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white m-0 font-heading">Add New Catalog Book</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddBook} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Book Title</label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:border-[#6D5EF4]"
                    placeholder="Enter book title"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Author Name</label>
                  <input
                    type="text"
                    name="author"
                    required
                    value={formData.author}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:border-[#6D5EF4]"
                    placeholder="Enter author name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">ISBN Number</label>
                    <input
                      type="text"
                      name="isbn"
                      required
                      value={formData.isbn}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-mono focus:outline-none focus:border-[#6D5EF4]"
                      placeholder="e.g., 978013235"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Total Copies</label>
                    <input
                      type="number"
                      name="total_copies"
                      required
                      min="1"
                      max="100"
                      value={formData.total_copies}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:border-[#6D5EF4]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Category Genre</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs cursor-pointer focus:outline-none focus:border-[#6D5EF4]"
                  >
                    {categories.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 mt-2 bg-[#6D5EF4] hover:bg-[#5A4BE8] text-white rounded-xl font-bold cursor-pointer transition shadow-lg shadow-[#6D5EF4]/20 text-xs"
                >
                  Save Book to Library
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* 2. EDIT BOOK MODAL */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-[#1e293b] w-full max-w-md rounded-2xl p-6 relative z-10 border border-slate-100 dark:border-slate-800 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white m-0 font-heading">Edit Catalog Book</h3>
                <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-650 dark:hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditBook} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Book Title</label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:border-[#6D5EF4]"
                    placeholder="Enter book title"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Author Name</label>
                  <input
                    type="text"
                    name="author"
                    required
                    value={formData.author}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:border-[#6D5EF4]"
                    placeholder="Enter author name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">ISBN Number</label>
                    <input
                      type="text"
                      name="isbn"
                      required
                      value={formData.isbn}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-mono focus:outline-none focus:border-[#6D5EF4]"
                      placeholder="e.g., 978013235"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Total Copies</label>
                    <input
                      type="number"
                      name="total_copies"
                      required
                      min="1"
                      max="100"
                      value={formData.total_copies}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:border-[#6D5EF4]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Category Genre</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs cursor-pointer focus:outline-none focus:border-[#6D5EF4]"
                  >
                    {categories.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer transition shadow-lg shadow-blue-600/20 text-xs"
                >
                  Save Changes
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* 3. VIEW BOOK MODAL */}
        {showViewModal && selectedBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowViewModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-[#1e293b] w-full max-w-md rounded-2xl p-6 relative z-10 border border-slate-100 dark:border-slate-800 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-800 dark:text-white m-0 font-heading">Book Detail Specifications</h3>
                <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-slate-650 dark:hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-4 items-start mb-6">
                <div className="h-20 w-14 rounded-lg bg-gradient-to-br from-[#6D5EF4] to-[#a78bfa] flex items-center justify-center text-xs font-bold text-white shadow-md flex-shrink-0">
                  {selectedBook.title.slice(0, 2).toUpperCase()}
                </div>
                <div className="text-left">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white leading-tight m-0">{selectedBook.title}</h4>
                  <p className="text-xs text-[#6D5EF4] font-semibold mt-1">{selectedBook.author}</p>
                  <span className={`inline-block mt-2 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getBookStatus(selectedBook).style}`}>
                    {getBookStatus(selectedBook).label}
                  </span>
                </div>
              </div>

              <div className="space-y-3.5 text-xs text-left bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
                <div className="flex justify-between">
                  <span className="text-slate-400">International ISBN:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedBook.isbn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Library Category:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-250">{selectedBook.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Asset Stock:</span>
                  <span className="font-semibold text-slate-850 dark:text-slate-200">{selectedBook.total_copies} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Currently Available:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedBook.available_copies} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimated Published Date:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{getPublishedDate(selectedBook)}</span>
                </div>
              </div>

              <button
                onClick={() => setShowViewModal(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition text-xs mt-5"
              >
                Close View details
              </button>
            </motion.div>
          </div>
        )}

        {/* 4. DELETE CONFIRMATION MODAL */}
        {showDeleteConfirm && selectedBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1e293b] w-full max-w-sm rounded-2xl p-6 relative z-10 border border-slate-100 dark:border-slate-800 shadow-xl"
            >
              <div className="text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-450 flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white m-0 font-heading">Remove Book from Catalog?</h3>
                  <p className="text-xs text-slate-400 mt-2">
                    Are you sure you want to delete <strong className="text-slate-800 dark:text-slate-200">"{selectedBook.title}"</strong>? This will permanently delete its catalog reference and logs.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteBook}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition text-xs cursor-pointer shadow-lg shadow-rose-650/20"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
