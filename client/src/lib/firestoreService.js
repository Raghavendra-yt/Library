/**
 * Firestore Service Layer
 * 
 * Provides all CRUD operations for the Library Management System.
 * Collections: users, books, issuedBooks, returns
 * 
 * This replaces the Flask REST API backend entirely.
 */
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  runTransaction,
  limit
} from 'firebase/firestore';
import { db } from './firebase';

// ─────────────────────────────────────────
// Collection References
// ─────────────────────────────────────────
const usersCol    = collection(db, 'users');
const booksCol    = collection(db, 'books');
const issuedCol   = collection(db, 'issuedBooks');
const returnsCol  = collection(db, 'returns');

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

/** Convert Firestore Timestamp or string to 'YYYY-MM-DD' string */
export function formatDate(value) {
  if (!value) return '';
  if (value instanceof Timestamp) {
    return value.toDate().toISOString().split('T')[0];
  }
  if (value.toDate) return value.toDate().toISOString().split('T')[0];
  return String(value).split('T')[0];
}

/** Add N days to today, return 'YYYY-MM-DD' */
export function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/** Today as 'YYYY-MM-DD' */
export function today() {
  return new Date().toISOString().split('T')[0];
}

/** Calc overdue fine: ₹10 per day */
export function calcFine(dueDateStr) {
  const due = new Date(dueDateStr);
  const now = new Date();
  const diffMs = now - due;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays * 10 : 0;
}

