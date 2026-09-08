'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Calendar, CheckCircle, Clock, Trash2, Plus, Filter, 
  Search, AlertCircle, ArrowRight, RefreshCw, Upload, Sparkles, Layers,
  ChevronRight, Laptop, Building2, User, Award, BookmarkCheck
} from 'lucide-react';

interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  ects: number;
  year?: number;
  is_elective?: boolean;
  instructor?: string;
  is_online?: boolean;
  sections?: CourseSection[];
}

interface CourseSection {
  section_no: string;
  instructor: string;
  is_online: boolean;
  schedule: ScheduleSlot[];
}

interface ScheduleSlot {
  day: string;
  start_time: string;
  end_time: string;
  classroom?: string;
}

interface ScheduleCombination {
  schedule: Record<string, {
    section_no: string;
    instructor: string;
    is_online: boolean;
    slots: ScheduleSlot[];
  }>;
  score: number;
  conflicts: string[];
}

interface Department {
  code: string;
  name: string;
}

interface Faculty {
  id: string;
  name: string;
  departments: Department[];
}

const FACULTIES: Faculty[] = [
  {
    id: 'EEF',
    name: 'Elektrik - Elektronik Fakültesi',
    departments: [
      { code: 'BLM', name: 'Bilgisayar Mühendisliği' },
      { code: 'ELK', name: 'Elektrik Mühendisliği' },
      { code: 'EHM', name: 'Elektronik ve Haberleşme Mühendisliği' },
      { code: 'BMD', name: 'Biyomedikal Mühendisliği' },
    ]
  },
  {
    id: 'KMF',
    name: 'Kimya - Metalurji Fakültesi',
    departments: [
      { code: 'BIO', name: 'Biyomühendislik' },
      { code: 'GDA', name: 'Gıda Mühendisliği' },
      { code: 'KIM', name: 'Kimya Mühendisliği' },
      { code: 'MAT', name: 'Matematik Mühendisliği' },
      { code: 'MET', name: 'Metalurji ve Malzeme Mühendisliği' },
    ]
  },
  {
    id: 'MAK_FAK',
    name: 'Makine Fakültesi',
    departments: [
      { code: 'MAK', name: 'Makine Mühendisliği' },
      { code: 'END', name: 'Endüstri Mühendisliği' },
      { code: 'MKT', name: 'Mekatronik Mühendisliği' },
    ]
  },
  {
    id: 'FEF',
    name: 'Fen - Edebiyat Fakültesi',
    departments: [
      { code: 'YZV', name: 'Yapay Zeka ve Veri Mühendisliği' },
    ]
  }
];

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const TIME_SLOTS = [
  '08:30-09:20', '09:30-10:20', '10:30-11:20', '11:30-12:20',
  '12:30-13:20', '13:30-14:20', '14:30-15:20', '15:30-16:20',
  '16:30-17:20', '17:30-18:20', '18:30-19:20', '19:30-20:20'
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'selection' | 'schedule'>('selection');
  const [courseCategoryTab, setCourseCategoryTab] = useState<'mandatory' | 'elective'>('mandatory');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('EEF');
  const [selectedDept, setSelectedDept] = useState<string>('BLM');
  const [yearFilter, setYearFilter] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [curriculum, setCurriculum] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [manualCode, setManualCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [generatedSchedules, setGeneratedSchedules] = useState<ScheduleCombination[]>([]);
  const [selectedScheduleIdx, setSelectedScheduleIdx] = useState(0);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://ytu-ders-secimi.onrender.com';

  useEffect(() => {
    fetchCurriculum(selectedDept);
  }, [selectedDept]);

  const fetchCurriculum = async (deptCode: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/curriculum/${deptCode}`);
      if (res.ok) {
        const data = await res.json();
        setCurriculum(data);
      } else {
        setCurriculum(getMockCurriculum(deptCode));
      }
    } catch (e) {
      setCurriculum(getMockCurriculum(deptCode));
    } finally {
      setLoading(false);
    }
  };

  const getMockCurriculum = (dept: string): Course[] => {
    const mockDb: Record<string, Course[]> = {
      BIO: [
        { id: '1', code: 'BIO1011', name: 'Biyomühendisliğe Giriş', credits: 3, ects: 5, year: 1, is_elective: false, instructor: 'Prof. Dr. Hüseyin Avni', is_online: false },
        { id: '2', code: 'KIM1001', name: 'Genel Kimya 1', credits: 4, ects: 6, year: 1, is_elective: false, instructor: 'Doç. Dr. Neslihan Şahin', is_online: false },
        { id: '3', code: 'BIO2021', name: 'Hücre Biyolojisi', credits: 3, ects: 5, year: 2, is_elective: false, instructor: 'Prof. Dr. Elif Damla', is_online: false },
        { id: '4', code: 'BIO3041', name: 'Biyoreaktör Tasarımı', credits: 3, ects: 6, year: 3, is_elective: false, instructor: 'Doç. Dr. Ahmet Can', is_online: false },
        { id: '5', code: 'BIO4810', name: 'Doku Mühendisliği (Seçmeli)', credits: 3, ects: 5, year: 4, is_elective: true, instructor: 'Dr. Öğr. Üyesi Gamze K.', is_online: false },
        { id: '6', code: 'USK1001', name: 'Üniversite Seçmeli', credits: 2, ects: 3, year: 2, is_elective: true, instructor: 'Ortak Havuz', is_online: true },
      ],
      BMD: [
        { id: '1', code: 'BMD1011', name: 'Biyomedikal Müh. Giriş', credits: 3, ects: 5, year: 1, is_elective: false, instructor: 'Prof. Dr. Sadık Kara', is_online: false },
        { id: '2', code: 'BMD2012', name: 'Biyomedikal Sinyaller', credits: 3, ects: 6, year: 2, is_elective: false, instructor: 'Doç. Dr. Mehmet Fatih', is_online: false },
        { id: '3', code: 'BMD3031', name: 'Tıbbi Görüntüleme Sistemleri', credits: 3, ects: 6, year: 3, is_elective: false, instructor: 'Prof. Dr. Ayşe Bora', is_online: false },
        { id: '4', code: 'BMD4720', name: 'Biyoensstrümantasyon (Seçmeli)', credits: 3, ects: 5, year: 4, is_elective: true, instructor: 'Dr. Öğr. Üyesi Ali Fuat', is_online: false },
      ],
      GDA: [
        { id: '1', code: 'GDA1011', name: 'Gıda Mühendisliğine Giriş', credits: 3, ects: 5, year: 1, is_elective: false, instructor: 'Prof. Dr. Osman Sağdıç', is_online: false },
        { id: '2', code: 'GDA2021', name: 'Gıda Mikrobiyolojisi', credits: 3, ects: 6, year: 2, is_elective: false, instructor: 'Doç. Dr. Halil İbrahim', is_online: false },
        { id: '3', code: 'GDA3011', name: 'Gıda İşleme Teknolojisi 1', credits: 3, ects: 6, year: 3, is_elective: false, instructor: 'Prof. Dr. Muhammet Aıcı', is_online: false },
        { id: '4', code: 'GDA4510', name: 'Fonksiyonel Gıdalar (Seçmeli)', credits: 3, ects: 5, year: 4, is_elective: true, instructor: 'Dr. Öğr. Üyesi Filiz N.', is_online: false },
      ],
      KIM: [
        { id: '1', code: 'KIM1011', name: 'Kimya Mühendisliğine Giriş', credits: 3, ects: 5, year: 1, is_elective: false, instructor: 'Prof. Dr. İbrahim Doymaz', is_online: false },
        { id: '2', code: 'KIM2031', name: 'Kimyasal Termodinamik', credits: 3, ects: 6, year: 2, is_elective: false, instructor: 'Doç. Dr. Serap Güneş', is_online: false },
        { id: '3', code: 'KIM3011', name: 'Kütle Aktarımı', credits: 3, ects: 6, year: 3, is_elective: false, instructor: 'Prof. Dr. Nuran Devrim', is_online: false },
        { id: '4', code: 'KIM4750', name: 'Polimer Teknolojisi (Seçmeli)', credits: 3, ects: 5, year: 4, is_elective: true, instructor: 'Dr. Öğr. Üyesi Mert A.', is_online: false },
      ],
      MAT: [
        { id: '1', code: 'MAT1011', name: 'Matematik Müh. Giriş', credits: 3, ects: 5, year: 1, is_elective: false, instructor: 'Prof. Dr. Salim Yüce', is_online: false },
        { id: '2', code: 'MAT2011', name: 'Soyut Matematik', credits: 3, ects: 6, year: 2, is_elective: false, instructor: 'Doç. Dr. Zekeriya Arvasi', is_online: false },
        { id: '3', code: 'MAT3021', name: 'Nümerik Analiz 2', credits: 3, ects: 6, year: 3, is_elective: false, instructor: 'Prof. Dr. Bayram Şahin', is_online: false },
        { id: '4', code: 'MAT4810', name: 'Kriptoloji Temelleri (Seçmeli)', credits: 3, ects: 5, year: 4, is_elective: true, instructor: 'Dr. Öğr. Üyesi Fatih K.', is_online: false },
      ],
      MET: [
        { id: '1', code: 'MET1011', name: 'Malzeme Bilimine Giriş', credits: 3, ects: 5, year: 1, is_elective: false, instructor: 'Prof. Dr. Ahmet Topuz', is_online: false },
        { id: '2', code: 'MET2021', name: 'Malzeme Termodinamiği', credits: 3, ects: 6, year: 2, is_elective: false, instructor: 'Doç. Dr. Erhan Altan', is_online: false },
        { id: '3', code: 'MET3011', name: 'Fiziksel Metalurji', credits: 3, ects: 6, year: 3, is_elective: false, instructor: 'Prof. Dr. Yılmaz Taptık', is_online: false },
        { id: '4', code: 'MET4720', name: 'Kompozit Malzemeler (Seçmeli)', credits: 3, ects: 5, year: 4, is_elective: true, instructor: 'Dr. Öğr. Üyesi Bora M.', is_online: false },
      ],
      MAK: [
        { id: '1', code: 'MAK1011', name: 'Makine Mühendisliğine Giriş', credits: 3, ects: 5, year: 1, is_elective: false, instructor: 'Prof. Dr. Zehra Yumurtacı', is_online: false },
        { id: '2', code: 'MAK2011', name: 'Statik & Mukavemet', credits: 4, ects: 6, year: 2, is_elective: false, instructor: 'Doç. Dr. Orhan Çakır', is_online: false },
        { id: '3', code: 'MAK3011', name: 'Akışkanlar Mekaniği', credits: 3, ects: 6, year: 3, is_elective: false, instructor: 'Prof. Dr. Hakan Ersoy', is_online: false },
        { id: '4', code: 'MAK4730', name: 'Isı Değiştiricileri Tasarımı (Seçmeli)', credits: 3, ects: 5, year: 4, is_elective: true, instructor: 'Dr. Öğr. Üyesi Tarık V.', is_online: false },
      ],
      MKT: [
        { id: '1', code: 'MKT1011', name: 'Mekatronik Mühendisliğine Giriş', credits: 3, ects: 5, year: 1, is_elective: false, instructor: 'Prof. Dr. Vasfi Elek', is_online: false },
        { id: '2', code: 'MKT2021', name: 'Sensörler & Dönüştürücüler', credits: 3, ects: 6, year: 2, is_elective: false, instructor: 'Doç. Dr. Mustafa Doğan', is_online: false },
        { id: '3', code: 'MKT3011', name: 'Robotiğe Giriş', credits: 3, ects: 6, year: 3, is_elective: false, instructor: 'Prof. Dr. Şeref Naci', is_online: false },
        { id: '4', code: 'MKT4820', name: 'Otonom Sistemler (Seçmeli)', credits: 3, ects: 5, year: 4, is_elective: true, instructor: 'Dr. Öğr. Üyesi Alper K.', is_online: false },
      ],
      END: [
        { id: '1', code: 'END1011', name: 'Endüstri Mühendisliğine Giriş', credits: 3, ects: 5, year: 1, is_elective: false, instructor: 'Prof. Dr. Ethem Tolga', is_online: false },
        { id: '2', code: 'END2011', name: 'Yöneylem Araştırması 1', credits: 4, ects: 6, year: 2, is_elective: false, instructor: 'Doç. Dr. Nihal Erginel', is_online: false },
        { id: '3', code: 'END3011', name: 'Üretim Planlama ve Kontrol', credits: 3, ects: 6, year: 3, is_elective: false, instructor: 'Prof. Dr. Ziya Ulukan', is_online: false },
        { id: '4', code: 'END4710', name: 'Tedarik Zinciri Yönetimi (Seçmeli)', credits: 3, ects: 5, year: 4, is_elective: true, instructor: 'Dr. Öğr. Üyesi Gültekin C.', is_online: false },
      ],
      ELK: [
        { id: '1', code: 'ELK1011', name: 'Elektrik Mühendisliğine Giriş', credits: 3, ects: 5, year: 1, is_elective: false, instructor: 'Prof. Dr. Galip Cansever', is_online: false },
        { id: '2', code: 'ELK2011', name: 'Devre Teorisi 1', credits: 4, ects: 6, year: 2, is_elective: false, instructor: 'Doç. Dr. Muammer Ermiş', is_online: false },
        { id: '3', code: 'ELK3011', name: 'Elektrik Makineleri 1', credits: 3, ects: 6, year: 3, is_elective: false, instructor: 'Prof. Dr. Celal Kocatepe', is_online: false },
        { id: '4', code: 'ELK4820', name: 'Yüksek Gerilim Tekniği (Seçmeli)', credits: 3, ects: 5, year: 4, is_elective: true, instructor: 'Dr. Öğr. Üyesi Osman Ç.', is_online: false },
      ],
      EHM: [
        { id: '1', code: 'EHM1011', name: 'Elektronik & Hab. Giriş', credits: 3, ects: 5, year: 1, is_elective: false, instructor: 'Prof. Dr. Tülay Yıldırım', is_online: false },
        { id: '2', code: 'EHM2011', name: 'Elektronik Devreleri 1', credits: 4, ects: 6, year: 2, is_elective: false, instructor: 'Doç. Dr. Herman Sedef', is_online: false },
        { id: '3', code: 'EHM3011', name: 'Haberleşme Kuramı', credits: 3, ects: 6, year: 3, is_elective: false, instructor: 'Prof. Dr. Ali Ziya', is_online: false },
        { id: '4', code: 'EHM4750', name: 'Sayısal İşaret İşleme (Seçmeli)', credits: 3, ects: 5, year: 4, is_elective: true, instructor: 'Dr. Öğr. Üyesi Hakan K.', is_online: false },
      ],
      YZV: [
        { id: '1', code: 'YZV1011', name: 'Yapay Zeka Mühendisliğine Giriş', credits: 3, ects: 5, year: 1, is_elective: false, instructor: 'Prof. Dr. Banu Diri', is_online: false },
        { id: '2', code: 'YZV2011', name: 'Makine Öğrenmesi Temelleri', credits: 4, ects: 6, year: 2, is_elective: false, instructor: 'Doç. Dr. Erkan Uçar', is_online: false },
        { id: '3', code: 'YZV3011', name: 'Doğal Dil İşleme', credits: 3, ects: 6, year: 3, is_elective: false, instructor: 'Prof. Dr. M. Elif Karslıgil', is_online: false },
        { id: '4', code: 'YZV4810', name: 'Pekiştirmeli Öğrenme (Seçmeli)', credits: 3, ects: 5, year: 4, is_elective: true, instructor: 'Dr. Öğr. Üyesi Hasan E.', is_online: false },
      ],
    };

    if (mockDb[dept]) {
      return mockDb[dept];
    }

    return [
      { id: '1', code: `${dept}1011`, name: `${dept} Mühendisliğine Giriş`, credits: 3, ects: 5, year: 1, is_elective: false, instructor: 'Prof. Dr. YTÜ Öğretim Üyesi', is_online: false },
      { id: '2', code: 'MAT1071', name: 'Matematik 1', credits: 4, ects: 6, year: 1, is_elective: false, instructor: 'Prof. Dr. Ayşe Yılmaz', is_online: false },
      { id: '3', code: 'FIZ1001', name: 'Fizik 1', credits: 4, ects: 6, year: 1, is_elective: false, instructor: 'Doç. Dr. Mehmet Demir', is_online: false },
      { id: '4', code: `${dept}2012`, name: 'Temel Bölüm Dersleri', credits: 3, ects: 6, year: 2, is_elective: false, instructor: 'Bölüm Öğretim Üyeleri', is_online: false },
      { id: '5', code: `${dept}3011`, name: 'İleri Bölüm Uygulamaları', credits: 3, ects: 6, year: 3, is_elective: false, instructor: 'Bölüm Öğretim Üyeleri', is_online: false },
      { id: '6', code: `${dept}4800`, name: 'Uzmanlık Seçmeli Dersi', credits: 3, ects: 5, year: 4, is_elective: true, instructor: 'Bölüm Öğretim Üyeleri', is_online: false },
      { id: '7', code: 'USK1001', name: 'Üniversite Seçmeli', credits: 2, ects: 3, year: 2, is_elective: true, instructor: 'Ortak Havuz', is_online: true },
    ];
  };

  const handleAddCourse = (course: Course) => {
    if (!selectedCourses.some(c => c.code === course.code)) {
      setSelectedCourses([...selectedCourses, course]);
    }
  };

  const handleRemoveCourse = (code: string) => {
    setSelectedCourses(selectedCourses.filter(c => c.code !== code));
  };

  const handleManualAdd = () => {
    if (!manualCode.trim()) return;
    const codeUpper = manualCode.trim().toUpperCase();
    if (selectedCourses.some(c => c.code === codeUpper)) {
      setManualCode('');
      return;
    }
    const found = curriculum.find(c => c.code === codeUpper);
    if (found) {
      handleAddCourse(found);
    } else {
      setSelectedCourses([
        ...selectedCourses,
        {
          id: `manual_${Date.now()}`,
          code: codeUpper,
          name: `${codeUpper} (Özel Ders)`,
          credits: 3,
          ects: 5,
          is_elective: false,
          instructor: 'Bilinmiyor',
          is_online: false
        }
      ]);
    }
    setManualCode('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/upload-pdf`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.courses && Array.isArray(data.courses)) {
          const newCourses: Course[] = data.courses.map((item: any) => ({
            id: `pdf_${Date.now()}_${Math.random()}`,
            code: item.code,
            name: item.name || item.code,
            credits: item.credits || 3,
            ects: item.ects || 5,
            is_elective: item.is_elective || false,
            instructor: item.instructor || 'PDF Kaynaklı',
            is_online: item.is_online || false
          }));
          
          setSelectedCourses(prev => {
            const existingCodes = new Set(prev.map(c => c.code));
            const uniqueNew = newCourses.filter(c => !existingCodes.has(c.code));
            return [...prev, ...uniqueNew];
          });
        }
      }
    } catch (e) {
      console.error('PDF upload error', e);
    } finally {
      setPdfUploading(false);
    }
  };

  const handleConfirmAndSolve = async () => {
    if (selectedCourses.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/generate-schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_course_codes: selectedCourses.map(c => c.code)
        })
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedSchedules(data || []);
      } else {
        generateFallbackSchedule();
      }
    } catch (e) {
      generateFallbackSchedule();
    } finally {
      setLoading(false);
      setActiveTab('schedule');
    }
  };

  const generateFallbackSchedule = () => {
    const mockSchedule: Record<string, any> = {};
    const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
    
    selectedCourses.forEach((course, idx) => {
      const day = days[idx % days.length];
      const startIdx = (idx * 2) % 8;
      mockSchedule[course.code] = {
        section_no: '01',
        instructor: course.instructor || 'Dr. Öğr. Üyesi YTÜ',
        is_online: course.is_online || false,
        slots: [
          { day, start_time: TIME_SLOTS[startIdx].split('-')[0], end_time: TIME_SLOTS[startIdx+1].split('-')[1], classroom: course.is_online ? 'ONLINE' : 'B-101' }
        ]
      };
    });

    setGeneratedSchedules([{ schedule: mockSchedule, score: 95, conflicts: [] }]);
  };

  // Filter curriculum by search, year, and category (mandatory vs elective)
  const filteredCurriculum = curriculum.filter(course => {
    const matchesCategory = courseCategoryTab === 'mandatory' ? !course.is_elective : course.is_elective;
    const matchesSearch = course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          course.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = yearFilter === 'ALL' || course.year === yearFilter;
    return matchesCategory && matchesSearch && matchesYear;
  });

  const mandatoryCount = curriculum.filter(c => !c.is_elective).length;
  const electiveCount = curriculum.filter(c => c.is_elective).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-600/30">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                YTÜ Ders Seçimi & Program Oluşturucu
              </h1>
              <p className="text-xs text-slate-400">Yıldız Technical University Schedule Builder</p>
            </div>
          </div>

          {/* Top Stage Tabs Navigation */}
          <div className="flex bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveTab('selection')}
              className={`flex items-center space-x-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'selection'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>1. Aşama: Bölüm & Ders Seçimi</span>
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center space-x-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'schedule'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>2. Aşama: Haftalık Çizelge</span>
              {selectedCourses.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-indigo-500/30 rounded-full text-indigo-300">
                  {selectedCourses.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {activeTab === 'selection' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left & Middle Column: Department & Curriculum Selection */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Modern Glassmorphic Faculty & Department Selection Bar */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-2xl backdrop-blur space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400" /> Akademik Program Seçimi
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {FACULTIES.find(f => f.id === selectedFaculty)?.name} → {FACULTIES.find(f => f.id === selectedFaculty)?.departments.find(d => d.code === selectedDept)?.name}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Faculty Selector Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      Fakülte Seçiniz
                    </label>
                    <select
                      value={selectedFaculty}
                      onChange={(e) => {
                        const newFacId = e.target.value;
                        setSelectedFaculty(newFacId);
                        const fac = FACULTIES.find(f => f.id === newFacId);
                        if (fac && fac.departments.length > 0) {
                          setSelectedDept(fac.departments[0].code);
                        }
                      }}
                      className="bg-slate-950/80 border border-slate-700/80 hover:border-indigo-500/50 rounded-xl px-4 py-3 text-xs font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-all shadow-inner"
                    >
                      {FACULTIES.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Department Selector Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      Bölüm Seçiniz
                    </label>
                    <select
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                      className="bg-slate-950/80 border border-slate-700/80 hover:border-indigo-500/50 rounded-xl px-4 py-3 text-xs font-semibold text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-all shadow-inner"
                    >
                      {FACULTIES.find(f => f.id === selectedFaculty)?.departments.map(d => (
                        <option key={d.code} value={d.code}>
                          {d.code} - {d.name}
                        </option>
                      )) || FACULTIES[0].departments.map(d => (
                        <option key={d.code} value={d.code}>
                          {d.code} - {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Main Course Listing Card with Search & Filters placed AT THE VERY TOP */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                
                {/* TOP HEADER OF COURSES BLOCK: Search & Filters Bar */}
                <div className="space-y-3 pb-3 border-b border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Integrated Search Bar */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Ders Ara (Kod veya İsim ile anlık filtrele)..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>

                    {/* Class/Year Filter Pills */}
                    <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 flex-shrink-0">
                      <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
                        <Filter className="w-3 h-3 text-slate-500" /> Sınıf:
                      </span>
                      {(['ALL', 1, 2, 3, 4] as const).map(yr => (
                        <button
                          key={yr}
                          onClick={() => setYearFilter(yr)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            yearFilter === yr
                              ? 'bg-indigo-600 text-white shadow'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          {yr === 'ALL' ? 'Tümü' : `${yr}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category Selector Sub-Tabs (Zorunlu vs Seçmeli) */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
                      <button
                        onClick={() => setCourseCategoryTab('mandatory')}
                        className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          courseCategoryTab === 'mandatory'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <BookmarkCheck className="w-3.5 h-3.5" />
                        <span>Zorunlu Dersler</span>
                        <span className="px-1.5 py-0.2 text-[10px] bg-slate-800 text-slate-300 rounded-full font-mono">
                          {mandatoryCount}
                        </span>
                      </button>

                      <button
                        onClick={() => setCourseCategoryTab('elective')}
                        className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          courseCategoryTab === 'elective'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Seçmeli Dersler</span>
                        <span className="px-1.5 py-0.2 text-[10px] bg-amber-950 text-amber-300 rounded-full font-mono">
                          {electiveCount}
                        </span>
                      </button>
                    </div>

                    <span className="text-xs font-mono text-indigo-400">{filteredCurriculum.length} Ders Listeleniyor</span>
                  </div>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                    <p className="text-sm">Dersler yükleniyor...</p>
                  </div>
                ) : filteredCurriculum.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    Bu kategoride ders bulunamadı.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filteredCurriculum.map(course => {
                      const isAdded = selectedCourses.some(c => c.code === course.code);
                      return (
                        <div
                          key={course.id || course.code}
                          onClick={() => handleAddCourse(course)}
                          className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isAdded
                              ? 'bg-indigo-950/30 border-indigo-500/50 shadow-md shadow-indigo-950/50'
                              : 'bg-slate-950/60 border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-800/40'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center space-x-2">
                                <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded border ${
                                  course.is_elective
                                    ? 'text-amber-400 bg-amber-950/80 border-amber-800/50'
                                    : 'text-indigo-400 bg-indigo-950/80 border-indigo-800/50'
                                }`}>
                                  {course.code}
                                </span>
                                {course.year && (
                                  <span className="text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                                    {course.year}. Sınıf
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-1">
                                {course.is_elective && (
                                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded-full">
                                    SEÇMELİ
                                  </span>
                                )}
                                {course.is_online && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded-full">
                                    <Laptop className="w-3 h-3" /> ONLINE
                                  </span>
                                )}
                              </div>
                            </div>

                            <h3 className="font-semibold text-sm text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2">
                              {course.name}
                            </h3>

                            {course.instructor && (
                              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-500" />
                                <span className="truncate">{course.instructor}</span>
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/60 text-xs text-slate-400">
                            <span>Kredi: {course.credits} | AKTS: {course.ects}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isAdded) handleRemoveCourse(course.code);
                                else handleAddCourse(course);
                              }}
                              className={`p-1.5 rounded-lg transition-all ${
                                isAdded
                                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-red-500/20 hover:text-red-400'
                                  : 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white'
                              }`}
                            >
                              {isAdded ? <CheckCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Course Basket & Manual Input */}
            <div className="space-y-6">
              
              {/* Basket Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 sticky top-24">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="bg-emerald-500/20 p-1.5 rounded-lg border border-emerald-500/30">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <h2 className="text-base font-semibold text-slate-200">Ders Sepetim</h2>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded-full font-mono">
                    {selectedCourses.length} Ders
                  </span>
                </div>

                {/* Basket Course List */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {selectedCourses.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-2 border border-dashed border-slate-800 rounded-xl">
                      <AlertCircle className="w-6 h-6 text-slate-600" />
                      <span>Sepetiniz henüz boş.</span>
                      <span className="text-xs text-slate-600">Müfredattan veya Seçmelilerden ders seçin.</span>
                    </div>
                  ) : (
                    selectedCourses.map(course => (
                      <div
                        key={course.code}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center space-x-2">
                            <span className={`font-mono font-bold text-xs ${course.is_elective ? 'text-amber-400' : 'text-indigo-400'}`}>
                              {course.code}
                            </span>
                            {course.is_elective && (
                              <span className="text-[9px] text-amber-400 bg-amber-950/60 px-1.5 rounded border border-amber-800/40">SEÇMELİ</span>
                            )}
                            {course.is_online && (
                              <span className="text-[9px] text-cyan-400 bg-cyan-950/60 px-1.5 rounded border border-cyan-800/40">ONLINE</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 truncate mt-0.5">{course.name}</p>
                          {course.instructor && (
                            <p className="text-[10px] text-slate-500 truncate">{course.instructor}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveCourse(course.code)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
                          title="Dersi Çıkar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Manual Add Input */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Elle Ders Kodu Ekle
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualAdd()}
                      placeholder="Örn: BLM101"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={handleManualAdd}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors"
                    >
                      Ekle
                    </button>
                  </div>
                </div>

                {/* Optional PDF Upload */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Veya PDF Transkript Yükle
                  </label>
                  <label className="flex items-center justify-center gap-2 p-3 bg-slate-950/80 border border-dashed border-slate-700 hover:border-indigo-500 rounded-xl cursor-pointer text-xs text-slate-400 hover:text-indigo-300 transition-all">
                    <Upload className="w-4 h-4 text-indigo-400" />
                    <span>{pdfUploading ? 'Yükleniyor...' : 'Transkript PDF Seç'}</span>
                    <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                {/* Confirm & Go to Stage 2 Button */}
                <button
                  onClick={handleConfirmAndSolve}
                  disabled={selectedCourses.length === 0 || loading}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 transition-all ${
                    selectedCourses.length > 0 && !loading
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <span>Dersleri Onayla & Çizelgeyi Oluştur</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Stage 2: Weekly Schedule Timetable Grid */
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-400" />
                  Haftalık Ders Çizelgesi
                </h2>
                <p className="text-xs text-slate-400">Çakışmasız optimum ders programınız</p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveTab('selection')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
                >
                  ← Ders Seçimine Geri Dön
                </button>
                <button
                  onClick={handleConfirmAndSolve}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl shadow transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Yeniden Hesapla</span>
                </button>
              </div>
            </div>

            {/* Weekly Timetable Table Grid */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800">
                      <th className="p-3 border-r border-slate-800 w-24 text-center font-bold text-slate-400">Saat</th>
                      {DAYS.map(day => (
                        <th key={day} className="p-3 border-r border-slate-800 text-center font-bold text-indigo-300 min-w-[140px]">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIME_SLOTS.map((slot, slotIdx) => {
                      const [slotStart] = slot.split('-');
                      return (
                        <tr key={slot} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                          <td className="p-2 border-r border-slate-800 text-center font-mono text-slate-500 bg-slate-950/40">
                            {slot}
                          </td>
                          {DAYS.map(day => {
                            let activeCourse: any = null;
                            const currentSchedule = generatedSchedules[selectedScheduleIdx]?.schedule || {};

                            Object.entries(currentSchedule).forEach(([code, details]) => {
                              details.slots.forEach(s => {
                                if (s.day === day && s.start_time <= slotStart && s.end_time > slotStart) {
                                  activeCourse = { code, ...details };
                                }
                              });
                            });

                            return (
                              <td key={day} className="p-1 border-r border-slate-800/60 h-16 align-top">
                                {activeCourse ? (
                                  <div className={`h-full w-full p-2 rounded-lg border flex flex-col justify-between ${
                                    activeCourse.is_online
                                      ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                                      : 'bg-indigo-950/50 border-indigo-800/60 text-indigo-200'
                                  }`}>
                                    <div>
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold font-mono">{activeCourse.code}</span>
                                        {activeCourse.is_online && (
                                          <span className="text-[9px] bg-amber-900/80 text-amber-300 px-1 rounded">ONLINE</span>
                                        )}
                                      </div>
                                      <p className="text-[10px] opacity-80 truncate mt-0.5">{activeCourse.instructor}</p>
                                    </div>
                                    <div className="text-[9px] opacity-60 font-mono text-right">
                                      {activeCourse.slots[0]?.classroom || 'Derslik'}
                                    </div>
                                  </div>
                                ) : null}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500 bg-slate-950">
        YTÜ Ders Seçimi & Program Oluşturucu © 2026 - Yıldız Technical University
      </footer>
    </div>
  );
}
