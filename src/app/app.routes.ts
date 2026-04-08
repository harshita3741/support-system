import { Routes } from "@angular/router";
import { LandingComponent } from "./pages/landing/landing";
import { LoginComponent } from "./pages/login/login";
import { DashboardComponent } from "./pages/dashboard/dashboard";
import { AppointmentComponent } from "./pages/appointment/appointment";
import { ChatbotComponent } from "./pages/chatbot/chatbot";
import { RegisterComponent } from "./pages/register/register";

export const routes: Routes = [
  { path: "", component: LandingComponent },
  { path: "login", component: LoginComponent },
  { path: "register", component: RegisterComponent },
  { path: "dashboard", component: DashboardComponent },
  { path: "appointment", component: AppointmentComponent },
  { path: "chatbot", component: ChatbotComponent }
];
