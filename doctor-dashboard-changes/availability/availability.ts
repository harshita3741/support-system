import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';

// ⚠️ Must match the backend URL used by the rest of the doctor dashboard
// (e.g. http://192.168.1.76:8080 — check appointment.service.ts for the correct IP)
const BACKEND = 'http://192.168.1.76:8080';
const API = `${BACKEND}/availability`;

@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './availability.html',
  styleUrls: ['./availability.css']
})
export class Availability implements OnInit {

  doctorId: number = 0;
  availability: any = null;
  loading = true;
  saving = false;
  toast = '';
  toastType: 'success' | 'error' = 'success';
  backendError = false;   // true when backend is unreachable

  // ── Status ──────────────────────────────────────────────────────────
  readonly statusOptions = [
    { value: 'AVAILABLE',       label: 'Available',        icon: '🟢', desc: 'Accepting patients & consultations' },
    { value: 'UNAVAILABLE',     label: 'Unavailable',      icon: '🔴', desc: 'Not accepting any new requests' },
    { value: 'ON_LEAVE',        label: 'On Leave',         icon: '🟡', desc: 'Away — all requests paused' },
    { value: 'IN_CONSULTATION', label: 'In Consultation',  icon: '🔵', desc: 'In an active session' }
  ];

  selectedStatus = 'AVAILABLE';

  // ── Working hours ───────────────────────────────────────────────────
  workingStart = '09:00';
  workingEnd   = '17:00';

  // ── Block date ──────────────────────────────────────────────────────
  blockDateInput = '';

  // ── Block time slot ─────────────────────────────────────────────────
  blockSlotDate = '';
  blockSlotTime = '';

