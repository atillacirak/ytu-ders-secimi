with open('frontend/src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(''''use client';

import React, { useState, useEffect } from 'react';
import { Course, DepartmentSchedule, ScheduleCombination, OptimizationOptions } from '../types';
import { Upload, CheckCircle, Sparkles, RefreshCw, ChevronLeft, ChevronRight, GraduationCap, Building2, BookOpen, Clock, Calendar, Check, ShoppingBag, Search, Plus, Trash2, Video, User } from 'lucide-react';

const DAYS = ['Pazartesi', 'Salý', 'Çarþamba', 'Perþembe', 'Cuma'];
const TIME_SLOTS = [
  '08.00-08.50', '09.00-09.50', '10.00-10.50', '11.00-11.50',
  '12.00-12.50', '13.00-13.50', '14.00-14.50', '15.00-15.50',
  '16.00-16.50', '17.00-17.50', '18.00-18.50', '19.00-19.50'
];

interface Department {
  code: string;
  name: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'selection' | 'schedule'>('selection');
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('BLM');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customCourseInput, setCustomCourseInput] = useState<string>('');

  const [basket, setBasket] = useState<string[]>([]);
  const [combinations, setCombinations] = useState<ScheduleCombination[]>([]);
  const [currentCombIndex, setCurrentCombIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [options, setOptions] = useState<OptimizationOptions>({
    target_free_days: true,
    minimize_gaps: true,
    avoid_early_mornings: false,
    locked_sections: {}
  });

  const BACKEND_URL = 'https://ytu-ders-secimi.onrender.com';

  useEffect(() => {
    fetch(${BACKEND_URL}/api/departments)
      .then(res => res.json())
      .then(data => setDepartments(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCourses(selectedDept);
  }, [selectedDept]);

  const fetchCourses = async (deptCode: string) => {
    try {
      const res = await fetch(${BACKEND_URL}/api/courses?department=);
      if (res.ok) {
        const data: Course[] = await res.json();
        setCourses(data);
      }
    } catch (err) {}
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(${BACKEND_URL}/api/upload-pdf?department=, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('PDF yüklenemedi');
      const data: DepartmentSchedule = await res.json();
      setCourses(data.courses);
      alert('PDF yüklenip verileri iþlendi!');
    } catch (err) {
      alert('PDF Okunurken hata oluþtu! Lütfen YTÜ formatýnda PDF yükleyin.');
    } finally {
      setLoading(false);
    }
  };

  const toggleBasket = (code: string) => {
    if (basket.includes(code)) {
      setBasket(basket.filter(c => c !== code));
    } else {
      setBasket([...basket, code]);
    }
  };

  const addCustomCourse = () => {
    if (!customCourseInput.trim()) return;
    const cleanCode = customCourseInput.trim().toUpperCase();
    if (!basket.includes(cleanCode)) {
      setBasket([...basket, cleanCode]);
    }
    setCustomCourseInput('');
  };

  const confirmBasketAndGenerate = async () => {
    if (basket.length === 0) {
      alert('Lütfen sepetinize en az 1 ders ekleyin!');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(${BACKEND_URL}/api/generate-schedules?department=, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_course_codes: basket,
          options: options
        }),
      });
      if (!res.ok) throw new Error('Program oluþturulamadý');
      const data: ScheduleCombination[] = await res.json();
      setCombinations(data);
      setCurrentCombIndex(0);
      setActiveTab('schedule');
    } catch (err) {
      alert('Program oluþturulurken çakýþma veya hata oluþtu.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(c => {
    const matchesYear = selectedYear === 'all' || c.year === selectedYear;
    const matchesSearch = c.code.toLowerCase().includes(searchQuery.toLowerCase()) || c.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesYear && matchesSearch;
  });

  const currentCombination = combinations[currentCombIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-50 shadow-2xl shadow-slate-950/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-400 p-0.5 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[9px] flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg tracking-tight text-white">YTÜ Ders Sihirbazý</h1>
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Bölüm müfredatýndan ders seçin, çakýþmasýz haftalýk programýnýzý oluþturun</p>
          </div>
        </div>

        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button
            onClick={() => setActiveTab('selection')}
            className={lex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all }
          >
            <BookOpen className="w-4 h-4" />
            <span>1. Aþama: Ders Seçimi & Sepet ({basket.length})</span>
          </button>

          <button
            onClick={() => {
              if (combinations.length > 0) setActiveTab('schedule');
              else alert('Lütfen önce sepetinizdeki dersleri onaylayýp program oluþturun!');
            }}
            className={lex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all }
          >
            <Calendar className="w-4 h-4" />
            <span>2. Aþama: Haftalýk Çizelge</span>
          </button>
        </div>
      </header>

      {activeTab === 'selection' ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <Building2 className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <h3 className="text-xs font-bold text-slate-300">Akademik Bölümünüz</h3>
                  <p className="text-[11px] text-slate-400">Bölüm seçerek güncel müfredat derslerini yükleyin</p>
                </div>
              </div>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-slate-950 text-xs font-semibold text-slate-200 border border-slate-800 rounded-xl px-4 py-2.5 outline-none cursor-pointer w-full md:w-72"
              >
                {departments.map(dept => (
                  <option key={dept.code} value={dept.code} className="bg-slate-900 text-slate-200">
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl space-y-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800/80 w-full md:w-auto overflow-x-auto">
                  {[
                    { id: 'all', label: 'Tüm Müfredat' },
                    { id: 1, label: '1. Sýnýf' },
                    { id: 2, label: '2. Sýnýf' },
                    { id: 3, label: '3. Sýnýf' },
                    { id: 4, label: '4. Sýnýf' }
                  ].map(tab => (
                    <button
                      key={tab.id.toString()}
                      onClick={() => setSelectedYear(tab.id as any)}
                      className={	ext-[11px] font-semibold py-1.5 px-3 rounded-lg transition-all whitespace-nowrap }
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full md:w-64">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Ders Ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[550px] pr-1">
              {filteredCourses.length > 0 ? (
                filteredCourses.map(course => {
                  const isInBasket = basket.includes(course.code);
                  const firstSec = course.sections[0];
                  const instructorName = firstSec?.instructor || 'Bölüm Öðretim Üyesi';
                  const isOnline = firstSec?.time_slots.some(t => t.classroom?.toLowerCase().includes('online')) || false;
                  const timeSummary = firstSec?.time_slots.map(t => ${t.day.slice(0,3)} ).join(', ') || 'Saat Açýklanacak';

                  return (
                    <div
                      key={course.code}
                      onClick={() => toggleBasket(course.code)}
                      className={p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between relative group }
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="text-[10px] font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase">
                              {course.year}. Sýnýf
                            </span>
                            <h4 className="font-extrabold text-sm text-white mt-1.5">{course.code} - {course.name}</h4>
                          </div>
                          
                          <div className={w-6 h-6 rounded-lg border flex items-center justify-center transition-all shrink-0 }>
                            {isInBasket ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>

                        <div className="space-y-1.5 text-[11px] text-slate-300 mt-3 pt-3 border-t border-slate-800/60">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium truncate">{instructorName}</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px]">
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{timeSummary}</span>
                            </div>

                            {isOnline && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-500/30">
                                <Video className="w-3 h-3 text-purple-400" />
                                ONLINE
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/60 text-slate-500 text-xs">
                  Aramanýza uygun ders bulunamadý.
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-xl flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                    <ShoppingBag className="w-4.5 h-4.5 text-indigo-400" />
                    Ders Sepetim ({basket.length})
                  </h3>
                  {basket.length > 0 && (
                    <button
                      onClick={() => setBasket([])}
                      className="text-[11px] text-rose-400 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Sepeti Temizle
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Elle Ders Kodu Ekle..."
                    value={customCourseInput}
                    onChange={(e) => setCustomCourseInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={addCustomCourse}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-2 rounded-xl transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {basket.length > 0 ? (
                    basket.map(code => (
                      <div
                        key={code}
                        className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-white">{code}</span>
                        <button
                          onClick={() => toggleBasket(code)}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                      Sepetiniz boþ. Sol taraftaki müfredattan ders seçin veya elle ekleyin.
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={confirmBasketAndGenerate}
                disabled={loading || basket.length === 0}
                className="mt-6 w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-xl shadow-indigo-600/30 text-xs flex items-center justify-center gap-2.5 transition-all disabled:opacity-40"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
                <span>Dersleri Onayla & Programý Oluþtur</span>
              </button>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl">
              <h4 className="font-bold text-xs text-slate-300 mb-2 flex items-center gap-2">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                Özel Program PDF'i Yükle
              </h4>
              <label className="border border-dashed border-slate-800 hover:border-indigo-500/60 transition-all rounded-xl p-3 flex items-center justify-center cursor-pointer bg-slate-950/40 text-[11px] text-slate-400">
                <span>Fakülte PDF programý yüklemek için týklayýn</span>
                <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-6 lg:p-8 max-w-[1600px] w-full mx-auto flex flex-col">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-xl flex-1 flex flex-col">
            {combinations.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5 bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-black text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20 text-sm">
                    Kombinasyon #{currentCombIndex + 1}
                  </span>
                  <span className="text-slate-400 font-medium">/ {combinations.length} Çakýþmasýz Seçenek</span>
                </div>
                
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">Boþ Gün: <strong className="text-emerald-400 font-bold">{currentCombination.free_days_count} Gün</strong></span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-400">Boþ Saat: <strong className="text-amber-400 font-bold">{currentCombination.total_gap_hours} Sa</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 border-l border-slate-800 pl-4">
                    <button
                      onClick={() => setCurrentCombIndex(Math.max(0, currentCombIndex - 1))}
                      disabled={currentCombIndex === 0}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-30 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-200" />
                    </button>
                    <button
                      onClick={() => setCurrentCombIndex(Math.min(combinations.length - 1, currentCombIndex + 1))}
                      disabled={currentCombIndex === combinations.length - 1}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-30 transition-all"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-200" />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex-1 overflow-x-auto border border-slate-800/80 rounded-xl bg-slate-950/90 shadow-2xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-bold">
                    <th className="p-3.5 border-r border-slate-800 w-24 text-center font-mono text-[11px]">Saat</th>
                    {DAYS.map(day => (
                      <th key={day} className="p-3.5 border-r border-slate-800 text-center font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map(slot => {
                    const [slotStart] = slot.split('-');
                    return (
                      <tr key={slot} className="border-b border-slate-800/50 hover:bg-slate-900/40 transition-colors">
                        <td className="p-2.5 border-r border-slate-800/80 text-center text-slate-400 font-mono text-[11px] bg-slate-900/30">
                          {slot}
                        </td>
                        {DAYS.map(day => {
                          let matchedCourse: any = null;
                          if (currentCombination) {
                            Object.entries(currentCombination.selected_sections).forEach(([code, sec]) => {
                              sec.time_slots.forEach(ts => {
                                if (ts.day === day && ts.start_time.replace(':', '.') === slotStart) {
                                  matchedCourse = {
                                    code,
                                    secId: sec.section_id,
                                    instructor: sec.instructor,
                                    room: ts.classroom
                                  };
                                }
                              });
                            });
                          }

                          return (
                            <td key={day} className="p-1 border-r border-slate-800/50 h-20 align-top w-1/5 relative">
                              {matchedCourse ? (
                                <div className="h-full w-full bg-gradient-to-b from-indigo-900/40 to-slate-900 border border-indigo-500/50 rounded-xl p-2 flex flex-col justify-between shadow-lg shadow-indigo-950/40 backdrop-blur-sm group hover:scale-[1.02] transition-transform">
                                  <div>
                                    <div className="font-extrabold text-indigo-300 text-[11px] tracking-tight">{matchedCourse.code}</div>
                                    <div className="text-[10px] text-slate-300 font-medium truncate mt-0.5">
                                      {matchedCourse.secId} • {matchedCourse.instructor || ''}
                                    </div>
                                  </div>
                                  <div className="text-[9px] text-indigo-400/90 font-mono text-right font-semibold bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40 self-end mt-1">
                                    {matchedCourse.room}
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
    </div>
  );
}
