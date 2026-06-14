import os
import re
import sqlite3
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

DB_TYPE = os.getenv('DATABASE_TYPE', 'sqlite')
DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'library.db')
pg_pool = None

# Ensure SQLite data directory exists
if DB_TYPE == 'sqlite':
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# Helper to translate Postgres parameter syntax ($1, $2, etc.) to engine-specific syntax
def translate_query(text):
    if DB_TYPE == 'sqlite':
        return re.sub(r'\$\d+', '?', text)
    elif DB_TYPE == 'postgres':
        return re.sub(r'\$\d+', '%s', text)
    return text

def get_connection():
    if DB_TYPE == 'postgres':
        # Lazy load psycopg2 to avoid failures if not using Postgres
        import psycopg2
        import psycopg2.extras
        conn_str = os.getenv('DATABASE_URL')
        ssl_mode = os.getenv('DATABASE_SSL', 'false') == 'true'
        ssl_args = {'sslmode': 'require'} if ssl_mode else {}
        return psycopg2.connect(conn_str, **ssl_args)
    else:
        conn = sqlite3.connect(DB_PATH)
        # Return dicts instead of tuples for matching express database return rows
        conn.row_factory = sqlite3.Row
        return conn

def query(text, params=None):
    if params is None:
        params = []
    
    translated_text = translate_query(text)
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(translated_text, params)
        lower_query = text.strip().lower()
        
        if lower_query.startswith('select') or lower_query.startswith('with'):
            rows = cursor.fetchall()
            # Convert SQLite rows or Postgres dicts into standard python dict lists
            if DB_TYPE == 'sqlite':
                result = [dict(row) for row in rows]
            else:
                result = [dict(row) for row in rows]
        else:
            conn.commit()
            if DB_TYPE == 'sqlite':
                last_id = cursor.lastrowid
                changes = conn.total_changes
                result = [{"id": last_id, "changes": changes}]
            else:
                try:
                    last_id = cursor.fetchone()[0]
                except Exception:
                    last_id = None
                result = [{"id": last_id}]
        return result
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def initialize_database():
    print("Initializing database schema...")
    
    queries = [
        # 1. Campuses
        """CREATE TABLE IF NOT EXISTS campuses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          campus_name TEXT NOT NULL,
          location TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        
        # 2. Users
        """CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          role TEXT NOT NULL, -- 'Student', 'Librarian', 'Admin', 'Faculty'
          contact TEXT,
          campus_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        
        # 3. Books
        """CREATE TABLE IF NOT EXISTS books (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          author TEXT NOT NULL,
          isbn TEXT UNIQUE NOT NULL,
          category TEXT NOT NULL,
          availability_status TEXT DEFAULT 'Available', -- 'Available', 'Issued', 'Reserved'
          total_copies INTEGER DEFAULT 1,
          available_copies INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        
        # 4. Transactions (Book issues & returns)
        """CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          issue_date TEXT NOT NULL,
          expected_return_date TEXT NOT NULL,
          actual_return_date TEXT,
          fine_amount REAL DEFAULT 0.0,
          status TEXT DEFAULT 'Active', -- 'Active', 'Returned', 'Overdue'
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        
        # 5. Fine Ledger
        """CREATE TABLE IF NOT EXISTS fine_ledger (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transaction_id INTEGER NOT NULL,
          amount_due REAL DEFAULT 0.0,
          payment_status TEXT DEFAULT 'Unpaid', -- 'Unpaid', 'Paid'
          automated_reminder_sent INTEGER DEFAULT 0, -- 0 for false, 1 for true
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        
        # 6. Parents
        """CREATE TABLE IF NOT EXISTS parents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          contact TEXT NOT NULL,
          email TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        
        # 7. Students (linked to users and parents)
        """CREATE TABLE IF NOT EXISTS students (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE NOT NULL,
          parent_id INTEGER,
          admission_number TEXT UNIQUE NOT NULL,
          class_grade TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        
        # 8. Applications (Admission CRM)
        """CREATE TABLE IF NOT EXISTS applications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_name TEXT NOT NULL,
          contact TEXT NOT NULL,
          grade_applied TEXT NOT NULL,
          status TEXT DEFAULT 'Enquiry', -- 'Enquiry', 'Applied', 'Verified', 'Approved'
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        
        # 9. Courses
        """CREATE TABLE IF NOT EXISTS courses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          course_name TEXT NOT NULL,
          code TEXT UNIQUE NOT NULL,
          department TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        
        # 10. Document Checklists
        """CREATE TABLE IF NOT EXISTS document_checklists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          document_type TEXT NOT NULL,
          is_verified INTEGER DEFAULT 0,
          verified_at TEXT
        )""",
        
        # 11. Fee Receipts
        """CREATE TABLE IF NOT EXISTS fee_receipts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          payment_date TEXT NOT NULL,
          status TEXT DEFAULT 'Pending' -- 'Pending', 'Paid'
        )""",
        
        # 12. Attendance
        """CREATE TABLE IF NOT EXISTS attendance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          status TEXT NOT NULL -- 'Present', 'Absent'
        )""",
        
        # 13. Exam Results
        """CREATE TABLE IF NOT EXISTS exam_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          subject TEXT NOT NULL,
          marks_obtained REAL NOT NULL,
          max_marks REAL NOT NULL
        )""",
        
        # 14. Hostel Rooms
        """CREATE TABLE IF NOT EXISTS hostel_rooms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER,
          room_number TEXT NOT NULL,
          block TEXT NOT NULL,
          fee_status TEXT DEFAULT 'Paid'
        )""",
        
        # 15. Transport Routes
        """CREATE TABLE IF NOT EXISTS transport (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER,
          route_no TEXT NOT NULL,
          stop_name TEXT NOT NULL
        )""",
        
        # 16. AI Study Plans
        """CREATE TABLE IF NOT EXISTS ai_study_plans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          subject TEXT NOT NULL,
          study_plan_text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        
        # 17. AI Doubt Histories
        """CREATE TABLE IF NOT EXISTS ai_doubt_histories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"""
    ]
    
    for q in queries:
        if DB_TYPE == 'postgres':
            q = q.replace('INTEGER PRIMARY KEY AUTOINCREMENT', 'SERIAL PRIMARY KEY')
        query(q)
        
    print("Database tables successfully initialized.")
    seed_initial_data()

