import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-queue',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './queue.html',
  styleUrl: './queue.css'
})
export class Queue {
  queueItems = [
    { initials: 'RK', name: 'Rohan Kapoor', age: 34, gender: 'Male', symptoms: 'Chest tightness, breathlessness', priority: 'High', wait: '8 min', bg: '#fef2f2', color: '#b91c1c' },
    { initials: 'NS', name: 'Neha Sharma', age: 28, gender: 'Female', symptoms: 'Palpitations, dizziness', priority: 'Medium', wait: '15 min', bg: '#eff6ff', color: '#1d4ed8' },
    { initials: 'AV', name: 'Arjun Verma', age: 45, gender: 'Male', symptoms: 'Fatigue, mild breathlessness', priority: 'Low', wait: '22 min', bg: '#f0fdf4', color: '#15803d' }
  ];

  getPriorityClass(p: string) {
    if (p === 'High') return 'prio-high';
    if (p === 'Low') return 'prio-low';
    return 'prio-medium';
  }

  getWaitClass(p: string) {
    if (p === 'High') return 'wait-high';
    if (p === 'Medium') return 'wait-medium';
    return 'wait-low';
  }
}