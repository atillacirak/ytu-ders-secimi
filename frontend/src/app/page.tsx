'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Calendar, CheckCircle, Clock, Trash2, Plus, Filter, 
  Search, AlertCircle, ArrowRight, RefreshCw, Upload, Sparkles, Layers,
  ChevronRight, ChevronLeft, Laptop, Building2, User, Award, BookmarkCheck,
  GraduationCap, LayoutGrid, XCircle, Shuffle, Globe, Star, TrendingUp, Download,
  FileText, Printer, Eye, Share2, Palette
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { getFullInstructorName, INSTRUCTOR_MAP } from '../utils/instructors';


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
  days?: string;
  semester?: string;
  sections?: CourseSection[];
}

interface CourseSection {
  section_no?: string;
  section_id?: string;
  instructor?: string;
  is_online?: boolean;
  schedule?: ScheduleSlot[];
  time_slots?: ScheduleSlot[];
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
      { code: 'BMD', name: 'Biyomedikal Mühendisliği' },
      { code: 'ELK', name: 'Elektrik Mühendisliği' },
      { code: 'EHM', name: 'Elektronik ve Haberleşme Mühendisliği' },
      { code: 'YZV', name: 'Yapay Zeka ve Veri Mühendisliği' },
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
    id: 'KMF',
    name: 'Kimya - Metalurji Fakültesi',
    departments: [
      { code: 'BIO', name: 'Biyomühendislik Bölümü' },
      { code: 'GDA', name: 'Gıda Mühendisliği Bölümü' },
      { code: 'KIM', name: 'Kimya Mühendisliği (%30 İngilizce)' },
      { code: 'KIM_ENG', name: 'Kimya Mühendisliği (%100 İngilizce)' },
      { code: 'MAT', name: 'Matematik Mühendisliği Bölümü' },
      { code: 'MET', name: 'Metalurji ve Malzeme Mühendisliği (%30 İngilizce)' },
      { code: 'MET_ENG', name: 'Metalurji ve Malzeme Mühendisliği (%100 İngilizce)' },
    ]
  }
];

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
const TIME_SLOTS = [
  '08.00-08.50', '09.00-09.50', '10.00-10.50', '11.00-11.50',
  '12.00-12.50', '13.00-13.50', '14.00-14.50', '15.00-15.50',
  '16.00-16.50', '17.00-17.50', '18.00-18.50', '19.00-19.50',
  '20.00-20.50'
];

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);

  const [activeTab, setActiveTab] = useState<'intibak' | 'management' | 'selection' | 'schedule' | 'visualizer'>('visualizer');
  const [courseCategoryTab, setCourseCategoryTab] = useState<'mandatory' | 'dept_elective' | 'social_elective' | 'curriculum'>('mandatory');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('EEF');
  const [selectedDept, setSelectedDept] = useState<string>('BLM');
  const [yearFilter, setYearFilter] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [curriculumYear, setCurriculumYear] = useState<number>(1);
  const [semesterFilter, setSemesterFilter] = useState<'ALL' | 'güz' | 'bahar'>('güz');
  const [excludedCourses, setExcludedCourses] = useState<string[]>([]);
  const [curriculum, setCurriculum] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [manualCode, setManualCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [generatedSchedules, setGeneratedSchedules] = useState<ScheduleCombination[]>([]);
  const [selectedScheduleIdx, setSelectedScheduleIdx] = useState(0);
  const [hiddenCourses, setHiddenCourses] = useState<string[]>([]);

  // PDF Schedule Visualizer state
  const [visualizerPdfUploading, setVisualizerPdfUploading] = useState(false);
  const [visualizerData, setVisualizerData] = useState<{
    student_id: string;
    student_name: string;
    department?: string;
    term: string;
    title: string;
    schedule: Record<string, any[]>;
    courses_summary: any[];
  } | null>(null);
  const [visualizerError, setVisualizerError] = useState<string | null>(null);
  const [visualizerViewMode, setVisualizerViewMode] = useState<'table' | 'cards' | 'summary'>('table');
  const [visualizerColorMode, setVisualizerColorMode] = useState<'colored' | 'monochrome'>('colored');
  const visualizerScheduleRef = useRef<HTMLDivElement>(null);
  
  const scheduleRef = useRef<HTMLDivElement>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [editingCourseCode, setEditingCourseCode] = useState<string | null>(null);
  const [manageSearch, setManageSearch] = useState('');

  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [lockedSections, setLockedSections] = useState<Record<string, string>>({});
  const [availableCodes, setAvailableCodes] = useState<Set<string>>(new Set());
  const [isFetchingAvailable, setIsFetchingAvailable] = useState(false);


  const [optimizationOptions, setOptimizationOptions] = useState({
    target_free_days: false,
    minimize_gaps: false,
    avoid_early_mornings: false
  });

  const handleExportPNG = async () => {
    if (!scheduleRef.current) return;
    try {
      const dataUrl = await toPng(scheduleRef.current, {
        cacheBust: true,
        backgroundColor: '#020617',
        style: {
          padding: '16px'
        }
      });
      const link = document.createElement('a');
      link.download = `YTU_Ders_Programi_${selectedDept}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('PNG export error:', err);
      alert('PNG görseli oluşturulurken hata oluştu.');
    }
  };

  const handleVisualizerPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVisualizerPdfUploading(true);
    setVisualizerError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/parse-student-schedule`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'PDF ayrıştırılamadı. Lütfen geçerli bir Öğrenci Ders Programı (Report.pdf) yükleyin.');
      }

      const data = await res.json();
      if (data && data.schedule) {
        setVisualizerData(data);
      } else {
        throw new Error('PDF dosyasında ders programı bilgisi bulunamadı.');
      }
    } catch (err: any) {
      console.error('Visualizer PDF upload error:', err);
      setVisualizerError(err.message || 'PDF yüklenirken bir hata oluştu.');
    } finally {
      setVisualizerPdfUploading(false);
      e.target.value = '';
    }
  };

  const handleExportVisualizerPNG = async () => {
    if (!visualizerScheduleRef.current) return;
    try {
      const dataUrl = await toPng(visualizerScheduleRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2, // A4 yüksek çözünürlük & netlik
        style: {
          borderRadius: '0px',
          border: 'none',
          boxShadow: 'none',
          margin: '0px',
        }
      });
      const link = document.createElement('a');
      const studentNameClean = (visualizerData?.student_name || 'Ogrenci').replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ_]/g, '_');
      link.download = `YTU_A4_Ders_Programi_${studentNameClean}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('PNG export error:', err);
      alert('PNG görseli oluşturulurken hata oluştu.');
    }
  };

  const [manageFormData, setManageFormData] = useState<{
    department_code: string;
    code: string;
    name: string;
    year: number;
    is_elective: boolean;
    credits: number;
    ects: number;
    instructor: string;
    is_online: boolean;
    sections: {
      section_id: string;
      instructor: string;
      time_slots: { day: string; start_time: string; end_time: string; classroom: string }[];
    }[];
  }>({
    department_code: 'BLM',
    code: '',
    name: '',
    year: 1,
    is_elective: false,
    credits: 3,
    ects: 5,
    instructor: 'Bölüm Öğretim Üyeleri',
    is_online: false,
    sections: []
  });

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    if (selectedCourses.length === 0) {
      setAvailableCodes(new Set());
      return;
    }
    
    let isMounted = true;
    const fetchAvailable = async () => {
      setIsFetchingAvailable(true);
      try {
        const payload = {
          selected_course_codes: selectedCourses.map(c => c.code),
          department_code: selectedDept,
          options: {
            ...optimizationOptions,
            locked_sections: lockedSections
          }
        };
        const res = await fetch(`${API_BASE}/api/available-courses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        if (isMounted && Array.isArray(data)) {
          setAvailableCodes(new Set(data));
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsFetchingAvailable(false);
      }
    };
    
    fetchAvailable();
    return () => { isMounted = false; };
  }, [selectedCourses, selectedDept, lockedSections, optimizationOptions, API_BASE]);

  const handleOpenAddCourseModal = () => {
    setEditingCourseCode(null);
    setManageFormData({
      department_code: selectedDept,
      code: '',
      name: '',
      year: 1,
      is_elective: false,
      credits: 3,
      ects: 5,
      instructor: 'Bölüm Öğretim Üyeleri',
      is_online: false,
      sections: [
        {
          section_id: 'Gr1',
          instructor: 'Bölüm Öğretim Üyeleri',
          time_slots: [{ day: 'Pazartesi', start_time: '09:00', end_time: '11:50', classroom: 'DB11' }]
        }
      ]
    });
    setIsManageModalOpen(true);
  };

  const handleOpenEditCourseModal = (course: Course) => {
    setEditingCourseCode(course.code);
    setManageFormData({
      department_code: selectedDept,
      code: course.code,
      name: course.name,
      year: course.year || 1,
      is_elective: !!course.is_elective,
      credits: course.credits || 3,
      ects: course.ects || 5,
      instructor: course.instructor || 'Bölüm Öğretim Üyeleri',
      is_online: !!course.is_online,
      sections: (course.sections && course.sections.length > 0)
        ? course.sections.map((s: any) => ({
            section_id: s.section_id || s.section_no || 'Gr1',
            instructor: s.instructor || 'Bölüm Öğretim Üyeleri',
            time_slots: (s.time_slots || s.schedule || []).map((ts: any) => ({
              day: ts.day || 'Pazartesi',
              start_time: ts.start_time || '09:00',
              end_time: ts.end_time || '11:50',
              classroom: ts.classroom || 'DB11'
            }))
          }))
        : [{ section_id: 'Gr1', instructor: course.instructor || 'Bölüm Öğretim Üyeleri', time_slots: [{ day: 'Pazartesi', start_time: '09:00', end_time: '11:50', classroom: 'DB11' }] }]
    });
    setIsManageModalOpen(true);
  };

  const handleSaveCourse = async () => {
    if (!manageFormData.code || !manageFormData.name) {
      alert('Ders kodu ve ders adı zorunludur.');
      return;
    }
    const isEdit = !!editingCourseCode;
    const url = isEdit
      ? `${API_BASE}/api/admin/courses/${editingCourseCode}`
      : `${API_BASE}/api/admin/courses`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manageFormData)
      });
      if (res.ok) {
        setIsManageModalOpen(false);
        fetchCurriculum(selectedDept);
      } else {
        const err = await res.json();
        alert(err.detail || 'Ders kaydedilirken hata oluştu.');
      }
    } catch (e) {
      alert('Sunucu hatası: ' + e);
    }
  };

  const handleDeleteCourse = async (code: string) => {
    if (!confirm(`"${code}" dersini silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/courses/${code}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchCurriculum(selectedDept);
      } else {
        alert('Ders silinirken hata oluştu.');
      }
    } catch (e) {
      alert('Hata: ' + e);
    }
  };

  // Load stored preferences after mounting (avoids SSR hydration mismatch)
  useEffect(() => {
    try {
      const savedFaculty = localStorage.getItem('ytu_selected_faculty');
      const savedDept = localStorage.getItem('ytu_selected_dept');
      const savedSelected = localStorage.getItem('ytu_selected_courses');
      const savedExcluded = localStorage.getItem('ytu_excluded_courses');

      if (savedFaculty) setSelectedFaculty(savedFaculty);
      if (savedDept) setSelectedDept(savedDept);
      if (savedSelected) setSelectedCourses(JSON.parse(savedSelected));
      if (savedExcluded) setExcludedCourses(JSON.parse(savedExcluded));
    } catch (e) {
      console.error('Error loading stored preferences:', e);
    } finally {
      setIsMounted(true);
    }
  }, []);

  // Save selected faculty & department
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('ytu_selected_faculty', selectedFaculty);
      localStorage.setItem('ytu_selected_dept', selectedDept);
    } catch (e) {}
  }, [selectedFaculty, selectedDept, isMounted]);

  // Save selected courses to localStorage
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('ytu_selected_courses', JSON.stringify(selectedCourses));
    } catch (e) {}
  }, [selectedCourses, isMounted]);

  // Save intibak / excluded courses to localStorage
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('ytu_excluded_courses', JSON.stringify(excludedCourses));
    } catch (e) {}
  }, [excludedCourses, isMounted]);


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

  const hasMultipleTimeOptions = (course: Course): boolean => {
    if (!course.sections || course.sections.length <= 1) return false;
    const firstSec = course.sections[0];
    const firstSlots = (firstSec.time_slots || (firstSec as any).schedule || []).map((s: any) => `${s.day}_${s.start_time}_${s.end_time}`).sort().join('|');
    for (let i = 1; i < course.sections.length; i++) {
      const sec = course.sections[i];
      const secSlots = (sec.time_slots || (sec as any).schedule || []).map((s: any) => `${s.day}_${s.start_time}_${s.end_time}`).sort().join('|');
      if (secSlots !== firstSlots) {
        return true;
      }
    }
    return false;
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

  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const parseMin = (tStr: string) => {
    if (!tStr) return 0;
    const parts = tStr.replace('.', ':').split(':');
    return parseInt(parts[0], 10) * 60 + (parts[1] ? parseInt(parts[1], 10) : 0);
  };

  // Helper to extract time slots for a single section
  const getSectionSlots = (sec: any): { day: string; start: number; end: number; timeStr: string }[] => {
    const slots: { day: string; start: number; end: number; timeStr: string }[] = [];
    const timeArr = sec.schedule || sec.time_slots || [];
    timeArr.forEach((ts: any) => {
      if (ts.day && ts.start_time && ts.end_time) {
        slots.push({
          day: ts.day,
          start: parseMin(ts.start_time),
          end: parseMin(ts.end_time),
          timeStr: `${ts.day} ${ts.start_time}-${ts.end_time}`
        });
      }
    });
    return slots;
  };

  // Helper to extract all possible section slot options for a course (or specific locked section)
  const getCourseSectionsSlots = (course: Course, lockedSectionId?: string): { day: string; start: number; end: number; timeStr: string }[][] => {
    if (course.sections && course.sections.length > 0) {
      let sectionsToConsider = course.sections;
      if (lockedSectionId) {
        const found = course.sections.find((s: any) => s.section_id === lockedSectionId);
        if (found) sectionsToConsider = [found];
      }
      const result: { day: string; start: number; end: number; timeStr: string }[][] = [];
      sectionsToConsider.forEach((sec: any) => {
        const sSlots = getSectionSlots(sec);
        if (sSlots.length > 0) {
          result.push(sSlots);
        }
      });
      if (result.length > 0) return result;
    }

    // fallback to course.days if sections array is not populated
    const fallbackSlots: { day: string; start: number; end: number; timeStr: string }[] = [];
    if (course.days) {
      const text = course.days;
      const daysList = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
      daysList.forEach(d => {
        if (text.includes(d)) {
          const regex = /(\d{1,2}[\.:]\d{2})\s*-\s*(\d{1,2}[\.:]\d{2})/g;
          let match;
          while ((match = regex.exec(text)) !== null) {
            const startM = parseMin(match[1]);
            const endM = parseMin(match[2]);
            fallbackSlots.push({
              day: d,
              start: startM,
              end: endM,
              timeStr: `${d} ${match[1]}-${match[2]}`
            });
          }
        }
      });
    }
    return [fallbackSlots];
  };

  const slotsOverlap = (slots1: { day: string; start: number; end: number }[], slots2: { day: string; start: number; end: number }[]) => {
    for (const s1 of slots1) {
      for (const s2 of slots2) {
        if (s1.day === s2.day) {
          if (Math.max(s1.start, s2.start) < Math.min(s1.end, s2.end)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const canAddCourseWithoutConflict = (coursesList: Course[], lockedSecs: Record<string, string>): boolean => {
    if (coursesList.length <= 1) return true;
    
    const allCourseOptions: { day: string; start: number; end: number; timeStr: string }[][][] = coursesList.map(c => 
      getCourseSectionsSlots(c, lockedSecs[c.code])
    );

    const findValid = (index: number, currentChoice: { day: string; start: number; end: number; timeStr: string }[][]): boolean => {
      if (index === allCourseOptions.length) return true;
      const sectionOptions = allCourseOptions[index];
      if (sectionOptions.length === 0) {
        return findValid(index + 1, currentChoice);
      }
      for (const secSlots of sectionOptions) {
        let overlaps = false;
        for (const chosen of currentChoice) {
          if (slotsOverlap(secSlots, chosen)) {
            overlaps = true;
            break;
          }
        }
        if (!overlaps) {
          if (findValid(index + 1, [...currentChoice, secSlots])) {
            return true;
          }
        }
      }
      return false;
    };

    return findValid(0, []);
  };

  // Comprehensive slot extractor for single schedule generation / fallback
  const getCourseAllSlots = (course: Course): { day: string; start: number; end: number; timeStr: string }[] => {
    const secOptions = getCourseSectionsSlots(course, lockedSections[course.code]);
    return secOptions[0] || [];
  };

  const handleAddCourse = (course: Course) => {
    if (selectedCourses.some(c => c.code === course.code)) return;

    const testCourses = [...selectedCourses, course];
    const possible = canAddCourseWithoutConflict(testCourses, lockedSections);

    if (!possible) {
      const msg = `⚠️ Zaman Çakışması: "${course.name}" dersinin mevcut sepetinizdeki derslerle çakışmayan hiçbir şubesi / saati bulunamadı!`;
      console.warn(msg);
      setConflictWarning(msg);
      return;
    }

    setConflictWarning(null);
    setSelectedCourses(prev => [...prev, course]);
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
      handleAddCourse({
        id: `manual_${Date.now()}`,
        code: codeUpper,
        name: `${codeUpper} (Özel Ders)`,
        credits: 3,
        ects: 5,
        is_elective: false,
        instructor: 'Bilinmiyor',
        is_online: false
      });
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

  const mergeCourseSlots = (scheduleData: ScheduleCombination[]): ScheduleCombination[] => {
    if (!scheduleData || scheduleData.length === 0) return scheduleData;
    return scheduleData.map(combo => {
      const updatedSchedule = { ...combo.schedule };
      selectedCourses.forEach(course => {
        const parsedSlots = getCourseAllSlots(course);
        if (parsedSlots.length > 0) {
          const formattedSlots = parsedSlots.map(s => {
            const timeParts = s.timeStr.split(' ');
            const range = timeParts[1] ? timeParts[1].split('-') : ['09:00', '11:50'];
            return {
              day: s.day,
              start_time: range[0],
              end_time: range[1],
              classroom: course.is_online ? 'Online' : 'Derslik Belirtilmedi'
            };
          });

          if (updatedSchedule[course.code]) {
            const currentSlots = updatedSchedule[course.code].slots || [];
            if (currentSlots.length === 0) {
              updatedSchedule[course.code] = {
                ...updatedSchedule[course.code],
                section_no: updatedSchedule[course.code].section_no || 'Gr1',
                slots: formattedSlots
              };
            }
          } else {
            updatedSchedule[course.code] = {
              section_no: 'Gr1',
              instructor: course.instructor || '',
              is_online: !!course.is_online,
              slots: formattedSlots
            };
          }
        }
      });
      return { ...combo, schedule: updatedSchedule };
    });
  };

  const handleConfirmAndSolve = async (overrideOpts?: typeof optimizationOptions) => {
    const opts = (overrideOpts && typeof overrideOpts === 'object' && 'target_free_days' in overrideOpts)
      ? overrideOpts
      : optimizationOptions;

    if (selectedCourses.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/generate-schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_course_codes: selectedCourses.map(c => c.code),
          options: {
            ...opts,
            locked_sections: lockedSections
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setGeneratedSchedules(mergeCourseSlots(data));
          setSelectedScheduleIdx(0);
        } else {
          generateFallbackSchedule();
        }
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
    const realSchedule: Record<string, any> = {};
    selectedCourses.forEach(course => {
      const parsedSlots = getCourseAllSlots(course);
      realSchedule[course.code] = {
        section_no: 'Gr1',
        instructor: course.instructor || '',
        is_online: course.is_online || false,
        slots: parsedSlots.map(s => {
          const timeParts = s.timeStr.split(' ');
          const range = timeParts[1] ? timeParts[1].split('-') : ['09:00', '11:50'];
          return {
            day: s.day,
            start_time: range[0],
            end_time: range[1],
            classroom: course.is_online ? 'Online' : 'Derslik Belirtilmedi'
          };
        })
      };
    });
    setGeneratedSchedules([{ schedule: realSchedule, score: 0, conflicts: [] }]);
    setSelectedScheduleIdx(0);
  };

  const handleToggleExclude = (code: string) => {
    setExcludedCourses(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  // Helper to identify social/general electives (USK, ITB, GSB, SDB, MDB, or social keywords)
  const isSocialElective = (course: Course): boolean => {
    const c = course.code.toUpperCase();
    const n = course.name.toLowerCase();
    return c.startsWith('USK') || c.startsWith('ITB') || c.startsWith('GSB') || c.startsWith('SDB') || c.startsWith('MDB') ||
           n.includes('sosyal') || n.includes('felsefe') || n.includes('sanat') || n.includes('sosyoloji') || n.includes('insan ve toplum') || n.includes('serbest');
  };

  // Base filtered courses (filtered by year, search query, and intibak/excluded status)
  const baseFilteredCurriculum = curriculum.filter(course => {
    const matchesSearch = course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          course.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = isSocialElective(course) || yearFilter === 'ALL' || course.year === yearFilter;
    const notExcluded = !excludedCourses.includes(course.code);
    const matchesAvailable = showOnlyAvailable 
      ? (selectedCourses.length === 0 ? true : availableCodes.has(course.code))
      : true;
    return matchesSearch && matchesYear && notExcluded && matchesAvailable;
  });

  // Category counts based on active filters
  const mandatoryCount = baseFilteredCurriculum.filter(c => !c.is_elective).length;
  const deptElectiveCount = baseFilteredCurriculum.filter(c => c.is_elective && !isSocialElective(c)).length;
  const socialElectiveCount = baseFilteredCurriculum.filter(c => c.is_elective && isSocialElective(c)).length;

  const filteredCurriculum = baseFilteredCurriculum.filter(course => {
    if (courseCategoryTab === 'mandatory') {
      return !course.is_elective;
    } else if (courseCategoryTab === 'dept_elective') {
      return !!course.is_elective && !isSocialElective(course);
    } else if (courseCategoryTab === 'social_elective') {
      return !!course.is_elective && isSocialElective(course);
    }
    return true;
  });

  const handleAddAllFilteredCourses = () => {
    const toAdd = filteredCurriculum.filter(
      c => !selectedCourses.some(s => s.code === c.code)
    );
    setSelectedCourses(prev => [...prev, ...toAdd]);
  };





  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-100/80 text-slate-900 transition-colors duration-200">
      {/* Top Header — Kurumsal YTÜ Portalı */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 no-print shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#002855] flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  YTÜ Program Görselleştirici
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-mono rounded font-semibold">
                  OBS
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Öğrenci Haftalık Ders Programı Çizelgesi Portalı
              </p>
            </div>
          </div>

          {/* Kurumsal Bilgi & Durum Alanı */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Gönüllü Proje</span>
            </div>

            {visualizerData && (
              <label className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#002855] hover:bg-[#001f42] text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Yeni Belge Yükle</span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleVisualizerPdfUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </header>

      {/* Sticky Conflict Warning Notification Banner */}
      {conflictWarning && (
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 border-b-2 border-rose-500 text-rose-100 px-4 py-3.5 sticky top-[73px] z-50 shadow-2xl backdrop-blur flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3 max-w-7xl mx-auto w-full">
            <div className="bg-rose-600/30 p-2 rounded-xl border border-rose-500/50 flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-rose-300" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-rose-100 leading-snug">{conflictWarning}</p>
          </div>
          <button
            onClick={() => setConflictWarning(null)}
            className="px-3 py-1.5 rounded-xl bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-600/60 font-semibold text-xs transition-colors flex-shrink-0"
          >
            Kapat ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {activeTab === 'intibak' ? (
          /* ══════════════════════════════════════════
             İNTİBAK DERSLERİ — Full Page
          ══════════════════════════════════════════ */
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header card */}
            <div className="bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-900 border border-rose-800/40 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="bg-rose-700/30 border border-rose-600/40 p-3 rounded-xl flex-shrink-0">
                  <Shuffle className="w-6 h-6 text-rose-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-rose-200">Yatay Geçiş – İntibak Dersleri</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Önceki üniversitenizde almış olduğunuz ve muaf sayılacak dersleri aşağıdan işaretleyin.
                    İşaretlenen dersler <span className="text-indigo-300 font-medium">1. Aşama</span>'daki
                    Zorunlu ve Seçmeli ders listelerinden otomatik olarak çıkarılır.
                  </p>
                  {excludedCourses.length > 0 && (
                    <div className="mt-3 flex items-center gap-3">
                      <span className="text-sm font-semibold text-rose-300">
                        {excludedCourses.length} ders muaf sayıldı
                      </span>
                      <button
                        onClick={() => setExcludedCourses([])}
                        className="text-xs text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-700/60 px-3 py-1 rounded-lg transition-all"
                      >
                        Tümünü Temizle
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Faculty & Dept selector — reuse for loading the right curriculum */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Bölüm Seçin (Muaf tutulacak derslerin müfredatını yükler)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={selectedFaculty}
                  onChange={e => {
                    const newFacId = e.target.value;
                    setSelectedFaculty(newFacId);
                    const fac = FACULTIES.find(f => f.id === newFacId);
                    if (fac && fac.departments.length > 0) setSelectedDept(fac.departments[0].code);
                  }}
                  className="bg-slate-950/80 border border-slate-700/80 hover:border-rose-500/50 rounded-xl px-4 py-3 text-xs font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500 w-full transition-all"
                >
                  {FACULTIES.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <select
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                  className="bg-slate-950/80 border border-slate-700/80 hover:border-rose-500/50 rounded-xl px-4 py-3 text-xs font-semibold text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500 w-full transition-all"
                >
                  {FACULTIES.find(f => f.id === selectedFaculty)?.departments.map(d => (
                    <option key={d.code} value={d.code}>{d.code} - {d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Curriculum course list with checkboxes */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              {loading ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-rose-400" />
                  <p className="text-sm">Müfredat yükleniyor...</p>
                </div>
              ) : curriculum.length === 0 ? (
                <div className="py-10 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  Bu bölüm için müfredat verisi bulunamadı.
                </div>
              ) : (
                <>
                  {[1, 2, 3, 4].map(yr => {
                    const yearCourses = curriculum.filter(c => c.year === yr);
                    if (yearCourses.length === 0) return null;
                    return (
                      <div key={yr} className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-rose-400" />
                            {yr}. Sınıf
                          </h3>
                          <button
                            onClick={() => {
                              const codes = yearCourses.map(c => c.code);
                              const allExcluded = codes.every(code => excludedCourses.includes(code));
                              if (allExcluded) {
                                setExcludedCourses(prev => prev.filter(c => !codes.includes(c)));
                              } else {
                                setExcludedCourses(prev => [...new Set([...prev, ...codes])]);
                              }
                            }}
                            className="text-xs text-rose-400 hover:text-rose-300 border border-rose-800/40 hover:border-rose-600/60 px-3 py-1 rounded-lg transition-all"
                          >
                            {yearCourses.every(c => excludedCourses.includes(c.code)) ? 'Tümünü Seçimi Kaldır' : 'Tümünü Seç'}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {yearCourses.map(course => {
                            const isExcluded = excludedCourses.includes(course.code);
                            return (
                              <div
                                key={course.code}
                                onClick={() => handleToggleExclude(course.code)}
                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                  isExcluded
                                    ? 'bg-rose-950/40 border-rose-700/60'
                                    : 'bg-slate-950/60 border-slate-800 hover:border-rose-700/40 hover:bg-rose-950/10'
                                }`}
                              >
                                <div className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${
                                  isExcluded ? 'bg-rose-600 border-rose-500' : 'bg-transparent border-slate-600'
                                }`}>
                                  {isExcluded && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`font-mono font-bold text-xs ${isExcluded ? 'line-through text-slate-500' : course.is_elective ? 'text-amber-400' : 'text-indigo-400'}`}>
                                      {course.code}
                                    </span>
                                    {course.code.endsWith('000') && (
                                     <span className="text-[10px] font-bold text-purple-300 bg-purple-950/80 border border-purple-800/60 px-2 py-0.5 rounded-full">
                                       HAVUZ DERSİ
                                     </span>
                                   )}
                                   {course.is_elective && !course.code.endsWith('000') && (
                                     <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded-full">
                                       SEÇMELİ
                                     </span>
                                   )}
                                   {course.is_online && (
                                     <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded-full">
                                       <Laptop className="w-3 h-3" /> ONLINE
                                     </span>
                                   )}
                                   {hasMultipleTimeOptions(course) && (
                                     <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1" title="Bu ders için farklı saatlerde şube alternatifleri mevcuttur">
                                       ⚡ Ders Saati Opsiyonlu
                                     </span>
                                   )}
                                  </div>
                                  <p className={`text-xs mt-0.5 leading-snug ${isExcluded ? 'line-through text-slate-600' : 'text-slate-300'}`}>{course.name}</p>
                                  <div className="text-[10px] text-slate-500 mt-1">{course.credits} Kredi • {course.ects} AKTS</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* CTA to go to selection */}
            <button
              onClick={() => setActiveTab('selection')}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <Layers className="w-4 h-4" />
              İntibak seçimini tamamladım, Ders Seçimine Geç →
            </button>
          </div>
        ) : activeTab === 'management' ? (
          /* ══════════════════════════════════════════
             ELLE DERS EKLEME VE DÜZENLEME SEKMESİ
          ══════════════════════════════════════════ */
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900 border border-amber-800/40 rounded-2xl p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="bg-amber-600/30 border border-amber-500/40 p-3 rounded-xl flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-amber-200">Ders Ekleme ve Düzenleme Yönetimi</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Bölüm müfredatındaki tüm dersleri ve şubeleri görüntüleyin, yeni dersler ekleyin veya var olan dersleri düzenleyip silin.
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenAddCourseModal}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" /> Yeni Ders Ekle
              </button>
            </div>

            {/* Department & Search Filter Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-[300px]">
                <select
                  value={selectedFaculty}
                  onChange={e => {
                    const newFacId = e.target.value;
                    setSelectedFaculty(newFacId);
                    const fac = FACULTIES.find(f => f.id === newFacId);
                    if (fac && fac.departments.length > 0) setSelectedDept(fac.departments[0].code);
                  }}
                  className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {FACULTIES.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <select
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                  className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {FACULTIES.find(f => f.id === selectedFaculty)?.departments.map(d => (
                    <option key={d.code} value={d.code}>{d.code} - {d.name}</option>
                  ))}
                </select>
              </div>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Ders ara (Kod veya Ad)..."
                  value={manageSearch}
                  onChange={e => setManageSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Course List Cards */}
            <div className="space-y-3">
              {loading ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                  <p className="text-sm">Dersler yükleniyor...</p>
                </div>
              ) : curriculum.filter(c => 
                  c.code.toLowerCase().includes(manageSearch.toLowerCase()) || 
                  c.name.toLowerCase().includes(manageSearch.toLowerCase())
                ).length === 0 ? (
                <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  Bu bölüm için aramanızla eşleşen ders bulunamadı.
                </div>
              ) : (
                curriculum
                  .filter(c => 
                    c.code.toLowerCase().includes(manageSearch.toLowerCase()) || 
                    c.name.toLowerCase().includes(manageSearch.toLowerCase())
                  )
                  .map(course => (
                    <div key={course.code} className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 shadow-xl transition-all space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/60 pb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm text-amber-400">{course.code}</span>
                            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-semibold">{course.year}. Sınıf</span>
                            {course.is_elective ? (
                              <span className="text-[10px] bg-amber-950 border border-amber-800 text-amber-300 px-2 py-0.5 rounded-full font-bold">SEÇMELİ</span>
                            ) : (
                              <span className="text-[10px] bg-indigo-950 border border-indigo-800 text-indigo-300 px-2 py-0.5 rounded-full font-bold">ZORUNLU</span>
                            )}
                            {course.is_online && (
                              <span className="text-[10px] bg-cyan-950 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <Laptop className="w-3 h-3" /> ONLINE
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-slate-100 mt-1">{course.name}</h3>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {course.credits} Kredi • {course.ects} AKTS | <span className="text-slate-300 font-medium">{course.instructor || 'Bölüm Öğretim Üyeleri'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditCourseModal(course)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(course.code)}
                            className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-semibold border border-rose-800/60 transition-colors"
                          >
                            Sil
                          </button>
                        </div>
                      </div>

                      {/* Sections breakdown */}
                      {course.sections && course.sections.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                          {course.sections.map((sec: any, idx: number) => {
                            const slots = sec.time_slots || sec.schedule || [];
                            return (
                              <div key={idx} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 text-xs">
                                <div className="font-bold text-indigo-300 flex items-center justify-between">
                                  <span>Şube: {sec.section_id || sec.section_no}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">{sec.instructor}</span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                                  {slots.length > 0 ? (
                                    slots.map((ts: any, tIdx: number) => (
                                      <div key={tIdx} className="flex justify-between text-slate-300">
                                        <span>{ts.day} {ts.start_time}-{ts.end_time}</span>
                                        <span className="text-slate-400 ml-2">[{ts.classroom || 'Derslik B.'}]</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-slate-500 italic">Zaman slotu eklenmedi</div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        ) : activeTab === 'selection' ? (
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
                
                {/* TOP HEADER OF COURSES BLOCK: Search, Filters & Semester Bar */}
                <div className="space-y-3 pb-3 border-b border-slate-800">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
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

                    {/* Filter Controls: Class Pills & Add All Button */}
                    <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                      {/* Sınıf Filter */}
                      <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
                          <Filter className="w-3 h-3 text-slate-500" /> Müfredat Sınıfı:
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
                            {yr === 'ALL' ? 'Tümü' : `${yr}. Sınıf`}
                          </button>
                        ))}
                      </div>

                      {/* Çakışmayanları Göster Toggle */}
                      <label className="flex items-center space-x-2 cursor-pointer bg-slate-950 p-1.5 px-3 rounded-xl border border-slate-800 hover:border-emerald-500/50 transition-all">
                        <input
                          type="checkbox"
                          checked={showOnlyAvailable}
                          onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                          className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
                        />
                        <span className="text-[11px] font-semibold text-slate-300">
                          {isFetchingAvailable ? 'Hesaplanıyor...' : 'Çakışmayan Dersler'}
                        </span>
                      </label>

                      {/* Hepsini Sepete Ekle Button */}
                      <button
                        onClick={handleAddAllFilteredCourses}
                        disabled={filteredCurriculum.length === 0}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                          filteredCurriculum.length > 0
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Hepsini Ekle ({filteredCurriculum.length})
                      </button>
                    </div>
                  </div>

                  {/* Category Selector Sub-Tabs: Zorunlu / Bölüm Seçmeli / Sosyal Seçmeli */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 flex-wrap">
                      <button
                        onClick={() => setCourseCategoryTab('mandatory')}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          courseCategoryTab === 'mandatory'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <BookmarkCheck className="w-3.5 h-3.5" />
                        <span>Zorunlu Dersler</span>
                        <span className="px-1.5 text-[10px] bg-slate-800/80 text-slate-300 rounded-full font-mono">
                          {mandatoryCount}
                        </span>
                      </button>

                      <button
                        onClick={() => setCourseCategoryTab('dept_elective')}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          courseCategoryTab === 'dept_elective'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Bölüm Seçmelileri</span>
                        <span className="px-1.5 text-[10px] bg-amber-950 text-amber-300 rounded-full font-mono">
                          {deptElectiveCount}
                        </span>
                      </button>

                      <button
                        onClick={() => setCourseCategoryTab('social_elective')}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          courseCategoryTab === 'social_elective'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Sosyal & Genel Seçmeliler</span>
                        <span className="px-1.5 text-[10px] bg-purple-950 text-purple-300 rounded-full font-mono">
                          {socialElectiveCount}
                        </span>
                      </button>
                    </div>


                  </div>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                    <p className="text-sm">Dersler yükleniyor...</p>
                  </div>
                ) : filteredCurriculum.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    Bu kriterlere uygun ders bulunamadı.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filteredCurriculum.map(course => {
                      const isAdded = selectedCourses.some(c => c.code === course.code);
                      return (
                        <div
                          key={course.id || course.code}
                          onClick={() => {
                            if (isAdded) {
                              handleRemoveCourse(course.code);
                            } else {
                              handleAddCourse(course);
                            }
                          }}
                          className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isAdded
                              ? 'bg-indigo-950/50 border-indigo-500 shadow-lg shadow-indigo-950/80 ring-1 ring-indigo-500/50'
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
                                {(course.code.startsWith('USS') || course.code.startsWith('MES') || course.code.startsWith('SOS') || course.code.startsWith('UMS') || course.code.endsWith('000')) ? (
                                  <span className="text-[10px] font-bold text-purple-300 bg-purple-950/80 border border-purple-800/60 px-2 py-0.5 rounded-full">
                                    MÜFREDAT DERSİ (HAVUZ)
                                  </span>
                                ) : course.is_elective ? (
                                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded-full">
                                    SEÇMELİ
                                  </span>
                                ) : null}
                                {course.is_online && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded-full">
                                    <Laptop className="w-3 h-3" /> ONLINE
                                  </span>
                                )}
                                {selectedCourses.length > 0 && !isAdded && !availableCodes.has(course.code) && !isFetchingAvailable && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/80 border border-rose-800/60 px-2 py-0.5 rounded-full">
                                    <AlertCircle className="w-3 h-3" /> ÇAKIŞIYOR
                                  </span>
                                )}
                              </div>

                            </div>

                            <h3 className="font-semibold text-sm text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2 mt-1">
                              {course.name}
                            </h3>

                            {(() => {
                              if (!course.sections || course.sections.length <= 1) return null;
                              
                              const getSectionScheduleStr = (sec: any) => {
                                const slots = sec.time_slots || sec.schedule || [];
                                if (slots.length === 0) return 'Zaman Belirsiz';
                                const sorted = [...slots].sort((a, b) => {
                                  if (a.day !== b.day) return a.day.localeCompare(b.day);
                                  return a.start_time.localeCompare(b.start_time);
                                });
                                return sorted.map((ts: any) => `${ts.day.substring(0,3)} ${ts.start_time}-${ts.end_time}`).join(', ');
                              };

                              const uniqueSchedules = new Set();
                              course.sections.forEach((sec: any) => {
                                uniqueSchedules.add(getSectionScheduleStr(sec));
                              });

                              if (uniqueSchedules.size <= 1) return null;

                              return (
                                <div className="mt-2.5">
                                  <div className="text-[10px] font-bold text-emerald-400 mb-1.5 flex items-center gap-1">
                                    <Layers className="w-3 h-3" />
                                    {uniqueSchedules.size} Farklı Saat Opsiyonu
                                  </div>
                                  {isAdded && (
                                    <div onClick={e => e.stopPropagation()} className="relative">
                                      <select
                                        value={lockedSections[course.code] || ''}
                                        onChange={(e) => {
                                          setLockedSections(prev => ({...prev, [course.code]: e.target.value}));
                                        }}
                                        className="w-full appearance-none bg-slate-900 border border-slate-700 hover:border-indigo-500/50 text-slate-300 rounded-lg pl-2 pr-6 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer text-ellipsis overflow-hidden whitespace-nowrap"
                                        title={lockedSections[course.code] ? `Seçili: Şube ${lockedSections[course.code]}` : 'Otomatik Seçim'}
                                      >
                                        <option value="">(Otomatik Seçim - En iyi şube)</option>
                                        {course.sections.map((s: any) => {
                                          const timeStr = getSectionScheduleStr(s);
                                          return (
                                            <option key={s.section_id} value={s.section_id}>
                                              Şube {s.section_id} | {s.instructor || 'Bilinmiyor'} ({timeStr})
                                            </option>
                                          );
                                        })}
                                      </select>
                                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-400">
                              {course.days && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-300 bg-indigo-950/90 border border-indigo-800/60 px-2 py-0.5 rounded-lg shadow-sm">
                                  <Clock className="w-3 h-3 text-indigo-400" />
                                  {course.days}
                                </span>
                              )}
                              {course.instructor && (
                                <span className="inline-flex items-center gap-1 text-slate-400 text-[11px] truncate max-w-[200px]" title={getFullInstructorName(course.instructor)}>
                                  <User className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                  {getFullInstructorName(course.instructor)}
                                </span>
                              )}

                            </div>
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

                {/* Total Credits & AKTS Summary Badges */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="space-y-0.5 border-r border-slate-800/80 pr-2">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Toplam Kredi</span>
                    <p className="text-base font-bold text-indigo-400 font-mono">
                      {selectedCourses.reduce((sum, c) => sum + (c.credits || 0), 0)} Kredi
                    </p>
                  </div>
                  <div className="space-y-0.5 pl-2">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Toplam AKTS</span>
                    <p className="text-base font-bold text-emerald-400 font-mono">
                      {selectedCourses.reduce((sum, c) => sum + (c.ects || 0), 0)} AKTS
                    </p>
                  </div>
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
                          <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
                            <span>{course.credits} Kredi</span>
                            <span>•</span>
                            <span className="text-emerald-400 font-medium">{course.ects} AKTS</span>
                          </div>

                          {/* Şube Seçici for Basket */}
                          {(() => {
                            if (!course.sections || course.sections.length <= 1) return null;
                            const getSectionScheduleStr = (sec: any) => {
                              const slots = sec.time_slots || sec.schedule || [];
                              if (slots.length === 0) return 'Belirsiz';
                              const sorted = [...slots].sort((a, b) => {
                                if (a.day !== b.day) return a.day.localeCompare(b.day);
                                return a.start_time.localeCompare(b.start_time);
                              });
                              return sorted.map((ts: any) => `${ts.day.substring(0,3)} ${ts.start_time}`).join(', ');
                            };
                            const uniqueSchedules = new Set();
                            course.sections.forEach((sec: any) => uniqueSchedules.add(getSectionScheduleStr(sec)));
                            if (uniqueSchedules.size <= 1) return null;

                            return (
                              <div className="mt-1.5 pr-2" onClick={e => e.stopPropagation()}>
                                <select
                                  value={lockedSections[course.code] || ''}
                                  onChange={(e) => setLockedSections(prev => ({...prev, [course.code]: e.target.value}))}
                                  className="w-full appearance-none bg-slate-900 border border-slate-700 hover:border-indigo-500/50 text-slate-300 rounded-md px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer text-ellipsis overflow-hidden whitespace-nowrap"
                                >
                                  <option value="">(Şube: Otomatik Seçim)</option>
                                  {course.sections.map((s: any) => (
                                    <option key={s.section_id} value={s.section_id}>
                                      Şube {s.section_id} | {s.instructor || '?'} ({getSectionScheduleStr(s)})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })()}

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
                  onClick={() => handleConfirmAndSolve()}
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
        ) : activeTab === 'schedule' ? (
          /* Stage 2: Weekly Schedule Timetable Grid */
          <div className="space-y-6">
            {/* Stage 2 Top Bar: Title + Combination Navigator */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              {/* Row 1: Title + Back/Recalc */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-400" />
                    Haftalık Ders Çizelgesi
                  </h2>
                  <p className="text-xs text-slate-400">Çakışmasız ders programı kombinasyonları</p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setActiveTab('selection')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
                  >
                    ← Ders Seçimine Geri Dön
                  </button>
                  <button
                    onClick={() => handleConfirmAndSolve()}
                    disabled={loading}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl shadow transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>Yeniden Hesapla</span>
                  </button>
                  <button
                    onClick={handleExportPNG}
                    disabled={generatedSchedules.length === 0}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PNG Görsel İndir</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Combination Navigator */}
              {generatedSchedules.length === 0 ? (
                <div className="flex items-center gap-3 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <p className="text-xs text-rose-300 font-medium">
                    {loading ? 'Kombinasyonlar hesaplanıyor...' : 'Seçilen dersler arasında çakışmasız kombinasyon bulunamadı. Farklı ders grupları veya daha az ders seçmeyi deneyin.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Left: nav buttons + position */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedScheduleIdx(i => Math.max(0, i - 1))}
                      disabled={selectedScheduleIdx === 0}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 text-xs font-medium rounded-xl transition-all"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Önceki
                    </button>

                    <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-950 border border-slate-700 rounded-xl">
                      <span className="text-xs font-mono font-bold text-indigo-300">
                        {selectedScheduleIdx + 1}
                      </span>
                      <span className="text-xs text-slate-500">/</span>
                      <span className="text-xs font-mono text-slate-400">
                        {generatedSchedules.length}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">kombinasyon</span>
                    </div>

                    <button
                      onClick={() => setSelectedScheduleIdx(i => Math.min(generatedSchedules.length - 1, i + 1))}
                      disabled={selectedScheduleIdx === generatedSchedules.length - 1}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 text-xs font-medium rounded-xl transition-all"
                    >
                      Sonraki
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Center: score badge + stats */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {(() => {
                      const combo = generatedSchedules[selectedScheduleIdx];
                      if (!combo) return null;

                      const hasConflicts = combo.conflicts && combo.conflicts.length > 0;

                      // Calculate free days & gap from slots
                      const daySlots: Record<string, {start: number, end: number}[]> = {};
                      Object.values(combo.schedule).forEach((info: any) => {
                        (info.slots || []).forEach((s: any) => {
                          if (!s.start_time || !s.end_time) return;
                          const toMin = (t: string) => { const p = t.replace('.', ':').split(':'); return parseInt(p[0])*60+parseInt(p[1]); };
                          if (!daySlots[s.day]) daySlots[s.day] = [];
                          daySlots[s.day].push({ start: toMin(s.start_time), end: toMin(s.end_time) });
                        });
                      });
                      const usedDays = Object.keys(daySlots).length;
                      const freeDays = 5 - usedDays;
                      let gapMin = 0;
                      Object.values(daySlots).forEach(slots => {
                        const sorted = [...slots].sort((a, b) => a.start - b.start);
                        for (let i = 0; i < sorted.length - 1; i++) {
                          const gap = sorted[i+1].start - sorted[i].end;
                          if (gap > 0) gapMin += gap;
                        }
                      });
                      const gapH = (gapMin / 60).toFixed(1);

                      if (hasConflicts) {
                        return (
                          <div className="flex items-center gap-2 p-2 bg-rose-950/50 border border-rose-700/60 rounded-xl">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                            <span className="text-xs text-rose-300 font-medium">
                              Çakışma var — farklı ders kombinasyonu dene
                            </span>
                          </div>
                        );
                      }

                      return (
                        <>
                          {/* Score badge with tooltip */}
                          <div
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/60 border border-amber-700/50 rounded-xl cursor-help"
                            title={`Puan = 100 (taban) + ${freeDays}×30 (boş gün) - ${(parseFloat(gapH)*15).toFixed(0)} (boşluk)`}
                          >
                            <Star className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-xs font-bold text-amber-300 font-mono">
                              {combo.score} puan
                            </span>
                          </div>

                          {freeDays > 0 && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-emerald-950/50 border border-emerald-800/50 rounded-lg text-emerald-300 text-xs font-medium">
                              <TrendingUp className="w-3 h-3" />
                              {freeDays} boş gün
                            </span>
                          )}
                          <span className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-slate-400">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {gapH}s boşluk
                          </span>
                        </>
                      );
                    })()}
                  </div>

                  {/* Right: Best combo button */}
                  <button
                    onClick={() => setSelectedScheduleIdx(0)}
                    disabled={selectedScheduleIdx === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-700/80 to-amber-600/80 hover:from-amber-600 hover:to-amber-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-all shadow shadow-amber-900/30"
                  >
                    <Star className="w-3.5 h-3.5" />
                    En İyi
                  </button>
                </div>
              )}

              {/* Row 3: Selected groups summary for current combination */}
              {generatedSchedules.length > 0 && generatedSchedules[selectedScheduleIdx] && (
                <div className="border-t border-slate-800/80 pt-3">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(generatedSchedules[selectedScheduleIdx].schedule).map(([code, info]: [string, any]) => {
                      const secNo = info.section_no;
                      const inst = getFullInstructorName(info.instructor);
                      if (!secNo && !inst) return null;
                      return (
                        <div key={code} className="flex items-center gap-1.5 text-[10px] bg-slate-950/80 border border-slate-800 px-2 py-1 rounded-lg font-mono">
                          <span className="font-bold text-indigo-400">{code}</span>
                          {secNo && <span className="text-slate-400">Gr{secNo.replace('Gr', '')}</span>}
                          {inst && <span className="text-slate-500 truncate max-w-[80px]" title={inst}>· {inst.split(' ').pop()}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Row 4: Program Preferences Buttons */}
              <div className="border-t border-slate-800/80 pt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
                  <Filter className="w-3.5 h-3.5 text-indigo-400" />
                  Sıralama Tercihi:
                </span>

                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...optimizationOptions, minimize_gaps: !optimizationOptions.minimize_gaps };
                    setOptimizationOptions(updated);
                    handleConfirmAndSolve(updated);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    optimizationOptions.minimize_gaps
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  ⏱️ En Az Ders Boşluğu {optimizationOptions.minimize_gaps && '✓'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...optimizationOptions, target_free_days: !optimizationOptions.target_free_days };
                    setOptimizationOptions(updated);
                    handleConfirmAndSolve(updated);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    optimizationOptions.target_free_days
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  🗓️ Boş Gün Yarat {optimizationOptions.target_free_days && '✓'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...optimizationOptions, avoid_early_mornings: !optimizationOptions.avoid_early_mornings };
                    setOptimizationOptions(updated);
                    handleConfirmAndSolve(updated);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    optimizationOptions.avoid_early_mornings
                      ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-600/30'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  🌅 Sabah Dersinden Kaçın {optimizationOptions.avoid_early_mornings && '✓'}
                </button>

                {(optimizationOptions.minimize_gaps || optimizationOptions.target_free_days || optimizationOptions.avoid_early_mornings) && (
                  <button
                    type="button"
                    onClick={() => {
                      const resetOpts = { target_free_days: false, minimize_gaps: false, avoid_early_mornings: false };
                      setOptimizationOptions(resetOpts);
                      handleConfirmAndSolve(resetOpts);
                    }}
                    className="text-[11px] text-slate-400 hover:text-rose-400 underline ml-1 cursor-pointer"
                  >
                    Tercihleri Sıfırla
                  </button>
                )}
              </div>
            </div>

            {/* Stage 2 Grid Layout: Left Sidebar + Right Timetable */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              
              {/* Left Sidebar: Selected Basket Courses with Day/Time & Visibility Toggle */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 sticky top-24">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <div className="bg-indigo-600/20 p-1.5 rounded-lg border border-indigo-500/30">
                        <BookOpen className="w-4 h-4 text-indigo-400" />
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Sepetteki Dersler</h3>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800/60 rounded-full font-mono font-bold">
                      {selectedCourses.length} Ders
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
                    {selectedCourses.map(course => {
                      const currentSchedule = generatedSchedules[selectedScheduleIdx]?.schedule || {};
                      const courseScheduleInfo = currentSchedule[course.code];
                      const isHidden = hiddenCourses.includes(course.code);

                      // Extract days and time slots
                      let dayTimes: string[] = [];
                      if (courseScheduleInfo?.slots && courseScheduleInfo.slots.length > 0) {
                        dayTimes = courseScheduleInfo.slots.map(s => `${s.day} ${s.start_time}-${s.end_time}`);
                      }

                      return (
                        <div
                          key={course.code}
                          className={`p-3 rounded-xl border transition-all shadow-sm ${
                            isHidden
                              ? 'bg-slate-950/40 border-slate-800/60 opacity-40 grayscale'
                              : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-1.5 flex-wrap">
                                <span className={`font-mono font-extrabold text-xs ${course.is_elective ? 'text-amber-400' : 'text-indigo-400'}`}>
                                  {course.code}
                                </span>
                                {courseScheduleInfo?.section_no && (
                                  <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                    Gr{courseScheduleInfo.section_no.replace('Gr','')}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-200 font-semibold truncate mt-1" title={course.name}>
                                {course.name}
                              </p>
                              
                              {/* Day & Time Slot list */}
                              <div className="mt-2 space-y-1">
                                {dayTimes.length > 0 ? (
                                  dayTimes.map((dt, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-300 font-mono bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-800">
                                      <Clock className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                                      <span className="truncate">{dt}</span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-amber-500/80 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40 font-mono inline-block">
                                    Programı yok (Genel seçmeli)
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Eye Toggle Visibility Button */}
                            <button
                              onClick={() => {
                                setHiddenCourses(prev =>
                                  prev.includes(course.code)
                                    ? prev.filter(c => c !== course.code)
                                    : [...prev, course.code]
                                );
                              }}
                              className={`p-2 rounded-xl border transition-all flex-shrink-0 ${
                                isHidden
                                  ? 'bg-slate-800/80 text-slate-500 border-slate-700 hover:text-slate-200 hover:border-slate-600'
                                  : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600 hover:text-white shadow-sm'
                              }`}
                              title={isHidden ? 'Çizelgede Göster' : 'Çizelgede Gizle'}
                            >
                              {isHidden ? <XCircle className="w-4 h-4 text-slate-500" /> : <BookmarkCheck className="w-4 h-4 text-indigo-400" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Weekly Timetable Table Grid */}
              <div className="lg:col-span-3">
                <div ref={scheduleRef} className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300 border-collapse table-fixed">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800">
                          <th className="p-3 border-r border-slate-800 w-28 text-center font-bold text-slate-400">Saat</th>
                          {DAYS.map(day => (
                            <th key={day} className="p-3 border-r border-slate-800 text-center font-bold text-indigo-300 w-1/5">
                              {day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const COLOR_PALETTES = [
                            { bg: 'bg-indigo-950/90', border: 'border-indigo-500', text: 'text-indigo-100', accent: 'text-indigo-300', badge: 'bg-indigo-900/90 text-indigo-200 border border-indigo-600' },
                            { bg: 'bg-emerald-950/90', border: 'border-emerald-500', text: 'text-emerald-100', accent: 'text-emerald-300', badge: 'bg-emerald-900/90 text-emerald-200 border border-emerald-600' },
                            { bg: 'bg-amber-950/90', border: 'border-amber-500', text: 'text-amber-100', accent: 'text-amber-300', badge: 'bg-amber-900/90 text-amber-200 border border-amber-600' },
                            { bg: 'bg-purple-950/90', border: 'border-purple-500', text: 'text-purple-100', accent: 'text-purple-300', badge: 'bg-purple-900/90 text-purple-200 border border-purple-600' },
                            { bg: 'bg-cyan-950/90', border: 'border-cyan-500', text: 'text-cyan-100', accent: 'text-cyan-300', badge: 'bg-cyan-900/90 text-cyan-200 border border-cyan-600' },
                            { bg: 'bg-rose-950/90', border: 'border-rose-500', text: 'text-rose-100', accent: 'text-rose-300', badge: 'bg-rose-900/90 text-rose-200 border border-rose-600' },
                            { bg: 'bg-teal-950/90', border: 'border-teal-500', text: 'text-teal-100', accent: 'text-teal-300', badge: 'bg-teal-900/90 text-teal-200 border border-teal-600' },
                            { bg: 'bg-fuchsia-950/90', border: 'border-fuchsia-500', text: 'text-fuchsia-100', accent: 'text-fuchsia-300', badge: 'bg-fuchsia-900/90 text-fuchsia-200 border border-fuchsia-600' },
                            { bg: 'bg-orange-950/90', border: 'border-orange-500', text: 'text-orange-100', accent: 'text-orange-300', badge: 'bg-orange-900/90 text-orange-200 border border-orange-600' },
                            { bg: 'bg-sky-950/90', border: 'border-sky-500', text: 'text-sky-100', accent: 'text-sky-300', badge: 'bg-sky-900/90 text-sky-200 border border-sky-600' },
                            { bg: 'bg-violet-950/90', border: 'border-violet-500', text: 'text-violet-100', accent: 'text-violet-300', badge: 'bg-violet-900/90 text-violet-200 border border-violet-600' },
                            { bg: 'bg-lime-950/90', border: 'border-lime-500', text: 'text-lime-100', accent: 'text-lime-300', badge: 'bg-lime-900/90 text-lime-200 border border-lime-600' },
                          ];

                          const getCourseColor = (code: string) => {
                            const idx = selectedCourses.findIndex(c => c.code === code);
                            if (idx !== -1) {
                              return COLOR_PALETTES[idx % COLOR_PALETTES.length];
                            }
                            let hash = 0;
                            for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
                            return COLOR_PALETTES[Math.abs(hash) % COLOR_PALETTES.length];
                          };

                          const currentSchedule = generatedSchedules[selectedScheduleIdx]?.schedule || {};

                          // Pre-calculate active course per (slotIdx, day)
                          const grid: Record<string, Record<number, any>> = {}; // day -> slotIdx -> courseInfo
                          DAYS.forEach(day => { grid[day] = {}; });

                          TIME_SLOTS.forEach((slot, slotIdx) => {
                            const [slotStart] = slot.split('-');
                            const toMin = (t: string) => {
                              const parts = t.replace('.', ':').split(':');
                              return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                            };
                            const slotMin = toMin(slotStart);

                            DAYS.forEach(day => {
                              Object.entries(currentSchedule).forEach(([code, details]) => {
                                if (hiddenCourses.includes(code)) return; // Skip if hidden by user

                                (details as any).slots.forEach((s: any) => {
                                  if (!s.start_time || !s.end_time) return;
                                  const startMin = toMin(s.start_time);
                                  const endMin = toMin(s.end_time);

                                  if (s.day === day && slotMin >= startMin && slotMin < endMin) {
                                    const courseObj = selectedCourses.find(c => c.code === code) || curriculum.find(c => c.code === code);
                                    grid[day][slotIdx] = {
                                      code,
                                      name: courseObj?.name || (details as any).name || code,
                                      instructor: (details as any).instructor,
                                      section_no: (details as any).section_no,
                                      is_online: (details as any).is_online,
                                      classroom: s.classroom || 'Derslik'
                                    };
                                  }
                                });
                              });
                            });
                          });

                          // Track rowSpan skips: day -> set of skipped slotIndices
                          const skipCells: Record<string, Set<number>> = {};
                          DAYS.forEach(day => { skipCells[day] = new Set(); });

                          return TIME_SLOTS.map((slot, slotIdx) => (
                            <tr key={slot} className="border-b border-slate-800/60 hover:bg-slate-800/30 h-16">
                              <td className="p-2 border-r border-slate-800 text-center font-mono text-slate-500 bg-slate-950/40 h-16">
                                {slot}
                              </td>
                              {DAYS.map(day => {
                                if (skipCells[day].has(slotIdx)) {
                                  return null; // Skip cell rendered by rowSpan
                                }

                                const cellCourse = grid[day][slotIdx];
                                if (!cellCourse) {
                                  return <td key={day} className="p-1 border-r border-slate-800/60 h-16 align-top" />;
                                }

                                // Calculate rowSpan for consecutive identical course slots
                                let span = 1;
                                while (
                                  slotIdx + span < TIME_SLOTS.length &&
                                  grid[day][slotIdx + span]?.code === cellCourse.code
                                ) {
                                  skipCells[day].add(slotIdx + span);
                                  span++;
                                }

                                const palette = getCourseColor(cellCourse.code);
                                const fullInstructor = getFullInstructorName(cellCourse.instructor);

                                return (
                                  <td
                                    key={day}
                                    rowSpan={span}
                                    style={{ height: `${span * 64}px` }}
                                    className="p-1 border-r border-slate-800/60 align-top h-full"
                                  >
                                    <div className={`h-full w-full p-2.5 rounded-xl border ${palette.bg} ${palette.border} shadow-lg flex flex-col justify-between transition-all hover:brightness-110`}>
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between gap-1">
                                          <span className={`font-mono font-extrabold text-xs ${palette.accent}`}>
                                            {cellCourse.code} {cellCourse.section_no ? `(Gr${cellCourse.section_no.replace('Gr','')})` : ''}
                                          </span>
                                          {cellCourse.is_online ? (
                                            <span className="text-[9px] bg-amber-900/80 text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-700/50">ONLINE</span>
                                          ) : (
                                            <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded ${palette.badge}`}>
                                              {cellCourse.classroom}
                                            </span>
                                          )}
                                        </div>
                                        <p className={`text-[11px] font-semibold ${palette.text} leading-tight line-clamp-2`}>
                                          {cellCourse.name}
                                        </p>
                                      </div>

                                      {fullInstructor ? (
                                        <div className="mt-2 pt-1.5 border-t border-slate-700/40">
                                          <div className="flex items-center justify-between text-[10px]">
                                            {cellCourse.instructor && INSTRUCTOR_MAP[cellCourse.instructor.trim()] && (
                                              <span className="font-mono font-bold text-slate-300 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700/60 mr-1" title={fullInstructor}>
                                                {cellCourse.instructor}
                                              </span>
                                            )}
                                            <span className="text-[10px] text-slate-300 font-medium truncate" title={fullInstructor}>
                                              {fullInstructor}
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="mt-2 pt-1.5 border-t border-transparent" />
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════════
             RESMİ ÖĞRENCİ DERS PROGRAMI ÇİZELGESİ (VISUALIZER)
          ══════════════════════════════════════════════════════════════════ */
          <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {!visualizerData ? (
              /* Henüz Belge Yüklenmedi -> Resmi Doküman Yükleme Alanı */
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs relative overflow-hidden space-y-4">
                  <div className="max-w-3xl space-y-2 relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold">
                      <GraduationCap className="w-4 h-4 text-amber-500" />
                      <span>Yıldız Teknik Üniversitesi — Öğrenci Bilgi Sistemi (OBS)</span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      Öğrenci Haftalık Ders Programı <span className="text-[#002855]">Çizelgesi</span>
                    </h2>

                    <p className="text-sm text-slate-600 leading-relaxed">
                      OBS sistemi üzerinden temin ettiğiniz resmi <span className="font-mono text-slate-800 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Report.pdf</span> (Öğrenci Ders Programı) belgesini sisteme yükleyiniz. Belgedeki ders kodları, şube numaraları, teori ve laboratuvar derslikleri ile öğretim elemanları otomatik olarak çözümlenerek resmi A4 haftalık akademik çizelge formatında görselleştirilecektir.
                    </p>
                  </div>

                  {/* OBS Belge Alma Talimatı */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-left">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <FileText className="w-4 h-4 text-[#002855]" />
                      <span>OBS Üzerinden Ders Programı PDF'i Nasıl Alınır?</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                        <span className="w-5 h-5 rounded-full bg-[#002855] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                        <span><strong>OBS</strong> sistemine giriş yapınız ve <strong>Ders Programı</strong> ekranını açınız.</span>
                      </div>
                      <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                        <span className="w-5 h-5 rounded-full bg-[#002855] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                        <span>Sayfadaki <strong>"Yazdır"</strong> butonunu seçip açılan ekranda <strong>"Save / Kaydet"</strong> tuşuna basarak PDF belgesini indiriniz.</span>
                      </div>
                      <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                        <span className="w-5 h-5 rounded-full bg-[#002855] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
                        <span>İndirdiğiniz bu <strong>Report.pdf</strong> dosyasını aşağıdaki alana yükleyiniz.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Yükleme Alanı */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs text-center space-y-6">
                  {visualizerError && (
                    <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm max-w-xl mx-auto text-left">
                      <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-bold">Belge Ayrıştırma Hatası</p>
                        <p className="text-xs text-rose-600 mt-0.5">{visualizerError}</p>
                      </div>
                    </div>
                  )}

                  <label className={`block border-2 border-dashed rounded-xl p-10 transition-all cursor-pointer max-w-2xl mx-auto ${
                    visualizerPdfUploading
                      ? 'border-[#002855] bg-blue-50/40'
                      : 'border-slate-300 hover:border-[#002855] bg-slate-50/70 hover:bg-slate-100/70'
                  }`}>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleVisualizerPdfUpload}
                      disabled={visualizerPdfUploading}
                      className="hidden"
                    />

                    {visualizerPdfUploading ? (
                      <div className="py-8 flex flex-col items-center justify-center space-y-3">
                        <RefreshCw className="w-8 h-8 text-[#002855] animate-spin" />
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-800">Belge Analiz Ediliyor...</p>
                          <p className="text-xs text-slate-500">Ders kayıtları, derslikler ve öğretim üyeleri eşleştirilmektedir</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center mx-auto text-[#002855] shadow-xs">
                          <FileText className="w-7 h-7" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-800">
                            Öğrenci Ders Programı Dokümanını (Report.pdf) Seçiniz
                          </p>
                          <p className="text-xs text-slate-500">
                            Dosyayı bu alana sürükleyebilir veya tıklayarak dosya seçebilirsiniz
                          </p>
                        </div>
                        <div className="pt-2">
                          <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#002855] hover:bg-[#001f42] text-white text-xs font-semibold rounded-lg shadow-xs transition-all">
                            <Upload className="w-4 h-4" />
                            <span>PDF Belgesi Yükle</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </label>

                  {/* Resmi Bilgi Kartları */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-2">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-1">
                      <div className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#002855]" />
                        Haftalık Akademik Çizelge
                      </div>
                      <p className="text-[11px] text-slate-500">Ders saatleri bloklar halinde haftalık resmi şablona yerleştirilir.</p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-1">
                      <div className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-[#002855]" />
                        Derslik ve Laboratuvarlar
                      </div>
                      <p className="text-[11px] text-slate-500">Teorik derslikler ve LAB ortamları açık ve net şekilde belirtilir.</p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-1">
                      <div className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-[#002855]" />
                        Ders ve Şube Bilgileri
                      </div>
                      <p className="text-[11px] text-slate-500">Belgedeki tüm ders kodları ve şubeler çizelgeye eksiksiz yerleştirilir.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Belge Yüklendi -> Resmi Çizelge Görünümü */
              <div className="space-y-6">
                {/* Üst Yönetim Paneli */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4 no-print text-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Öğrenci Resmi Bilgi Alanı */}
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-[#002855] font-bold text-base shadow-2xs">
                        <GraduationCap className="w-5 h-5 text-[#002855]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-sm sm:text-base font-bold text-slate-900">
                            {visualizerData.student_name || 'Öğrenci Ders Programı'}
                          </h2>
                          {visualizerData.student_id && (
                            <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-md">
                              No: {visualizerData.student_id}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {visualizerData.term ? `${visualizerData.term} Öğretim Yarıyılı` : 'Haftalık Ders Programı'}
                        </p>
                      </div>
                    </div>

                    {/* Eylem Butonları */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Görünüm Seçici */}
                      <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center gap-1">
                        <button
                          onClick={() => setVisualizerViewMode('table')}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                            visualizerViewMode === 'table'
                              ? 'bg-[#002855] text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5 inline mr-1" />
                          Haftalık Çizelge
                        </button>
                        <button
                          onClick={() => setVisualizerViewMode('cards')}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                            visualizerViewMode === 'cards'
                              ? 'bg-[#002855] text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <LayoutGrid className="w-3.5 h-3.5 inline mr-1" />
                          Günlük Dağılım
                        </button>
                        <button
                          onClick={() => setVisualizerViewMode('summary')}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                            visualizerViewMode === 'summary'
                              ? 'bg-[#002855] text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5 inline mr-1" />
                          Ders Listesi & Derslikler
                        </button>
                      </div>

                      {/* Renk Seçici (Renkli / Sade) */}
                      <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center gap-1">
                        <button
                          onClick={() => setVisualizerColorMode('colored')}
                          className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                            visualizerColorMode === 'colored'
                              ? 'bg-[#002855] text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Renkli Görünüm"
                        >
                          <Palette className="w-3.5 h-3.5" />
                          <span>Renkli</span>
                        </button>
                        <button
                          onClick={() => setVisualizerColorMode('monochrome')}
                          className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                            visualizerColorMode === 'monochrome'
                              ? 'bg-[#002855] text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Standart Renksiz / Sade Görünüm"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Sade (Renksiz)</span>
                        </button>
                      </div>

                      <button
                        onClick={handleExportVisualizerPNG}
                        className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#002855] hover:bg-[#001f42] text-white text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PNG Kaydet</span>
                      </button>

                      <button
                        onClick={() => window.print()}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 transition-all cursor-pointer shadow-2xs"
                        title="Yazdır"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Yazdır</span>
                      </button>

                      <label className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 transition-all cursor-pointer shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>Yeni Belge</span>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleVisualizerPdfUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Özet Göstergeleri */}
                  <div className="flex items-center gap-3 pt-3 border-t border-slate-100 flex-wrap text-xs text-slate-600">
                    <span className="px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                      Kayıtlı Ders: <strong className="text-slate-900 font-mono">{visualizerData.courses_summary?.length || 0}</strong>
                    </span>

                    <span className="px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Haftalık Toplam: <strong className="text-slate-900 font-mono">
                        {visualizerData.courses_summary?.reduce((acc: number, c: any) => acc + (c.time_slots?.length || 0), 0)}
                      </strong> Saat
                    </span>

                    <span className="px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      Derslikler: <strong className="text-slate-900 font-medium">
                        {Array.from(new Set(visualizerData.courses_summary?.flatMap((c: any) => c.classrooms || []) || [])).join(', ') || 'Belirtilmedi'}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* GÖRÜNÜM 1: HAFTALIK AKADEMİK ÇİZELGE (A4 & PNG ÇIKTISI) */}
                {visualizerViewMode === 'table' && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 overflow-x-auto">
                    <div
                      id="visualizer-a4-document"
                      ref={visualizerScheduleRef}
                      className="a4-print-target bg-white text-slate-900 p-6 space-y-3 w-full mx-auto rounded-none border-0"
                      style={{ minWidth: '980px', maxWidth: '1120px' }}
                    >
                      {/* Resmi Kurumsal Belge Başlığı */}
                      <div className="border-b border-slate-300 pb-2.5 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h2 className="font-black text-sm tracking-wide uppercase text-slate-950">
                            YILDIZ TEKNİK ÜNİVERSİTESİ
                          </h2>
                          <h3 className="text-xs font-semibold text-slate-600">
                            Ders Programı - Gönüllü Proje
                          </h3>
                        </div>

                        <div className="text-right text-xs space-y-0.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                          <p className="font-bold text-slate-900 font-mono text-xs">
                            {visualizerData.student_name}
                          </p>
                          <p className="text-slate-600 font-mono text-[11px]">
                            Öğrenci No: <span className="text-slate-900 font-bold">{visualizerData.student_id}</span>
                          </p>
                          {visualizerData.term && (
                            <p className="text-slate-500 text-[10px] font-mono">
                              {visualizerData.term} Yarıyılı
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Resmi Tablo Gövdesi */}
                      <table className="w-full border-collapse text-xs select-none table-fixed border border-slate-300">
                        <thead>
                          <tr className="border-b border-slate-300 text-slate-700 bg-slate-100">
                            <th className="p-1.5 w-20 text-center font-bold text-[10.5px] border-r border-slate-300 uppercase tracking-wider">
                              Saat
                            </th>
                            {['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'].map((day, dIdx) => (
                              <th
                                key={day}
                                className={`p-1.5 text-center font-bold text-[11px] border-r border-slate-300 uppercase tracking-wider text-slate-800 ${
                                  dIdx === 4 ? 'border-r-0' : ''
                                }`}
                              >
                                {day}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const VISUALIZER_HOURS = [
                              '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
                            ];

                            const VIS_DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

                            const toMinutes = (timeStr: string) => {
                              const parts = timeStr.replace('.', ':').split(':');
                              return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                            };

                            // Sade, Kurumsal ve Baskıya Uygun Ofis Renk Paletleri (Açık Kağıt Üzerinde)
                            const CLEAN_OFFICE_PALETTES = [
                              { bg: 'bg-blue-50/90', border: 'border-blue-200/90', text: 'text-blue-950', accent: 'text-blue-700', badge: 'bg-white text-blue-800 border-blue-200' },
                              { bg: 'bg-emerald-50/90', border: 'border-emerald-200/90', text: 'text-emerald-950', accent: 'text-emerald-800', badge: 'bg-white text-emerald-800 border-emerald-200' },
                              { bg: 'bg-rose-50/90', border: 'border-rose-200/90', text: 'text-rose-950', accent: 'text-rose-800', badge: 'bg-white text-rose-800 border-rose-200' },
                              { bg: 'bg-amber-50/90', border: 'border-amber-200/90', text: 'text-amber-950', accent: 'text-amber-800', badge: 'bg-white text-amber-800 border-amber-200' },
                              { bg: 'bg-teal-50/90', border: 'border-teal-200/90', text: 'text-teal-950', accent: 'text-teal-800', badge: 'bg-white text-teal-800 border-teal-200' },
                              { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-900', accent: 'text-slate-800', badge: 'bg-white text-slate-800 border-slate-300' },
                              { bg: 'bg-purple-50/90', border: 'border-purple-200/90', text: 'text-purple-950', accent: 'text-purple-800', badge: 'bg-white text-purple-800 border-purple-200' },
                              { bg: 'bg-stone-100', border: 'border-stone-300', text: 'text-stone-900', accent: 'text-stone-800', badge: 'bg-white text-stone-800 border-stone-300' },
                            ];

                            const MONOCHROME_PALETTE = {
                              bg: 'bg-slate-100',
                              border: 'border-slate-300',
                              text: 'text-slate-900',
                              accent: 'text-slate-950 font-bold',
                              badge: 'bg-white text-slate-900 border-slate-300 font-semibold'
                            };

                            const getCourseColor = (code: string) => {
                              if (visualizerColorMode === 'monochrome') {
                                return MONOCHROME_PALETTE;
                              }
                              const codes = (visualizerData.courses_summary || []).map((c: any) => c.code);
                              const idx = codes.indexOf(code);
                              if (idx !== -1) return CLEAN_OFFICE_PALETTES[idx % CLEAN_OFFICE_PALETTES.length];
                              let hash = 0;
                              for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
                              return CLEAN_OFFICE_PALETTES[Math.abs(hash) % CLEAN_OFFICE_PALETTES.length];
                            };

                            const grid: Record<string, Record<number, any>> = {};
                            VIS_DAYS.forEach(d => { grid[d] = {}; });

                            VIS_DAYS.forEach(day => {
                              const items = visualizerData.schedule[day] || [];
                              items.forEach((it: any) => {
                                const startM = toMinutes(it.start_time);
                                const endM = toMinutes(it.end_time);

                                VISUALIZER_HOURS.forEach((hr, hrIdx) => {
                                  const hrM = toMinutes(hr);
                                  if (hrM >= startM && hrM < endM) {
                                    grid[day][hrIdx] = it;
                                  }
                                });
                              });
                            });

                            const skipCells: Record<string, Set<number>> = {};
                            VIS_DAYS.forEach(d => { skipCells[d] = new Set(); });

                            return VISUALIZER_HOURS.map((hour, hrIdx) => {
                              const nextHour = `${parseInt(hour.split(':')[0], 10)}:50`;
                              const hourLabel = `${hour} - ${nextHour}`;

                              return (
                                <tr key={hour} className="border-b border-slate-300 h-[37px]">
                                  <td className="p-1 border-r border-slate-300 text-center font-mono text-[9.5px] text-slate-600 bg-slate-50 align-middle whitespace-nowrap">
                                    {hourLabel}
                                  </td>

                                  {VIS_DAYS.map((day, dayIdx) => {
                                    if (skipCells[day].has(hrIdx)) return null;

                                    const it = grid[day][hrIdx];
                                    const isLastCol = dayIdx === 4;

                                    if (!it) {
                                      return (
                                        <td
                                          key={day}
                                          className={`p-0.5 border-r border-slate-300 h-[37px] align-top ${
                                            isLastCol ? 'border-r-0' : ''
                                          }`}
                                        />
                                      );
                                    }

                                    let span = 1;
                                    while (
                                      hrIdx + span < VISUALIZER_HOURS.length &&
                                      grid[day][hrIdx + span]?.code === it.code &&
                                      grid[day][hrIdx + span]?.section === it.section &&
                                      grid[day][hrIdx + span]?.classroom === it.classroom
                                    ) {
                                      skipCells[day].add(hrIdx + span);
                                      span++;
                                    }

                                    const palette = getCourseColor(it.code);

                                    const formatClassroomLabel = (cr: string, isLab: boolean) => {
                                      if (!cr) return 'Derslik';
                                      const clean = cr
                                        .replace(/Davutpaşa Diğer/gi, 'D.Paşa Diğer')
                                        .replace(/Davutpaşa/gi, 'D.Paşa');
                                      return isLab ? `LAB (${clean})` : clean;
                                    };

                                    return (
                                      <td
                                        key={day}
                                        rowSpan={span}
                                        style={{ height: `${span * 37}px` }}
                                        className={`p-0.5 border-r border-slate-300 align-top h-full ${
                                          isLastCol ? 'border-r-0' : ''
                                        }`}
                                      >
                                        <div className={`h-full w-full p-1.5 rounded border ${palette.bg} ${palette.border} flex flex-col justify-between space-y-0.5 transition-all shadow-xs overflow-hidden`}>
                                          <div className="space-y-0.5">
                                            {/* Başlık ve Şube / Derslik Bilgisi */}
                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                              <span className={`font-mono font-bold text-[10.5px] whitespace-nowrap shrink-0 ${palette.accent}`}>
                                                {it.code} {it.section ? `(Şb. ${it.section})` : ''}
                                              </span>

                                              <span
                                                className={`text-[8px] font-mono px-1 py-0.5 rounded border truncate max-w-[85px] shrink shadow-2xs font-semibold ${palette.badge}`}
                                                title={it.classroom || 'Derslik'}
                                              >
                                                {formatClassroomLabel(it.classroom, it.is_lab)}
                                              </span>
                                            </div>

                                            {/* Ders Adı */}
                                            <h4 className={`text-[10px] font-semibold ${palette.text} leading-tight line-clamp-2 break-words`}>
                                              {it.name}
                                            </h4>
                                          </div>

                                          {/* Alt Bilgi: Saat */}
                                          <div className="pt-0.5 border-t border-slate-200/80 text-[8.5px] text-slate-600">
                                            <p className="font-mono text-slate-500 text-[8px] whitespace-nowrap">
                                              {it.start_time} - {it.end_time}
                                            </p>
                                          </div>
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* GÖRÜNÜM 2: GÜNLÜK DERS DAĞILIMI */}
                {visualizerViewMode === 'cards' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'].map(day => {
                      const dayItems = visualizerData.schedule[day] || [];
                      if (dayItems.length === 0) return null;

                      return (
                        <div key={day} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 text-slate-900">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 uppercase tracking-wider">
                              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                              {day}
                            </h3>
                            <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-700 font-mono font-semibold">
                              {dayItems.length} Ders
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {dayItems.map((it: any, idx: number) => {
                              const fullInst = getFullInstructorName(it.instructor);
                              return (
                                <div
                                  key={idx}
                                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 shadow-2xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono font-bold text-xs text-blue-700 whitespace-nowrap">
                                      {it.code} {it.section ? `(Şb. ${it.section})` : ''}
                                    </span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-300 text-slate-700 whitespace-nowrap shrink-0 font-medium">
                                      {it.classroom}
                                    </span>
                                  </div>

                                  <h4 className="text-xs font-semibold text-slate-900">
                                    {it.name}
                                  </h4>

                                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                                    <span className="font-mono text-slate-600 font-medium">
                                      {it.start_time} - {it.end_time}
                                    </span>
                                    {it.is_lab && <span className="text-[10px] text-emerald-600 font-bold">Laboratuvar</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* GÖRÜNÜM 3: DERSLİK VE DERS LİSTESİ */}
                {visualizerViewMode === 'summary' && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-slate-900">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#002855]" />
                        Kayıtlı Dersler ve Derslik Dağılımı Dökümü
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Ders kodları, şubeler ve derslik ortamları listesi</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-800 border-collapse border border-slate-200">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[10px] bg-slate-100">
                            <th className="p-2.5">Ders Kodu</th>
                            <th className="p-2.5">Ders Adı</th>
                            <th className="p-2.5">Şube</th>
                            <th className="p-2.5">Derslik / Ortam</th>
                            <th className="p-2.5">Ders Saatleri</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {visualizerData.courses_summary?.map((c: any, idx: number) => {
                            return (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="p-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                                  {c.code}
                                </td>
                                <td className="p-2.5 font-medium text-slate-900">
                                  {c.name}
                                </td>
                                <td className="p-2.5 font-mono text-slate-600 whitespace-nowrap">
                                  Şb. {c.section}
                                </td>
                                <td className="p-2.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {c.classrooms?.map((cr: string, cidx: number) => (
                                      <span
                                        key={cidx}
                                        className="px-2 py-0.5 rounded border text-[11px] font-mono bg-slate-50 border-slate-300 text-slate-700"
                                      >
                                        {cr}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="p-2.5 font-mono text-slate-600">
                                  <div className="space-y-0.5">
                                    {c.time_slots?.map((ts: any, tidx: number) => (
                                      <div key={tidx} className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700">{ts.day}:</span>
                                        <span>{ts.start_time} - {ts.end_time}</span>
                                        {ts.is_lab && <span className="text-[10px] text-emerald-600 font-bold">(Lab)</span>}
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal for Adding / Editing Course */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                {editingCourseCode ? `Dersi Düzenle (${editingCourseCode})` : 'Yeni Ders Ekle'}
              </h3>
              <button
                onClick={() => setIsManageModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Ders Kodu *</label>
                <input
                  type="text"
                  placeholder="Örn: BLM3021"
                  value={manageFormData.code}
                  onChange={e => setManageFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Ders Adı *</label>
                <input
                  type="text"
                  placeholder="Örn: Algoritma Analizi"
                  value={manageFormData.name}
                  onChange={e => setManageFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Bölüm Kodu</label>
                <select
                  value={manageFormData.department_code}
                  onChange={e => setManageFormData(prev => ({ ...prev, department_code: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {FACULTIES.flatMap(f => f.departments).map(d => (
                    <option key={d.code} value={d.code}>{d.code} - {d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Sınıf</label>
                <select
                  value={manageFormData.year}
                  onChange={e => setManageFormData(prev => ({ ...prev, year: parseInt(e.target.value, 10) }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value={1}>1. Sınıf</option>
                  <option value={2}>2. Sınıf</option>
                  <option value={3}>3. Sınıf</option>
                  <option value={4}>4. Sınıf</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Kredi / AKTS</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Kredi"
                    value={manageFormData.credits}
                    onChange={e => setManageFormData(prev => ({ ...prev, credits: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                  <input
                    type="number"
                    placeholder="AKTS"
                    value={manageFormData.ects}
                    onChange={e => setManageFormData(prev => ({ ...prev, ects: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Ders Türü</label>
                <div className="flex items-center gap-4 py-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manageFormData.is_elective}
                      onChange={e => setManageFormData(prev => ({ ...prev, is_elective: e.target.checked }))}
                      className="rounded border-slate-700 bg-slate-950 text-amber-500"
                    />
                    <span>Seçmeli Ders</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manageFormData.is_online}
                      onChange={e => setManageFormData(prev => ({ ...prev, is_online: e.target.checked }))}
                      className="rounded border-slate-700 bg-slate-950 text-cyan-500"
                    />
                    <span>Online (Çevrim içi)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Sections & Time Slots Builder */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Şubeler & Zaman Slotları</h4>
                <button
                  type="button"
                  onClick={() => {
                    setManageFormData(prev => ({
                      ...prev,
                      sections: [
                        ...prev.sections,
                        {
                          section_id: `Gr${prev.sections.length + 1}`,
                          instructor: 'Bölüm Öğretim Üyeleri',
                          time_slots: [{ day: 'Pazartesi', start_time: '09:00', end_time: '11:50', classroom: 'DB11' }]
                        }
                      ]
                    }));
                  }}
                  className="px-3 py-1 rounded-lg bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-700/60 text-indigo-200 text-xs font-semibold"
                >
                  + Şube Ekle
                </button>
              </div>

              {manageFormData.sections.map((sec, secIdx) => (
                <div key={secIdx} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        placeholder="Şube No (Gr1)"
                        value={sec.section_id}
                        onChange={e => {
                          const val = e.target.value;
                          setManageFormData(prev => {
                            const secs = [...prev.sections];
                            secs[secIdx].section_id = val;
                            return { ...prev, sections: secs };
                          });
                        }}
                        className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-indigo-300"
                      />
                      <input
                        type="text"
                        placeholder="Öğretim Elemanı"
                        value={sec.instructor}
                        onChange={e => {
                          const val = e.target.value;
                          setManageFormData(prev => {
                            const secs = [...prev.sections];
                            secs[secIdx].instructor = val;
                            return { ...prev, sections: secs };
                          });
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setManageFormData(prev => ({
                          ...prev,
                          sections: prev.sections.filter((_, i) => i !== secIdx)
                        }));
                      }}
                      className="text-rose-400 hover:text-rose-300 text-xs px-2 py-1"
                    >
                      Şubeyi Sil
                    </button>
                  </div>

                  {/* Time Slots */}
                  <div className="space-y-2 pl-2 border-l-2 border-slate-800">
                    {sec.time_slots.map((ts, tsIdx) => (
                      <div key={tsIdx} className="flex flex-wrap items-center gap-2 text-xs">
                        <select
                          value={ts.day}
                          onChange={e => {
                            const val = e.target.value;
                            setManageFormData(prev => {
                              const secs = [...prev.sections];
                              secs[secIdx].time_slots[tsIdx].day = val;
                              return { ...prev, sections: secs };
                            });
                          }}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
                        >
                          {['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'].map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>

                        <input
                          type="text"
                          placeholder="09:00"
                          value={ts.start_time}
                          onChange={e => {
                            const val = e.target.value;
                            setManageFormData(prev => {
                              const secs = [...prev.sections];
                              secs[secIdx].time_slots[tsIdx].start_time = val;
                              return { ...prev, sections: secs };
                            });
                          }}
                          className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center text-slate-200 font-mono"
                        />
                        <span>-</span>
                        <input
                          type="text"
                          placeholder="11:50"
                          value={ts.end_time}
                          onChange={e => {
                            const val = e.target.value;
                            setManageFormData(prev => {
                              const secs = [...prev.sections];
                              secs[secIdx].time_slots[tsIdx].end_time = val;
                              return { ...prev, sections: secs };
                            });
                          }}
                          className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center text-slate-200 font-mono"
                        />

                        <input
                          type="text"
                          placeholder="Derslik (DB11 / Online)"
                          value={ts.classroom}
                          onChange={e => {
                            const val = e.target.value;
                            setManageFormData(prev => {
                              const secs = [...prev.sections];
                              secs[secIdx].time_slots[tsIdx].classroom = val;
                              return { ...prev, sections: secs };
                            });
                          }}
                          className="flex-1 min-w-[100px] bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            setManageFormData(prev => {
                              const secs = [...prev.sections];
                              secs[secIdx].time_slots = secs[secIdx].time_slots.filter((_, i) => i !== tsIdx);
                              return { ...prev, sections: secs };
                            });
                          }}
                          className="text-slate-500 hover:text-rose-400 px-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        setManageFormData(prev => {
                          const secs = [...prev.sections];
                          secs[secIdx].time_slots.push({ day: 'Pazartesi', start_time: '09:00', end_time: '11:50', classroom: 'DB11' });
                          return { ...prev, sections: secs };
                        });
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
                    >
                      + Zaman Slotu Ekle
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSaveCourse}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
              >
                Kaydet & Veritabanına İşle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white no-print">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">
            YTÜ Program Görselleştirici — Gönüllü Öğrenci Projesi
          </p>
          <p className="text-[11px] text-slate-400">
            OBS sistemi üzerinden temin edilen resmi Report.pdf formatıyla tam uyumludur.
          </p>
        </div>
      </footer>
    </div>
  );
}
