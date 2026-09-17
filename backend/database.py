import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'ytu_courses.db')


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, code TEXT UNIQUE NOT NULL)')
    cursor.execute('CREATE TABLE IF NOT EXISTS courses (id INTEGER PRIMARY KEY AUTOINCREMENT, department_code TEXT NOT NULL, code TEXT NOT NULL, name TEXT NOT NULL, year INTEGER NOT NULL, is_elective INTEGER DEFAULT 0, UNIQUE(department_code, code))')
    cursor.execute('CREATE TABLE IF NOT EXISTS sections (id INTEGER PRIMARY KEY AUTOINCREMENT, course_code TEXT NOT NULL, section_id TEXT NOT NULL, instructor TEXT)')

    cursor.execute('CREATE TABLE IF NOT EXISTS time_slots (id INTEGER PRIMARY KEY AUTOINCREMENT, section_db_id INTEGER NOT NULL, day TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, classroom TEXT)')
    
    # Safe alter table for existing databases
    for col, col_type in [('credits', 'INTEGER DEFAULT 3'), ('ects', 'INTEGER DEFAULT 5'), ('instructor', 'TEXT'), ('is_online', 'INTEGER DEFAULT 0'), ('days', 'TEXT'), ('semester', 'TEXT')]:
        try:
            cursor.execute(f'ALTER TABLE courses ADD COLUMN {col} {col_type}')
        except Exception:
            pass

    # Fast load from cached JSON data if database tables are empty
    cursor.execute('SELECT COUNT(*) FROM courses')
    c_count = cursor.fetchone()[0]
    
    cache_json_path = os.path.join(BASE_DIR, 'data', 'parsed_courses_cache.json')
    if c_count == 0 and os.path.exists(cache_json_path):
        try:
            import json
            with open(cache_json_path, 'r', encoding='utf-8') as f:
                cached = json.load(f)
                
            cursor.executemany(
                '''INSERT OR REPLACE INTO courses 
                   (id, department_code, code, name, year, is_elective, credits, ects, instructor, is_online, days, semester)
                   VALUES (:id, :department_code, :code, :name, :year, :is_elective, :credits, :ects, :instructor, :is_online, :days, :semester)''',
                cached.get('courses', [])
            )
            cursor.executemany(
                'INSERT OR REPLACE INTO sections (id, course_code, section_id, instructor) VALUES (:id, :course_code, :section_id, :instructor)',
                cached.get('sections', [])
            )
            cursor.executemany(
                'INSERT OR REPLACE INTO time_slots (id, section_db_id, day, start_time, end_time, classroom) VALUES (:id, :section_db_id, :day, :start_time, :end_time, :classroom)',
                cached.get('time_slots', [])
            )
            print("Database instantly seeded from cached JSON file!")
        except Exception as e:
            print(f"Cache loading warning: {e}")

    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
