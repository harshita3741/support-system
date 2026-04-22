import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

type VitalItem = {
  name: string;
  value: string;
  unit: string;
  status: string;
  icon: string;
  bg: string;
};

type ReportItem = {
  name: string;
  size: string;
  icon: string;
  downloaded: boolean;
};

type HistoryItem = {
  diagnosis: string;
  doctor: string;
  icon: string;
};

type TestItem = {
  name: string;
  freq: string;
  date: string;
  icon: string;
  bg: string;
};

type VisitItem = {
  date: string;
  diagnosis: string;
  notes: string;
};

type PatientProfile = {
  id: string;
  doctorDept: string;
  name: string;
  initials: string;
  age: number;
  gender: string;
  patientId: string;
  bloodGroup: string;
  bmi: string;
  height: string;
  weight: string;
  contact: string;
  vitals: VitalItem[];
  reports: ReportItem[];
  history: HistoryItem[];
  upcomingTests: TestItem[];
  visits: VisitItem[];
};

@Component({
  selector: 'app-patient-monitor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './patient-monitor.html',
  styleUrls: ['./patient-monitor.css']
})
export class PatientMonitor implements OnInit {
  isEditingVitals = false;
  patientId = '';
  patient: PatientProfile | null = null;

  vitals: VitalItem[] = [];
  editableVitals: VitalItem[] = [];
  reports: ReportItem[] = [];
  history: HistoryItem[] = [];
  upcomingTests: TestItem[] = [];
  visits: VisitItem[] = [];

