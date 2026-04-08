IF NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Smith')
    INSERT INTO doctors (name, specialty, available, active_cases) VALUES ('Dr. Smith', 'CARDIO', 1, 0);

IF NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Adams')
    INSERT INTO doctors (name, specialty, available, active_cases) VALUES ('Dr. Adams', 'NEURO', 1, 0);

IF NOT EXISTS (SELECT 1 FROM doctors WHERE name = 'Dr. Lee')
    INSERT INTO doctors (name, specialty, available, active_cases) VALUES ('Dr. Lee', 'ORTHO', 1, 0);

IF NOT EXISTS (SELECT 1 FROM appointment_slots WHERE doctor_id = 1 AND slot_time = '2026-06-01 09:00:00')
    INSERT INTO appointment_slots (doctor_id, slot_time, booked) VALUES (1, '2026-06-01 09:00:00', 0);

IF NOT EXISTS (SELECT 1 FROM appointment_slots WHERE doctor_id = 1 AND slot_time = '2026-06-01 10:00:00')
    INSERT INTO appointment_slots (doctor_id, slot_time, booked) VALUES (1, '2026-06-01 10:00:00', 0);

IF NOT EXISTS (SELECT 1 FROM appointment_slots WHERE doctor_id = 1 AND slot_time = '2026-06-01 11:00:00')
    INSERT INTO appointment_slots (doctor_id, slot_time, booked) VALUES (1, '2026-06-01 11:00:00', 0);

IF NOT EXISTS (SELECT 1 FROM appointment_slots WHERE doctor_id = 2 AND slot_time = '2026-06-01 09:00:00')
    INSERT INTO appointment_slots (doctor_id, slot_time, booked) VALUES (2, '2026-06-01 09:00:00', 0);

IF NOT EXISTS (SELECT 1 FROM appointment_slots WHERE doctor_id = 2 AND slot_time = '2026-06-01 10:00:00')
    INSERT INTO appointment_slots (doctor_id, slot_time, booked) VALUES (2, '2026-06-01 10:00:00', 0);

IF NOT EXISTS (SELECT 1 FROM appointment_slots WHERE doctor_id = 3 AND slot_time = '2026-06-01 09:00:00')
    INSERT INTO appointment_slots (doctor_id, slot_time, booked) VALUES (3, '2026-06-01 09:00:00', 0);

IF NOT EXISTS (SELECT 1 FROM appointment_slots WHERE doctor_id = 3 AND slot_time = '2026-06-01 11:00:00')
    INSERT INTO appointment_slots (doctor_id, slot_time, booked) VALUES (3, '2026-06-01 11:00:00', 0);