def seed_initial_data():
    users_count = query('SELECT count(*) as count FROM users')
    if int(users_count[0]['count']) > 0:
        print("Database already contains data, skipping seed.")
        return
        
    print("Seeding initial data...")
    
    # Campuses
    query('INSERT INTO campuses (campus_name, location) VALUES ($1, $2)', ['Main Campus', 'Rajahmundry'])
    query('INSERT INTO campuses (campus_name, location) VALUES ($1, $2)', ['City Campus', 'Kakinada'])
    
    # Users
    query('INSERT INTO users (name, role, contact, campus_id) VALUES ($1, $2, $3, $4)', ['Librarian Gowthami', 'Librarian', '9876543210', 1])
    query('INSERT INTO users (name, role, contact, campus_id) VALUES ($1, $2, $3, $4)', ['Ramesh Kumar', 'Student', '9988776655', 1])
    query('INSERT INTO users (name, role, contact, campus_id) VALUES ($1, $2, $3, $4)', ['Sita Rama', 'Student', '9977553311', 1])
    query('INSERT INTO users (name, role, contact, campus_id) VALUES ($1, $2, $3, $4)', ['Anjali Devi', 'Student', '8877665544', 2])

    # Parents
    query('INSERT INTO parents (name, contact, email) VALUES ($1, $2, $3)', ['Koteswara Rao', '9000012345', 'koteswar@gmail.com'])
    query('INSERT INTO parents (name, contact, email) VALUES ($1, $2, $3)', ['Subbarayudu', '9000054321', 'subbarao@gmail.com'])

    # Students
    query('INSERT INTO students (user_id, parent_id, admission_number, class_grade) VALUES ($1, $2, $3, $4)', [2, 1, 'SG-2024-001', 'Class 10'])
    query('INSERT INTO students (user_id, parent_id, admission_number, class_grade) VALUES ($1, $2, $3, $4)', [3, 2, 'SG-2024-002', 'Class 9'])
    query('INSERT INTO students (user_id, parent_id, admission_number, class_grade) VALUES ($1, $2, $3, $4)', [4, 1, 'SG-2024-003', 'Class 11'])

    # Books
    query('INSERT INTO books (title, author, isbn, category, total_copies, available_copies) VALUES ($1, $2, $3, $4, $5, $6)', 
      ['Introduction to Algorithms', 'Thomas H. Cormen', '9780262033848', 'Computer Science', 5, 4])
    query('INSERT INTO books (title, author, isbn, category, total_copies, available_copies) VALUES ($1, $2, $3, $4, $5, $6)', 
      ['Clean Code', 'Robert C. Martin', '9780132350884', 'Computer Science', 3, 2])
    query('INSERT INTO books (title, author, isbn, category, total_copies, available_copies) VALUES ($1, $2, $3, $4, $5, $6)', 
      ['A Brief History of Time', 'Stephen Hawking', '9780553380163', 'Physics', 2, 2])
    query('INSERT INTO books (title, author, isbn, category, total_copies, available_copies) VALUES ($1, $2, $3, $4, $5, $6)', 
      ['The Alchemist', 'Paulo Coelho', '9780061122415', 'Fiction', 4, 3])

    # Transactions
    today = datetime.now()
    def past_date(days):
        return (today - timedelta(days=days)).strftime('%Y-%m-%d')

    # 1. Regular active transaction (issued 5 days ago, expected return in 5 days)
    query('INSERT INTO transactions (book_id, user_id, issue_date, expected_return_date, status) VALUES ($1, $2, $3, $4, $5)',
      [1, 2, past_date(5), past_date(-5), 'Active'])
    query('UPDATE books SET available_copies = available_copies - 1 WHERE id = 1')

    # 2. Overdue transaction (issued 20 days ago, expected return 10 days ago) Sita Rama Clean Code
    query('INSERT INTO transactions (book_id, user_id, issue_date, expected_return_date, status, fine_amount) VALUES ($1, $2, $3, $4, $5, $6)',
      [2, 3, past_date(20), past_date(10), 'Overdue', 50.0])
    query('UPDATE books SET available_copies = available_copies - 1 WHERE id = 2')
    
    # Fine ledger record
    query('INSERT INTO fine_ledger (transaction_id, amount_due, payment_status, automated_reminder_sent) VALUES ($1, $2, $3, $4)',
      [2, 50.0, 'Unpaid', 0])

    # 3. Already returned transaction
    query('INSERT INTO transactions (book_id, user_id, issue_date, expected_return_date, actual_return_date, fine_amount, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [4, 4, past_date(15), past_date(5), past_date(3), 10.0, 'Returned'])
    query('INSERT INTO fine_ledger (transaction_id, amount_due, payment_status, automated_reminder_sent) VALUES ($1, $2, $3, $4)',
      [3, 10.0, 'Paid', 1])

    print("Seeding complete.")
