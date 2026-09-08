# -*- coding: utf-8 -*-
from models import Course, Section, TimeSlot, OptimizationOptions
from schedule_solver import generate_schedules

mat1071 = Course(
    code='MAT1071',
    name='Matematik 1',
    year=1,
    sections=[
        Section(
            section_id='Gr11',
            instructor='HTK',
            time_slots=[
                TimeSlot(day='Pazartesi', start_time='09.00', end_time='11.50', classroom='DB11'),
                TimeSlot(day='Salı', start_time='11.00', end_time='12.50', classroom='DB11')
            ]
        ),
        Section(
            section_id='Gr12',
            instructor='MSA',
            time_slots=[
                TimeSlot(day='Pazartesi', start_time='09.00', end_time='11.50', classroom='D012'),
                TimeSlot(day='Salı', start_time='09.00', end_time='10.50', classroom='D012')
            ]
        )
    ]
)

blm2012 = Course(
    code='BLM2012',
    name='Nesneye Yönelik Prog.',
    year=2,
    sections=[
        Section(
            section_id='Gr1',
            instructor='MSA',
            time_slots=[
                TimeSlot(day='Pazartesi', start_time='16.00', end_time='17.50', classroom='Gr1'),
                TimeSlot(day='Çarşamba', start_time='09.00', end_time='11.50', classroom='D012')
            ]
        ),
        Section(
            section_id='Gr2',
            instructor='FÇ',
            time_slots=[
                TimeSlot(day='Pazartesi', start_time='16.00', end_time='17.50', classroom='Gr2'),
                TimeSlot(day='Çarşamba', start_time='09.00', end_time='11.50', classroom='D111')
            ]
        )
    ]
)

options = OptimizationOptions(
    target_free_days=True,
    minimize_gaps=True,
    avoid_early_mornings=False
)

combinations = generate_schedules([mat1071, blm2012], options)

print(f'Toplam çakışmasız program sayısı: {len(combinations)}')
for i, comb in enumerate(combinations):
    print(f'\n--- Kombinasyon #{i+1} (Puan: {comb.score}, Boş Gün: {comb.free_days_count}, Boşluk: {comb.total_gap_hours} sa) ---')
    for code, sec in comb.selected_sections.items():
        print(f'  {code}: {sec.section_id} ({sec.instructor})')
