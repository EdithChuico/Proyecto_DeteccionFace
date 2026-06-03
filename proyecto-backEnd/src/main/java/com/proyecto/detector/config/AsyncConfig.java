package com.proyecto.detector.config;

import java.util.concurrent.Executor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "iaTaskExecutor")
    public Executor iaTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5); // 5 hilos trabajando al mismo tiempo
        executor.setMaxPoolSize(10); // Máximo 10 si hay pico de empleados a las 8 AM
        executor.setQueueCapacity(50); // Cola de espera
        executor.setThreadNamePrefix("IA-Thread-");
        executor.initialize();
        return executor;
    }
}
