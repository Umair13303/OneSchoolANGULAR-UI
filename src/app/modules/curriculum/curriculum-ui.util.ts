/** Human-readable curriculum progress labels (never show raw API enums in UI). */
export function progressMark(status: string | null | undefined): string {
  switch (status) {
    case 'Completed': return '✓';
    case 'InProgress': return '●';
    default: return '○';
  }
}

export function progressLabel(status: string | null | undefined): string {
  switch (status) {
    case 'Completed': return 'Completed';
    case 'InProgress': return 'In Progress';
    default: return 'Not Started';
  }
}

export function progressDisplay(status: string | null | undefined): string {
  return `${progressMark(status)} ${progressLabel(status)}`;
}

export const PROGRESS_SELECT_OPTIONS = [
  { value: 'NotStarted', label: '○ Not Started' },
  { value: 'InProgress', label: '● In Progress' },
  { value: 'Completed', label: '✓ Completed' }
];

export function activityTypeLabel(type: string): string {
  const map: Record<string, string> = {
    Drawing: 'Drawing',
    Coloring: 'Coloring',
    Tracing: 'Tracing',
    Matching: 'Matching',
    ConnectDots: 'Connect Dots',
    ShapeIdentification: 'Shape Identification',
    PictureIdentification: 'Picture Identification',
    DragArrange: 'Drag & Arrange',
    FillBlanks: 'Fill in the Blanks',
    CircleSelect: 'Circle / Select',
    ImageQuestion: 'Image Question',
    Worksheet: 'Worksheet'
  };
  return map[type] || type;
}

export function materialTypeLabel(type: string): string {
  const map: Record<string, string> = {
    Pdf: 'PDF',
    Booklet: 'Booklet',
    Worksheet: 'Worksheet',
    Notes: 'Notes',
    Image: 'Image',
    Link: 'Link',
    Other: 'Other',
    Word: 'Word',
    Doc: 'Word'
  };
  return map[type] || type;
}

export function classDisplay(className: string, section?: string | null): string {
  return section ? `${className}-${section}` : className;
}

export function courseHeading(subjectName: string, className: string, section?: string | null): string {
  return `${subjectName} — ${classDisplay(className, section)}`;
}

export function teachingTypeLabel(type: string): string {
  const map: Record<string, string> = {
    NewTopic: 'New Topic',
    Revision: 'Revision',
    Practice: 'Practice',
    Assessment: 'Assessment'
  };
  return map[type] || type;
}

/** One-line teaching history entry: date — teacher — summary */
export function teachingHistoryLine(
  date: string | Date,
  teacherName: string,
  teachingType: string,
  remarks?: string | null
): string {
  const summary = (remarks || '').trim() || teachingTypeLabel(teachingType);
  const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date;
  const formatted = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${formatted} — ${teacherName} — ${summary}`;
}
