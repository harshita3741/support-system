import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings {
  name = 'Dr. Smith';
  specialization = 'Cardiologist';
  caseAlerts = true;
  scheduleReminder = true;
  emailSummaries = false;
}