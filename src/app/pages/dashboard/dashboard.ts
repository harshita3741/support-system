import { Component, OnInit, ChangeDetectorRef, NgZone } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { AuthService } from "../../core/auth";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./dashboard.html",
  styleUrls: ["./dashboard.css"]
})
export class DashboardComponent implements OnInit {
  name = "";
  initials = "";
  showNewMenu = false;
  showAvatarMenu = false;
  showProfileAlert = false;

  constructor(private auth: AuthService, private http: HttpClient, private router: Router, private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.name = this.auth.getPatientName();
    const parts = this.name.split("@")[0].split(".");
    this.initials = parts.map((p: string) => p[0]?.toUpperCase()).join("").slice(0, 2);
    this.checkProfile();
  }

  checkProfile() {
    const patientId = localStorage.getItem("patientId");
    if (!patientId) { this.showProfileAlert = true; return; }
    this.http.get<any>("http://localhost:8080/patients/" + patientId).subscribe({
      next: (p) => {
        this.ngZone.run(() => {
          this.showProfileAlert = !(p.bloodGroup && p.height && p.city);
          this.cdr.detectChanges();
        });
      },
      error: () => {}
    });
  }

  toggleNewMenu() { this.showNewMenu = !this.showNewMenu; this.showAvatarMenu = false; }
  toggleAvatarMenu() { this.showAvatarMenu = !this.showAvatarMenu; this.showNewMenu = false; }
  closeMenus() { this.showNewMenu = false; this.showAvatarMenu = false; }

  logout() {
    localStorage.clear();
    this.router.navigate(["/login"]);
  }
  dismissAlert() { this.showProfileAlert = false; }
}