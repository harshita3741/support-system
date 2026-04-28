import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing';
import { LoginComponent } from './pages/login/login';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { AppointmentComponent } from './pages/appointment/appointment';
import { ChatbotComponent } from './pages/chatbot/chatbot';
import { RegisterComponent } from './pages/register/register';
import { ProfileComponent } from './pages/profile/profile';
import { VideoCallComponent } from './pages/video-call/video-call';
import { ChatConsultationComponent } from './pages/chat-consultation/chat-consultation';
import { SymptomsComponent } from './pages/symptoms/symptoms';
import { PrescriptionsComponent } from './pages/prescriptions/prescriptions';

export const routes: Routes = [
  { path: '',                  component: LandingComponent },
  { path: 'login',             component: LoginComponent },
  { path: 'register',          component: RegisterComponent },
  { path: 'dashboard',         component: DashboardComponent },
  { path: 'appointment',       component: AppointmentComponent },
  { path: 'chatbot',           component: ChatbotComponent },
  { path: 'profile',           component: ProfileComponent },
  { path: 'video-call',        component: VideoCallComponent },
  { path: 'chat-consultation', component: ChatConsultationComponent },
  { path: 'symptoms',          component: SymptomsComponent },
  { path: 'prescriptions',     component: PrescriptionsComponent },
  { path: 'case-history',      redirectTo: 'prescriptions' },
  { path: '**',                redirectTo: '' }
];
