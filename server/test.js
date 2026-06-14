import express from 'express';
import cors from 'cors';
import { initializeDatabase, query } from './db.js';
import router from './routes.js';

console.log('--- STARTING BACKEND INTEGRATION TESTS ---');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', router);

const PORT = 5001;
let serverInstance;

// Helper to make fetch calls
async function apiCall(endpoint, options = {}) {
  const url = `http://localhost:${PORT}/api${endpoint}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Request failed for ${endpoint} with status ${response.status}: ${errorBody}`);
  }
  return response.json();
}

async function runTests() {
  try {
    // 1. Initialize database schema
    await initializeDatabase();
    
    // Start server
    serverInstance = app.listen(PORT, async () => {
      console.log(`Test server running on port ${PORT}`);
      
      try {
        // Test 1: Fetch books
        console.log('Testing GET /books...');
        const books = await apiCall('/books');
        if (!Array.isArray(books) || books.length === 0) {
          throw new Error('Books array is empty or invalid');
        }
        console.log(`  ✓ Passed: Found ${books.length} books.`);

        // Test 2: Add a book
        console.log('Testing POST /books...');
        const newBook = {
          title: 'Artificial Intelligence: A Modern Approach',
          author: 'Stuart Russell',
          isbn: '9780136042594',
          category: 'Computer Science',
          total_copies: 2
        };
        const addResult = await apiCall('/books', {
          method: 'POST',
          body: JSON.stringify(newBook)
        });
        if (!addResult.id) {
          throw new Error('Book addition failed to return ID');
        }
        console.log(`  ✓ Passed: Added book with ID ${addResult.id}`);

        // Test 3: Get students
        console.log('Testing GET /students...');
        const students = await apiCall('/students');
        if (!Array.isArray(students) || students.length === 0) {
          throw new Error('Students array is empty or invalid');
        }
        console.log(`  ✓ Passed: Found ${students.length} students.`);

        // Test 4: Issue a book
        console.log('Testing POST /transactions/issue...');
        const issueResult = await apiCall('/transactions/issue', {
          method: 'POST',
          body: JSON.stringify({
            book_id: 1,
            user_id: 2,
            expected_return_days: 7
          })
        });
        if (!issueResult.transaction_id) {
          throw new Error('Book issue failed to return transaction ID');
        }
        console.log(`  ✓ Passed: Issued book. Transaction ID: ${issueResult.transaction_id}`);

        // Test 5: Return a book
        console.log('Testing POST /transactions/return...');
        const returnResult = await apiCall('/transactions/return', {
          method: 'POST',
          body: JSON.stringify({
            transaction_id: issueResult.transaction_id
          })
        });
        if (returnResult.fine_accrued === undefined) {
          throw new Error('Book return did not calculate fine accrual');
        }
        console.log(`  ✓ Passed: Book returned. Fine: ₹${returnResult.fine_accrued}`);

        // Test 6: Dashboard stats
        console.log('Testing GET /dashboard/stats...');
        const stats = await apiCall('/dashboard/stats');
        if (!stats.metrics || stats.metrics.totalBooks === undefined) {
          throw new Error('Dashboard stats structure is invalid');
        }
        console.log(`  ✓ Passed: Stats retrieved. Total books count: ${stats.metrics.totalBooks}`);

        // Test 7: AI Counseling
        console.log('Testing POST /ai/counsel...');
        const counselResult = await apiCall('/ai/counsel', {
          method: 'POST',
          body: JSON.stringify({ student_id: 1 })
        });
        if (!counselResult.studentName || !counselResult.dropoutRisk) {
          throw new Error('AI Counseling result invalid');
        }
        console.log(`  ✓ Passed: Counseling plan generated for ${counselResult.studentName}. Risk level: ${counselResult.dropoutRisk}`);

        // Test 8: AI Doubt Explanation
        console.log('Testing POST /ai/doubt...');
        const doubtResult = await apiCall('/ai/doubt', {
          method: 'POST',
          body: JSON.stringify({ question: 'Explain recursion in Telugu' })
        });
        if (!doubtResult.answer || !doubtResult.answer.includes('తెలుగు')) {
          throw new Error('AI Doubt explanation did not return translation');
        }
        console.log(`  ✓ Passed: Doubt answered. Response preview:\n${doubtResult.answer.split('\n')[2]}`);

        // Test 9: Notifications reminder simulation
        console.log('Testing POST /notifications/remind...');
        const notifyResult = await apiCall('/notifications/remind', {
          method: 'POST',
          body: JSON.stringify({
            ledger_id: 1,
            student_name: 'Sita Rama',
            student_contact: '9977553311',
            book_title: 'Clean Code',
            fine_amount: 50.0
          })
        });
        if (notifyResult.status !== 'Success') {
          throw new Error('Notification simulation failed');
        }
        console.log(`  ✓ Passed: Notification simulation success. Channel: ${notifyResult.channel}`);

        console.log('\n--- ALL BACKEND TESTS COMPLETED SUCCESSFULLY ---');
        cleanupAndExit(0);
      } catch (err) {
        console.error('Test execution failed:', err);
        cleanupAndExit(1);
      }
    });
  } catch (err) {
    console.error('Test initialization failed:', err);
    cleanupAndExit(1);
  }
}

function cleanupAndExit(code) {
  if (serverInstance) {
    serverInstance.close(() => {
      console.log('Test server shut down.');
      process.exit(code);
    });
  } else {
    process.exit(code);
  }
}

runTests();
