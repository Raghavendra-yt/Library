/**
 * Unified API Service
 * 
 * Automatically switches between:
 *   - Flask REST API (when VITE_USE_FLASK=true, for local development)
 *   - Firebase Firestore SDK (for production / GitHub Pages)
 * 
 * All components import from this file — never directly from Flask or Firestore.
 */

// ─────────────────────────────────────────────────────────────────
// Detect which backend to use
// ─────────────────────────────────────────────────────────────────
const USE_FLASK = import.meta.env.VITE_USE_FLASK === 'true';
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// ─────────────────────────────────────────────────────────────────
// Lazy imports — only load Firestore when not using Flask
// ─────────────────────────────────────────────────────────────────
let firestoreService = null;

async function getFirestoreService() {
  if (!firestoreService) {
    firestoreService = await import('./firestoreService.js');
  }
  return firestoreService;
}

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
  if (USE_FLASK) {
    const data = await flaskGet('/dashboard/stats');
    return data;
  }
  const fs = await getFirestoreService();
  return fs.getDashboardStats();
}

// ─────────────────────────────────────────────────────────────────
// STUDENTS / USERS
// ─────────────────────────────────────────────────────────────────
export async function getStudents() {
  if (USE_FLASK) {
    const data = await flaskGet('/students');
    return data;
  }
  const fs = await getFirestoreService();
  return fs.getStudents();
}

export async function addStudent(studentData) {
  if (USE_FLASK) {
    return flaskPost('/students', studentData);
  }
  const fs = await getFirestoreService();
  return fs.addUser({ ...studentData, role: 'student' });
}

// ─────────────────────────────────────────────────────────────────
// BOOKS
// ─────────────────────────────────────────────────────────────────
export async function getBooks({ search = '', category = '' } = {}) {
  if (USE_FLASK) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category && category !== 'All') params.append('category', category);
    const qs = params.toString() ? `?${params}` : '';
    return flaskGet(`/books${qs}`);
  }
  const fs = await getFirestoreService();
  return fs.getBooks({ search, category });
}

export async function addBook(bookData) {
  if (USE_FLASK) {
    return flaskPost('/books', bookData);
  }
  const fs = await getFirestoreService();
  return fs.addBook(bookData);
}

export async function updateBook(bookId, bookData) {
  if (USE_FLASK) {
    return flaskPut(`/books/${bookId}`, bookData);
  }
  const fs = await getFirestoreService();
  return fs.updateBook(bookId, bookData);
}

export async function deleteBook(bookId) {
  if (USE_FLASK) {
    return flaskDelete(`/books/${bookId}`);
  }
  const fs = await getFirestoreService();
  return fs.deleteBook(bookId);
}

// ─────────────────────────────────────────────────────────────────
// ISSUE & RETURN
// ─────────────────────────────────────────────────────────────────
export async function getIssuedBooks({ status = '' } = {}) {
  if (USE_FLASK) {
    // Flask returns issued books embedded in dashboard stats
    const stats = await getDashboardStats();
    if (status === 'active') {
      return (stats.recentTransactions || []).filter(t => t.status === 'Active' || t.status === 'Overdue');
    }
    return stats.recentTransactions || [];
  }
  const fs = await getFirestoreService();
  return fs.getIssuedBooks({ status });
}

export async function issueBook({ userId, bookId, durationDays = 14 }) {
  if (USE_FLASK) {
    return flaskPost('/transactions/issue', {
      user_id: userId,
      book_id: bookId,
      expected_return_days: durationDays
    });
  }
  const fs = await getFirestoreService();
  return fs.issueBook({ userId, bookId, durationDays });
}

export async function returnBook(transactionId) {
  if (USE_FLASK) {
    const data = await flaskPost('/transactions/return', {
      transaction_id: transactionId
    });
    return {
      fineAccrued: data.fine_accrued || 0,
      returnDate: data.return_date || new Date().toISOString().split('T')[0]
    };
  }
  const fs = await getFirestoreService();
  return fs.returnBook(transactionId);
}

// ─────────────────────────────────────────────────────────────────
// NOTIFICATIONS / REMINDERS
// ─────────────────────────────────────────────────────────────────
export async function markReminderSent(transactionId, ledgerId) {
  if (USE_FLASK) {
    if (!ledgerId) return; // Flask requires ledger_id
    return flaskPost('/notifications/remind', {
      ledger_id: ledgerId
    });
  }
  const fs = await getFirestoreService();
  return fs.markReminderSent(transactionId);
}

// ─────────────────────────────────────────────────────────────────
// AI DOUBT RESOLVER
// ─────────────────────────────────────────────────────────────────
export async function askDoubt(question) {
  if (USE_FLASK) {
    return flaskPost('/ai/doubt', { question });
  }
  // Handled locally in AIStudentCounselor when not using Flask
  throw new Error('Use local AI when not in Flask mode');
}

// ─────────────────────────────────────────────────────────────────
// AI COUNSELING
// ─────────────────────────────────────────────────────────────────
export async function getAICounsel(studentId) {
  if (USE_FLASK) {
    return flaskPost('/ai/counsel', { student_id: studentId });
  }
  return null; // Handled locally in Dashboard
}

// ─────────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────────
export async function checkHealth() {
  if (USE_FLASK) {
    return flaskGet('/health');
  }
  return { status: 'OK', backend: 'Firestore' };
}

// ─────────────────────────────────────────────────────────────────
// Re-export formatDate utility from Firestore service
// ─────────────────────────────────────────────────────────────────
export function formatDate(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.split('T')[0];
  if (value.toDate) return value.toDate().toISOString().split('T')[0];
  return String(value).split('T')[0];
}

export const IS_FLASK_MODE = USE_FLASK;
