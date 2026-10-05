import { ParamMap } from '@angular/router';

/** Query keys used when deep-linking Classroom Today ↔ leaf pages. */
export interface ClassroomNavCtx {
  classId: number;
  subjectId: number;
  periodId: number | null;
  periodNo: number | null;
  academicYearId: number | null;
  topicId: number | null;
  className: string | null;
  section: string | null;
  subjectName: string | null;
  startTime: string | null;
  endTime: string | null;
}

export function isFromClassroom(qp: ParamMap): boolean {
  return qp.get('from') === 'classroom';
}

export function parseClassroomCtx(qp: ParamMap): ClassroomNavCtx | null {
  const classId = Number(qp.get('classId'));
  const subjectId = Number(qp.get('subjectId'));
  if (!classId || !subjectId) return null;
  return {
    classId,
    subjectId,
    periodId: Number(qp.get('periodId')) || null,
    periodNo: Number(qp.get('periodNo')) || null,
    academicYearId: Number(qp.get('academicYearId')) || null,
    topicId: Number(qp.get('topicId')) || null,
    className: qp.get('className'),
    section: qp.get('section'),
    subjectName: qp.get('subjectName'),
    startTime: qp.get('startTime'),
    endTime: qp.get('endTime')
  };
}

/** Params to reopen Classroom Today on the same session. */
export function classroomReturnQuery(
  ctx: ClassroomNavCtx | null | undefined
): Record<string, string | number> | null {
  if (!ctx?.classId || !ctx?.subjectId) return null;
  const q: Record<string, string | number> = {
    classId: ctx.classId,
    subjectId: ctx.subjectId,
    className: ctx.className || '',
    section: ctx.section || '',
    subjectName: ctx.subjectName || ''
  };
  if (ctx.periodId) q['periodId'] = ctx.periodId;
  if (ctx.periodNo) q['periodNo'] = ctx.periodNo;
  if (ctx.academicYearId) q['academicYearId'] = ctx.academicYearId;
  if (ctx.topicId) q['topicId'] = ctx.topicId;
  if (ctx.startTime) q['startTime'] = ctx.startTime;
  if (ctx.endTime) q['endTime'] = ctx.endTime;
  return q;
}

export function classroomReturnQueryFromParamMap(qp: ParamMap): Record<string, string | number> | null {
  return classroomReturnQuery(parseClassroomCtx(qp));
}
