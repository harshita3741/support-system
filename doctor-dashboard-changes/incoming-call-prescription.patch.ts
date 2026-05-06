/**
 * PRESCRIPTION FOLLOW-UP CHANGES FOR incoming-call.ts
 * =====================================================
 * Apply these 3 changes to your incoming-call.ts file.
 *
 * CHANGE 1 — Add followUpTime to the prescription object (around line 93):
 *
 *   prescription = {
 *     diagnosis: '',
 *     advice: '',
 *     investigations: '',
 *     followUpDate: '',
 *     followUpTime: '',      // ← ADD THIS LINE
 *     duration: ''
 *   };
 *
 *
 * CHANGE 2 — Add the followUpAppointment result field (near other class properties):
 *
 *   followUpAppointmentResult: any = null;   // ← ADD THIS
 *   followUpBookingError = '';               // ← ADD THIS
 *
 *
 * CHANGE 3 — Replace the entire savePrescription() method with the one below.
 */

// ── CHANGE 3: Replacement savePrescription() ─────────────────────────────────

savePrescription_REPLACEMENT() {
  const doctor = this.getDoctorSession();
  const date = new Date().toLocaleDateString('en-IN');

  // Combine followUpDate + followUpTime into "YYYY-MM-DDTHH:MM" so the backend
  // auto-books the follow-up appointment.
  let combinedFollowUp = this.prescription.followUpDate || '';
  if (combinedFollowUp && (this as any).prescription.followUpTime) {
    // Convert "09:00 AM" → "09:00"  (strip AM/PM, convert to 24-hour)
    const slot = (this as any).prescription.followUpTime as string;
    const toHHMM = (s: string): string => {
      const [hm, ampm] = s.split(' ');
      let [hh, mm] = hm.split(':').map(Number);
      if (ampm === 'PM' && hh !== 12) hh += 12;
      if (ampm === 'AM' && hh === 12) hh = 0;
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    };
    combinedFollowUp = `${combinedFollowUp}T${toHHMM(slot)}`;
  }

  const payload = {
    caseId:      (this as any).patient?.caseId || null,
    doctorId:    doctor.id,
    doctorName:  (this as any).getDoctorName(),
    department:  doctor.dept || (this as any).patient?.dept || 'General',
    patientName: (this as any).patient?.name || (this as any).patient?.patientName || '',
    patientId:   (this as any).patient?.patientId || (this as any).patient?.id || '',
    symptoms:    (this as any).patient?.symptoms || '',
    diagnosis:   (this as any).prescription.diagnosis,
    medicines:   JSON.stringify((this as any).medicines),
    investigations: (this as any).prescription.investigations,
    advice:      (this as any).prescription.advice,
    followUpDate: combinedFollowUp,
    createdAt:   new Date().toISOString()
  };

  (this as any).http.post(`${(this as any).baseUrl}/prescriptions`, payload).subscribe({
    next: (res: any) => {
      // res.followUpAppointment is populated when the backend auto-booked it
      if (res?.followUpAppointment?.id) {
        (this as any).followUpAppointmentResult = res.followUpAppointment;
        (this as any).followUpBookingError = '';
      } else if (combinedFollowUp.includes('T') && !res?.followUpAppointment?.id) {
        (this as any).followUpBookingError = 'Follow-up date saved, but appointment could not be auto-booked. Please add it manually.';
      }
      (this as any).generatePDF(payload, date);
    },
    error: () => (this as any).generatePDF(payload, date)
  });
}
