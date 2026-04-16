import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";

@Component({
  selector: "app-doctor-queue",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./doctor-queue.html",
  styleUrls: ["./doctor-queue.css"]
})
export class DoctorQueueComponent implements OnInit, OnDestroy {

  doctors: any[] = [];
  selectedDoctor: any = null;
  cases: any[] = [];
  loading = false;
  acceptingId: number | null = null;
  private refreshInterval: any;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    // Try to restore saved doctor
    const saved = localStorage.getItem("doctorId");
    if (saved) {
      this.http.get<any[]>("http://localhost:8080/api/doctors").subscribe({
        next: (docs) => {
          this.ngZone.run(() => {
            this.doctors = docs;
            const found = docs.find(d => String(d.doctorId) === saved);
            if (found) { this.selectedDoctor = found; this.startPolling(); }
            this.cdr.detectChanges();
          });
        }
      });
    } else {
      this.loadDoctors();
    }
  }

  ngOnDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  loadDoctors() {
    this.http.get<any[]>("http://localhost:8080/api/doctors").subscribe({
      next: (docs) => {
        this.ngZone.run(() => { this.doctors = docs; this.cdr.detectChanges(); });
      }
    });
  }

  selectDoctor(doc: any) {
    this.selectedDoctor = doc;
    localStorage.setItem("doctorId", String(doc.doctorId));
    this.loadQueue();
    this.startPolling();
  }

  startPolling() {
    this.loadQueue();
    this.refreshInterval = setInterval(() => this.loadQueue(), 8000);
  }

  loadQueue() {
    this.http.get<any[]>("http://localhost:8080/cases/queue").subscribe({
      next: (cases) => {
        this.ngZone.run(() => {
          // Filter to only show cases for this doctor's specialty
          const dept = this.getDeptForSpecialty(this.selectedDoctor?.specialty);
          this.cases = cases.filter(c => !dept || c.department === dept);
          this.cdr.detectChanges();
        });
      }
    });
  }

  getDeptForSpecialty(specialty: string): string {
    if (!specialty) return "";
    const s = specialty.toLowerCase();
    if (s.includes("cardio")) return "CARDIO";
    if (s.includes("neuro")) return "NEURO";
    if (s.includes("ortho")) return "ORTHO";
    return "";
  }

  acceptCase(c: any) {
    this.acceptingId = c.caseId;
    this.http.patch(`http://localhost:8080/cases/${c.caseId}/accept`,
      { doctorId: String(this.selectedDoctor.doctorId) }
    ).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.acceptingId = null;
          // Update case status locally for immediate feedback
          const idx = this.cases.findIndex(x => x.caseId === c.caseId);
          if (idx !== -1) this.cases[idx] = { ...this.cases[idx], status: "ACCEPTED" };
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => { this.acceptingId = null; this.cdr.detectChanges(); });
      }
    });
  }

  startCall(caseId: number) {
    this.router.navigate(["/doctor-call"], { queryParams: { caseId } });
  }

  logout() {
    localStorage.removeItem("doctorId");
    this.selectedDoctor = null;
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    this.cases = [];
  }

  getDeptColor(dept: string): string {
    if (dept === "CARDIO") return "#fee2e2";
    if (dept === "NEURO") return "#ede9fe";
    if (dept === "ORTHO") return "#d1fae5";
    return "#f3f4f6";
  }

  getDeptTextColor(dept: string): string {
    if (dept === "CARDIO") return "#dc2626";
    if (dept === "NEURO") return "#7c3aed";
    if (dept === "ORTHO") return "#059669";
    return "#374151";
  }
}
