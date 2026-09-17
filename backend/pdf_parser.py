# -*- coding: utf-8 -*-
"""
Generalized parser for YTU-style weekly course-schedule PDFs.

Different departments export their schedule table with quite different
layouts (day as its own separator row vs. a day column repeated on every
row; one column per year vs. several group sub-columns per year; course
info packed into a single wrapped cell vs. spread across several table
rows). Rather than assuming one fixed layout, this parser inspects each
table it finds and adapts:

  1. Locates the header row (the one naming the years / classes).
  2. Forward-fills merged header cells so every column knows which
     "year" (1./2./3. Sınıf, 1.YIL, 1.Year, ...) it belongs to.
  3. Detects the time column (SAAT / HOUR) and, if present, the day
     column (GÜN / DAYS) from the header text.
  4. Walks the data rows top to bottom. A new day is recognised either
     from an explicit day-name row/cell (e.g. "Pazartesi", "Monday") or,
     when the day text is too fragmented to read reliably (rotated
     vertical text some PDFs produce), from the time column resetting
     back to an earlier hour.
  5. For every "course" column, consecutive non-empty cells are treated
     as one course block (a course's name / code / group / room /
     instructor are often split across several stacked table rows
     rather than newlines within one cell); the block ends at a blank
     cell or as soon as a new course code appears.
  6. Course code, room and group/section are pulled out of the block's
     text with regexes; whatever text is left over is used as the
     course name, and any line that looks like an academic title
     ("Dr.", "Doç.", "Prof.", "Öğr.") is used as the instructor.

This heuristic approach won't be pixel-perfect on every possible
schedule layout, but it degrades gracefully: at minimum it will always
recover day / time / course code / room correctly, which is the
information most schedule tools actually need.
"""
import re
import unicodedata
from typing import Dict, List, Optional, Tuple

import pdfplumber

from models import Course, DepartmentSchedule, Section, TimeSlot

# ---------------------------------------------------------------------------
# Normalization / lookup tables
# ---------------------------------------------------------------------------

_TR_UPPER_MAP = str.maketrans({
    "ç": "C", "Ç": "C",
    "ğ": "G", "Ğ": "G",
    "ı": "I", "I": "I",
    "i": "I", "İ": "I",
    "ö": "O", "Ö": "O",
    "ş": "S", "Ş": "S",
    "ü": "U", "Ü": "U",
})


def normalize(text: Optional[str]) -> str:
    """Upper-case, accent-stripped, whitespace-collapsed version of text."""
    if not text:
        return ""
    text = text.translate(_TR_UPPER_MAP).upper()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", text).strip()


DAY_LOOKUP = {
    "PAZARTESI": "Pazartesi", "MONDAY": "Pazartesi", "PZT": "Pazartesi",
    "SALI": "Salı", "TUESDAY": "Salı",
    "CARSAMBA": "Çarşamba", "WEDNESDAY": "Çarşamba",
    "PERSEMBE": "Perşembe", "THURSDAY": "Perşembe",
    "CUMA": "Cuma", "FRIDAY": "Cuma",
    "CUMARTESI": "Cumartesi", "SATURDAY": "Cumartesi", "CTS": "Cumartesi",
    "PAZAR": "Pazar", "SUNDAY": "Pazar",
}
DAY_CYCLE = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]

TIME_RE = re.compile(r"^(\d{1,2})[.:](\d{2})\s*-\s*(\d{1,2})[.:](\d{2})$")
YEAR_HEADER_RE = re.compile(r"(\d+)\s*\.?\s*(SINIF|YIL|YEAR|CLASS|YARIYIL)", re.IGNORECASE)
CODE_RE = re.compile(r"\b([A-ZÇĞİÖŞÜ]{2,5}\d{3,4}(?:\.\d{1,3})?)\b")
GROUP_RE = re.compile(r"\bG(?:R)?\.?:?\s*\d+(?:\s*,\s*\d+)*\b", re.IGNORECASE)
ROOM_RE = re.compile(
    r"(Online|Derslik|Classroom:?\s*[\wÇĞİÖŞÜçğıöşü]*"
    r"|\bG\d+\s+[A-ZÇĞİÖŞÜ]{1,4}\d{1,3}\b"
    r"|\b[A-ZÇĞİÖŞÜ]{1,4}\d{1,3}\b\s*\([^)]{1,25}\)"
    r"|\b[A-ZÇĞİÖŞÜ]{1,4}\d{2,3}\b"
    r"|\([^)]{1,25}\))",
    re.IGNORECASE,
)
TITLE_RE = re.compile(
    r"\b(Dr\.?|Doç\.?|Prof\.?|Öğr\.?|Arş\.?|Uzm\.?)\b", re.IGNORECASE
)
_LANG_TAGS = {"ING", "ENG", "EN", "TR"}


def find_day_word(text: Optional[str]) -> Optional[str]:
    """Exact (whole-string) day-name match, used to avoid false positives
    from fragmented/rotated vertical day-label text."""
    norm = normalize(text)
    return DAY_LOOKUP.get(norm)


