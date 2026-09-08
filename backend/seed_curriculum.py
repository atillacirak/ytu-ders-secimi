# -*- coding: utf-8 -*-
import sqlite3
from database import DB_PATH, init_db

init_db()

CURRICULUM_DATA = {
    'BLM': [
        {'code': 'MAT1071', 'name': 'Matematik 1', 'year': 1},
        {'code': 'FIZ1001', 'name': 'Fizik 1', 'year': 1},
        {'code': 'BLM1011', 'name': 'Bilgisayar Bilimlerine Giriş', 'year': 1},
        {'code': 'MAT1320', 'name': 'Lineer Cebir', 'year': 1},
        {'code': 'MDB1031', 'name': 'İleri İngilizce 1', 'year': 1},
        {'code': 'BLM1991', 'name': 'İş Sağlığı ve Güvenliği 1', 'year': 1},
        {'code': 'BLM2642', 'name': 'Bilg. Müh. İçin Dif. Denk.', 'year': 2},
        {'code': 'BLM2611', 'name': 'Lojik Devreler', 'year': 2},
        {'code': 'BLM2012', 'name': 'Nesneye Yönelik Programlama', 'year': 2},
        {'code': 'BLM2521', 'name': 'Ayrık Matematik', 'year': 2},
        {'code': 'BLM2011', 'name': 'İstatistik ve Olasılık Hesabı', 'year': 2},
        {'code': 'BLM3021', 'name': 'Algoritma Analizi', 'year': 3},
        {'code': 'BLM3011', 'name': 'İşletim Sistemleri', 'year': 3},
        {'code': 'BLM3730', 'name': 'Blokzincir Temelleri', 'year': 3},
        {'code': 'BLM3041', 'name': 'Veritabanı Yönetimi', 'year': 3},
        {'code': 'BLM3061', 'name': 'Mikroişlemci Sistemleri', 'year': 3},
        {'code': 'BLM3042', 'name': 'Seminer ve Meslek Etiği', 'year': 3},
        {'code': 'BLM4800', 'name': 'Veri Madenciliğine Giriş', 'year': 4},
        {'code': 'BLM4140', 'name': 'Kablosuz Mobil Ağlar', 'year': 4},
        {'code': 'BLM4011', 'name': 'Bilişim Sistemleri Güvenliği', 'year': 4},
        {'code': 'BLM4021', 'name': 'Gömülü Sistemler', 'year': 4},
        {'code': 'BLM3010', 'name': 'Bilgisayar Projesi', 'year': 4},
        {'code': 'BLM9000', 'name': 'Bitirme Çalışması', 'year': 4},
    ]
}

def seed_database():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    for dept_code, courses in CURRICULUM_DATA.items():
        for c in courses:
            cursor.execute(
                'INSERT OR IGNORE INTO courses (department_code, code, name, year, is_elective) VALUES (?, ?, ?, ?, ?)',
                (dept_code, c['code'], c['name'], c['year'], 0)
            )
            
    conn.commit()
    conn.close()
    print('Müfredat veritabanına başarıyla yüklendi!')

if __name__ == '__main__':
    seed_database()
