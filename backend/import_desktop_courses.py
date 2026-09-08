# -*- coding: utf-8 -*-
import os
import re
import sqlite3
import pdfplumber
import pandas as pd
from database import DB_PATH, init_db

init_db()

DESKTOP_DIR = r"C:\Users\ati_c\OneDrive\Desktop\ders seçim"
if not os.path.exists(DESKTOP_DIR):
    DESKTOP_DIR = r"C:\Users\ati_c\Desktop\ders seçim"




DEPT_MAPPING = {
    "biyomudhendislik": ("BIO", "Biyomühendislik"),
    "biyomühendislik": ("BIO", "Biyomühendislik"),
    "bilgisayar": ("BLM", "Bilgisayar Mühendisliği"),
    "biyomedikal": ("BMD", "Biyomedikal Mühendisliği"),
    "elektronik": ("EHM", "Elektronik ve Haberleşme Mühendisliği"),
    "elektrik": ("ELK", "Elektrik Mühendisliği"),
    "endustri": ("END", "Endüstri Mühendisliği"),
    "endüstri": ("END", "Endüstri Mühendisliği"),
    "gida": ("GDA", "Gıda Mühendisliği"),
    "gıda": ("GDA", "Gıda Mühendisliği"),
    "kimya %100": ("KIM_ENG", "Kimya Mühendisliği (%100 İngilizce)"),
    "kimya %30": ("KIM", "Kimya Mühendisliği (%30 İngilizce)"),
    "makine": ("MAK", "Makine Mühendisliği"),
    "mat müh": ("MAT", "Matematik Mühendisliği"),
    "matematik": ("MAT", "Matematik Mühendisliği"),
    "metalurji %100": ("MET_ENG", "Metalurji ve Malzeme Mühendisliği (%100 İngilizce)"),
    "metalurji %30": ("MET", "Metalurji ve Malzeme Mühendisliği (%30 İngilizce)"),
    "mekatronik": ("MKT", "Mekatronik Mühendisliği"),
    "yapay zeka": ("YZV", "Yapay Zeka Mühendisliği"),
}


DAYS_MAP = {
    'PAZARTESİ': 'Pazartesi',
    'SALI': 'Salı',
    'ÇARŞAMBA': 'Çarşamba',
    'PERŞEMBE': 'Perşembe',
    'CUMA': 'Cuma',
    'CUMARTESİ': 'Cumartesi'
}

