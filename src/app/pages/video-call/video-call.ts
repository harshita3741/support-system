import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { AuthService } from "../../core/auth";

@Component({
  selector: "app-video-call",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./video-call.html",
  styleUrls: ["./video-call.css"]
})
export class VideoCallComponent implements OnInit {
  doctorName = "Dr. Adams";
  department = "Neurology";
  patientName = "";
  callStatus = "connecting";
  callDuration = 0;
  timer: any;

  constructor(private auth: AuthService) {}

  ngOnInit() {
    this.patientName = this.auth.getPatientName();
    setTimeout(() => {
      this.callStatus = "connected";
      this.timer = setInterval(() => { this.callDuration++; }, 1000);
    }, 2000);
  }

  getCallTime(): string {
    const m = Math.floor(this.callDuration / 60).toString().padStart(2, "0");
    const s = (this.callDuration % 60).toString().padStart(2, "0");
    return m + ":" + s;
  }

  endCall() {
    clearInterval(this.timer);
    this.callStatus = "ended";
  }
}
