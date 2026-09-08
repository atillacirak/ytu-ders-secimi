'use client';

import React, { useState } from 'react';
import { Course, DepartmentSchedule, ScheduleCombination, OptimizationOptions } from '../types';
import { Upload, CheckCircle, Sparkles, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
const TIME_SLOTS = [
  '08.00-08.50', '09.00-09.50', '10.00-10.50', '11.00-11.50',
  '12.00-12.50', '13.00-13.50', '14.00-14.50', '15.00-15.50',
  '16.00-16.50', '17.00-17.50'
];

export default function Home() {
  const [schedule, setSchedule] = useState<DepartmentSchedule | null>(null);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('https://ytu-ders-secimi.onrender.com/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('PDF yüklenemedi');
      const data: DepartmentSchedule = await res.json();
      setSchedule(data);
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
      const res = await fetch('https://ytu-ders-secimi.onrender.com/api/generate-schedules', {
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

  const currentCombination = combinations[currentCombIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-slate-950 px-3 py-1.5 rounded-lg font-black tracking-wider shadow-lg shadow-amber-500/20">
            YTÜ
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">Ders Seçimi & Program Oluşturucu</h1>
            <p className="text-xs text-slate-400">PDF yükleyin, çakışmasız ve optimize haftalık ders programınızı hazırlayın</p>
          </div>
        </div>
        {schedule && (
          <div className="text-xs bg-slate-800 px-3 py-1.5 rounded-full text-slate-300 border border-slate-700">
            {schedule.department} • {schedule.academic_year}
          </div>
        )}
      </header>

      {/* Main Container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl w-full mx-auto">
        
        {/* Left Control Panel */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          
          {/* PDF Upload */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl">
            <h2 className="font-semibold text-sm text-slate-200 mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4 text-amber-400" />
              1. Ders Programı PDF Yükle
            </h2>
            <label className="border-2 border-dashed border-slate-700 hover:border-amber-500 transition-colors rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer bg-slate-950/60 hover:bg-slate-900 group">
              <Upload className="w-8 h-8 text-slate-500 group-hover:text-amber-400 mb-2 transition-colors" />
              <span className="text-xs text-slate-300 font-medium">YTÜ Bölüm Ders Programı PDF Seç</span>
              <span className="text-[10px] text-slate-500 mt-1">.pdf formatında ders çizelgesi</span>
              <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Options */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl">
            <h2 className="font-semibold text-sm text-slate-200 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              2. Optimizasyon Tercihleri
            </h2>
            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.target_free_days}
                  onChange={(e) => setOptions({...options, target_free_days: e.target.checked})}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/20 bg-slate-950"
                />
                <span>Boş gün yaratmaya çalış (Max Free Days)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.minimize_gaps}
                  onChange={(e) => setOptions({...options, minimize_gaps: e.target.checked})}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/20 bg-slate-950"
                />
                <span>En kısa ders aralıkları (Minimal Gaps)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.avoid_early_mornings}
                  onChange={(e) => setOptions({...options, avoid_early_mornings: e.target.checked})}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/20 bg-slate-950"
                />
                <span>08:00 Erken derslerinden kaçın</span>
              </label>
            </div>
          </div>

          {/* Courses List */}
          {schedule && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl flex-1 flex flex-col">
              <h2 className="font-semibold text-sm text-slate-200 mb-3 flex items-center justify-between">
                <span>3. Dersleri Seç ({selectedCourses.length})</span>
                <span className="text-xs text-amber-400">{schedule.courses.length} Ders</span>
              </h2>
              <div className="space-y-2 overflow-y-auto max-h-[320px] pr-1 flex-1 text-xs">
                {schedule.courses.map((course) => {
                  const isSelected = selectedCourses.includes(course.code);
                  return (
                    <div
                      key={course.code}
                      onClick={() => toggleCourse(course.code)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/50 text-amber-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-white">{course.code} - {course.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {course.year}. Yıl • {course.sections.length} Şube/Grup
                        </div>
                      </div>
                      {isSelected && <CheckCircle className="w-4 h-4 text-amber-400" />}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={generateSchedules}
                disabled={loading || selectedCourses.length === 0}
                className="mt-4 w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-bold py-3 rounded-lg shadow-lg shadow-amber-500/20 text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Program Oluştur ve Optimize Et
              </button>
            </div>
          )}

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

