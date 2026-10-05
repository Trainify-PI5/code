package com.trainify.lms.services;

import org.junit.jupiter.api.Test;
import java.time.Clock;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SalesRateLimiterTest {
    @Test void limitsRequestsAndReopensAfterWindow() {
        Clock clock = mock(Clock.class);
        when(clock.millis()).thenReturn(0L);
        SalesRateLimiter limiter = new SalesRateLimiter(clock);
        for (int i = 0; i < 10; i++) assertTrue(limiter.allow("client"));
        assertFalse(limiter.allow("client"));
        assertTrue(limiter.allow("another-client"));
        when(clock.millis()).thenReturn(60_000L);
        assertTrue(limiter.allow("client"));
    }
}
