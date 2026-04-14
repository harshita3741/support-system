import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class AuthService {
  login(data: any) {
    localStorage.setItem("token", "dummy");
    localStorage.setItem("patientName", data.email);
  }
  logout() { localStorage.clear(); }
  getPatientName(): string { return localStorage.getItem("patientName") || "User"; }
  getInitials(): string {
    const name = localStorage.getItem("patientName") || "";
    const parts = name.split("@")[0].split(".");
    return parts.map((p: string) => p[0]?.toUpperCase()).filter(Boolean).join("").slice(0, 2) || "?";
  }
}
