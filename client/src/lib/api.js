/**
 * Unified API Service (Flask Backend Enforced)
 * 
 * Communicates directly with the Python Flask REST API backend.
 * Firebase/Firestore support has been completely removed.
 */

const API_BASE = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? '/api'
    : 'http://localhost:5000/api'
);

// ─────────────────────────────────────────────────────────────────
// Flask API helpers
// ─────────────────────────────────────────────────────────────────
async function flaskGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function flaskPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `POST ${path} failed: ${res.status}`);
  }
  return res.json();
}

async function flaskPut(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `PUT ${path} failed: ${res.status}`);
  }
  return res.json();
}

async function flaskDelete(path) {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `DELETE ${path} failed: ${res.status}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────────────────────
export async function getDashboardStats() {
  return flaskGet('/dashboard/stats');
}

// ─────────────────────────────────────────────────────────────────
// STUDENTS / USERS
// ─────────────────────────────────────────────────────────────────
export async function getStudents() {
  return flaskGet('/students');
}

export async function addStudent(studentData) {
  return flaskPost('/students', studentData);
}

// ─────────────────────────────────────────────────────────────────
// BOOKS
// ─────────────────────────────────────────────────────────────────
export async function getBooks({ search = '', category = '' } = {}) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category && category !== 'All') params.append('category', category);
  const qs = params.toString() ? `?${params}` : '';
  return flaskGet(`/books${qs}`);
}

export async function addBook(bookData) {
  return flaskPost('/books', bookData);
}

export async function updateBook(bookId, bookData) {
  return flaskPut(`/books/${bookId}`, bookData);
}

export async function deleteBook(bookId) {
  return flaskDelete(`/books/${bookId}`);
}

// ─────────────────────────────────────────────────────────────────
// ISSUE & RETURN
// ─────────────────────────────────────────────────────────────────
export async function getIssuedBooks({ status = '' } = {}) {
  const stats = await getDashboardStats();
  if (status === 'active') {
    return (stats.recentTransactions || []).filter(t => t.status === 'Active' || t.status === 'Overdue');
  }
  return stats.recentTransactions || [];
}

export async function issueBook({ userId, bookId, durationDays = 14 }) {
  return flaskPost('/transactions/issue', {
    user_id: userId,
    book_id: bookId,
    expected_return_days: durationDays
  });
}

export async function returnBook(transactionId) {
  const data = await flaskPost('/transactions/return', {
    transaction_id: transactionId
  });
  return {
    fineAccrued: data.fine_accrued || 0,
    returnDate: data.return_date || new Date().toISOString().split('T')[0]
  };
}

// ─────────────────────────────────────────────────────────────────
// NOTIFICATIONS / REMINDERS
// ─────────────────────────────────────────────────────────────────
export async function markReminderSent(transactionId, ledgerId, studentName, studentContact, bookTitle, fineAmount) {
  if (!ledgerId) return; // Flask requires ledger_id
  return flaskPost('/notifications/remind', {
    ledger_id: ledgerId,
    student_name: studentName,
    student_contact: studentContact,
    book_title: bookTitle,
    fine_amount: fineAmount
  });
}

// ─────────────────────────────────────────────────────────────────
// AI DOUBT RESOLVER
// ─────────────────────────────────────────────────────────────────
export async function askDoubt(question) {
  return flaskPost('/ai/doubt', { question });
}

// ─────────────────────────────────────────────────────────────────
// AI COUNSELING
// ─────────────────────────────────────────────────────────────────
export async function getAICounsel(studentId) {
  return flaskPost('/ai/counsel', { student_id: studentId });
}

// ─────────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────────
export async function checkHealth() {
  return flaskGet('/health');
}

// ─────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────
export function formatDate(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.split('T')[0];
  if (value.toDate) return value.toDate().toISOString().split('T')[0];
  return String(value).split('T')[0];
}

export const IS_FLASK_MODE = true;
