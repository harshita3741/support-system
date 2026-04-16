import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-symptoms',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './symptoms.html',
  styleUrls: ['./symptoms.css']
})
export class SymptomsComponent {}
