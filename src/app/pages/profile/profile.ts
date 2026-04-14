import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { AuthService } from "../../core/auth";

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
  noProfile = false;
  initials = "";

  constructor(private http: HttpClient, private router: Router, private auth: AuthService) {}

  ngOnInit() {
    this.initials = this.auth.getInitials();
    const patientId = localStorage.getItem("patientId");
    if (!patientId) {
      this.loading = false;
      this.noProfile = true;
      return;
    }
    this.http.get<any>("http://localhost:8080/patients/" + patientId).subscribe({
      next: (data) => {
        this.patient = data;
        this.loading = false;
        const name = data.fullName || "";
        this.initials = name.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase() || this.auth.getInitials();
      },
      error: () => {
        this.loading = false;
        this.noProfile = true;
      }
    });
  }

  logout() {
    localStorage.clear();
    this.router.navigate(["/login"]);
  }
}
