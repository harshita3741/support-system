import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";

@Component({
  selector: "app-register",
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: "./register.html",
  styleUrls: ["./register.css"]
})
export class RegisterComponent {
  currentStep = 1;
  patient: any = {
    fullName: "", email: "", phone: "", password: "", gender: "",
    dob: "", emergencyContact: "",
    bloodGroup: "", height: null, weight: null, bmi: null, allergies: "",
    chronicConditions: "",
    smokingHabit: "Never", alcoholConsumption: "No", activityLevel: "Moderate",
    sleepHours: "", dietType: "Vegetarian", waterIntake: "",
    isPregnant: false, lastMenstrual: "",
    pastIllness: "", previousSurgeries: "", familyHistory: "",
    ongoingTreatments: "", hospitalizations: "",
    city: "", state: "", pinCode: ""
  };
  conditions = ["Diabetes", "Hypertension", "Thyroid", "Asthma", "Heart Disease", "None"];
  selectedConditions: string[] = [];

  constructor(private http: HttpClient, private router: Router) {}

  nextStep() { if (this.currentStep < 5) this.currentStep++; }
  prevStep() { if (this.currentStep > 1) this.currentStep--; }

  calcBMI() {
    if (this.patient.height && this.patient.weight) {
      const h = this.patient.height / 100;
      this.patient.bmi = (this.patient.weight / (h * h)).toFixed(1);
    }
  }

  getBMILabel(): string {
    const b = parseFloat(this.patient.bmi);
    if (b < 18.5) return "Underweight";
    if (b < 25) return "Normal";
    if (b < 30) return "Overweight";
    return "Obese";
  }

  toggleCondition(c: string) {
    const i = this.selectedConditions.indexOf(c);
    if (i > -1) this.selectedConditions.splice(i, 1);
    else this.selectedConditions.push(c);
    this.patient.chronicConditions = this.selectedConditions.join(", ");
  }

  isSelected(c: string): boolean {
    return this.selectedConditions.includes(c);
  }

  submit() {
    this.http.post("http://localhost:8080/patients/register", this.patient)
      .subscribe({
        next: (res: any) => {
          localStorage.setItem("patientId", res.patientId);
          localStorage.setItem("patientName", res.fullName);
          alert("Registration successful! Your Patient ID: " + res.patientId);
          this.router.navigate(["/dashboard"]);
        },
        error: () => alert("Registration failed. Please try again.")
      });
  }
}