  readonly timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM'
  ];

  // ── Block day of week ───────────────────────────────────────────────
  readonly weekDays = [
    { value: 'MONDAY',    label: 'Mon' },
    { value: 'TUESDAY',   label: 'Tue' },
    { value: 'WEDNESDAY', label: 'Wed' },
    { value: 'THURSDAY',  label: 'Thu' },
    { value: 'FRIDAY',    label: 'Fri' },
    { value: 'SATURDAY',  label: 'Sat' },
    { value: 'SUNDAY',    label: 'Sun' }
  ];

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const id = this.auth.getDoctorId();
    if (!id) { this.router.navigate(['/login']); return; }
    this.doctorId = Number(id);
    this.load();
  }

  // ── Data loading ─────────────────────────────────────────────────────

  load() {
    this.loading = true;
    this.http.get<any>(`${API}/${this.doctorId}`).subscribe({
      next: (data) => {
        this.availability = data;
        this.selectedStatus = data.status || 'AVAILABLE';
        this.workingStart   = data.workingHoursStart || '09:00';
        this.workingEnd     = data.workingHoursEnd   || '17:00';
        this.backendError   = false;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        // Show a clear banner if backend is unreachable (CORS / network / 404)
        this.backendError = true;
        // Still show the form so UI is usable
        this.availability = {
          blockedDates: [], blockedSlots: [], blockedDays: [],
          status: 'AVAILABLE', workingHoursStart: '09:00', workingHoursEnd: '17:00'
        };
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Status ────────────────────────────────────────────────────────────

  saveStatus() {
    this.saving = true;
    this.http.put(`${API}/${this.doctorId}/status`, { status: this.selectedStatus }).subscribe({
      next: (data: any) => {
        this.availability = data;
        this.backendError = false;
        this.saving = false;
        this.showToast('Status updated to ' + this.selectedStatus.replace('_', ' '), 'success');
      },
      error: (err) => {
        this.saving = false;
        this.backendError = true;
        const hint = err?.status === 0
          ? `Cannot reach backend at ${BACKEND}. Check the IP / make sure Spring Boot is running.`
          : `Backend error ${err?.status}: ${err?.error?.error || 'update failed'}`;
        this.showToast(hint, 'error');
      }
    });
  }

  // ── Working hours ─────────────────────────────────────────────────────

  saveWorkingHours() {
    if (!this.workingStart || !this.workingEnd) { this.showToast('Please fill in both start and end times', 'error'); return; }
    if (this.workingStart >= this.workingEnd) { this.showToast('End time must be after start time', 'error'); return; }
    this.saving = true;
    this.http.put(`${API}/${this.doctorId}/working-hours`, { start: this.workingStart, end: this.workingEnd }).subscribe({
      next: (data: any) => {
        this.availability = data;
        this.backendError = false;
        this.saving = false;
        this.showToast('Working hours saved', 'success');
      },
      error: (err) => {
        this.saving = false;
        this.backendError = true;
        this.showToast(err?.status === 0 ? `Cannot reach ${BACKEND}` : `Error ${err?.status}`, 'error');
      }
    });
  }

  // ── Blocked dates ─────────────────────────────────────────────────────

  addBlockedDate() {
    if (!this.blockDateInput) { this.showToast('Please pick a date', 'error'); return; }
    if ((this.availability?.blockedDates || []).includes(this.blockDateInput)) {
      this.showToast('Date already blocked', 'error'); return;
    }
    this.http.post(`${API}/${this.doctorId}/block-date`, { date: this.blockDateInput }).subscribe({
      next: (data: any) => {
        this.availability = data;
        this.backendError = false;
        this.blockDateInput = '';
        this.showToast('Date blocked', 'success');
      },
      error: (err) => {
        this.backendError = true;
        this.showToast(err?.status === 0 ? `Cannot reach ${BACKEND}` : `Error ${err?.status}`, 'error');
      }
    });
  }

  removeBlockedDate(date: string) {
    this.http.delete(`${API}/${this.doctorId}/block-date`, { body: { date } }).subscribe({
      next: (data: any) => {
        this.availability = data;
        this.backendError = false;
        this.showToast('Date unblocked', 'success');
      },
      error: (err) => {
        this.backendError = true;
        this.showToast(err?.status === 0 ? `Cannot reach ${BACKEND}` : `Error ${err?.status}`, 'error');
      }
    });
  }

  // ── Blocked slots ─────────────────────────────────────────────────────

  addBlockedSlot() {
    if (!this.blockSlotDate || !this.blockSlotTime) { this.showToast('Please pick a date and time slot', 'error'); return; }
    const key = this.blockSlotDate + ':' + this.blockSlotTime;
    if ((this.availability?.blockedSlots || []).includes(key)) {
      this.showToast('Slot already blocked', 'error'); return;
    }
    this.http.post(`${API}/${this.doctorId}/block-slot`, { date: this.blockSlotDate, timeSlot: this.blockSlotTime }).subscribe({
      next: (data: any) => {
        this.availability = data;
        this.backendError = false;
        this.blockSlotTime = '';
        this.showToast('Slot blocked', 'success');
      },
      error: (err) => {
        this.backendError = true;
        this.showToast(err?.status === 0 ? `Cannot reach ${BACKEND}` : `Error ${err?.status}`, 'error');
      }
    });
  }

  removeBlockedSlot(slot: string) {
    // slot format: "YYYY-MM-DD:HH:MM AM"
    const colonIdx = slot.indexOf(':');
    const date = slot.substring(0, colonIdx);
    const timeSlot = slot.substring(colonIdx + 1);
    this.http.delete(`${API}/${this.doctorId}/block-slot`, { body: { date, timeSlot } }).subscribe({
      next: (data: any) => {
        this.availability = data;
        this.backendError = false;
        this.showToast('Slot unblocked', 'success');
      },
      error: (err) => {
        this.backendError = true;
        this.showToast(err?.status === 0 ? `Cannot reach ${BACKEND}` : `Error ${err?.status}`, 'error');
      }
    });
  }

  formatSlotLabel(slot: string): string {
    // "2025-12-20:09:00 AM" → "Dec 20, 2025 — 09:00 AM"
    try {
      const idx = slot.indexOf(':');
      const date = slot.substring(0, idx);
      const time = slot.substring(idx + 1);
      const d = new Date(date + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' — ' + time;
    } catch { return slot; }
  }

  // ── Blocked days ──────────────────────────────────────────────────────

  isDayBlocked(day: string): boolean {
    return (this.availability?.blockedDays || []).includes(day);
  }

  toggleDay(day: string) {
    const onError = (err: any) => {
      this.backendError = true;
      this.showToast(err?.status === 0 ? `Cannot reach ${BACKEND}` : `Error ${err?.status}`, 'error');
    };
    if (this.isDayBlocked(day)) {
      this.http.delete(`${API}/${this.doctorId}/block-day`, { body: { day } }).subscribe({
        next: (data: any) => { this.availability = data; this.backendError = false; this.showToast(day + ' unblocked', 'success'); },
        error: onError
      });
    } else {
      this.http.post(`${API}/${this.doctorId}/block-day`, { day }).subscribe({
        next: (data: any) => { this.availability = data; this.backendError = false; this.showToast(day + ' blocked', 'success'); },
        error: onError
      });
    }
  }

  // ── Toast ─────────────────────────────────────────────────────────────

  showToast(msg: string, type: 'success' | 'error') {
    this.toast = msg;
    this.toastType = type;
    this.cdr.detectChanges();
    // Errors stay longer so the user can read them
    const duration = type === 'error' ? 7000 : 3000;
    setTimeout(() => { this.toast = ''; this.cdr.detectChanges(); }, duration);
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  get todayISO(): string {
    return new Date().toISOString().split('T')[0];
  }

  get backendUrl(): string { return BACKEND; }

  getStatusConfig(value: string) {
    return this.statusOptions.find(s => s.value === value) || this.statusOptions[0];
  }

  formatBlockedDate(date: string): string {
    try {
      return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return date; }
  }
}
