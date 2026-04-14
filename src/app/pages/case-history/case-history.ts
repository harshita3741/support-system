import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { HttpClient } from "@angular/common/http";

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
  patientName = "";
  error = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.patientName = localStorage.getItem("patientName") || "Patient";
    this.loadCases();
  }

  loadCases() {
    this.http.get<any[]>("http://localhost:8080/cases/all").subscribe({
      next: (data) => { this.cases = data; this.loading = false; },
      error: () => { this.loading = false; this.error = true; }
    });
  }

  getStatusColor(status: string): string {
    if (status === "OPEN") return "#e1f5ee";
    if (status === "CLOSED") return "#fdeee8";
    return "#eeedfe";
  }

  getStatusText(status: string): string {
    if (status === "OPEN") return "#0f6e56";
    if (status === "CLOSED") return "#d85a30";
    return "#6c63ff";
  }

  getDeptColor(dept: string): string {
    if (dept === "CARDIO") return "#fdeee8";
    if (dept === "NEURO") return "#eeedfe";
    if (dept === "ORTHO") return "#fef3e2";
    return "#e1f5ee";
  }
}
