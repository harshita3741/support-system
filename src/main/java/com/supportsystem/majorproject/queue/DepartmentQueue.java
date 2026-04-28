package com.supportsystem.majorproject.queue;

import com.supportsystem.majorproject.model.MedicalCase;
import org.springframework.stereotype.Component;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

@Component
public class DepartmentQueue {

  private BlockingQueue<MedicalCase> cardioQueue   = new LinkedBlockingQueue<>();
  private BlockingQueue<MedicalCase> neuroQueue    = new LinkedBlockingQueue<>();
  private BlockingQueue<MedicalCase> orthoQueue    = new LinkedBlockingQueue<>();
  private BlockingQueue<MedicalCase> generalQueue  = new LinkedBlockingQueue<>();

  public void addCase(MedicalCase medicalCase) {
    switch (medicalCase.getDepartment()) {
      case "CARDIO":   cardioQueue.add(medicalCase);  break;
      case "NEURO":    neuroQueue.add(medicalCase);   break;
      case "ORTHO":    orthoQueue.add(medicalCase);   break;
      default:         generalQueue.add(medicalCase); break; // GENERAL + fallback
    }
  }

  public MedicalCase getCardioCase()   throws InterruptedException { return cardioQueue.take();  }
  public MedicalCase getNeuroCase()    throws InterruptedException { return neuroQueue.take();   }
  public MedicalCase getOrthoCase()    throws InterruptedException { return orthoQueue.take();   }
  public MedicalCase getGeneralCase()  throws InterruptedException { return generalQueue.take(); }
}
