import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-prescriptions',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './prescriptions.html',
  styleUrls: ['./prescriptions.css']
})
export class PrescriptionsComponent implements OnInit {

  prescriptions: any[] = [];
  loading = true;
  initials = '';
  showAvatarMenu = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    const name = localStorage.getItem('patientName') || '';
    this.initials = name.split('@')[0].split('.')
      .map((p: string) => p[0]?.toUpperCase()).join('').slice(0, 2) || 'PT';

    this.http.get<any[]>(`http://localhost:8080/prescriptions/patient/${encodeURIComponent(name)}`).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.prescriptions = (res || []).sort((a: any, b: any) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => { this.loading = false; this.cdr.detectChanges(); });
      }
    });
  }

  parseMedicines(json: string): any[] {
    try {
      const arr = JSON.parse(json || '[]');
      return Array.isArray(arr) ? arr.filter((m: any) => m.name) : [];
    } catch { return []; }
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
  }

  formatPdfDate(iso: string): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch { return iso; }
  }

  downloadPdf(rx: any) {
    const medicines = this.parseMedicines(rx.medicines);
    const pdfDate = this.formatPdfDate(rx.createdAt);
    const regNo = rx.doctorId ? `MQ/${rx.doctorId}` : 'MQ/1';

    const medRows = medicines.length > 0
      ? medicines.map((m: any) => `
          <tr>
            <td style="padding:6px 0; font-size:13px;">${m.name || ''}${m.dosage ? ' – ' + m.dosage : ''}</td>
            <td style="padding:6px 0; font-size:13px; color:#555;">${m.frequency || ''}</td>
            <td style="padding:6px 0; font-size:13px; color:#555;">${m.duration || ''}</td>
          </tr>`).join('')
      : `<tr><td colspan="3" style="padding:6px 0; font-size:13px; color:#555;">No medicines prescribed</td></tr>`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Prescription — ${rx.patientName || ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; color: #111; background: white; padding: 48px; max-width: 780px; margin: 0 auto; }
    .date-line { text-align: center; font-style: italic; font-size: 13px; margin-bottom: 16px; }
    .hospital-name { text-align: center; font-size: 26px; font-weight: bold; margin-bottom: 4px; }
    .doctor-name { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }
    .dept-line { text-align: center; font-size: 13px; color: #444; margin-bottom: 2px; }
    .reg-line { text-align: center; font-size: 13px; color: #444; margin-bottom: 16px; }
    .divider { border: none; border-top: 1.5px solid #222; margin: 12px 0; }
    .patient-name { font-weight: bold; font-size: 14px; margin-bottom: 6px; }
    .info-line { font-size: 13px; margin-bottom: 4px; }
    .rx-symbol { font-size: 42px; font-weight: bold; font-style: italic; font-family: serif; margin: 18px 0 6px 0; }
    .section-head { font-weight: bold; font-size: 14px; margin: 14px 0 4px 0; }
    .section-val { font-size: 13px; margin-left: 2px; }
    .footer { display: flex; justify-content: space-between; margin-top: 60px; padding-top: 12px; border-top: 1px solid #ccc; font-size: 13px; }
    .footer-left .name { font-weight: bold; }
    .footer-right { text-align: right; }
    table { width: 100%; border-collapse: collapse; }
    @media print { body { padding: 32px; } }
  </style>
</head>
<body>
  <div class="date-line">Date: ${pdfDate}</div>
  <div class="hospital-name">MediQueue Hospital</div>
  <div class="doctor-name">${rx.doctorName || 'Doctor'}</div>
  <div class="dept-line">${rx.department || ''} Department</div>
  <div class="reg-line">Reg. No. ${regNo}</div>

  <hr class="divider"/>

  <div class="patient-name">Patient: ${rx.patientName || ''}</div>
  ${rx.symptoms ? `<div class="info-line">Symptoms: ${rx.symptoms}</div>` : ''}
  ${rx.diagnosis ? `<div class="info-line">Diagnosis: ${rx.diagnosis}</div>` : ''}

  <hr class="divider"/>

  <div class="rx-symbol"><i>R<sub>x</sub></i></div>

  <table>
    ${medRows}
  </table>

  ${rx.advice ? `<div class="section-head">Advice / Referrals</div><div class="section-val">${rx.advice}</div>` : ''}
  ${rx.followUpDate ? `<div class="section-head">Follow-up Date</div><div class="section-val">${rx.followUpDate}</div>` : ''}

  <div class="footer">
    <div class="footer-left">
      <div class="name">${rx.doctorName || 'Doctor'}</div>
      <div>${rx.department || ''}</div>
    </div>
    <div class="footer-right">
      <div>MediQueue Hospital</div>
      <div>${pdfDate}</div>
    </div>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  toggleAvatarMenu() { this.showAvatarMenu = !this.showAvatarMenu; }
  closeMenus() { this.showAvatarMenu = false; }
  logout() { localStorage.clear(); this.router.navigate(['/']); }
}
