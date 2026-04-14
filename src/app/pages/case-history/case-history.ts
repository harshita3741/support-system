import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { AuthService } from "../../core/auth";

@Component({
  selector: "app-case-history",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./case-history.html",
  styleUrls: ["./case-history.css"]
})
export class CaseHistoryComponent implements OnInit {
  cases: any[] = [];
  loading = true;
  error = false;
  initials = "";

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit() {
    this.initials = this.auth.getInitials();
    this.loadCases();
  }

  loadCases() {
    this.loading = true;
    this.error = false;
    this.http.get<any[]>("http://localhost:8080/cases/all").subscribe({
      next: (data) => { this.cases = data; this.loading = false; },
      error: () => { this.loading = false; this.error = true; }
    });
  }

  getStatusColor(s: string): string {
    if (s === "OPEN") return "#e1f5ee";
    if (s === "CLOSED") return "#fdeee8";
    return "#eeedfe";
  }

  getStatusText(s: string): string {
    if (s === "OPEN") return "#0f6e56";
    if (s === "CLOSED") return "#d85a30";
    return "#6c63ff";
  }

  getDeptColor(d: string): string {
    if (d === "CARDIO") return "#fdeee8";
    if (d === "NEURO") return "#eeedfe";
    if (d === "ORTHO") return "#fef3e2";
    return "#e1f5ee";
  }
}
