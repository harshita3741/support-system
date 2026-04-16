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
  docsLoading = true;
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
            this.patient = res;
            this.loading = false;
            this.isProfileIncomplete = !(res.bloodGroup && res.height && res.weight && res.city && res.phone && res.dob);
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.ngZone.run(() => { this.loading = false; this.cdr.detectChanges(); });
        }
      });

      this.http.get<any[]>(`http://localhost:8080/patients/${patientId}/documents`).subscribe({
        next: (docs) => {
          this.ngZone.run(() => {
            this.documents = docs || [];
            this.docsLoading = false;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.ngZone.run(() => { this.docsLoading = false; this.cdr.detectChanges(); });
        }
      });
    } else {
      this.loading = false;
      this.docsLoading = false;
    }
  }

  toggleAvatarMenu() { this.showAvatarMenu = !this.showAvatarMenu; }
  closeMenus() { this.showAvatarMenu = false; }
  logout() { localStorage.clear(); this.router.navigate(['/login']); }
}