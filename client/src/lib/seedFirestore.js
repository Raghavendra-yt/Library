/**
 * Firestore Seed Script
 * 
 * Run this ONCE to populate the Firestore database with initial data.
 * Import and call seedFirestore() from a component or browser console.
 * 
 * Usage: import { seedFirestore } from './lib/seedFirestore';
 *        await seedFirestore();
 */
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const usersCol   = collection(db, 'users');
const booksCol   = collection(db, 'books');
const issuedCol  = collection(db, 'issuedBooks');
const returnsCol = collection(db, 'returns');

function pastDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function futureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export async function seedFirestore() {
  // Check if already seeded
  const existingUsers = await getDocs(usersCol);
  if (!existingUsers.empty) {
    console.log('Firestore already seeded. Skipping.');
    return { skipped: true };
  }

  console.log('Seeding Firestore...');

  // ── Users ────────────────────────────────────────────────────────────────
  const librarianRef = await addDoc(usersCol, {
    uid: 'librarian-001',
    name: 'Librarian Gowthami',
    email: 'gowthami@srigowthami.edu',
    role: 'librarian',
    createdAt: serverTimestamp()
  });

  const student1Ref = await addDoc(usersCol, {
    uid: 'student-001',
    name: 'Ramesh Kumar',
    email: 'ramesh@student.srigowthami.edu',
    role: 'student',
    classGrade: 'Class 10',
    admissionNumber: 'SG-2024-001',
    createdAt: serverTimestamp()
  });

  const student2Ref = await addDoc(usersCol, {
    uid: 'student-002',
    name: 'Sita Rama',
    email: 'sita@student.srigowthami.edu',
    role: 'student',
    classGrade: 'Class 9',
    admissionNumber: 'SG-2024-002',
    createdAt: serverTimestamp()
  });

  const student3Ref = await addDoc(usersCol, {
    uid: 'student-003',
    name: 'Anjali Devi',
    email: 'anjali@student.srigowthami.edu',
    role: 'student',
    classGrade: 'Class 11',
    admissionNumber: 'SG-2024-003',
    createdAt: serverTimestamp()
  });

  // ── Books ─────────────────────────────────────────────────────────────────
  const book1Ref = await addDoc(booksCol, {
    title: 'Introduction to Algorithms',
    author: 'Thomas H. Cormen',
    isbn: '9780262033848',
    category: 'Computer Science',
    quantity: 5,
    available: 4,
    total_copies: 5,
    available_copies: 4,
    createdAt: serverTimestamp()
  });

  const book2Ref = await addDoc(booksCol, {
    title: 'Clean Code',
    author: 'Robert C. Martin',
    isbn: '9780132350884',
    category: 'Computer Science',
    quantity: 3,
    available: 2,
    total_copies: 3,
    available_copies: 2,
    createdAt: serverTimestamp()
  });

  const book3Ref = await addDoc(booksCol, {
    title: 'A Brief History of Time',
    author: 'Stephen Hawking',
    isbn: '9780553380163',
    category: 'Physics',
    quantity: 2,
    available: 2,
    total_copies: 2,
    available_copies: 2,
    createdAt: serverTimestamp()
  });

  const book4Ref = await addDoc(booksCol, {
    title: 'The Alchemist',
    author: 'Paulo Coelho',
    isbn: '9780061122415',
    category: 'Fiction',
    quantity: 4,
    available: 3,
    total_copies: 4,
    available_copies: 3,
    createdAt: serverTimestamp()
  });

  await addDoc(booksCol, {
    title: 'Discrete Mathematics',
    author: 'Kenneth H. Rosen',
    isbn: '9780073383095',
    category: 'Mathematics',
    quantity: 6,
    available: 6,
    total_copies: 6,
    available_copies: 6,
    createdAt: serverTimestamp()
  });

  await addDoc(booksCol, {
    title: 'Engineering Mechanics',
    author: 'R.C. Hibbeler',
    isbn: '9780133918922',
    category: 'Engineering',
    quantity: 4,
    available: 4,
    total_copies: 4,
    available_copies: 4,
    createdAt: serverTimestamp()
  });

  await addDoc(booksCol, {
    title: 'Organic Chemistry',
    author: 'Paula Yurkanis Bruice',
    isbn: '9780134042282',
    category: 'Chemistry',
    quantity: 3,
    available: 3,
    total_copies: 3,
    available_copies: 3,
    createdAt: serverTimestamp()
  });

  // ── Issued Books (Transactions) ───────────────────────────────────────────

  // 1. Active transaction — Ramesh has Introduction to Algorithms
  const issue1Ref = await addDoc(issuedCol, {
    userId: student1Ref.id,
    bookId: book1Ref.id,
    issueDate: pastDate(5),
    dueDate: futureDate(9),
    status: 'active',
    fine: 0,
    reminderSent: false,
    createdAt: serverTimestamp()
  });

  // 2. Overdue transaction — Sita has Clean Code (20 days ago, due 10 days ago)
  const issue2Ref = await addDoc(issuedCol, {
    userId: student2Ref.id,
    bookId: book2Ref.id,
    issueDate: pastDate(20),
    dueDate: pastDate(10),
    status: 'active',
    fine: 100, // 10 days × ₹10
    reminderSent: false,
    createdAt: serverTimestamp()
  });

  // 3. Already returned transaction — Anjali returned The Alchemist
  const issue3Ref = await addDoc(issuedCol, {
    userId: student3Ref.id,
    bookId: book4Ref.id,
    issueDate: pastDate(15),
    dueDate: pastDate(5),
    returnDate: pastDate(3),
    status: 'returned',
    fine: 10, // 2 days late × ₹10 = ₹20, rounded to ₹10
    reminderSent: true,
    createdAt: serverTimestamp()
  });

  // ── Returns ───────────────────────────────────────────────────────────────
  await addDoc(returnsCol, {
    issueId: issue3Ref.id,
    returnDate: pastDate(3),
    fine: 10,
    createdAt: serverTimestamp()
  });

  console.log('✅ Firestore seeded successfully!');
  return {
    users: [librarianRef.id, student1Ref.id, student2Ref.id, student3Ref.id],
    books: [book1Ref.id, book2Ref.id, book3Ref.id, book4Ref.id],
    issues: [issue1Ref.id, issue2Ref.id, issue3Ref.id]
  };
}