  allPatients: PatientProfile[] = [
    {
      id: 'C-1042',
      doctorDept: 'CARDIO',
      name: 'Priya Mehta',
      initials: 'PM',
      age: 52,
      gender: 'Female',
      patientId: '#83947',
      bloodGroup: 'B+',
      bmi: '27.1',
      height: '5.4 ft',
      weight: '68 kg',
      contact: '9876543210',
      vitals: [
        { name: 'Blood Sugar', value: '126', unit: 'mg/dL', status: 'Pre-diabetic', icon: '🩸', bg: '#fff8f0' },
        { name: 'Heart Rate', value: '88', unit: 'BPM', status: 'Normal', icon: '❤️', bg: '#fff0f0' },
        { name: 'Blood Pressure', value: '138', unit: '/ 88 mmhg', status: 'Elevated', icon: '💧', bg: '#f0f9ff' },
        { name: 'Hemoglobin', value: '12.8', unit: 'g/dL', status: 'Normal', icon: '🧬', bg: '#fff0f5' }
      ],
      reports: [
        { name: 'Cardiac Checkup Report.pdf', size: '2.1 MB', icon: '📄', downloaded: true },
        { name: 'Lipid Profile.pdf', size: '1.2 MB', icon: '📄', downloaded: false },
        { name: 'ECG Summary.pdf', size: '4.6 MB', icon: '📄', downloaded: false }
      ],
      history: [
        { diagnosis: 'Hypertension', doctor: 'Dr. Smith', icon: '🩺' },
        { diagnosis: 'Palpitations Review', doctor: 'Dr. Smith', icon: '❤️' }
      ],
      upcomingTests: [
        { name: 'ECG Test', freq: 'Monthly', date: '20/04/26', icon: '📈', bg: '#f0f6ff' },
        { name: 'Blood Test', freq: 'Monthly', date: '20/04/26', icon: '🩸', bg: '#fff0f0' }
      ],
      visits: [
        { date: 'Mar 20, 2026', diagnosis: 'Cardiac follow-up', notes: 'Medication adjusted.' },
        { date: 'Jan 28, 2026', diagnosis: 'BP review', notes: 'Continue antihypertensives.' }
      ]
    },
    {
      id: 'C-1043',
      doctorDept: 'CARDIO',
      name: 'Rohan Verma',
      initials: 'RV',
      age: 48,
      gender: 'Male',
      patientId: '#83948',
      bloodGroup: 'A+',
      bmi: '26.4',
      height: '5.8 ft',
      weight: '76 kg',
      contact: '9812345678',
      vitals: [
        { name: 'Blood Sugar', value: '110', unit: 'mg/dL', status: 'Pre-diabetic', icon: '🩸', bg: '#fff8f0' },
        { name: 'Heart Rate', value: '84', unit: 'BPM', status: 'Normal', icon: '❤️', bg: '#fff0f0' },
        { name: 'Blood Pressure', value: '132', unit: '/ 86 mmhg', status: 'Elevated', icon: '💧', bg: '#f0f9ff' },
        { name: 'Hemoglobin', value: '13.6', unit: 'g/dL', status: 'Normal', icon: '🧬', bg: '#fff0f5' }
      ],
      reports: [
        { name: 'Post-op Review.pdf', size: '2.8 MB', icon: '📄', downloaded: true },
        { name: 'Medication Plan.pdf', size: '1.0 MB', icon: '📄', downloaded: false }
      ],
      history: [
        { diagnosis: 'Post-op check', doctor: 'Dr. Smith', icon: '🩺' },
        { diagnosis: 'Medication review', doctor: 'Dr. Smith', icon: '💊' }
      ],
      upcomingTests: [
        { name: 'Blood Pressure Review', freq: 'Weekly', date: '24/04/26', icon: '📈', bg: '#f0f6ff' }
      ],
      visits: [
        { date: 'Apr 10, 2026', diagnosis: 'Post-op check', notes: 'Recovery stable.' },
        { date: 'Feb 18, 2026', diagnosis: 'Cardiac review', notes: 'Advised light activity.' }
      ]
    },
    {
      id: 'N-2011',
      doctorDept: 'NEURO',
      name: 'Amit Sharma',
      initials: 'AS',
      age: 45,
      gender: 'Male',
      patientId: '#83951',
      bloodGroup: 'B+',
      bmi: '25.0',
      height: '5.9 ft',
      weight: '73 kg',
      contact: '9898981111',
      vitals: [
        { name: 'Blood Sugar', value: '102', unit: 'mg/dL', status: 'Normal', icon: '🩸', bg: '#fff8f0' },
        { name: 'Heart Rate', value: '80', unit: 'BPM', status: 'Normal', icon: '❤️', bg: '#fff0f0' },
        { name: 'Blood Pressure', value: '122', unit: '/ 80 mmhg', status: 'Elevated', icon: '💧', bg: '#f0f9ff' },
        { name: 'Hemoglobin', value: '14.0', unit: 'g/dL', status: 'Normal', icon: '🧬', bg: '#fff0f5' }
      ],
      reports: [
        { name: 'MRI Brain.pdf', size: '6.2 MB', icon: '📄', downloaded: true },
        { name: 'Neuro Exam.pdf', size: '1.1 MB', icon: '📄', downloaded: false }
      ],
      history: [
        { diagnosis: 'Migraine review', doctor: 'Dr. Adams', icon: '🧠' }
      ],
      upcomingTests: [
        { name: 'EEG Test', freq: 'Monthly', date: '21/04/26', icon: '📈', bg: '#f0f6ff' }
      ],
      visits: [
        { date: 'Mar 22, 2026', diagnosis: 'Headache consult', notes: 'MRI advised.' }
      ]
    },
    {
      id: 'N-2012',
      doctorDept: 'NEURO',
      name: 'Neha Sharma',
      initials: 'NS',
      age: 39,
      gender: 'Female',
      patientId: '#83952',
      bloodGroup: 'O+',
      bmi: '23.7',
      height: '5.5 ft',
      weight: '59 kg',
      contact: '9898982222',
      vitals: [
        { name: 'Blood Sugar', value: '96', unit: 'mg/dL', status: 'Normal', icon: '🩸', bg: '#fff8f0' },
        { name: 'Heart Rate', value: '78', unit: 'BPM', status: 'Normal', icon: '❤️', bg: '#fff0f0' },
        { name: 'Blood Pressure', value: '118', unit: '/ 76 mmhg', status: 'Normal', icon: '💧', bg: '#f0f9ff' },
        { name: 'Hemoglobin', value: '13.1', unit: 'g/dL', status: 'Normal', icon: '🧬', bg: '#fff0f5' }
      ],
      reports: [
        { name: 'MRI Review.pdf', size: '3.5 MB', icon: '📄', downloaded: true },
        { name: 'Neuro Assessment.pdf', size: '1.6 MB', icon: '📄', downloaded: false }
      ],
      history: [
        { diagnosis: 'MRI review', doctor: 'Dr. Adams', icon: '🧠' },
        { diagnosis: 'Neuro assessment', doctor: 'Dr. Adams', icon: '🩺' }
      ],
      upcomingTests: [
        { name: 'Follow-up Scan', freq: 'Monthly', date: '26/04/26', icon: '📈', bg: '#f0f6ff' }
      ],
      visits: [
        { date: 'Apr 08, 2026', diagnosis: 'MRI review', notes: 'No major abnormality seen.' },
        { date: 'Feb 12, 2026', diagnosis: 'Consultation', notes: 'Headache frequency reduced.' }
      ]
    },
    {
      id: 'O-3001',
      doctorDept: 'ORTHO',
      name: 'Vikram Singh',
      initials: 'VS',
      age: 56,
      gender: 'Male',
      patientId: '#83961',
      bloodGroup: 'AB+',
      bmi: '28.2',
      height: '5.7 ft',
      weight: '81 kg',
      contact: '9765432101',
      vitals: [
        { name: 'Blood Sugar', value: '104', unit: 'mg/dL', status: 'Normal', icon: '🩸', bg: '#fff8f0' },
        { name: 'Heart Rate', value: '82', unit: 'BPM', status: 'Normal', icon: '❤️', bg: '#fff0f0' },
        { name: 'Blood Pressure', value: '128', unit: '/ 82 mmhg', status: 'Elevated', icon: '💧', bg: '#f0f9ff' },
        { name: 'Hemoglobin', value: '13.9', unit: 'g/dL', status: 'Normal', icon: '🧬', bg: '#fff0f5' }
      ],
      reports: [
        { name: 'Knee Evaluation.pdf', size: '2.7 MB', icon: '📄', downloaded: true },
        { name: 'Physio Notes.pdf', size: '1.3 MB', icon: '📄', downloaded: false }
      ],
      history: [
        { diagnosis: 'Knee pain review', doctor: 'Dr. Patel', icon: '🦴' }
      ],
      upcomingTests: [
        { name: 'Physio assessment', freq: 'Weekly', date: '25/04/26', icon: '📈', bg: '#f0f6ff' }
      ],
      visits: [
        { date: 'Mar 18, 2026', diagnosis: 'Knee pain review', notes: 'Mobility mildly restricted.' }
      ]
    },
    {
      id: 'O-3002',
      doctorDept: 'ORTHO',
      name: 'Pooja Nair',
      initials: 'PN',
      age: 34,
      gender: 'Female',
      patientId: '#83962',
      bloodGroup: 'A-',
      bmi: '22.9',
      height: '5.4 ft',
      weight: '56 kg',
      contact: '9765432102',
      vitals: [
        { name: 'Blood Sugar', value: '92', unit: 'mg/dL', status: 'Normal', icon: '🩸', bg: '#fff8f0' },
        { name: 'Heart Rate', value: '76', unit: 'BPM', status: 'Normal', icon: '❤️', bg: '#fff0f0' },
        { name: 'Blood Pressure', value: '116', unit: '/ 74 mmhg', status: 'Normal', icon: '💧', bg: '#f0f9ff' },
        { name: 'Hemoglobin', value: '12.9', unit: 'g/dL', status: 'Normal', icon: '🧬', bg: '#fff0f5' }
      ],
      reports: [
        { name: 'Fracture Follow-up.pdf', size: '4.1 MB', icon: '📄', downloaded: true },
        { name: 'X-ray Review.pdf', size: '2.4 MB', icon: '📄', downloaded: false }
      ],
      history: [
        { diagnosis: 'Fracture follow-up', doctor: 'Dr. Patel', icon: '🦴' },
        { diagnosis: 'X-ray review', doctor: 'Dr. Patel', icon: '🩻' }
      ],
      upcomingTests: [
        { name: 'X-ray check', freq: 'Monthly', date: '27/04/26', icon: '📈', bg: '#f0f6ff' }
      ],
      visits: [
        { date: 'Apr 02, 2026', diagnosis: 'Fracture follow-up', notes: 'Healing progressing well.' },
        { date: 'Feb 25, 2026', diagnosis: 'Initial review', notes: 'Brace support continued.' }
      ]
    }
  ];

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.patientId = params.get('id') || '';
      this.loadPatient();
    });
  }

  loadPatient(): void {
    const found = this.allPatients.find(p => p.id === this.patientId);

    if (found) {
      this.patient = found;
      this.vitals = found.vitals.map(v => ({ ...v }));
      this.editableVitals = found.vitals.map(v => ({ ...v }));
      this.reports = found.reports.map(r => ({ ...r }));
      this.history = found.history.map(h => ({ ...h }));
      this.upcomingTests = found.upcomingTests.map(t => ({ ...t }));
      this.visits = found.visits.map(v => ({ ...v }));
    } else {
      this.patient = {
        id: this.patientId,
        doctorDept: '',
        name: 'Patient data not available yet',
        initials: '--',
        age: 0,
        gender: '--',
        patientId: this.patientId || '--',
        bloodGroup: '--',
        bmi: '--',
        height: '--',
        weight: '--',
        contact: '--',
        vitals: [],
        reports: [],
        history: [],
        upcomingTests: [],
        visits: []
      };

      this.vitals = [];
      this.editableVitals = [];
      this.reports = [];
      this.history = [];
      this.upcomingTests = [];
      this.visits = [];
    }

    this.isEditingVitals = false;
  }

  startEditVitals(): void {
    this.editableVitals = this.vitals.map(v => ({ ...v }));
    this.isEditingVitals = true;
  }

  saveVitals(): void {
    this.vitals = this.editableVitals.map(v => ({
      ...v,
      status: this.getStatus(v.name, v.value)
    }));

    if (this.patient) {
      this.patient.vitals = this.vitals.map(v => ({ ...v }));
    }

    this.isEditingVitals = false;
  }

  cancelEdit(): void {
    this.editableVitals = this.vitals.map(v => ({ ...v }));
    this.isEditingVitals = false;
  }

  getStatus(name: string, value: string): string {
    const v = parseFloat(value);

    switch (name) {
      case 'Blood Sugar':
        if (v < 70) return 'Low';
        if (v <= 100) return 'Normal';
        if (v <= 125) return 'Pre-diabetic';
        return 'High';

      case 'Heart Rate':
        if (v < 60) return 'Low';
        if (v <= 100) return 'Normal';
        return 'High';

      case 'Blood Pressure':
        if (v < 80) return 'Low';
        if (v <= 120) return 'Normal';
        if (v <= 139) return 'Elevated';
        return 'High';

      case 'Hemoglobin':
        if (v < 12) return 'Low';
        if (v <= 17.5) return 'Normal';
        return 'High';

      default:
        return 'Normal';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Normal':
        return 'status-normal';
      case 'Low':
        return 'status-low';
      case 'Elevated':
      case 'Pre-diabetic':
      case 'High':
        return 'status-high';
      default:
        return 'status-normal';
    }
  }
}