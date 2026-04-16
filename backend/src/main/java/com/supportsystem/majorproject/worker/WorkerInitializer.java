package com.supportsystem.majorproject.worker;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Component
public class WorkerInitializer {

    @Autowired
    private CardioWorker cardioWorker;

    @Autowired
    private NeuroWorker neuroWorker;

    @Autowired
    private OrthoWorker orthoWorker;

    @PostConstruct
    public void startWorkers() {

        ExecutorService executor = Executors.newFixedThreadPool(3);

        executor.submit(cardioWorker);
        executor.submit(neuroWorker);
        executor.submit(orthoWorker);

        System.out.println("Worker threads started...");
    }
}