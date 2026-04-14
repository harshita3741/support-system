import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { AuthService } from "../../core/auth";

@Component({
  selector: "app-appointment",
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: "./appointment.html",
  styleUrls: ["./appointment.css"]
})
export class AppointmentComponent implements OnInit {
  doctors: any[] = [];
  slots = [
    { time: "9:00 AM", taken: true },
    { time: "9:30 AM", taken: true },
    { time: "10:00 AM", taken: false },
    { time: "10:30 AM", taken: false },
    { time: "11:00 AM", taken: false },
    { time: "11:30 AM", taken: true },
    { time: "2:00 PM", taken: false },
    { time: "2:30 PM", taken: false },
    { time: "3:00 PM", taken: false },
  ];
  selectedDoctor = 0;
  selectedSlot = "10:00 AM";
  selectedDay = 9;
  patientName = "";
  initials = "";
  days = ["","",1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30];

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit() {
    this.patientName = this.auth.getPatientName();
    this.initials = this.auth.getInitials();
    this.loadDoctors();
  }

  loadDoctors() {
    this.http.get<any[]>("http://localhost:8080/doctors").subscribe({
      next: (data) => {
        this.doctors = data.map(d => ({
          initials: d.name.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase(),
          name: d.name,
          spec: d.specialty,
          color: this.getColor(d.specialty),
          id: d.doctorId
        }));
      },
      error: () => {
        this.doctors = [
          { initials: "RS", name: "Dr. Riya Sharma", spec: "General Physician", color: "#6c63ff", id: 1 },
          { initials: "AK", name: "Dr. Arjun Kapoor", spec: "Cardiologist", color: "#1d9e75", id: 2 },
          { initials: "PM", name: "Dr. Priya Mehta", spec: "Dermatologist", color: "#d85a30", id: 3 }
        ];
      }
    });
  }

  getColor(s: string): string {
    if (s === "CARDIO" || s === "Cardiologist") return "#1d9e75";
    if (s === "NEURO") return "#6c63ff";
    if (s === "ORTHO") return "#d85a30";
    return "#6c63ff";
  }

  selectDoctor(i: number) { this.selectedDoctor = i; }
  selectSlot(slot: any) { if (!slot.taken) this.selectedSlot = slot.time; }
  selectDay(day: any) { if (day) this.selectedDay = day; }

  getDepartment(): string {
    const spec = this.doctors[this.selectedDoctor]?.spec || "";
    if (spec === "Cardiologist" || spec === "CARDIO") return "CARDIO";
    if (spec === "NEURO") return "NEURO";
    if (spec === "ORTHO" || spec === "Dermatologist") return "ORTHO";
    return "GENERAL";
  }

  confirm() {
    if (!this.doctors.length) { alert("No doctors available"); return; }
    const caseData = {
      caseId: Date.now(),
      patientName: this.patientName,
      symptoms: "Appointment - " + this.doctors[this.selectedDoctor]?.spec,
      department: this.getDepartment(),
      status: "OPEN",
      assignedDoctorId: this.doctors[this.selectedDoctor]?.id
    };
    this.http.post("http://localhost:8080/cases/create", caseData).subscribe({
      next: () => alert("Appointment confirmed with " + this.doctors[this.selectedDoctor]?.name + " on April " + this.selectedDay + " at " + this.selectedSlot),
      error: () => alert("Could not book. Is backend running?")
    });
  }
}