def time_to_minutes(h: str, m: str) -> int:
    return int(h) * 60 + int(m)


# ---------------------------------------------------------------------------
# Column detection
# ---------------------------------------------------------------------------

def _pad(row: List, n: int) -> List[str]:
    row = list(row) + [""] * (n - len(row))
    return [("" if c is None else str(c).strip()) for c in row[:n]]


def find_header_row(table: List[List]) -> Optional[int]:
    for i, row in enumerate(table[:6]):
        for cell in row:
            if cell and YEAR_HEADER_RE.search(str(cell)):
                return i
    return None


def build_year_columns(header_row: List) -> Dict[int, str]:
    """Forward-fill merged header cells, return {col_index: year_label}."""
    labels: List[Optional[str]] = []
    last = None
    for cell in header_row:
        text = (cell or "").strip()
        if text:
            last = text
        labels.append(last)

    col_year: Dict[int, str] = {}
    for idx, label in enumerate(labels):
        if not label:
            continue
        m = YEAR_HEADER_RE.search(label)
        if m:
            val = int(m.group(1))
            if m.group(2).upper() == "YARIYIL":
                val = (val + 1) // 2
            col_year[idx] = str(val)
    return col_year


def find_keyword_col(header_row: List, keywords: set) -> Optional[int]:
    for idx, cell in enumerate(header_row):
        if normalize(cell) in keywords:
            return idx
    return None


def pick_time_col_by_content(data_rows: List[List], ncols: int) -> Optional[int]:
    counts = [0] * ncols
    for row in data_rows:
        row = _pad(row, ncols)
        for idx, cell in enumerate(row):
            if TIME_RE.match(cell):
                counts[idx] += 1
    if not counts or max(counts) == 0:
        return None
    return counts.index(max(counts))


# ---------------------------------------------------------------------------
# Course-block text -> fields
# ---------------------------------------------------------------------------