/** Snapshot array to plain objects with id */
function snapshotToDocs(snapshot) {
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─────────────────────────────────────────
// USERS Collection
// ─────────────────────────────────────────

/** Get all users */
export async function getUsers() {
  const snap = await getDocs(query(usersCol, orderBy('name')));
  return snapshotToDocs(snap);
}

/** Get users by role */
export async function getUsersByRole(role) {
  const q = query(usersCol, where('role', '==', role), orderBy('name'));
  const snap = await getDocs(q);
  return snapshotToDocs(snap);
}

/** Get a single user by ID */
export async function getUserById(uid) {
  const docRef = doc(db, 'users', uid);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/** Add a new user */
export async function addUser({ name, email, role }) {
  const docRef = await addDoc(usersCol, {
    name,
    email: email || '',
    role,  // 'student' | 'librarian'
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

/** Update a user */
export async function updateUser(uid, updates) {
  const docRef = doc(db, 'users', uid);
  await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
}

/** Delete a user */
export async function deleteUser(uid) {
  await deleteDoc(doc(db, 'users', uid));
}

// ─────────────────────────────────────────
// BOOKS Collection
// ─────────────────────────────────────────

/** Get all books, with optional search + category filter */
export async function getBooks({ search = '', category = '' } = {}) {
  let snap;

  if (category && category !== 'All') {
    const q = query(booksCol, where('category', '==', category), orderBy('title'));
    snap = await getDocs(q);
  } else {
    const q = query(booksCol, orderBy('title'));
    snap = await getDocs(q);
  }

  let books = snapshotToDocs(snap);

  // Client-side search filter
  if (search) {
    const term = search.toLowerCase();
    books = books.filter(b =>
      b.title?.toLowerCase().includes(term) ||
      b.author?.toLowerCase().includes(term) ||
      b.isbn?.toLowerCase().includes(term)
    );
  }

  return books;
}

/** Get a single book */
export async function getBookById(bookId) {
  const snap = await getDoc(doc(db, 'books', bookId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/** Add a new book */
export async function addBook({ title, author, isbn, category, total_copies }) {
  const qty = parseInt(total_copies) || 1;

  // Check for duplicate ISBN
  const dupQ = query(booksCol, where('isbn', '==', isbn));
  const dupSnap = await getDocs(dupQ);
  if (!dupSnap.empty) throw new Error('A book with this ISBN already exists.');

  const docRef = await addDoc(booksCol, {
    title,
    author,
    isbn,
    category,
    quantity: qty,
    available: qty,
    // Keep legacy field names for backward compat with UI
    total_copies: qty,
    available_copies: qty,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

/** Update a book */
export async function updateBook(bookId, { title, author, isbn, category, total_copies }) {
  const qty = parseInt(total_copies) || 1;
  const docRef = doc(db, 'books', bookId);
  const existing = await getDoc(docRef);
  if (!existing.exists()) throw new Error('Book not found.');

  const data = existing.data();
  const prevTotal = data.total_copies || data.quantity || 1;
  const prevAvail = data.available_copies ?? data.available ?? prevTotal;
  const issued = prevTotal - prevAvail;
  const newAvail = Math.max(0, qty - issued);

  await updateDoc(docRef, {
    title,
    author,
    isbn,
    category,
    quantity: qty,
    available: newAvail,
    total_copies: qty,
    available_copies: newAvail,
    updatedAt: serverTimestamp()
  });
}

/** Delete a book */
export async function deleteBook(bookId) {
  // Prevent deleting if there are active issues
  const activeQ = query(issuedCol, where('bookId', '==', bookId), where('status', '==', 'active'));
  const activeSnap = await getDocs(activeQ);
  if (!activeSnap.empty) throw new Error('Cannot delete a book with active issues. Return the book first.');
  await deleteDoc(doc(db, 'books', bookId));
}

// ─────────────────────────────────────────
// ISSUED BOOKS Collection
// ─────────────────────────────────────────

/** Get all issued books (enriched with book + user info) */
export async function getIssuedBooks({ status = '' } = {}) {
  let q = issuedCol;
  if (status) {
    q = query(issuedCol, where('status', '==', status), orderBy('issueDate', 'desc'));
  } else {
    q = query(issuedCol, orderBy('issueDate', 'desc'));
  }

  const snap = await getDocs(q);
  const issues = snapshotToDocs(snap);

  // Enrich with book and user data
  const [usersSnap, booksSnap] = await Promise.all([
    getDocs(usersCol),
    getDocs(booksCol)
  ]);
  const usersMap = Object.fromEntries(usersSnap.docs.map(d => [d.id, d.data()]));
  const booksMap = Object.fromEntries(booksSnap.docs.map(d => [d.id, d.data()]));

  return issues.map(issue => {
    const user = usersMap[issue.userId] || {};
    const book = booksMap[issue.bookId] || {};
    const fineAmount = issue.status === 'active' ? calcFine(formatDate(issue.dueDate)) : (issue.fine || 0);
    return {
      ...issue,
      // Legacy field names for UI compatibility
      student_name: user.name || 'Unknown',
      student_contact: user.email || '',
      title: book.title || 'Unknown Book',
      issue_date: formatDate(issue.issueDate),
      expected_return_date: formatDate(issue.dueDate),
      actual_return_date: issue.returnDate ? formatDate(issue.returnDate) : null,
      fine_amount: fineAmount,
      automated_reminder_sent: issue.reminderSent ? 1 : 0,
      transaction_id: issue.id,
      user_id: issue.userId,
      book_id: issue.bookId
    };
  });
}

/** Issue a book to a user */
export async function issueBook({ userId, bookId, durationDays = 14 }) {
  const bookRef = doc(db, 'books', bookId);

  return await runTransaction(db, async (txn) => {
    const bookSnap = await txn.get(bookRef);
    if (!bookSnap.exists()) throw new Error('Book not found.');

    const bookData = bookSnap.data();
    const available = bookData.available_copies ?? bookData.available ?? 0;
    if (available <= 0) throw new Error('No copies available for this book.');

    const issueDateStr = today();
    const dueDateStr = addDays(durationDays);

    // Create issue record
    const issueRef = doc(collection(db, 'issuedBooks'));
    txn.set(issueRef, {
      userId,
      bookId,
      issueDate: issueDateStr,
      dueDate: dueDateStr,
      status: 'active',
      fine: 0,
      reminderSent: false,
      createdAt: serverTimestamp()
    });

    // Decrement available count
    txn.update(bookRef, {
      available: available - 1,
      available_copies: available - 1
    });

    return issueRef.id;
  });
}

/** Return a book */
export async function returnBook(issueId) {
  const issueRef = doc(db, 'issuedBooks', issueId);

  return await runTransaction(db, async (txn) => {
    const issueSnap = await txn.get(issueRef);
    if (!issueSnap.exists()) throw new Error('Issue record not found.');

    const issueData = issueSnap.data();
    if (issueData.status === 'returned') throw new Error('Book already returned.');

    const bookRef = doc(db, 'books', issueData.bookId);
    const bookSnap = await txn.get(bookRef);
    if (!bookSnap.exists()) throw new Error('Book not found.');

    const bookData = bookSnap.data();
    const available = bookData.available_copies ?? bookData.available ?? 0;
    const returnDateStr = today();
    const fineAccrued = calcFine(formatDate(issueData.dueDate));

    // Update issue record
    txn.update(issueRef, {
      status: 'returned',
      returnDate: returnDateStr,
      fine: fineAccrued,
      returnedAt: serverTimestamp()
    });

    // Increment available count
    txn.update(bookRef, {
      available: available + 1,
      available_copies: available + 1
    });

    // Create return record
    const returnRef = doc(collection(db, 'returns'));
    txn.set(returnRef, {
      issueId,
      returnDate: returnDateStr,
      fine: fineAccrued,
      createdAt: serverTimestamp()
    });

    return { fineAccrued, returnDate: returnDateStr };
  });
}

/** Mark a reminder as sent */
export async function markReminderSent(issueId) {
  const issueRef = doc(db, 'issuedBooks', issueId);
  await updateDoc(issueRef, { reminderSent: true });
}

// ─────────────────────────────────────────
// RETURNS Collection
// ─────────────────────────────────────────

/** Get all returns */
export async function getReturns() {
  const snap = await getDocs(query(returnsCol, orderBy('returnDate', 'desc')));
  return snapshotToDocs(snap);
}

// ─────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────

/** Compute dashboard stats from Firestore collections */
export async function getDashboardStats() {
  const [booksSnap, usersSnap, issuedSnap] = await Promise.all([
    getDocs(booksCol),
    getDocs(usersCol),
    getDocs(issuedCol)
  ]);

  const books = snapshotToDocs(booksSnap);
  const users = snapshotToDocs(usersSnap);
  const issued = snapshotToDocs(issuedSnap);

  const todayStr = today();
  const totalBooks = books.reduce((acc, b) => acc + (b.total_copies || b.quantity || 1), 0);
  const activeIssues = issued.filter(i => i.status === 'active').length;
  const overdueIssues = issued.filter(i => i.status === 'active' && formatDate(i.dueDate) < todayStr);
  const totalOverdue = overdueIssues.length;

  // Build category stats
  const catMap = {};
  books.forEach(b => {
    const cat = b.category || 'Other';
    if (!catMap[cat]) catMap[cat] = { category: cat, total_copies: 0, available_copies: 0 };
    catMap[cat].total_copies += b.total_copies || b.quantity || 1;
    catMap[cat].available_copies += b.available_copies ?? b.available ?? 0;
  });
  const categoryStats = Object.values(catMap);

  // Build users lookup
  const usersMap = Object.fromEntries(users.map(u => [u.id, u]));
  const booksMap = Object.fromEntries(books.map(b => [b.id, b]));

  // Recent transactions (last 20, newest first)
  const recentTransactions = issued
    .slice()
    .sort((a, b) => {
      const dateA = formatDate(a.issueDate);
      const dateB = formatDate(b.issueDate);
      return dateB.localeCompare(dateA);
    })
    .slice(0, 20)
    .map(i => {
      const user = usersMap[i.userId] || {};
      const book = booksMap[i.bookId] || {};
      const fineAmount = i.status === 'active' ? calcFine(formatDate(i.dueDate)) : (i.fine || 0);
      const isOverdue = i.status === 'active' && formatDate(i.dueDate) < todayStr;
      return {
        id: i.id,
        transaction_id: i.id,
        title: book.title || 'Unknown',
        student_name: user.name || 'Unknown',
        student_contact: user.email || '',
        issue_date: formatDate(i.issueDate),
        expected_return_date: formatDate(i.dueDate),
        actual_return_date: i.returnDate ? formatDate(i.returnDate) : null,
        status: i.status === 'returned' ? 'Returned' : isOverdue ? 'Overdue' : 'Active',
        fine_amount: fineAmount,
        automated_reminder_sent: i.reminderSent ? 1 : 0,
        ledger_id: i.id,
        book_id: i.bookId,
        user_id: i.userId
      };
    });

  // Overdue list
  const overdueList = recentTransactions.filter(t => t.status === 'Overdue');

  return {
    metrics: {
      totalBooks,
      activeIssues,
      totalOverdue,
      totalStudents: users.filter(u => u.role === 'student').length
    },
    recentTransactions,
    overdueList,
    categoryStats
  };
}

/** Get students list (users with role 'student') */
export async function getStudents() {
  const snap = await getDocs(query(usersCol, where('role', '==', 'student'), orderBy('name')));
  return snapshotToDocs(snap).map(s => ({
    ...s,
    user_id: s.id,
    name: s.name,
    class_grade: s.classGrade || s.class_grade || '',
    admission_number: s.admissionNumber || s.admission_number || s.id.slice(0, 8).toUpperCase()
  }));
}
