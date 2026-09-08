# -*- coding: utf-8 -*-
import os
import re
import sqlite3
import pdfplumber
import pandas as pd
from database import DB_PATH, init_db

init_db()

DESKTOP_DIR = r"C:\Users\ati_c\OneDrive\Desktop\ders seçim"

DEPT_MAPPING = {
    "2627_guz_lisans_bilgisayar": ("BLM", "Bilgisayar Mühendisliği"),
    "elektrik": ("ELK", "Elektrik Mühendisliği"),
    "elektronik": ("EHM", "Elektronik ve Haberleşme Mühendisliği"),
    "endüstri": ("END", "Endüstri Mühendisliği"),
    "makine": ("MAK", "Makine Mühendisliği"),
    "biyomedikal": ("BMD", "Biyomedikal Mühendisliği"),
    "biyomühendislik": ("BIO", "Biyomühendislik Bölümü"),
    "gıda": ("GDA", "Gıda Mühendisliği Bölümü"),
    "kimya": ("KIM", "Kimya Mühendisliği Bölümü"),
    "mat müh": ("MAT", "Matematik Mühendisliği Bölümü"),
    "mekatronik": ("MKT", "Mekatronik Mühendisliği"),
    "metalurji": ("MET", "Metalurji ve Malzeme Mühendisliği Bölümü"),
    "yapay zeka": ("YZV", "Yapay Zeka ve Veri Mühendisliği"),
    "kontrol": ("KOM", "Kontrol ve Otomasyon Mühendisliği"),
}

DAYS_MAP = {
    'PAZARTESİ': 'Pazartesi', 'P\nA\nZ\nA\nR\nT\nE\nS\nİ': 'Pazartesi', 'P\nA\nZ\nA\nR\nT\nE\nS\nİ': 'Pazartesi',
    'SALI': 'Salı', 'S\nA\nL\nI': 'Salı',
    'ÇARŞAMBA': 'Çarşamba', 'Ç\nA\nR\nŞ\nA\nM\nB\nA': 'Çarşamba',
    'PERŞEMBE': 'Perşembe', 'P\nE\nR\nŞ\nE\nM\nB\nE': 'Perşembe',
    'CUMA': 'Cuma', 'C\nU\nM\nA': 'Cuma',
    'CUMARTESİ': 'Cumartesi'
}

def get_dept_code(filename):
    fname_lower = filename.lower()
    for key, (code, name) in DEPT_MAPPING.items():
        if key in fname_lower:
            return code, name
    return "GENEL", "Genel Mühendislik"

def process_pdf_schedule(file_path, dept_code):
    courses_dict = {}
    try:
        with pdfplumber.open(file_path) as pdf:
            current_day = 'Pazartesi'
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        if not row or len(row) < 3:
                            continue
                        
                        # Check Day column
                        first_col = str(row[0] or '').replace(' ', '').upper()
                        for d_key, d_val in DAYS_MAP.items():
                            if d_key.replace('\n','').replace(' ','') in first_col:
                                current_day = d_val
                                break
                        
                        time_cell = str(row[1] or '').strip()
                        
                        # Process year cells (1. YIL, 2. YIL, 3. YIL, 4. YIL)
                        for year_idx, cell in enumerate(row[2:], start=1):
                            if not cell:
                                continue
                            cell_text = str(cell).replace('\n', ' ').strip()
                            if not cell_text:
                                continue
                            
                            # Find course code like BLM1011, MAT1071, EHM2011, etc.
                            code_match = re.search(r'([A-Z]{3,4}\s?\d{4})', cell_text)
                            if code_match:
                                code = code_match.group(1).replace(' ', '')
                                # Name comes after code or full cell_text
                                name_part = cell_text.replace(code_match.group(1), '').strip()
                                name = name_part if len(name_part) > 2 else f"{code} Ders"
                                
                                is_online = 1 if ('ONLINE' in cell_text.upper() or 'UZAKTAN' in cell_text.upper()) else 0
                                is_elective = 1 if ('SEÇ' in cell_text.upper() or 'ELECTIVE' in cell_text.upper()) else 0
                                
                                if code not in courses_dict:
                                    courses_dict[code] = {
                                        'dept': dept_code,
                                        'code': code,
                                        'name': name[:60],
                                        'year': min(year_idx, 4),
                                        'is_elective': is_elective,
                                        'is_online': is_online,
                                        'days': set([current_day]),
                                        'time': time_cell if re.match(r'\d{2}', time_cell) else '08.30-11.20'
                                    }
                                else:
                                    courses_dict[code]['days'].add(current_day)
    except Exception as e:
        print(f"Error parsing PDF schedule {file_path}: {e}")
    
    return list(courses_dict.values())

