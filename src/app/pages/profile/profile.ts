import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";

@Component({
  selector: "app-profile",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./profile.html",
  styleUrls: ["./profile.css"]
})
export class ProfileComponent implements OnInit {
  patient: any = null;
  loading = true;
  initials = "";

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    const patientId = localStorage.getItem("patientId");
    if (!patientId) { this.router.navigate(["/login"]); return; }
    this.http.get<any>("http://localhost:8080/patients/" + patientId).subscribe({
      next: (data) => {
        this.patient = data;
        this.loading = false;
        const name = data.fullName || "";
        this.initials = name.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase();
      },
      error: () => { this.loading = false; }
    });
  }

  logout() {
    localStorage.clear();
    this.router.navigate(["/login"]);
  }
}
