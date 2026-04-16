import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { AuthService } from "../../core/auth";

@Component({
  selector: "app-case-history",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./case-history.html",
  styleUrls: ["./case-history.css"]
})
export class CaseHistoryComponent implements OnInit, OnDestroy {
  cases: any[] = [];
  loading = true;
  error = false;
  initials = "";
  pollInterval: any;

  constructor(private http: HttpClient, private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.initials = this.auth.getInitials();
    this.loadCases();
    this.pollInterval = setInterval(() => this.loadCases(), 5000);
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  loadCases() {
    this.http.get<any[]>("http://localhost:8080/cases/queue").subscribe({
      next: (data) => {
        const patientName = this.auth.getPatientName();
        this.cases = data.filter(c =>
          c.patientName === patientName || c.patientName === "ChatUser"
        );
        this.loading = false;
        this.error = false;
      },
      error: () => {
        if (this.loading) {
          this.loading = false;
          this.error = true;
        }
      }
    });
  }

  getRoomId(caseId: number): string {
    return "careai-room-" + caseId;
  }

  getStatusColor(s: string): string {
    if (s === "OPEN") return "#e1f5ee";
    if (s === "ACCEPTED") return "#eeedfe";
    if (s === "CLOSED") return "#fdeee8";
    return "#f0f2f8";
  }

  getStatusText(s: string): string {
    if (s === "OPEN") return "#0f6e56";
    if (s === "ACCEPTED") return "#6c63ff";
    if (s === "CLOSED") return "#d85a30";
    return "#9098b0";
  }

  getDeptColor(d: string): string {
    if (d === "CARDIO") return "#fdeee8";
    if (d === "NEURO") return "#eeedfe";
    if (d === "ORTHO") return "#fef3e2";
    return "#e1f5ee";
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