def extract_fields(lines: List[str]) -> Tuple[str, str, str, str, str]:
    """Return (code, name, instructor, room, section_id) from a block of
    stacked cell lines belonging to one course."""
    combined = " ".join(l for l in lines if l)

    codes = CODE_RE.findall(combined)
    code = codes[0] if codes else ""

    remainder_for_room = combined
    for c in codes:
        remainder_for_room = remainder_for_room.replace(c, " ")
    room = ""
    for m in ROOM_RE.finditer(remainder_for_room):
        candidate = m.group(0).strip()
        bare = normalize(candidate.strip("() "))
        if bare in _LANG_TAGS:
            continue  # "(ING)"/"(TR)" language tags aren't a room
        if GROUP_RE.fullmatch(candidate.strip("() ")):
            continue  # "(Gr.55)" is a group marker, not a room
        room = candidate
        break
    room = re.sub(r"(?i)^classroom:?\s*", "", room).strip()

    group_match = GROUP_RE.search(combined)
    section_id = re.sub(r"[^\dA-Za-z,]", "", group_match.group(0)) if group_match else ""
    if not section_id and "." in code:
        section_id = code.split(".", 1)[1]
    if not section_id:
        section_id = "Gr1"

    instructor = ""
    for line in lines:
        if TITLE_RE.search(line):
            instructor = line.strip()
            break

    # Build the name from whichever lines aren't the room line or the
    # instructor line, with codes/groups stripped out.
    name_parts = []
    for line in lines:
        if line == instructor:
            continue
        if room and room in line and CODE_RE.search(line) is None:
            continue
        cleaned = line
        for c in codes:
            cleaned = cleaned.replace(c, " ")
        cleaned = GROUP_RE.sub(" ", cleaned)
        cleaned = re.sub(r"(?i)classroom:?\s*\S*", " ", cleaned)
        cleaned = re.sub(r"\(\s*\)", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip(" -/")
        if cleaned:
            name_parts.append(cleaned)
    name = " ".join(dict.fromkeys(name_parts)).strip()  # de-dupe, keep order
    if not name:
        name = code or combined[:60]

    return code, name, instructor, room, section_id


# ---------------------------------------------------------------------------
# Main per-table walk
# ---------------------------------------------------------------------------

def process_table(table: List[List], schedule: DepartmentSchedule) -> None:
    header_idx = find_header_row(table)
    if header_idx is None:
        return
    header_row = table[header_idx]
    col_year = build_year_columns(header_row)
    if not col_year:
        return

    ncols = max(len(r) for r in table if r) if table else len(header_row)
    ncols = max(ncols, len(header_row))

    time_col = find_keyword_col(header_row, {"SAAT", "HOUR"})
    if time_col is None:
        time_col = pick_time_col_by_content(table[header_idx + 1:], ncols)
    if time_col is None:
        return  # can't locate a time column -> not a schedule table

    day_col = find_keyword_col(header_row, {"GUN", "DAYS", "GUNLER"})

    course_cols = [c for c in col_year if c != time_col and c != day_col]
    if not course_cols:
        return

    data_rows = table[header_idx + 1:]

    current_day: Optional[str] = None
    day_idx = -1
    prev_start_min: Optional[int] = None

    pending: Dict[int, List[str]] = {c: [] for c in course_cols}
    pending_start: Dict[int, Optional[str]] = {c: None for c in course_cols}
    pending_end: Dict[int, Optional[str]] = {c: None for c in course_cols}

    def flush(col: int) -> None:
        lines = pending[col]
        start = pending_start[col]
        end = pending_end[col]
        pending[col] = []
        pending_start[col] = None
        pending_end[col] = None
        if not lines or not start or not current_day:
            return
        code, name, instructor, room, section_id = extract_fields(lines)
        if not code:
            return  # stray text with no recognisable course code
        add_course_slot(schedule, col_year[col], code, name, instructor,
                         room, section_id, current_day, start, end)

    def flush_all() -> None:
        for c in course_cols:
            flush(c)

    for raw_row in data_rows:
        row = _pad(raw_row, ncols)
        time_text = row[time_col] if time_col < len(row) else ""
        m = TIME_RE.match(time_text)

        if not m:
            # Possibly a standalone day-separator row (day name in its own
            # row, e.g. elektrik/BME layout).
            day_hit = None
            for cell in row:
                day_hit = find_day_word(cell)
                if day_hit:
                    break
            if day_hit:
                flush_all()
                current_day = day_hit
                day_idx = DAY_CYCLE.index(day_hit) if day_hit in DAY_CYCLE else day_idx
                prev_start_min = None
            continue

        start_h, start_m, end_h, end_m = m.groups()
        start_str = f"{int(start_h):02d}.{start_m}"
        end_str = f"{int(end_h):02d}.{end_m}"
        start_min = time_to_minutes(start_h, start_m)

        # Explicit day text in the day column (when present and legible)
        # is authoritative.
        explicit_day = find_day_word(row[day_col]) if day_col is not None and day_col < len(row) else None
        if explicit_day and explicit_day != current_day:
            flush_all()
            current_day = explicit_day
            day_idx = DAY_CYCLE.index(explicit_day) if explicit_day in DAY_CYCLE else day_idx
            prev_start_min = None
        elif current_day is None:
            day_idx = 0
            current_day = DAY_CYCLE[0]
        elif prev_start_min is not None and start_min <= prev_start_min:
            # Time reset -> new day, and no legible explicit label this row.
            flush_all()
            day_idx = (day_idx + 1) % len(DAY_CYCLE)
            current_day = DAY_CYCLE[day_idx]

        prev_start_min = start_min

        for col in course_cols:
            text = row[col] if col < len(row) else ""
            if not text:
                flush(col)
                continue
            has_code = bool(CODE_RE.search(text))
            pending_has_code = bool(pending[col]) and CODE_RE.search(" ".join(pending[col]))
            if has_code and pending_has_code:
                # The current block already has a code of its own, so this
                # is a *new* course starting right after it (no blank row
                # between them) rather than the code line of the course
                # that's already being accumulated.
                flush(col)
            if not pending[col]:
                pending_start[col] = start_str
            pending[col].append(text)
            pending_end[col] = end_str

    flush_all()


def add_course_slot(schedule: DepartmentSchedule, year: str, code: str,
                     name: str, instructor: str, room: str, section_id: str,
                     day: str, start: str, end: str) -> None:
    course = next((c for c in schedule.courses if c.code == code), None)
    if course is None:
        course = Course(code=code, name=name or code, year=year, sections=[])
        schedule.courses.append(course)
    elif not course.name and name:
        course.name = name

    section = next((s for s in course.sections if s.section_id == section_id), None)
    if section is None:
        section = Section(section_id=section_id, instructor=instructor, time_slots=[])
        course.sections.append(section)
    elif not section.instructor and instructor:
        section.instructor = instructor

    # Some source tables visually duplicate a merged cell's text across two
    # adjacent sub-columns; guard against recording the exact same slot twice.
    new_slot = TimeSlot(day=day, start_time=start, end_time=end, classroom=room)
    if not any(ts.day == new_slot.day and ts.start_time == new_slot.start_time
               and ts.end_time == new_slot.end_time and ts.classroom == new_slot.classroom
               for ts in section.time_slots):
        section.time_slots.append(new_slot)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def parse_ytu_pdf(pdf_path: str, department: str = "Bilinmeyen Bölüm") -> DepartmentSchedule:
    schedule = DepartmentSchedule(department=department, academic_year="2026-2027 GÜZ")
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                if not table or len(table) < 3:
                    continue
                process_table(table, schedule)
    return schedule


if __name__ == "__main__":
    import sys
    import json
    from dataclasses import asdict

    if len(sys.argv) < 2:
        print("usage: python pdf_parser.py <file.pdf> [department name]")
        sys.exit(1)

    dept = sys.argv[2] if len(sys.argv) > 2 else "Bilinmeyen Bölüm"
    result = parse_ytu_pdf(sys.argv[1], dept)
    print(json.dumps(asdict(result), ensure_ascii=False, indent=2))
