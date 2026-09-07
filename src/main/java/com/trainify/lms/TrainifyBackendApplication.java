package com.trainify.lms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableFeignClients
@EnableCaching
@EnableAsync
public class TrainifyBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(TrainifyBackendApplication.class, args);
    }

}
