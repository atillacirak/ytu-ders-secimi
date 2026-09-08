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
    'PAZARTESİ': 'Pazartesi', 'P\nA\nZ\nA\nR\nT\nE\nS\nİ': 'Pazartesi',
    'SALI': 'Salı', 'S\nA\nL\nI': 'Salı',
    'ÇARŞAMBA': 'Çarşamba', 'Ç\nA\nR\nŞ\nA\nM\nB\nA': 'Çarşamba',
    'PERŞEMBE': 'Perşembe', 'P\nE\nR\nŞ\nE\nM\nB\nE': 'Perşembe',
    'CUMA': 'Cuma', 'C\nU\nM\nA': 'Cuma',
    'CUMARTESİ': 'Cumartesi'
}

CLEAN_COURSE_DB = {
    # --- Ortak Servis Dersleri ---
    'ATA1031': {'name': 'Atatürk İlkeleri ve İnkılap Tarihi 1', 'year': 1, 'is_elective': 0, 'credits': 2, 'ects': 2},
    'ATA1032': {'name': 'Atatürk İlkeleri ve İnkılap Tarihi 2', 'year': 1, 'is_elective': 0, 'credits': 2, 'ects': 2},
    'TDB1031': {'name': 'Türkçe 1', 'year': 1, 'is_elective': 0, 'credits': 2, 'ects': 2},
    'TDB1032': {'name': 'Türkçe 2', 'year': 1, 'is_elective': 0, 'credits': 2, 'ects': 2},
    'FIZ1001': {'name': 'Fizik 1', 'year': 1, 'is_elective': 0, 'credits': 4, 'ects': 6},
    'FIZ1002': {'name': 'Fizik 2', 'year': 1, 'is_elective': 0, 'credits': 4, 'ects': 6},
    'MAT1071': {'name': 'Matematik 1', 'year': 1, 'is_elective': 0, 'credits': 4, 'ects': 6},
    'MAT1072': {'name': 'Matematik 2', 'year': 1, 'is_elective': 0, 'credits': 4, 'ects': 6},
    'MAT1320': {'name': 'Lineer Cebir', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MAT2411': {'name': 'Diferansiyel Denklemler', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MDB1031': {'name': 'İleri İngilizce 1', 'year': 1, 'is_elective': 0, 'credits': 2, 'ects': 2},
    'MDB1032': {'name': 'İleri İngilizce 2', 'year': 1, 'is_elective': 0, 'credits': 2, 'ects': 2},
    'KIM1170': {'name': 'Genel Kimya', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'KIM1501': {'name': 'Genel Kimya 1', 'year': 1, 'is_elective': 0, 'credits': 4, 'ects': 6},
    'KMB2631': {'name': 'Mühendisler İçin İstatistik ve Olasılık', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},

    # --- Bilgisayar Mühendisliği (BLM) ---
    'BLM1011': {'name': 'Bilgisayar Bilimlerine Giriş', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'BLM1991': {'name': 'İş Sağlığı ve Güvenliği 1', 'year': 1, 'is_elective': 0, 'credits': 1, 'ects': 1},
    'BLM2011': {'name': 'İstatistik ve Olasılık Hesabı', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'BLM2012': {'name': 'Nesneye Yönelik Programlama', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'BLM2042': {'name': 'Veri Yapıları', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'BLM2521': {'name': 'Ayrık Matematik', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'BLM2611': {'name': 'Lojik Devreler', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'BLM2642': {'name': 'Bilgisayar Mühendisliği İçin Diferansiyel Denklemler', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'BLM3010': {'name': 'Bilgisayar Mühendisliği Projesi', 'year': 4, 'is_elective': 0, 'credits': 2, 'ects': 4},
    'BLM3011': {'name': 'İşletim Sistemleri', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'BLM3021': {'name': 'Algoritma Analizi', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'BLM3041': {'name': 'Veritabanı Yönetimi', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'BLM3042': {'name': 'Seminer ve Meslek Etiği', 'year': 3, 'is_elective': 0, 'credits': 1, 'ects': 2},
    'BLM3061': {'name': 'Mikroişlemci Sistemleri', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'BLM3120': {'name': 'Bilgisayar Ağları ve Güvenliği', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'BLM3730': {'name': 'Blokzincir Temelleri ve Uygulamaları', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'BLM4011': {'name': 'Bilişim Sistemleri Güvenliği', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'BLM4021': {'name': 'Gömülü Sistemler ve Yapay Zeka', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'BLM4140': {'name': 'Kablosuz Mobil Ağlar', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'BLM4550': {'name': 'Derin Öğrenmeye Giriş', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'BLM4620': {'name': 'Bulut Bilişim ve Mimari', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'BLM4710': {'name': 'Görüntü İşleme Temelleri', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'BLM4800': {'name': 'Veri Madenciliğine Giriş', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'BLM9000': {'name': 'Bitirme Çalışması', 'year': 4, 'is_elective': 0, 'credits': 4, 'ects': 10},

    # --- Yapay Zeka ve Veri Mühendisliği ---
    'YZM1041': {'name': 'İş Sağlığı ve Güvenliği 1', 'year': 1, 'is_elective': 0, 'credits': 1, 'ects': 1},
    'YZM2042': {'name': 'Lojik ve Mikroişlemciler', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'YZM2061': {'name': 'İstatistik ve Olasılık', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'YZV1011': {'name': 'Yapay Zeka Mühendisliğine Giriş', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'YZV2011': {'name': 'Makine Öğrenmesi Temelleri', 'year': 2, 'is_elective': 0, 'credits': 4, 'ects': 6},
    'YZV3011': {'name': 'Doğal Dil İşleme', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'YZV4810': {'name': 'Pekiştirmeli Öğrenme (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},

    # --- Biyomedikal Mühendisliği ---
    'BMD1011': {'name': 'Biyomedikal Mühendisliğine Giriş', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'BMD2012': {'name': 'Biyomedikal Sinyaller', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'BMD3031': {'name': 'Tıbbi Görüntüleme Sistemleri', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'BMD4720': {'name': 'Biyoensstrümantasyon (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'BME1101': {'name': 'Introduction to Biomedical Engineering', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'BME1901': {'name': 'Introductory Computer Sciences', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'BME2011': {'name': 'Occupational Health and Safety', 'year': 2, 'is_elective': 0, 'credits': 1, 'ects': 1},
    'BME2303': {'name': 'Circuit Theory', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'BME2901': {'name': 'Biochemistry Laboratory', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'BME3310': {'name': 'System Identification', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'BME3315': {'name': 'Analog Electronics Lab', 'year': 3, 'is_elective': 0, 'credits': 2, 'ects': 4},
    'BME3600': {'name': 'Biyomedikal Mühendisliğinde Seçmeli Ders 1', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'BME4120': {'name': 'Biomedical Image Processing', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'BME4142': {'name': 'Physiological Control Systems', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'BME4600': {'name': 'Biofluid Dynamics', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'BME4901': {'name': 'Engineering Design', 'year': 4, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'BME4991': {'name': 'Multidisciplinary Design Project', 'year': 4, 'is_elective': 0, 'credits': 3, 'ects': 6},

    # --- Makine Mühendisliği ---
    'MAK1051': {'name': 'Teknik Resim ve Bilgisayar Destekli Çizim', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MAK1061': {'name': 'Makine Mühendisliğine Giriş', 'year': 1, 'is_elective': 0, 'credits': 2, 'ects': 3},
    'MAK1062': {'name': 'Mühendislik Etiği ve Kariyer Planlama', 'year': 1, 'is_elective': 0, 'credits': 1, 'ects': 2},
    'MAK1071': {'name': 'Makine Elemanları Çizimi', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MAK1072': {'name': 'Bilgisayar Destekli Modelleme', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MAK2011': {'name': 'Statik & Mukavemet', 'year': 2, 'is_elective': 0, 'credits': 4, 'ects': 6},
    'MAK2061': {'name': 'İmalat İşlemleri', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MAK2071': {'name': 'Termodinamik 1', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MAK2081': {'name': 'Termodinamik 2', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MAK2091': {'name': 'Dinamik', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MAK2101': {'name': 'Akışkanlar Mekaniği 1', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MAK2112': {'name': 'Akışkanlar Mekaniği 2', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MAK2142': {'name': 'Malzeme Bilimi', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MAK2212': {'name': 'Mekanizma Tekniği', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MAK2482': {'name': 'Nümerik Yöntemler', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MAK3071': {'name': 'Isı Geçişi', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'MAK3091': {'name': 'Makine Elemanları 1', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'MAK3151': {'name': 'Makine Dinamiği ve Titreşimler', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MAK3182': {'name': 'Makine Elemanları 2', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'MAK3191': {'name': 'Otomatik Kontrol', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MAK3201': {'name': 'Isıtma ve Havalandırma Sistemleri (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK3271': {'name': 'Motorlar ve Güç Sistemleri (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK3281': {'name': 'Taşıt Mekaniği (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK3291': {'name': 'Hidrolik ve Pnömatik Sistemler (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK3301': {'name': 'Yenilenebilir Enerji Kaynakları (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK3391': {'name': 'Talaşlı İmalat Yöntemleri (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK3401': {'name': 'Kalıp Tasarımı ve İmalatı (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK3431': {'name': 'CAD/CAM Sistemleri (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK3441': {'name': 'Kaynak Teknolojisi (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK3461': {'name': 'Ürün Tasarımı ve Geliştirme (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK3471': {'name': 'Triboloji ve Aşınma (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK3561': {'name': 'Mühendislik Deneyleri', 'year': 3, 'is_elective': 0, 'credits': 2, 'ects': 3},
    'MAK3652': {'name': 'Staj 1', 'year': 3, 'is_elective': 0, 'credits': 1, 'ects': 2},
    'MAK3671': {'name': 'İçten Yanmalı Motorlar (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK3681': {'name': 'Soğutma Tekniği (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK3691': {'name': 'Güneş Enerjisi Sistemleri (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK4072': {'name': 'Termik Santraller (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK4092': {'name': 'Buhar Kazanları Tasarımı (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK4261': {'name': 'Isı Değiştiricileri Tasarımı (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK4291': {'name': 'Gaz Türbinleri (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK4391': {'name': 'Pompa ve Kompresörler (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK4401': {'name': 'Nükleer Enerjiye Giriş (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK4422': {'name': 'Yapay Zeka Ve Makine Uygulamaları (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK4451': {'name': 'Klima Sistemleri (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK4471': {'name': 'Yenilikçi Enerji Teknolojileri (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK4472': {'name': 'Enerji Depolama Sistemleri (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK4482': {'name': 'Batarya Teknolojileri ve Yönetimi (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK4491': {'name': 'Hesaplamalı Akışkanlar Dinamiği (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK4541': {'name': 'Kompozit Malzemeler (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK4571': {'name': 'Sonlu Elemanlar Yöntemi (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK4591': {'name': 'Mikro Ve Nano Isı Geçişi (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK4595': {'name': 'Optimizasyon Yöntemleri (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK4601': {'name': 'Tahribatsız Muayene Yöntemleri (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK4651': {'name': 'İki Fazlı Akışlar (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK4801': {'name': 'Havacılık Ve Uzay Sistemleri (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MAK4891': {'name': 'Makine Mühendisliği Tasarımı 1', 'year': 4, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MAK4921': {'name': 'Makine Mühendisliği Tasarımı 2', 'year': 4, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MAK4931': {'name': 'Bitirme Çalışması 1', 'year': 4, 'is_elective': 0, 'credits': 4, 'ects': 8},
    'MAK4933': {'name': 'Bitirme Çalışması 2', 'year': 4, 'is_elective': 0, 'credits': 4, 'ects': 8},
    'MAK4941': {'name': 'Uzmanlık Projesi (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},

    # --- Endüstri Mühendisliği ---
    'END1151': {'name': 'Bilgisayar Programlama 1', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'END1911': {'name': 'İş Sağlığı ve Güvenliği 1', 'year': 1, 'is_elective': 0, 'credits': 1, 'ects': 1},
    'END1991': {'name': 'Endüstri Mühendisliğine Giriş', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'END2151': {'name': 'Bilgisayar Programlama 2', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'END2961': {'name': 'Ekonomi', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'END2995': {'name': 'Üretim Yöntemleri', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'END3401': {'name': 'İş Etüdü ve Çalışma Standardı', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'END3455': {'name': 'Pazarlama Yönetimi (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'END3760': {'name': 'Çizelgeleme Yöntemleri (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'END3770': {'name': 'Stokastik Süreçler (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'END3961': {'name': 'Sistem Analizi ve Tasarımı', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'END3975': {'name': 'Yapay Zeka ve İşletme Uygulamaları (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'END3991': {'name': 'Yöneylem Araştırması 2', 'year': 3, 'is_elective': 0, 'credits': 4, 'ects': 6},
    'END3995': {'name': 'Kalite Mühendisliği', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'END4370': {'name': 'Stratejik Yönetim (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'END4393': {'name': 'Risk Yönetimi (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'END4420': {'name': 'Proje Yönetimi (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'END4480': {'name': 'İşletmelerde Verimlilik Yönetimi (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'END4651': {'name': 'Toplam Kalite Yönetimi (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'END4661': {'name': 'Endüstri Mühendisliği Tasarımı Projesi', 'year': 4, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'END4665': {'name': 'Finansal Yönetim (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'END4810': {'name': 'Envanter Modelleri (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'END4830': {'name': 'Yalın Üretim Sistemleri (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'END4985': {'name': 'İş Hukuku (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 2, 'ects': 3},
    'END4990': {'name': 'İstatistiksel Kalite Kontrol', 'year': 4, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'END4995': {'name': 'Ajan Tabanlı Modelleme Ve Simülasyon (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},

    # --- Mekatronik Mühendisliği ---
    'MKT1111': {'name': 'Bilgisayar Programlama', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MKT1801': {'name': 'İş Sağlığı ve Güvenliği 1', 'year': 1, 'is_elective': 0, 'credits': 1, 'ects': 1},
    'MKT1821': {'name': 'Mekatronik Mühendisliğine Giriş', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MKT1831': {'name': 'Laboratuvar 1 - Atölye ve İmalat', 'year': 1, 'is_elective': 0, 'credits': 2, 'ects': 3},
    'MKT2141': {'name': 'Analog Elektronik', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MKT2151': {'name': 'Nesneye Yönelik Programlama', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MKT2161': {'name': 'Lojik Devre Tasarımı', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MKT2412': {'name': 'Mühendisler İçin İstatistik', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MKT2831': {'name': 'Laboratuvar 2 - Elektrik ve Elektronik', 'year': 2, 'is_elective': 0, 'credits': 2, 'ects': 3},
    'MKT3411': {'name': 'Akışkanlar Mekaniği', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MKT3413': {'name': 'Isı Geçişi', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MKT3421': {'name': 'İşaretler ve Sistemler', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MKT3801': {'name': 'Staj 1', 'year': 3, 'is_elective': 0, 'credits': 1, 'ects': 2},
    'MKT3811': {'name': 'Mikroişlemciler ve Programlanması', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'MKT3821': {'name': 'Makine Elemanları', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MKT3841': {'name': 'Sayısal Yöntemler', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MKT4000': {'name': 'Mekatronik Sistem Tasarımı ve Bitirme Projesi', 'year': 4, 'is_elective': 0, 'credits': 4, 'ects': 8},
    'MKT4111': {'name': 'Bitirme Çalışması', 'year': 4, 'is_elective': 0, 'credits': 4, 'ects': 8},
    'MKT4403': {'name': 'Mekatronik Sistem Entegrasyonu (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MKT4441': {'name': 'İmalat Yöntemleri (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MKT4820': {'name': 'Otonom Sistemler (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MFK4991': {'name': 'Çok Disiplinli Tasarım Projesi', 'year': 4, 'is_elective': 0, 'credits': 3, 'ects': 6},

    # --- Matematik Mühendisliği ---
    'MAT1011': {'name': 'Matematik Mühendisliğine Giriş', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MAT2011': {'name': 'Soyut Matematik', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'MAT3021': {'name': 'Nümerik Analiz 2', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'MAT4810': {'name': 'Kriptoloji Temelleri (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MTM2501': {'name': 'İleri Analiz 1', 'year': 2, 'is_elective': 0, 'credits': 4, 'ects': 6},
    'MTM3691': {'name': 'Lineer Programlama Teorisi (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},

    # --- Metalurji ve Malzeme Mühendisliği ---
    'MET1011': {'name': 'Malzeme Bilimine Giriş', 'year': 1, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MET2021': {'name': 'Malzeme Termodinamiği', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'MET3011': {'name': 'Fiziksel Metalurji', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 6},
    'MET4720': {'name': 'Kompozit Malzemeler (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MSE2911': {'name': 'Statics and Strength of Materials', 'year': 2, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MSE3381': {'name': 'Transport Phenomena', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MSE3501': {'name': 'Welding Technology (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MSE3531': {'name': 'Machine Elements for Engineers (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MSE3591': {'name': 'Medical Device Regulations (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MSE3901': {'name': 'Mechanical Properties of Materials', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MSE3911': {'name': 'Principles of Solidification', 'year': 3, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MSE4621': {'name': 'Metallurgy Kinetics', 'year': 4, 'is_elective': 0, 'credits': 3, 'ects': 5},
    'MSE4891': {'name': 'Automotive Materials (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MSE4911': {'name': 'Functional Materials (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},
    'MSE4931': {'name': 'Ferroalloy Production Methods (Seçmeli)', 'year': 4, 'is_elective': 1, 'credits': 3, 'ects': 5},

    # --- Genel Seçmeli ---
    'USK1001': {'name': 'Üniversite Seçmeli Dersi 1', 'year': 2, 'is_elective': 1, 'credits': 2, 'ects': 3},
    'USK1002': {'name': 'Üniversite Seçmeli Dersi 2', 'year': 2, 'is_elective': 1, 'credits': 2, 'ects': 3},
    'ITB2050': {'name': 'Felsefeye Giriş (Sosyal Seçmeli)', 'year': 2, 'is_elective': 1, 'credits': 2, 'ects': 3},
    'ITB2020': {'name': 'Sosyolojiye Giriş (Sosyal Seçmeli)', 'year': 2, 'is_elective': 1, 'credits': 2, 'ects': 3},
    'GSB1010': {'name': 'Sanat Tarihi ve Uygarlık (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 2, 'ects': 3},
    'GSB1020': {'name': 'Müzik Tarihi ve Kültürü (Seçmeli)', 'year': 3, 'is_elective': 1, 'credits': 2, 'ects': 3},
}

def clean_course_details(code, raw_name="", year_hint=1):
    clean_code = code.upper().replace(" ", "")
    
    if clean_code in CLEAN_COURSE_DB:
        c = CLEAN_COURSE_DB[clean_code]
        return c['name'], c['year'], c['is_elective'], c['credits'], c['ects']
    
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
    if len(clean_name) < 3 or clean_name.lower() in ['online', 'ders', 'güz', 'bahar', 'saat']:
        clean_name = f"{clean_code} Dersi"

    year = year_hint
    digit_match = re.search(r'\d', clean_code)
    if digit_match:
        year = int(digit_match.group(0))
        if year > 4 or year < 1: year = 1

    is_elective = 0
    upper_check = (raw_name + " " + clean_name + " " + clean_code).upper()
    elective_keys = ['SEÇ', 'ELECTIVE', 'MES1', 'MES2', 'MES3', 'MES4', 'USK', 'ITB', 'GSB', 'SDB', 'GRUP', 'HAVUZ']
    if any(k in upper_check for k in elective_keys) or (year >= 3 and clean_code.startswith(('BLM37', 'BLM4', 'MAK4', 'MAK32', 'MAK33', 'MAK34', 'END4', 'END37', 'MSE4', 'MSE35', 'BME4', 'EHM4', 'ELM4', 'KMM4'))):
        is_elective = 1

    return clean_name, year, is_elective, 3, 5

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
                        
                        time_cell = str(row[1] or '').strip()
                        
                        for year_idx, cell in enumerate(row[2:], start=1):
                            if not cell:
                                continue
                            cell_text = str(cell).replace('\n', ' ').strip()
                            if not cell_text:
                                continue
                            
                            code_match = re.search(r'([A-Z]{3,4}\s?\d{4})', cell_text)
                            if code_match:
                                code = code_match.group(1).replace(' ', '')
                                raw_name = cell_text.replace(code_match.group(1), '').strip()
                                
                                clean_name, year, is_elective, credits, ects = clean_course_details(code, raw_name, min(year_idx, 4))
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
                clean_name, year, is_elective, credits, ects = clean_course_details(clean_code, name_raw, 1)
                
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
                (c['dept'], c['code'], c['name'], c['year'], c['is_elective'], c['credits'], c['ects'], 'Bölüm Öğretim Üyeleri', c['is_online'], days_str)
            )
            total_added += 1

    conn.commit()
    conn.close()
    print(f"Tüm ders programları temizlenmiş isimlerle veritabanına aktarıldı! Toplam {total_added} ders kaydedildi.")

if __name__ == '__main__':
    parse_and_seed_comprehensive()
