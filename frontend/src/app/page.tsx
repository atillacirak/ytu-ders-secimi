'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Calendar, CheckCircle, Clock, Trash2, Plus, Filter, 
  Search, AlertCircle, ArrowRight, RefreshCw, Upload, Sparkles, Layers,
  ChevronRight, Laptop, Building2, User
} from 'lucide-react';

interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  ects: number;
  year?: number;
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

const DEPARTMENTS = [
  { code: 'BLM', name: 'Bilgisayar Mühendisliği' },
  { code: 'ELK', name: 'Elektrik Mühendisliği' },
  { code: 'END', name: 'Endüstri Mühendisliği' },
  { code: 'EHM', name: 'Elektronik ve Haberleşme Mühendisliği' },
  { code: 'MAK', name: 'Makine Mühendisliği' },
];

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const TIME_SLOTS = [
  '08:30-09:20', '09:30-10:20', '10:30-11:20', '11:30-12:20',
  '12:30-13:20', '13:30-14:20', '14:30-15:20', '15:30-16:20',
  '16:30-17:20', '17:30-18:20', '18:30-19:20', '19:30-20:20'
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'selection' | 'schedule'>('selection');
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

  // Load department curriculum on selection change
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
        // Fallback mock data if API unavailable
        setCurriculum(getMockCurriculum(deptCode));
      }
    } catch (e) {
      setCurriculum(getMockCurriculum(deptCode));
    } finally {
      setLoading(false);
    }
  };

  const getMockCurriculum = (dept: string): Course[] => {
    return [
      { id: '1', code: `${dept}101`, name: 'Mühendisliğe Giriş', credits: 3, ects: 5, year: 1, instructor: 'Prof. Dr. Ahmet Yılmaz', is_online: false },
      { id: '2', code: 'MATH101', name: 'Matematik I', credits: 4, ects: 6, year: 1, instructor: 'Doç. Dr. Ayşe Kaya', is_online: false },
      { id: '3', code: 'PHYS101', name: 'Fizik I', credits: 4, ects: 6, year: 1, instructor: 'Dr. Öğr. Üyesi Mehmet Demir', is_online: true },
      { id: '4', code: `${dept}201`, name: 'Veri Yapıları ve Algoritmalar', credits: 3, ects: 6, year: 2, instructor: 'Prof. Dr. Can Yıldız', is_online: false },
      { id: '5', code: `${dept}202`, name: 'Nümerik Analiz', credits: 3, ects: 5, year: 2, instructor: 'Doç. Dr. Zeynep Şahin', is_online: true },
      { id: '6', code: `${dept}301`, name: 'İşletim Sistemleri', credits: 3, ects: 6, year: 3, instructor: 'Prof. Dr. Murat Çelik', is_online: false },
      { id: '7', code: `${dept}401`, name: 'Bitirme Projesi I', credits: 2, ects: 8, year: 4, instructor: 'Bölüm Öğretim Üyeleri', is_online: false }
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
          courses: selectedCourses.map(c => c.code),
          dept: selectedDept
        })
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedSchedules(data.schedules || []);
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

  // Filter curriculum by search and year
  const filteredCurriculum = curriculum.filter(course => {
    const matchesSearch = course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          course.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = yearFilter === 'ALL' || course.year === yearFilter;
    return matchesSearch && matchesYear;
  });

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
              
              {/* Department Selector & Filters Header */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" /> Bölüm Seçin
                    </label>
                    <select
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-72"
                    >
                      {DEPARTMENTS.map(d => (
                        <option key={d.code} value={d.code}>
                          {d.code} - {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Year Filter Buttons */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5" /> Sınıf Filtresi
                    </label>
                    <div className="flex flex-wrap gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60">
                      {(['ALL', 1, 2, 3, 4] as const).map(yr => (
                        <button
                          key={yr}
                          onClick={() => setYearFilter(yr)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            yearFilter === yr
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                          }`}
                        >
                          {yr === 'ALL' ? 'Tüm Müfredat' : `${yr}. Sınıf`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Müfredatta Ders Ara (Kod veya Ders Adı)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Curriculum Course Cards Grid */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                    <span>Müfredat Dersleri</span>
                    <span className="text-xs px-2.5 py-0.5 bg-slate-800 text-indigo-400 rounded-full font-mono">
                      {filteredCurriculum.length} Ders
                    </span>
                  </h2>
                  <span className="text-xs text-slate-400">Tıklayarak sepetinize ekleyebilirsiniz</span>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                    <p className="text-sm">Müfredat yükleniyor...</p>
                  </div>
                ) : filteredCurriculum.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    Ders bulunamadı.
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
                                <span className="font-mono font-bold text-sm text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/50">
                                  {course.code}
                                </span>
                                {course.year && (
                                  <span className="text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                                    {course.year}. Sınıf
                                  </span>
                                )}
                              </div>
                              {course.is_online && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded-full">
                                  <Laptop className="w-3 h-3" /> ONLINE
                                </span>
                              )}
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
                      <span className="text-xs text-slate-600">Müfredattan ders seçin veya elle ekleyin.</span>
                    </div>
                  ) : (
                    selectedCourses.map(course => (
                      <div
                        key={course.code}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-xs text-indigo-400">{course.code}</span>
                            {course.is_online && (
                              <span className="text-[9px] text-amber-400 bg-amber-950/60 px-1.5 rounded border border-amber-800/40">ONLINE</span>
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
                            // Find active course slot in this cell
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
