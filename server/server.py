import os
import sys
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

# Ensure the server directory is in python search path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import db

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

PORT = int(os.getenv('PORT', 5000))

# 1. GET /api/books - Get books catalog with optional search and category filters
@app.route('/api/books', methods=['GET'])
def get_books():
    search = request.args.get('search')
    category = request.args.get('category')
    
    sql = 'SELECT * FROM books'
    params = []
    
    if search or category:
        sql += ' WHERE'
        clauses = []
        if search:
            params.append(f"%{search}%")
            param_num = len(params)
            clauses.append(f"(title LIKE ${param_num} OR author LIKE ${param_num} OR isbn LIKE ${param_num})")
        if category:
            params.append(category)
            param_num = len(params)
            clauses.append(f"category = ${param_num}")
        sql += ' ' + ' AND '.join(clauses)
        
    sql += ' ORDER BY title ASC'
    books = db.query(sql, params)
    return jsonify(books), 200

# 2. POST /api/books - Add new book
@app.route('/api/books', methods=['POST'])
def add_book():
    data = request.json or {}
    title = data.get('title')
    author = data.get('author')
    isbn = data.get('isbn')
    category = data.get('category')
    total_copies = data.get('total_copies')
    
    if not title or not author or not isbn or not category or total_copies is None:
        return jsonify({'error': 'All fields are required'}), 400
        
    check_isbn = db.query('SELECT id FROM books WHERE isbn = $1', [isbn])
    if len(check_isbn) > 0:
        return jsonify({'error': 'Book with this ISBN already exists'}), 400
        
    insert_res = db.query(
        'INSERT INTO books (title, author, isbn, category, total_copies, available_copies) VALUES ($1, $2, $3, $4, $5, $6)',
        [title, author, isbn, category, int(total_copies), int(total_copies)]
    )
    
    return jsonify({'message': 'Book added successfully', 'id': insert_res[0]['id']}), 201

# 2a. PUT /api/books/:id - Edit existing book
@app.route('/api/books/<int:book_id>', methods=['PUT'])
def edit_book(book_id):
    data = request.json or {}
    title = data.get('title')
    author = data.get('author')
    isbn = data.get('isbn')
    category = data.get('category')
    total_copies = data.get('total_copies')
    
    if not title or not author or not isbn or not category or total_copies is None:
        return jsonify({'error': 'All fields are required'}), 400
        
    check_isbn = db.query('SELECT id FROM books WHERE isbn = $1 AND id != $2', [isbn, book_id])
    if len(check_isbn) > 0:
        return jsonify({'error': 'Book with this ISBN already exists'}), 400
        
    current_book = db.query('SELECT total_copies, available_copies FROM books WHERE id = $1', [book_id])
    if len(current_book) == 0:
        return jsonify({'error': 'Book not found'}), 404
        
    diff = int(total_copies) - current_book[0]['total_copies']
    new_available = current_book[0]['available_copies'] + diff
    if new_available < 0:
        new_available = 0
        
    db.query(
        'UPDATE books SET title = $1, author = $2, isbn = $3, category = $4, total_copies = $5, available_copies = $6 WHERE id = $7',
        [title, author, isbn, category, int(total_copies), new_available, book_id]
    )
    
    return jsonify({'message': 'Book updated successfully'}), 200

