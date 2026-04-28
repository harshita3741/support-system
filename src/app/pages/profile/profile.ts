import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class ProfileComponent implements OnInit {

  patient: any = null;
  loading = true;
  initials = '';
  isProfileIncomplete = false;
  documents: any[] = [];
  docsLoading = false;
  showAvatarMenu = false;

  constructor(private http: HttpClient, private router: Router, private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const patientId = localStorage.getItem('patientId');
    const name = localStorage.getItem('patientName') || '';
    this.initials = name.split('@')[0].split('.')
      .map((p: string) => p[0]?.toUpperCase()).join('').slice(0, 2) || 'PT';

    if (patientId) {
      this.http.get<any>(`http://localhost:8080/patients/${patientId}`).subscribe({
        next: (res) => {
          this.ngZone.run(() => {
            // If ALL lifestyle fields exactly match old register.ts hardcoded defaults,
            // the user never actually filled them in — treat them as empty.
            const OLD_LIFESTYLE: Record<string, string> = {
              smokingHabit: 'Never',
              alcoholConsumption: 'No',
              activityLevel: 'Moderate',
              dietType: 'Vegetarian'
            };
            const allDefaulted = Object.entries(OLD_LIFESTYLE).every(
              ([k, v]) => res[k] === v
            );
            if (allDefaulted) {
              for (const k of Object.keys(OLD_LIFESTYLE)) res[k] = '';
              // Blood group A+ was also a register default when lifestyle was untouched
              if (res.bloodGroup === 'A+') res.bloodGroup = '';
            }
            this.patient = res;
            this.loading = false;
            this.isProfileIncomplete = !(
              res.bloodGroup && res.height && res.weight &&
              res.city && res.phone && res.dob &&
              res.smokingHabit && res.alcoholConsumption &&
              res.activityLevel && res.dietType
            );
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.ngZone.run(() => { this.loading = false; this.cdr.detectChanges(); });
        }
      });
    } else {
      this.loading = false;
    }
  }

  toggleAvatarMenu() { this.showAvatarMenu = !this.showAvatarMenu; }
  closeMenus() { this.showAvatarMenu = false; }
  logout() { localStorage.clear(); this.router.navigate(['/']); }

  triggerFileUpload() {
    const input = document.getElementById('docFileInput') as HTMLInputElement;
    if (input) input.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const url = URL.createObjectURL(file);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    this.documents = [
      ...this.documents,
      { fileName: file.name, uploadedAt: dateStr, url, size: file.size }
    ];
    this.cdr.detectChanges();
    input.value = '';
  }

  formatSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