CLEAN_COURSE_DB = {
    # --- Ortak Servis Dersleri ---
    'ATA1031': {'name': 'Atatürk İlkeleri ve İnkılap Tarihi 1', 'year': 4, 'is_elective': 0, 'credits': 0, 'ects': 2},
    'ATA1032': {'name': 'Atatürk İlkeleri ve İnkılâp Tarihi 2', 'year': 4, 'is_elective': 0, 'credits': 0, 'ects': 2},
    'TDB1031': {'name': 'Türkçe 1', 'year': 3, 'is_elective': 0, 'credits': 0, 'ects': 2},
    'TDB1032': {'name': 'Türkçe 2', 'year': 4, 'is_elective': 0, 'credits': 0, 'ects': 2},
    'FIZ1001': {'name': 'Fizik 1', 'year': 1, 'is_elective': 0, 'credits': 4, 'ects': 6},
    'FIZ1002': {'name': 'Fizik 2', 'year': 1, 'is_elective': 0, 'credits': 4, 'ects': 6},
    'FIZ1951': {'name': 'Mühendisler için Yarıiletken Fiziği', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'MAT1071': {'name': 'Matematik 1', 'year': 1, 'is_elective': 0, 'credits': 4, 'ects': 6},
    'MAT1072': {'name': 'Matematik 2', 'year': 1, 'is_elective': 0, 'credits': 4, 'ects': 6},
    'MAT1320': {'name': 'Lineer Cebir', 'year': 1, 'is_elective': 0, 'credits': 2, 'ects': 4},
    'MAT2411': {'name': 'Diferansiyel Denklemler', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MDB1031': {'name': 'İleri İngilizce 1', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 3},
    'MDB1032': {'name': 'İleri İngilizce 2', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 3},

    # --- Bilgisayar Mühendisliği (BLM Müfredatı) ---
    'BLM1011': {'name': 'Bilgisayar Bilimlerine Giriş', 'year': 1, 'is_elective': 0, 'credits': 4, 'ects': 6},
    'BLM1991': {'name': 'İş Sağlığı ve Güvenliği 1', 'year': 1, 'is_elective': 0, 'credits': 2, 'ects': 2},
    'BLM1031': {'name': 'Yapısal Programlama', 'year': 1, 'is_elective': 0, 'credits': 4, 'ects': 6},
    'BLM1022': {'name': 'Sayısal Analiz', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'BLM1033': {'name': 'Devre Teorisi ve Elektronik Devreler', 'year': 1, 'is_elective': 0, 'credits': 4, 'ects': 6},
    'BLM2012': {'name': 'Nesneye Yönelik Programlama', 'year': 2, 'is_elective': 0, 'credits': 4, 'ects': 6},
    'BLM2611': {'name': 'Lojik Devreler', 'year': 2, 'is_elective': 0, 'credits': 4, 'ects': 6},
    'BLM2642': {'name': 'Bilgisayar Mühendisleri için Diferansiyel Denklemler', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'BLM2011': {'name': 'İstatistik ve Olasılık Hesapları', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'BLM2521': {'name': 'Ayrık Matematik', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'BLM2512': {'name': 'Veri Yapıları ve Algoritmalar', 'year': 2, 'is_elective': 0, 'credits': 4, 'ects': 6},
    'BLM2022': {'name': 'Bilgisayar Organizasyonu', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 4},
    'BLM2041': {'name': 'Bilgisayar Mühendisleri için Sinyaller ve Sistemler', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'BLM2042': {'name': 'Sistem Analizi ve Tasarımı', 'year': 2, 'is_elective': 0, 'credits': 2, 'ects': 3},
    'BLM2502': {'name': 'Hesaplama Kuramı', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'BLM1992': {'name': 'İş Sağlığı ve Güvenliği 2', 'year': 2, 'is_elective': 0, 'credits': 2, 'ects': 2},
    'BLM3011': {'name': 'İşletim Sistemleri', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'BLM3041': {'name': 'Veritabanı Yönetimi', 'year': 3, 'is_elective': 0, 'credits': 4, 'ects': 6},
    'BLM3021': {'name': 'Algoritma Analizi', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'BLM3061': {'name': 'Mikroişlemci Sistemleri ve Assembly Dili', 'year': 3, 'is_elective': 0, 'credits': 4, 'ects': 5},
    'BLM3042': {'name': 'Seminer ve Meslek Etiği', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 3},
    'BLM3002': {'name': 'Genel Staj', 'year': 3, 'is_elective': 0, 'credits': 0, 'ects': 3},
    'BLM3051': {'name': 'Veri İletişimi ve Bilgisayar Ağları', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 4},
    'BLM3010': {'name': 'Bilgisayar Projesi', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 4},
    'BLM3722': {'name': 'Yazılım Mühendisliği', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 4},
    'BLM3510': {'name': 'Yapay Zeka', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 4},
    'BLM4002': {'name': 'Mesleki Staj', 'year': 3, 'is_elective': 0, 'credits': 0, 'ects': 3},
    'BLM9000': {'name': 'Bitirme Çalışması', 'year': 4, 'is_elective': 0, 'credits': 4, 'ects': 8},

}

# Müfredattaki Genel / Sosyal / Mesleki Seçmeli Ders Şablonları (Ders saati/programı olmayan)
BLM_CURRICULUM_ELECTIVE_PLACEHOLDERS = [
    # 2. Yıl Güz
    ('BLM', 'USS-2G', 'Üniversite Sosyal Seçmeli -1', 2, 1, 3, 3, 'Sosyal Seçmeli Havuzu', 0, ''),
    # 3. Yıl Bahar
    ('BLM', 'MES1-3B', 'Mesleki Seçmeli 1-1', 3, 1, 3, 8, 'Bölüm Seçmeli Havuzu', 0, ''),
    ('BLM', 'SOS1-3B', 'Sosyal Seçmeli 1-1', 3, 1, 3, 4, 'Sosyal Seçmeli Havuzu', 0, ''),
    # 4. Yıl Güz
    ('BLM', 'MES2-4G', 'Mesleki Seçmeli 2-1', 4, 1, 1, 3, 'Bölüm Seçmeli Havuzu', 0, ''),
    ('BLM', 'UMS-4G', 'Üniversite Mesleki Seçmeli', 4, 1, 3, 5, 'Üniversite Seçmeli Havuzu', 0, ''),
    ('BLM', 'MES1-4G1', 'Mesleki Seçmeli 1-2', 4, 1, 3, 8, 'Bölüm Seçmeli Havuzu', 0, ''),
    ('BLM', 'MES1-4G2', 'Mesleki Seçmeli 1-3', 4, 1, 3, 8, 'Bölüm Seçmeli Havuzu', 0, ''),
    ('BLM', 'USS-4G', 'Üniversite Sosyal Seçmeli -2', 4, 1, 3, 3, 'Sosyal Seçmeli Havuzu', 0, ''),
    # 4. Yıl Bahar
    ('BLM', 'MES1-4B1', 'Mesleki Seçmeli 1-4', 4, 1, 3, 8, 'Bölüm Seçmeli Havuzu', 0, ''),
    ('BLM', 'MES1-4B2', 'Mesleki Seçmeli 1-5', 4, 1, 3, 8, 'Bölüm Seçmeli Havuzu', 0, ''),
    ('BLM', 'USS-4B', 'Üniversite Sosyal Seçmeli -3', 4, 1, 3, 3, 'Sosyal Seçmeli Havuzu', 0, ''),
]

def clean_course_details(code, raw_name="", year_column=1):
    clean_code = code.upper().replace(" ", "")
    year = year_column if 1 <= year_column <= 4 else 1

    clean_name = raw_name
    garbage_terms = [
        r'\bONLINE\b', r'\bON LINE\b', r'\bUZAKTAN\b', r'\bGr\.\s?\d+\b', r'\bGroup\s?\d+\b',
        r'\b\d\.\s?Sınıf\b', r'\bDZ-\d+\b', r'\bProf\.Dr\.[^\s]*', r'\bDoç\.Dr\.[^\s]*',
        r'\bDr\.Öğr\.Üyesi[^\s]*', r'\bArş\.Gör\.[^\s]*', r'\bKMB-\d+\b', r'\b\(Yıldız\)\b',
        r'\b\d{2}\.\d{2}-\d{2}\.\d{2}\b', r'RAMI2026', r'ELEKTRİK ELEKTRONİK FAKÜLTESİ'
    ]
    for p in garbage_terms:
        clean_name = re.sub(p, '', clean_name, flags=re.IGNORECASE)
    
    clean_name = re.sub(r'\s+', ' ', clean_name).strip()
    
    credits, ects = 3, 5
    if clean_code in CLEAN_COURSE_DB:
        clean_name = CLEAN_COURSE_DB[clean_code]['name']
        year = CLEAN_COURSE_DB[clean_code]['year']
        credits = CLEAN_COURSE_DB[clean_code]['credits']
        ects = CLEAN_COURSE_DB[clean_code]['ects']

    if len(clean_name) < 3 or clean_name.lower() in ['online', 'ders', 'güz', 'bahar', 'saat']:
        clean_name = f"{clean_code} Dersi"

    is_elective = 0
    upper_check = (raw_name + " " + clean_name + " " + clean_code).upper()
    elective_keys = ['SEÇ', 'ELECTIVE', 'MES1', 'MES2', 'MES3', 'MES4', 'USK', 'ITB', 'GSB', 'SDB', 'GRUP', 'HAVUZ', 'USS', 'UMS', 'SOS']
    if any(k in upper_check for k in elective_keys) or (year >= 3 and clean_code.startswith(('BLM37', 'BLM4', 'MAK4', 'MAK32', 'MAK33', 'MAK34', 'END4', 'END37', 'MSE4', 'MSE35', 'BME4', 'EHM4', 'ELM4', 'KMM4'))):
        is_elective = 1

    return clean_name, year, is_elective, credits, ects

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
                        
                        first_col = str(row[0] or '').replace(' ', '').upper()
                        for d_key, d_val in DAYS_MAP.items():
                            if d_key.replace('\n','').replace(' ','') in first_col:
                                current_day = d_val
                                break
                        
                        for year_col_idx, cell in enumerate(row[2:], start=1):
                            if not cell or year_col_idx > 4:
                                continue
                            cell_text = str(cell).replace('\n', ' ').strip()
                            if not cell_text:
                                continue
                            
                            code_match = re.search(r'([A-Z]{3,4}\s?\d{4})', cell_text)
                            if code_match:
                                code = code_match.group(1).replace(' ', '')
                                raw_name = cell_text.replace(code_match.group(1), '').strip()
                                
                                clean_name, year, is_elective, credits, ects = clean_course_details(code, raw_name, year_col_idx)
                                is_online = 1 if ('ONLINE' in cell_text.upper() or 'UZAKTAN' in cell_text.upper()) else 0
                                
                                if code not in courses_dict:
                                    courses_dict[code] = {
                                        'dept': dept_code,
                                        'code': code,
                                        'name': clean_name,
                                        'year': year,
                                        'is_elective': is_elective,
                                        'credits': credits,
                                        'ects': ects,
                                        'is_online': is_online,
                                        'days': set([current_day])
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
                digit_match = re.search(r'\d', clean_code)
                yr = int(digit_match.group(0)) if digit_match else 1
                if yr > 4 or yr < 1: yr = 1
                
                clean_name, year, is_elective, credits, ects = clean_course_details(clean_code, name_raw, yr)
                
                if clean_code not in courses_dict:
                    courses_dict[clean_code] = {
                        'dept': dept_code,
                        'code': clean_code,
                        'name': clean_name,
                        'year': year,
                        'is_elective': is_elective,
                        'credits': credits,
                        'ects': ects,
                        'is_online': 0,
                        'days': set([current_day])
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
            days TEXT DEFAULT '',
            UNIQUE(department_code, code)
        )
    ''')


    total_added = 0
    files = os.listdir(DESKTOP_DIR) if os.path.exists(DESKTOP_DIR) else []
    
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
                (c['dept'], c['code'], c['name'], c['year'], c['is_elective'], c['credits'], c['ects'], 'Bölüm Öğretim Üyeleri', c['is_online'], days_str)
            )

            total_added += 1


    # Update clean course details ONLY for courses actually parsed from PDF/Excel schedules
    for c_code, c_info in CLEAN_COURSE_DB.items():
        cursor.execute(
            """UPDATE courses SET
                 name = ?,
                 year = ?,
                 is_elective = ?,
                 credits = ?,
                 ects = ?
               WHERE department_code = 'BLM' AND code = ?""",
            (c_info['name'], c_info['year'], c_info['is_elective'], c_info['credits'], c_info['ects'], c_code)
        )



    # Insert curriculum elective placeholders (No schedule/day required)
    for dept_code, c_code, c_name, yr, is_e, cred, ects, inst, is_on, days in BLM_CURRICULUM_ELECTIVE_PLACEHOLDERS:
        cursor.execute(
            """INSERT OR REPLACE INTO courses (department_code, code, name, year, is_elective, credits, ects, instructor, is_online, days)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (dept_code, c_code, c_name, yr, is_e, cred, ects, inst, is_on, days)
        )



    # General electives for other departments
    generic_courses = [
        ('MET', 'ITB1000', 'Sosyal Seçmeli Dersi', 2, 1, 3, 3, 'Sosyal Seçmeli Havuzu', 0, ''),
        ('MET_ENG', 'ITB1000', 'Social Elective Course', 2, 1, 3, 3, 'Sosyal Seçmeli Havuzu', 0, ''),
        ('KIM', 'ITB1000', 'Sosyal Seçmeli Dersi', 2, 1, 3, 3, 'Sosyal Seçmeli Havuzu', 0, ''),
        ('KIM_ENG', 'ITB1000', 'Social Elective Course', 2, 1, 3, 3, 'Sosyal Seçmeli Havuzu', 0, ''),
    ]
    for d, c_code, c_name, yr, is_e, cred, ects, inst, is_on, days in generic_courses:
        cursor.execute(
            """INSERT OR REPLACE INTO courses (department_code, code, name, year, is_elective, credits, ects, instructor, is_online, days)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (d, c_code, c_name, yr, is_e, cred, ects, inst, is_on, days)
        )

    # Clean garbage header rows
    cursor.execute("DELETE FROM courses WHERE code LIKE '%2026%' OR name LIKE '%HAFTALIK%'")

    conn.commit()
    conn.close()

    print(f"Tüm müfredat dersleri ve seçmeli şablonları başarıyla yüklendi! Toplam {total_added} ders.")

if __name__ == '__main__':
    parse_and_seed_comprehensive()
