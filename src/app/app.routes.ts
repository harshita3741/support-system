import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { Patients } from './pages/patients/patients';
import { PatientMonitor } from './pages/patient-monitor/patient-monitor';
import { Schedule } from './pages/schedule/schedule';
import { Queue } from './pages/queue/queue';
import { IncomingCall } from './pages/incoming-call/incoming-call';
import { Settings } from './pages/settings/settings';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'patients', component: Patients, canActivate: [authGuard] },
  { path: 'monitor', component: PatientMonitor, canActivate: [authGuard] },
  { path: 'schedule', component: Schedule, canActivate: [authGuard] },
  { path: 'queue', component: Queue, canActivate: [authGuard] },
  { path: 'call', component: IncomingCall, canActivate: [authGuard] },
  { path: 'settings', component: Settings, canActivate: [authGuard] }
];