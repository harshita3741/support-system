import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-patient-monitor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './patient-monitor.html',
  styleUrl: './patient-monitor.css'
})
export class PatientMonitor {

  isEditingVitals = false;

  vitals = [
    { name: 'Blood Sugar',     value: '80', unit: 'mg/dL',     status: 'Normal', icon: '🩸', bg: '#fff8f0' },
    { name: 'Heart Rate',      value: '98', unit: 'BPM',        status: 'Normal', icon: '❤️', bg: '#fff0f0' },
    { name: 'Blood Pressure',  value: '90', unit: '/ 72 mmhg',  status: 'Normal', icon: '💧', bg: '#f0f9ff' },
    { name: 'Hemoglobin',      value: '14', unit: 'g/dL',       status: 'Normal', icon: '🧬', bg: '#fff0f5' }
  ];

  editableVitals = [...this.vitals.map(v => ({ ...v }))];

  reports = [
    { name: 'Medical Check Up Report.pdf', size: '2 MB',    icon: '📄', downloaded: true  },
    { name: 'Blood Count Report.docx',     size: '5 MB',    icon: '📄', downloaded: false },
    { name: 'Heart ECG Report.docx',       size: '10 MB',   icon: '📄', downloaded: false },
    { name: 'MRI of Brain Report.png',     size: '25.8 MB', icon: '🖼️', downloaded: false }
  ];

  history = [
    { diagnosis: 'Covid-19',                  doctor: 'Dr. Anjani Sharma',   icon: '🦠' },
    { diagnosis: 'Surgery for Appendicitis',  doctor: 'Dr. Sushant Seth',    icon: '🔬' },
    { diagnosis: 'Pranine Inspection',        doctor: 'Dr. Nilam Kumawat',   icon: '🩺' },
    { diagnosis: 'Ankle Fracture',            doctor: 'Dr. Vasishta Gupta',  icon: '🦴' }
  ];

  upcomingTests = [
    { name: 'ECG Test',       freq: 'Every month', date: '20/04/24', icon: '📈', bg: '#f0f6ff' },
    { name: 'Blood Test',     freq: 'Every month', date: '20/04/24', icon: '🩸', bg: '#fff0f0' },
    { name: 'Diagnosis Test', freq: 'Every month', date: '20/04/24', icon: '📋', bg: '#f0fdf4' },
    { name: 'Urine Test',     freq: 'Every month', date: '20/04/24', icon: '🧪', bg: '#fef9c3' }
  ];

  visits = [
    { date: 'Mar 20, 2026', diagnosis: 'HF management',        notes: 'Diuretic adjusted.'                  },
    { date: 'Jan 28, 2026', diagnosis: 'Nephrology co-visit',   notes: 'Creatinine stable.'                  },
    { date: 'Oct 5, 2025',  diagnosis: 'Hypertension check',    notes: 'BP controlled. Continue lisinopril.' }
  ];

  // ─── VITALS EDITING ───────────────────────────────────────────

  startEditVitals(): void {
    this.editableVitals = this.vitals.map(v => ({ ...v }));
    this.isEditingVitals = true;
  }

  // FIX 1: saveVitals() was missing its closing brace
  saveVitals(): void {
    this.vitals = this.editableVitals.map(v => ({
      ...v,
      status: this.getStatus(v.name, v.value)   // FIX 2: getStatus() added below
    }));
    this.isEditingVitals = false;
  }

  // FIX 3: cancelEdit() was missing entirely
  cancelEdit(): void {
    this.editableVitals = this.vitals.map(v => ({ ...v }));
    this.isEditingVitals = false;
  }

  // FIX 4: getStatus() was missing entirely
  getStatus(name: string, value: string): string {
    const v = parseFloat(value);
    switch (name) {
      case 'Blood Sugar':
        if (v < 70)               return 'Low';
        if (v <= 100)             return 'Normal';
        if (v <= 125)             return 'Pre-diabetic';
        return 'High';

      case 'Heart Rate':
        if (v < 60)               return 'Low';
        if (v <= 100)             return 'Normal';
        return 'High';

      case 'Blood Pressure':
        if (v < 80)               return 'Low';
        if (v <= 120)             return 'Normal';
        if (v <= 139)             return 'Elevated';
        return 'High';

      case 'Hemoglobin':
        if (v < 12)               return 'Low';
        if (v <= 17.5)            return 'Normal';
        return 'High';

      default:
        return 'Normal';
    }
  }

  // FIX 5: getStatusClass() was missing entirely (used in template for [ngClass])
  getStatusClass(status: string): string {
    switch (status) {
      case 'Normal':      return 'status-normal';
      case 'Low':         return 'status-low';
      case 'Elevated':
      case 'Pre-diabetic':
      case 'High':        return 'status-high';
      default:            return 'status-normal';
    }
  }
}