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
    "2627_Guz_Lisans_Bilgisayar_Muhendisligi": ("BLM", "Bilgisayar Mühendisliği"),
    "elektrik": ("ELK", "Elektrik Mühendisliği"),
    "elektronik": ("EHM", "Elektronik ve Haberleşme Mühendisliği"),
    "endüstri": ("END", "Endüstri Mühendisliği"),
    "makine": ("MAK", "Makine Mühendisliği"),
    "biyomedikal": ("BMD", "Biyomedikal Mühendisliği"),
    "biyomühendislik": ("BIO", "Biyomühendislik"),
    "gıda": ("GDA", "Gıda Mühendisliği"),
    "kimya": ("KIM", "Kimya Mühendisliği"),
    "mat müh": ("MAT", "Matematik Mühendisliği"),
    "mekatronik": ("MKT", "Mekatronik Mühendisliği"),
    "metalurji": ("MET", "Metalurji ve Malzeme Mühendisliği"),
    "yapay zeka": ("YZV", "Yapay Zeka ve Veri Mühendisliği"),
}

def get_dept_code(filename):
    fname_lower = filename.lower()
    for key, (code, name) in DEPT_MAPPING.items():
        if key in fname_lower:
            return code, name
    return "GENEL", "Genel Mühendislik"

def process_pdf(file_path, dept_code):
    courses_found = []
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text:
                    continue
                # Match course codes like BLM1011, FIZ1001, MAT1071, EHM2011, END3011 etc.
                matches = re.findall(r'([A-Z]{3,4}\s?\d{4})\s+([A-ZÇĞİÖŞÜa-zçğiöşü0-9\s\.\,\-\(\)]+)', text)
                for code, name_raw in matches:
                    clean_code = code.replace(" ", "")
                    clean_name = name_raw.split("\n")[0].strip()[:60]
                    if len(clean_name) > 3:
                        # Estimate year from 1st digit of course code
                        digit_match = re.search(r'\d', clean_code)
                        year = int(digit_match.group(0)) if digit_match else 1
                        if year > 4 or year < 1: year = 1
                        
                        is_elective = 1 if "SEÇ" in clean_name.upper() or "ELECTIVE" in clean_name.upper() else 0
                        is_online = 1 if "ONLINE" in text.upper() or "UZAKTAN" in text.upper() else 0
                        
                        courses_found.append({
                            'dept': dept_code,
                            'code': clean_code,
                            'name': clean_name,
                            'year': year,
                            'is_elective': is_elective,
                            'is_online': is_online
                        })
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    return courses_found

def process_excel(file_path, dept_code):
    courses_found = []
    try:
        df = pd.read_excel(file_path)
        for _, row in df.iterrows():
            row_str = " ".join([str(val) for val in row.values if pd.notna(val)])
            matches = re.findall(r'([A-Z]{3,4}\s?\d{4})\s+([A-ZÇĞİÖŞÜa-zçğiöşü0-9\s\.\,\-\(\)]+)', row_str)
            for code, name_raw in matches:
                clean_code = code.replace(" ", "")
                clean_name = name_raw.split("\n")[0].strip()[:60]
                if len(clean_name) > 3:
                    digit_match = re.search(r'\d', clean_code)
                    year = int(digit_match.group(0)) if digit_match else 1
                    if year > 4 or year < 1: year = 1
                    
                    is_elective = 1 if "SEÇ" in clean_name.upper() else 0
                    courses_found.append({
                        'dept': dept_code,
                        'code': clean_code,
                        'name': clean_name,
                        'year': year,
                        'is_elective': is_elective,
                        'is_online': 0
                    })
    except Exception as e:
        print(f"Error reading excel {file_path}: {e}")
    return courses_found

def parse_and_seed_all():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    total_added = 0
    files = os.listdir(DESKTOP_DIR)
    
    print(f"Found {len(files)} files on Desktop folder.")
    for fname in files:
        file_path = os.path.join(DESKTOP_DIR, fname)
        dept_code, dept_name = get_dept_code(fname)
        
        # Ensure department exists in departments table
        cursor.execute("INSERT OR IGNORE INTO departments (name, code) VALUES (?, ?)", (dept_name, dept_code))
        
        courses = []
        if fname.endswith(".pdf"):
            courses = process_pdf(file_path, dept_code)
        elif fname.endswith(".xlsx") or fname.endswith(".xls"):
            courses = process_excel(file_path, dept_code)
            
        for c in courses:
            cursor.execute(
                """INSERT OR REPLACE INTO courses 
                   (department_code, code, name, year, is_elective, credits, ects, instructor, is_online)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (c['dept'], c['code'], c['name'], c['year'], c['is_elective'], 3, 5, 'Bölüm Öğretim Üyeleri', c['is_online'])
            )
            total_added += 1

    conn.commit()
    conn.close()
    print(f"Masaüstündeki tüm ders programı dosyaları başarıyla işlendi! Toplam {total_added} ders veritabanına aktarıldı.")

if __name__ == '__main__':
    parse_and_seed_all()
