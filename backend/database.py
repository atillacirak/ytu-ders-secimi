# -*- coding: utf-8 -*-
import sqlite3

DB_PATH = 'ytu_courses.db'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, code TEXT UNIQUE NOT NULL)')
    cursor.execute('CREATE TABLE IF NOT EXISTS courses (id INTEGER PRIMARY KEY AUTOINCREMENT, department_code TEXT NOT NULL, code TEXT NOT NULL, name TEXT NOT NULL, year INTEGER NOT NULL, is_elective INTEGER DEFAULT 0)')
    cursor.execute('CREATE TABLE IF NOT EXISTS sections (id INTEGER PRIMARY KEY AUTOINCREMENT, course_code TEXT NOT NULL, section_id TEXT NOT NULL, instructor TEXT)')
    cursor.execute('CREATE TABLE IF NOT EXISTS time_slots (id INTEGER PRIMARY KEY AUTOINCREMENT, section_db_id INTEGER NOT NULL, day TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, classroom TEXT)')
    
    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
