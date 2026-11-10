package com.trainify.lms.ai;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/** Liga a leitura de {@link IaProperties}. O cliente da Groq vem do Spring AI (ver application.yml). */
@Configuration
@EnableConfigurationProperties(IaProperties.class)
public class IaConfig {
}
