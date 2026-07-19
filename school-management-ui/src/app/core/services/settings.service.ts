import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SchoolSettingsDto, DayScheduleDto, ScheduleProfileDto } from '../models/settings.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private base = environment.apiUrl;
  constructor(private http: HttpClient) {}

  /** Cached set of working day-of-week numbers (1=Mon … 7=Sun) from the active profile. */
  private workingDays$: Observable<Set<number>> | null = null;

  getWorkingDays(): Observable<Set<number>> {
    if (!this.workingDays$) {
      this.workingDays$ = this.getProfiles().pipe(
        map(profiles => {
          const active = profiles.find(p => p.isActive) ?? profiles[0];
          if (!active) return new Set<number>([1, 2, 3, 4, 5]);
          return new Set<number>(active.days.filter(d => d.isWorkingDay).map(d => d.dayOfWeek));
        }),
        shareReplay(1),
      );
    }
    return this.workingDays$;
  }

  /** Returns true when the given date falls on a working day. */
  isWorkingDate(date: Date, workingDays: Set<number>): boolean {
    // JS getDay(): 0=Sun,1=Mon…6=Sat  →  our encoding: 1=Mon…6=Sat,7=Sun
    const js = date.getDay();
    const dow = js === 0 ? 7 : js;
    return workingDays.has(dow);
  }

  /** Invalidate cache (call after activating a new profile). */
  clearWorkingDaysCache() { this.workingDays$ = null; }

  getAppInfo()                      { return this.http.get<{ appName: string; tagline: string; logoUrl: string; copyrightText: string }>(`${this.base}/app-info`); }
  get()                             { return this.http.get<SchoolSettingsDto>(`${this.base}/settings`); }
  save(dto: SchoolSettingsDto)      { return this.http.put<SchoolSettingsDto>(`${this.base}/settings`, dto); }
  bulkReplacePeriods(periods: any[]) { return this.http.post<any[]>(`${this.base}/periods/bulk-replace`, { periods }); }

  // Schedule profiles
  getProfiles()                                          { return this.http.get<ScheduleProfileDto[]>(`${this.base}/schedule-profiles`); }
  createProfile(name: string)                            { return this.http.post<ScheduleProfileDto>(`${this.base}/schedule-profiles`, { name }); }
  copyProfile(id: number, name: string)                  { return this.http.post<ScheduleProfileDto>(`${this.base}/schedule-profiles/${id}/copy`, { name }); }
  renameProfile(id: number, name: string)                { return this.http.patch<ScheduleProfileDto>(`${this.base}/schedule-profiles/${id}/rename`, { name }); }
  saveProfileDays(id: number, days: DayScheduleDto[])    { return this.http.put<ScheduleProfileDto>(`${this.base}/schedule-profiles/${id}/days`, { days }); }
  activateProfile(id: number)                            { return this.http.post<ScheduleProfileDto>(`${this.base}/schedule-profiles/${id}/activate`, {}); }
  deleteProfile(id: number)                              { return this.http.delete(`${this.base}/schedule-profiles/${id}`); }
  getProfilePeriods(id: number)                          { return this.http.get<any[]>(`${this.base}/schedule-profiles/${id}/periods`); }
  getActivePeriodsPerDay()                               { return this.http.get<Record<number, any[]>>(`${this.base}/schedule-profiles/active-periods-per-day`); }
  saveProfilePeriods(id: number, periods: any[])         { return this.http.put<any[]>(`${this.base}/schedule-profiles/${id}/periods`, { periods }); }
  syncPeriodsFromActiveProfile()                         { return this.http.post<any[]>(`${this.base}/schedule-profiles/sync-periods`, {}); }
}
