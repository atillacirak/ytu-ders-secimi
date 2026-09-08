'use client';

import React, { useState, useEffect } from 'react';
import { Course, DepartmentSchedule, ScheduleCombination, OptimizationOptions } from '../types';
import { Upload, CheckCircle, Sparkles, RefreshCw, ChevronLeft, ChevronRight, GraduationCap, Building2, BookOpen, Clock, Calendar, Check } from 'lucide-react';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('BLM');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(1);

  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
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
    fetch(`${BACKEND_URL}/api/departments`)
      .then(res => res.json())
      .then(data => setDepartments(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCourses(selectedDept);
  }, [selectedDept]);

  const fetchCourses = async (deptCode: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/courses?department=${deptCode}`);
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
      const res = await fetch(`${BACKEND_URL}/api/upload-pdf?department=${selectedDept}`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('PDF yüklenemedi');
      const data: DepartmentSchedule = await res.json();
      setCourses(data.courses);
      alert('PDF başarıyla yüklendi ve dersler veritabanına kaydedildi!');
    } catch (err) {
      alert('PDF Okunurken hata oluştu! Lütfen YTÜ formatında PDF yükleyin.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCourse = (code: string) => {
    if (selectedCourses.includes(code)) {
      setSelectedCourses(selectedCourses.filter(c => c !== code));
    } else {
      setSelectedCourses([...selectedCourses, code]);
    }
  };

  const generateSchedules = async () => {
    if (selectedCourses.length === 0) {
      alert('Lütfen en az 1 ders seçin!');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/generate-schedules?department=${selectedDept}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_course_codes: selectedCourses,
          options: options
        }),
      });
      if (!res.ok) throw new Error('Program oluşturulamadı');
      const data: ScheduleCombination[] = await res.json();
      setCombinations(data);
      setCurrentCombIndex(0);
    } catch (err) {
      alert('Program oluşturulurken çakışma veya hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(c => selectedYear === 'all' || c.year === selectedYear);

  const currentCombination = combinations[currentCombIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Academic Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-50 shadow-2xl shadow-slate-950/50">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-400 p-0.5 rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-xl tracking-tight text-white">YTÜ Ders Portal</h1>
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                v2.0 Academic
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Yıldız Teknik Üniversitesi Akıllı Ders Programı Sihirbazı</p>
          </div>
        </div>

        {/* Department Selector Dropdown */}
        <div className="flex items-center gap-3 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 shadow-inner w-full md:w-auto">
          <Building2 className="w-4 h-4 text-indigo-400 ml-2 shrink-0" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-200 outline-none pr-4 cursor-pointer py-1.5 w-full md:w-64"
          >
            {departments.map(dept => (
              <option key={dept.code} value={dept.code} className="bg-slate-900 text-slate-200">
                {dept.name} ({dept.code})
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
        
        {/* Left Control Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* PDF Upload */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl relative overflow-hidden group hover:border-slate-700 transition-all">
            <h2 className="font-bold text-sm text-slate-200 mb-3 flex items-center gap-2 tracking-wide">
              <Upload className="w-4 h-4 text-indigo-400" />
              1. Ders Programı PDF Yükle
            </h2>
            <label className="border-2 border-dashed border-slate-800 hover:border-indigo-500/60 transition-all rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 group/label">
              <Upload className="w-7 h-7 text-slate-500 group-hover/label:text-indigo-400 group-hover/label:scale-110 mb-2 transition-all" />
              <span className="text-xs text-slate-300 font-semibold">YTÜ Bölüm Ders Programı PDF Seç</span>
              <span className="text-[11px] text-slate-500 mt-1">.pdf formatında ders çizelgesi</span>
              <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Preferences Panel */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-4">
            <h2 className="font-bold text-sm text-slate-200 flex items-center gap-2 tracking-wide">
              <Sparkles className="w-4 h-4 text-amber-400" />
              2. Program Tercihleri
            </h2>
            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-800/50 bg-slate-950/50 hover:bg-slate-950 transition-all cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.target_free_days}
                  onChange={(e) => setOptions({...options, target_free_days: e.target.checked})}
                  className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500/20 bg-slate-900 accent-indigo-500"
                />
                <span className="text-slate-300 font-medium">Boş Gün Oluşturmaya Çalış (Max Free Days)</span>
              </label>
              <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-800/50 bg-slate-950/50 hover:bg-slate-950 transition-all cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.minimize_gaps}
                  onChange={(e) => setOptions({...options, minimize_gaps: e.target.checked})}
                  className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500/20 bg-slate-900 accent-indigo-500"
                />
                <span className="text-slate-300 font-medium">En Kısa Ders Araları (Minimal Gaps)</span>
              </label>
              <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-800/50 bg-slate-950/50 hover:bg-slate-950 transition-all cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.avoid_early_mornings}
                  onChange={(e) => setOptions({...options, avoid_early_mornings: e.target.checked})}
                  className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500/20 bg-slate-900 accent-indigo-500"
                />
                <span className="text-slate-300 font-medium">08:00 Erken Derslerden Kaçın</span>
              </label>
            </div>
          </div>

          {/* Academic Course Selector with Year Tabs */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex-1 flex flex-col min-h-[420px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                3. Müfredat Dersleri ({selectedCourses.length} Seçili)
              </h2>
              <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                {courses.length} Toplam Ders
              </span>
            </div>

            {/* Year Category Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800/80 mb-4 overflow-x-auto">
              {[
                { id: 'all', label: 'Tümü' },
                { id: 1, label: '1. Sınıf' },
                { id: 2, label: '2. Sınıf' },
                { id: 3, label: '3. Sınıf' },
                { id: 4, label: '4. Sınıf' }
              ].map(tab => (
                <button
                  key={tab.id.toString()}
                  onClick={() => setSelectedYear(tab.id as any)}
                  className={`flex-1 text-[11px] font-semibold py-1.5 px-3 rounded-lg transition-all whitespace-nowrap ${
                    selectedYear === tab.id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Courses List */}
            <div className="space-y-2.5 overflow-y-auto max-h-[300px] pr-1 flex-1 text-xs">
              {filteredCourses.length > 0 ? (
                filteredCourses.map((course) => {
                  const isSelected = selectedCourses.includes(course.code);
                  return (
                    <div
                      key={course.code}
                      onClick={() => toggleCourse(course.code)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-900/40 to-slate-900 border-indigo-500/50 text-indigo-100 shadow-md shadow-indigo-950/50'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-2">
                          <span>{course.code}</span>
                          <span className="text-slate-400 font-normal">- {course.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                          <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{course.year}. Sınıf</span>
                          <span>•</span>
                          <span>{course.sections.length} Şube/Grup Mevcut</span>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                        isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 group-hover:border-slate-500'
                      }`}>
                        {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-slate-500 text-xs">
                  Bu sınıfta henüz ders bulunamadı. Lütfen yukarıdan PDF ders programı yükleyin.
                </div>
              )}
            </div>

            {/* Modern CTA Generate Button */}
            <button
              onClick={generateSchedules}
              disabled={loading || selectedCourses.length === 0}
              className="mt-5 w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-xl shadow-indigo-600/25 text-xs flex items-center justify-center gap-2.5 transition-all disabled:opacity-40 active:scale-[0.99]"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
              <span>Program Seçeneklerini Oluştur</span>
            </button>
          </div>

        </div>

        {/* Right Calendar View */}
        <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col">
          {combinations.length > 0 ? (
            <div className="flex items-center justify-between mb-4 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-400">Olası Program #{currentCombIndex + 1}</span>
                <span className="text-slate-400">/ {combinations.length} Çakışmasız Seçenek</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-slate-300">Boş Gün: <strong className="text-emerald-400">{currentCombination.free_days_count} gün</strong></span>
                <span className="text-slate-300">Boşluk: <strong className="text-amber-400">{currentCombination.total_gap_hours} sa</strong></span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentCombIndex(Math.max(0, currentCombIndex - 1))}
                    disabled={currentCombIndex === 0}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentCombIndex(Math.min(combinations.length - 1, currentCombIndex + 1))}
                    disabled={currentCombIndex === combinations.length - 1}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between mb-4 text-xs text-slate-400">
              <span>Haftalık Program Takvimi</span>
              <span>YTÜ Ders Seçimi</span>
            </div>
          )}

          {/* Grid Table */}
          <div className="flex-1 overflow-x-auto border border-slate-800 rounded-lg bg-slate-950">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                  <th className="p-3 border-r border-slate-800 w-24 text-center">Saat</th>
                  {DAYS.map(day => (
                    <th key={day} className="p-3 border-r border-slate-800 text-center font-semibold text-slate-200">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map(slot => {
                  const [slotStart] = slot.split('-');
                  return (
                    <tr key={slot} className="border-b border-slate-800/60 hover:bg-slate-900/30 transition-colors">
                      <td className="p-2.5 border-r border-slate-800 text-center text-slate-400 font-mono text-[11px]">
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
                          <td key={day} className="p-1.5 border-r border-slate-800/60 h-16 align-top w-1/5 relative">
                            {matchedCourse ? (
                              <div className="h-full w-full bg-amber-500/20 border border-amber-500/60 rounded p-1.5 flex flex-col justify-between shadow-sm">
                                <div>
                                  <div className="font-bold text-amber-300 text-[11px]">{matchedCourse.code}</div>
                                  <div className="text-[10px] text-slate-300 font-medium">{matchedCourse.secId} • {matchedCourse.instructor || ''}</div>
                                </div>
                                <div className="text-[9px] text-amber-400/80 font-mono text-right">{matchedCourse.room}</div>
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
    </div>
  );
}