# 2b. DELETE /api/books/:id - Delete book
@app.route('/api/books/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    active_trans = db.query('SELECT id FROM transactions WHERE book_id = $1 AND actual_return_date IS NULL', [book_id])
    if len(active_trans) > 0:
        return jsonify({'error': 'Cannot delete book with active issued copies'}), 400
        
    db.query('DELETE FROM fine_ledger WHERE transaction_id IN (SELECT id FROM transactions WHERE book_id = $1)', [book_id])
    db.query('DELETE FROM transactions WHERE book_id = $1', [book_id])
    db.query('DELETE FROM books WHERE id = $1', [book_id])
    
    return jsonify({'message': 'Book deleted successfully'}), 200

# 3. GET /api/students - List all students with details
@app.route('/api/students', methods=['GET'])
def get_students():
    sql = """
      SELECT s.id as student_id, u.id as user_id, u.name, u.contact, s.admission_number, s.class_grade, p.name as parent_name, p.contact as parent_contact
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN parents p ON s.parent_id = p.id
      ORDER BY u.name ASC
    """
    students = db.query(sql)
    return jsonify(students), 200

# 4. POST /api/students - Create new student profile
@app.route('/api/students', methods=['POST'])
def add_student():
    data = request.json or {}
    name = data.get('name')
    contact = data.get('contact')
    admission_number = data.get('admission_number')
    class_grade = data.get('class_grade')
    parent_name = data.get('parent_name')
    parent_contact = data.get('parent_contact')
    campus_id = data.get('campus_id')
    
    if not name or not contact or not admission_number or not class_grade:
        return jsonify({'error': 'Name, contact, admission number, and class grade are required'}), 400
        
    check_admission = db.query('SELECT id FROM students WHERE admission_number = $1', [admission_number])
    if len(check_admission) > 0:
        return jsonify({'error': 'Student with this admission number already exists'}), 400
        
    parent_id = None
    if parent_name and parent_contact:
        parent_res = db.query('INSERT INTO parents (name, contact) VALUES ($1, $2)', [parent_name, parent_contact])
        parent_id = parent_res[0]['id']
        
    user_res = db.query(
        'INSERT INTO users (name, role, contact, campus_id) VALUES ($1, $2, $3, $4)',
        [name, 'Student', contact, campus_id or 1]
    )
    user_id = user_res[0]['id']
    
    student_res = db.query(
        'INSERT INTO students (user_id, parent_id, admission_number, class_grade) VALUES ($1, $2, $3, $4)',
        [user_id, parent_id, admission_number, class_grade]
    )
    
    return jsonify({
        'message': 'Student created successfully',
        'student_id': student_res[0]['id'],
        'user_id': user_id
    }), 201

# 4a. DELETE /api/students/:id - Delete student member profile
@app.route('/api/students/<int:student_id>', methods=['DELETE'])
def delete_student(student_id):
    student = db.query('SELECT user_id FROM students WHERE id = $1', [student_id])
    if len(student) == 0:
        return jsonify({'error': 'Student not found'}), 404
        
    user_id = student[0]['user_id']
    
    active_trans = db.query('SELECT id FROM transactions WHERE user_id = $1 AND actual_return_date IS NULL', [user_id])
    if len(active_trans) > 0:
        return jsonify({'error': 'Cannot delete member with active book checkouts'}), 400
        
    # Delete related records
    db.query('DELETE FROM fine_ledger WHERE transaction_id IN (SELECT id FROM transactions WHERE user_id = $1)', [user_id])
    db.query('DELETE FROM transactions WHERE user_id = $1', [user_id])
    db.query('DELETE FROM students WHERE id = $1', [student_id])
    db.query('DELETE FROM users WHERE id = $1', [user_id])
    
    return jsonify({'message': 'Member deleted successfully'}), 200

# 5. POST /api/transactions/issue - Issue book
@app.route('/api/transactions/issue', methods=['POST'])
def issue_book():
    data = request.json or {}
    book_id = data.get('book_id')
    user_id = data.get('user_id')
    expected_return_days = data.get('expected_return_days')
    
    if not book_id or not user_id:
        return jsonify({'error': 'Book ID and User ID are required'}), 400
        
    book = db.query('SELECT available_copies, availability_status FROM books WHERE id = $1', [book_id])
    if len(book) == 0:
        return jsonify({'error': 'Book not found'}), 404
        
    if book[0]['available_copies'] <= 0:
        return jsonify({'error': 'Book is currently out of stock'}), 400
        
    user = db.query('SELECT id FROM users WHERE id = $1', [user_id])
    if len(user) == 0:
        return jsonify({'error': 'User/Student not found'}), 404
        
    today = datetime.now()
    return_days = int(expected_return_days or 14)
    expected_return = today + timedelta(days=return_days)
    
    today_str = today.strftime('%Y-%m-%d')
    expected_str = expected_return.strftime('%Y-%m-%d')
    
    db.query('UPDATE books SET available_copies = available_copies - 1 WHERE id = $1', [book_id])
    
    trans_res = db.query(
        'INSERT INTO transactions (book_id, user_id, issue_date, expected_return_date, status) VALUES ($1, $2, $3, $4, $5)',
        [book_id, user_id, today_str, expected_str, 'Active']
    )
    
    return jsonify({
        'message': 'Book issued successfully',
        'transaction_id': trans_res[0]['id']
    }), 201

# 6. POST /api/transactions/return - Return book & calculate dynamic fine
@app.route('/api/transactions/return', methods=['POST'])
def return_book():
    data = request.json or {}
    transaction_id = data.get('transaction_id')
    
    if not transaction_id:
        return jsonify({'error': 'Transaction ID is required'}), 400
        
    transaction = db.query('SELECT t.*, b.id as book_id FROM transactions t JOIN books b ON t.book_id = b.id WHERE t.id = $1', [transaction_id])
    if len(transaction) == 0:
        return jsonify({'error': 'Transaction not found'}), 404
        
    if transaction[0]['actual_return_date']:
        return jsonify({'error': 'Book has already been returned'}), 400
        
    today_str = datetime.now().strftime('%Y-%m-%d')
    expected_return = datetime.strptime(transaction[0]['expected_return_date'], '%Y-%m-%d')
    actual_return = datetime.strptime(today_str, '%Y-%m-%d')
    
    diff_days = (actual_return - expected_return).days
    
    fine_amount = 0.0
    if diff_days > 0:
        fine_amount = diff_days * 10.0
        
    db.query('UPDATE books SET available_copies = available_copies + 1 WHERE id = $1', [transaction[0]['book_id']])
    
    db.query(
        'UPDATE transactions SET actual_return_date = $1, fine_amount = $2, status = $3 WHERE id = $4',
        [today_str, fine_amount, 'Returned', transaction_id]
    )
    
    if fine_amount > 0:
        db.query(
            'INSERT INTO fine_ledger (transaction_id, amount_due, payment_status, automated_reminder_sent) VALUES ($1, $2, $3, $4)',
            [transaction_id, fine_amount, 'Unpaid', 0]
        )
        
    return jsonify({
        'message': 'Book returned successfully',
        'return_date': today_str,
        'overdue_days': diff_days if diff_days > 0 else 0,
        'fine_accrued': fine_amount
    }), 200

# 7. GET /api/dashboard/stats - Bento grid metrics and tables
@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    today_str = datetime.now().strftime('%Y-%m-%d')
    
    # Dynamically flag overdue transactions
    db.query(
        "UPDATE transactions SET status = 'Overdue' WHERE actual_return_date IS NULL AND expected_return_date < $1 AND status != 'Overdue'",
        [today_str]
    )
    
    # Sync fine_ledger amounts for active overdues
    active_overdues = db.query("SELECT id, expected_return_date FROM transactions WHERE status = 'Overdue' AND actual_return_date IS NULL")
    for item in active_overdues:
        expected = datetime.strptime(item['expected_return_date'], '%Y-%m-%d')
        today = datetime.strptime(today_str, '%Y-%m-%d')
        diff_days = (today - expected).days
        calculated_fine = diff_days * 10.0 if diff_days > 0 else 0.0
        
        db.query('UPDATE transactions SET fine_amount = $1 WHERE id = $2', [calculated_fine, item['id']])
        
        ledger_rec = db.query('SELECT id FROM fine_ledger WHERE transaction_id = $1', [item['id']])
        if len(ledger_rec) > 0:
            db.query('UPDATE fine_ledger SET amount_due = $1 WHERE transaction_id = $2 AND payment_status = $3', [calculated_fine, item['id'], 'Unpaid'])
        else:
            db.query('INSERT INTO fine_ledger (transaction_id, amount_due, payment_status, automated_reminder_sent) VALUES ($1, $2, $3, $4)', [item['id'], calculated_fine, 'Unpaid', 0])
            
    # Gather Stats
    total_books = db.query('SELECT SUM(total_copies) as count FROM books')
    active_issues = db.query('SELECT count(*) as count FROM transactions WHERE actual_return_date IS NULL')
    total_overdue = db.query("SELECT count(*) as count FROM transactions WHERE status = 'Overdue' AND actual_return_date IS NULL")
    total_fines = db.query("SELECT SUM(amount_due) as total FROM fine_ledger WHERE payment_status = 'Unpaid'")
    
    # Recent Transactions
    recent_transactions = db.query("""
      SELECT t.id, b.title, u.name as student_name, t.issue_date, t.expected_return_date, t.actual_return_date, t.status, t.fine_amount
      FROM transactions t
      JOIN books b ON t.book_id = b.id
      JOIN users u ON t.user_id = u.id
      ORDER BY t.id DESC
      LIMIT 5
    """)
    
    # Overdue list
    overdue_list = db.query("""
      SELECT t.id as transaction_id, b.title as book_title, u.name as student_name, u.contact as student_contact,
             t.expected_return_date, t.fine_amount, fl.automated_reminder_sent, fl.id as ledger_id
      FROM transactions t
      JOIN books b ON t.book_id = b.id
      JOIN users u ON t.user_id = u.id
      LEFT JOIN fine_ledger fl ON t.id = fl.transaction_id
      WHERE t.status = 'Overdue' AND t.actual_return_date IS NULL
      ORDER BY t.fine_amount DESC
    """)
    
    # Category split
    category_stats = db.query("""
      SELECT category, COUNT(*) as count, SUM(total_copies) as total_copies
      FROM books
      GROUP BY category
    """)
    
    metrics = {
        'totalBooks': int(total_books[0]['count'] or 0),
        'activeIssues': int(active_issues[0]['count'] or 0),
        'totalOverdue': int(total_overdue[0]['count'] or 0),
        'totalFines': float(total_fines[0]['total'] or 0.0)
    }
    
    return jsonify({
        'metrics': metrics,
        'recentTransactions': recent_transactions,
        'overdueList': overdue_list,
        'categoryStats': category_stats
    }), 200

# 8. POST /api/ai/counsel - Mock AI counseling progression pathways
@app.route('/api/ai/counsel', methods=['POST'])
def ai_counsel():
    data = request.json or {}
    student_id = data.get('student_id')
    if not student_id:
        return jsonify({'error': 'Student ID is required'}), 400
        
    student_info = db.query("""
      SELECT u.name, s.class_grade, s.admission_number, p.name as parent_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE s.id = $1
    """, [student_id])
    
    if len(student_info) == 0:
        return jsonify({'error': 'Student profile not found'}), 404
        
    name = student_info[0]['name']
    overdue_check = db.query(
        'SELECT id FROM transactions WHERE user_id = (SELECT user_id FROM students WHERE id = $1) AND status = $2',
        [student_id, 'Overdue']
    )
    
    dropout_risk = 'Low'
    recommendations = [
      'Encourage engagement with advanced computer science data structures catalog.',
      'Recommend enrollment in SQL programming workshop based on database research history.',
      'Ensure standard class attendance remains above 90% (currently optimal).'
    ]
    
    if len(overdue_check) > 0:
        dropout_risk = 'Medium-High (Academic Neglect)'
        recommendations.insert(0, 'Urgent notice: Active overdue books with pending fines detected. Initiate parental notification.')
        recommendations.insert(1, 'Arrange a counselor meeting to address study routine inconsistencies.')
        
    plan_text = f"### Academic Pathway for {name}\n\n1. **Core Syllabus Progression**:\n   Maintain strict study schedules for board subjects. Clear any pending library assets to avoid suspension of borrowing privileges.\n\n2. **AI Study Recommendation**:\n   Review \"Clean Code\" reference chapters. Set up weekly check-ins with counselor to monitor compliance with academic timelines.\n\n3. **Administrative Guidelines**:\n   Arrange parent counseling session with {student_info[0]['parent_name'] or 'Guardian'} regarding school resources utilisation."
    
    return jsonify({
        'studentName': name,
        'admissionNumber': student_info[0]['admission_number'],
        'grade': student_info[0]['class_grade'],
        'dropoutRisk': dropout_risk,
        'academicStanding': 'Needs Attention' if len(overdue_check) > 0 else 'Excellent',
        'placementReadiness': 'Deferred (Clear Library Dues)' if len(overdue_check) > 0 else 'Highly Eligible',
        'recommendedActions': recommendations,
        'generatedPlan': plan_text
    }), 200

# 9. POST /api/ai/doubt - Simple doubt assistant in English / Telugu
@app.route('/api/ai/doubt', methods=['POST'])
def ai_doubt():
    data = request.json or {}
    question = data.get('question')
    if not question:
        return jsonify({'error': 'Question text is required'}), 400
        
    q_lower = question.lower()
    if 'algorithm' in q_lower or 'అల్గోరిథం' in q_lower:
        answer = "**English**: An algorithm is a step-by-step procedure or set of rules to solve a problem or accomplish a task.\n\n**తెలుగు**: అల్గోరిథం అంటే ఏదైనా సమస్యను పరిష్కరించడానికి లేదా ఒక పనిని పూర్తి చేయడానికి దశలవారీగా అనుసరించే నియమాలు లేదా పద్ధతి."
    elif 'database' in q_lower or 'డేటాబేస్' in q_lower:
        answer = "**English**: A database is an organized collection of structured information, or data, stored electronically in a computer system.\n\n**తెలుగు**: డేటాబేస్ అనేది కంప్యూటర్ సిస్టమ్‌లో ఎలక్ట్రానిక్‌గా నిల్వ చేయబడిన వ్యవస్థీకృత సమాచారం లేదా డేటా యొక్క సేకరణ."
    elif 'recursion' in q_lower or 'రికర్శన్' in q_lower:
        answer = "**English**: Recursion is a programming technique where a function calls itself directly or indirectly to solve a smaller instance of the same problem.\n\n**తెలుగు**: రికర్శన్ అనేది ఒక ప్రోగ్రామింగ్ పద్ధతి, ఇక్కడ ఒక ఫంక్షన్ అదే సమస్యను చిన్న భాగాలుగా పరిష్కరించడానికి తనను తాను పిలుచుకుంటుంది."
    elif 'data analysis' in q_lower or 'డేటా విశ్లేషణ' in q_lower or 'analyze data' in q_lower:
        answer = "**English**: To perform data analysis:\n1. **Load and Inspect**: Load the data and print its shape, column names, dtypes, and a small sample. Always look before you compute.\n2. **Clean Data**: Clean obvious issues — nulls, duplicates, type mismatches — and note what you changed.\n3. **Analyze**: Answer the question using code (prefer pandas/polars, matplotlib/plotly). Show intermediate results.\n4. **Product Analytics**: Query Amplitude directly and link the chart.\n5. **Output**: Save charts to `/mnt/session/outputs/` and summarize findings with caveats.\n\n**తెలుగు**: డేటా విశ్లేషణ చేయడానికి:\n1. **డేటాను లోడ్ చేయడం**: డేటా ఆకారం (shape), నిలువు వరుసల పేర్లు మరియు నమూనాను ముద్రించండి.\n2. **డేటాను శుభ్రపరచడం**: లోపాలు, నకిలీలను తొలగించండి.\n3. **విశ్లేషణ**: కోడ్ సహాయంతో ప్రశ్నకు సమాధానం ఇవ్వండి.\n4. **ప్రొడక్ట్ విశ్లేషణ**: ఆంప్లిట్యూడ్ (Amplitude) ఉపయోగించి చార్ట్‌లను లింక్ చేయండి.\n5. **নিవేదిక**: చార్ట్‌లను `/mnt/session/outputs/` లో సేవ్ చేయండి మరియు వివరించండి."
    else:
        answer = "**English**: Thank you for your question. As your AI study guide, I recommend looking up the standard textbooks on this topic in our book catalog for deep reading.\n\n**తెలుగు**: మీ ప్రశ్నకు ధన్యవాదాలు. మీ AI స్టడీ గైడ్‌గా, లోతైన అధ్యయనం కోసం మా పుస్తక కేటలాగ్‌లో ఈ విషయానికి సంబంధించిన ప్రామాణిక పాఠ్యపుస్తకాలను చూడాలని నేను సిఫార్సు చేస్తున్నాను."
        
    return jsonify({'question': question, 'answer': answer}), 200

# 10. POST /api/notifications/remind - Trigger notification simulation
@app.route('/api/notifications/remind', methods=['POST'])
def notify_remind():
    data = request.json or {}
    ledger_id = data.get('ledger_id')
    student_name = data.get('student_name')
    student_contact = data.get('student_contact')
    book_title = data.get('book_title')
    fine_amount = data.get('fine_amount')
    
    if ledger_id and (not student_name or not student_contact):
        record = db.query("""
            SELECT u.name as student_name, u.contact as student_contact, b.title as book_title, fl.amount_due as fine_amount
            FROM fine_ledger fl
            JOIN transactions t ON fl.transaction_id = t.id
            JOIN users u ON t.user_id = u.id
            JOIN books b ON t.book_id = b.id
            WHERE fl.id = $1
        """, [ledger_id])
        if len(record) > 0:
            student_name = record[0]['student_name']
            student_contact = record[0]['student_contact']
            book_title = record[0]['book_title']
            fine_amount = record[0]['fine_amount']

    if not ledger_id or not student_name or not student_contact:
        return jsonify({'error': 'Missing notification target properties'}), 400
        
    db.query('UPDATE fine_ledger SET automated_reminder_sent = 1 WHERE id = $1', [ledger_id])
    
    timestamp = datetime.now().isoformat()
    msg_body = f"Dear {student_name}, your issued book '{book_title or 'Library Asset'}' is overdue. Total fine: ₹{fine_amount}. Please return it to the library immediately."
    
    print(f"[NOTIFY DISPATCH] [{timestamp}] WhatsApp API triggered for {student_name} ({student_contact})")
    print(f"[NOTIFY PAYLOAD] Message: \"{msg_body}\"")
    
    return jsonify({
        'status': 'Success',
        'channel': 'WhatsApp Business API & Email API',
        'dispatchTime': timestamp,
        'payload': {
            'to': student_contact,
            'body': msg_body
        }
    }), 200

# 11. Health Check Heartbeat
@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'OK',
        'timestamp': datetime.now().isoformat()
    }), 200

# Server initialization & entrypoint
if __name__ == '__main__':
    # Initialize SQLite schema and mock values
    db.initialize_database()
    print(f"===================================================")
    print(f"Server is running in {db.DB_TYPE} mode")
    print(f"Server listening on URL: http://localhost:{PORT}")
    print(f"===================================================")
    app.run(host='0.0.0.0', port=PORT, debug=True)
