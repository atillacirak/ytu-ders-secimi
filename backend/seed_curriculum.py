# -*- coding: utf-8 -*-
import sqlite3
from database import DB_PATH, init_db

init_db()

CURRICULUM_DATA = {
    'BLM': [
        # 1. Sınıf Zorunlu Dersler
        {'code': 'MAT1071', 'name': 'Matematik 1', 'year': 1, 'is_elective': 0, 'credits': 4, 'ects': 6, 'instructor': 'Prof. Dr. Ayşe Yılmaz'},
        {'code': 'FIZ1001', 'name': 'Fizik 1', 'year': 1, 'is_elective': 0, 'credits': 4, 'ects': 6, 'instructor': 'Doç. Dr. Mehmet Demir'},
        {'code': 'BLM1011', 'name': 'Bilgisayar Bilimlerine Giriş', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 5, 'instructor': 'Prof. Dr. Ahmet Elbir'},
        {'code': 'MAT1320', 'name': 'Lineer Cebir', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 5, 'instructor': 'Doç. Dr. Ali Kaya'},
        {'code': 'MDB1031', 'name': 'İleri İngilizce 1', 'year': 1, 'is_elective': 0, 'credits': 2, 'ects': 2, 'instructor': 'Öğr. Gör. Sarah Smith'},
        {'code': 'BLM1991', 'name': 'İş Sağlığı ve Güvenliği 1', 'year': 1, 'is_elective': 0, 'credits': 1, 'ects': 1, 'instructor': 'Dr. Öğr. Üyesi Caner Can', 'is_online': True},
        {'code': 'MAT1072', 'name': 'Matematik 2', 'year': 1, 'is_elective': 0, 'credits': 4, 'ects': 6, 'instructor': 'Prof. Dr. Ayşe Yılmaz'},
        {'code': 'FIZ1002', 'name': 'Fizik 2', 'year': 1, 'is_elective': 0, 'credits': 4, 'ects': 6, 'instructor': 'Doç. Dr. Mehmet Demir'},

        # 2. Sınıf Zorunlu Dersler
        {'code': 'BLM2642', 'name': 'Bilg. Müh. İçin Dif. Denk.', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5, 'instructor': 'Prof. Dr. Zeynep Şahin'},
        {'code': 'BLM2611', 'name': 'Lojik Devreler', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 6, 'instructor': 'Doç. Dr. Murat Çelik'},
        {'code': 'BLM2012', 'name': 'Nesneye Yönelik Programlama', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 6, 'instructor': 'Dr. Öğr. Üyesi Burak Aksu'},
        {'code': 'BLM2521', 'name': 'Ayrık Matematik', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5, 'instructor': 'Prof. Dr. Fatma Yıldız'},
        {'code': 'BLM2011', 'name': 'İstatistik ve Olasılık Hesabı', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5, 'instructor': 'Doç. Dr. Selim Akın'},
        {'code': 'BLM2042', 'name': 'Veri Yapıları', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 6, 'instructor': 'Prof. Dr. Ahmet Elbir'},

        # 3. Sınıf Zorunlu Dersler
        {'code': 'BLM3021', 'name': 'Algoritma Analizi', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 6, 'instructor': 'Prof. Dr. Mustafa Gök'},
        {'code': 'BLM3011', 'name': 'İşletim Sistemleri', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 6, 'instructor': 'Doç. Dr. Erkan Uçar'},
        {'code': 'BLM3041', 'name': 'Veritabanı Yönetimi', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 6, 'instructor': 'Prof. Dr. M. Elif Karslıgil'},
        {'code': 'BLM3061', 'name': 'Mikroişlemci Sistemleri', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 5, 'instructor': 'Dr. Öğr. Üyesi Serkan Bayraklı'},
        {'code': 'BLM3042', 'name': 'Seminer ve Meslek Etiği', 'year': 3, 'is_elective': 0, 'credits': 1, 'ects': 2, 'instructor': 'Bölüm Öğretim Üyeleri', 'is_online': True},

        # 4. Sınıf Zorunlu Dersler
        {'code': 'BLM3010', 'name': 'Bilgisayar Projesi', 'year': 4, 'is_elective': 0, 'credits': 2, 'ects': 4, 'instructor': 'Bölüm Öğretim Üyeleri'},
        {'code': 'BLM9000', 'name': 'Bitirme Çalışması', 'year': 4, 'is_elective': 0, 'credits': 4, 'ects': 10, 'instructor': 'Bölüm Öğretim Üyeleri'},

        # --- SEÇMELİ DERSLER (Electives) ---
        {'code': 'BLM3730', 'name': 'Blokzincir Temelleri ve Uygulamaları', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5, 'instructor': 'Dr. Öğr. Üyesi Deniz Varol'},
        {'code': 'BLM4800', 'name': 'Veri Madenciliğine Giriş', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5, 'instructor': 'Prof. Dr. Banu Diri'},
        {'code': 'BLM4140', 'name': 'Kablosuz Mobil Ağlar', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5, 'instructor': 'Doç. Dr. Taha Arslan'},
        {'code': 'BLM4011', 'name': 'Bilişim Sistemleri Güvenliği', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5, 'instructor': 'Prof. Dr. M. Elif Karslıgil'},
        {'code': 'BLM4021', 'name': 'Gömülü Sistemler ve Yapay Zeka', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5, 'instructor': 'Doç. Dr. Serkan Bayraklı'},
        {'code': 'BLM4550', 'name': 'Derin Öğrenmeye Giriş', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5, 'instructor': 'Prof. Dr. Banu Diri'},
        {'code': 'BLM4620', 'name': 'Bulut Bilişim ve Mimari', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5, 'instructor': 'Dr. Öğr. Üyesi Hasan Eren', 'is_online': True},
        {'code': 'BLM4710', 'name': 'Görüntü İşleme Temelleri', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5, 'instructor': 'Prof. Dr. Mustafa Gök'},
        {'code': 'USK1001', 'name': 'Üniversite Seçmeli - İnsan ve Toplum', 'year': 2, 'is_elective': 1, 'credits': 2, 'ects': 3, 'instructor': 'Ortak Havuz Öğretim Üyesi', 'is_online': True},
        {'code': 'ITB2050', 'name': 'Felsefeye Giriş (Sosyal Seçmeli)', 'year': 2, 'is_elective': 1, 'credits': 2, 'ects': 3, 'instructor': 'Dr. Öğr. Üyesi Kemal Sunal', 'is_online': True},
        {'code': 'GSB1010', 'name': 'Sanat Tarihi ve Uygarlık (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 2, 'ects': 3, 'instructor': 'Öğr. Gör. Meltem Aras', 'is_online': True},
    ]
}

def seed_database():
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
            is_online INTEGER DEFAULT 0
        )
    ''')
    
    for dept_code, courses in CURRICULUM_DATA.items():
        for c in courses:
            cursor.execute(
                '''INSERT INTO courses (department_code, code, name, year, is_elective, credits, ects, instructor, is_online)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (dept_code, c['code'], c['name'], c['year'], c.get('is_elective', 0), c.get('credits', 3), c.get('ects', 5), c.get('instructor', ''), 1 if c.get('is_online') else 0)
            )
            
    conn.commit()
    conn.close()
    print('Genişletilmiş Zorunlu ve Seçmeli Müfredat veritabanına yüklendi!')

if __name__ == '__main__':
    seed_database()