def process_excel_schedule(file_path, dept_code):
    courses_dict = {}
    try:
        df = pd.read_excel(file_path)
        current_day = 'Pazartesi'
        for _, row in df.iterrows():
            row_str = " ".join([str(val) for val in row.values if pd.notna(val)])
            
            for d_key, d_val in DAYS_MAP.items():
                if d_key.replace('\n','') in row_str.upper():
                    current_day = d_val
                    break
            
            code_matches = re.findall(r'([A-Z]{3,4}\s?\d{4})\s+([A-ZÇĞİÖŞÜa-zçğiöşü0-9\s\.\,\-\(\)]+)', row_str)
            for code, name_raw in code_matches:
                clean_code = code.replace(" ", "")
                clean_name = name_raw.split("\n")[0].strip()[:60]
                if len(clean_name) > 3:
                    digit_match = re.search(r'\d', clean_code)
                    year = int(digit_match.group(0)) if digit_match else 1
                    if year > 4 or year < 1: year = 1
                    
                    is_elective = 1 if "SEÇ" in clean_name.upper() else 0
                    if clean_code not in courses_dict:
                        courses_dict[clean_code] = {
                            'dept': dept_code,
                            'code': clean_code,
                            'name': clean_name,
                            'year': year,
                            'is_elective': is_elective,
                            'is_online': 0,
                            'days': set([current_day]),
                            'time': '09.30-12.20'
                        }
                    else:
                        courses_dict[clean_code]['days'].add(current_day)
    except Exception as e:
        print(f"Error reading excel {file_path}: {e}")
    return list(courses_dict.values())

def parse_and_seed_comprehensive():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute('DROP TABLE IF EXISTS courses')
    cursor.execute('''
        CREATE TABLE courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            department_code TEXT NOT NULL,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            year INTEGER NOT NULL,
            is_elective INTEGER DEFAULT 0,
            credits INTEGER DEFAULT 3,
            ects INTEGER DEFAULT 5,
            instructor TEXT,
            is_online INTEGER DEFAULT 0,
            days TEXT DEFAULT 'Pazartesi'
        )
    ''')

    total_added = 0
    files = os.listdir(DESKTOP_DIR)
    
    print(f"Desktop folder: processing {len(files)} files...")
    for fname in files:
        file_path = os.path.join(DESKTOP_DIR, fname)
        dept_code, dept_name = get_dept_code(fname)
        
        cursor.execute("INSERT OR IGNORE INTO departments (name, code) VALUES (?, ?)", (dept_name, dept_code))
        
        courses = []
        if fname.endswith(".pdf"):
            courses = process_pdf_schedule(file_path, dept_code)
        elif fname.endswith(".xlsx") or fname.endswith(".xls"):
            courses = process_excel_schedule(file_path, dept_code)
            
        for c in courses:
            days_str = ", ".join(sorted(list(c['days'])))
            cursor.execute(
                """INSERT OR REPLACE INTO courses 
                   (department_code, code, name, year, is_elective, credits, ects, instructor, is_online, days)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (c['dept'], c['code'], c['name'], c['year'], c['is_elective'], 3, 5, 'Bölüm Öğretim Üyeleri', c['is_online'], days_str)
            )
            total_added += 1

    conn.commit()
    conn.close()
    print(f"Tüm ders programları günleriyle birlikte veritabanına aktarıldı! Toplam {total_added} ders kaydedildi.")

if __name__ == '__main__':
    parse_and_seed_comprehensive()
