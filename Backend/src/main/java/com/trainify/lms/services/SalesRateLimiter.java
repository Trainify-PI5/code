package com.trainify.lms.services;

import org.springframework.stereotype.Component;
import java.time.Clock;
import java.util.HashMap;
import java.util.Map;

@Component
public class SalesRateLimiter {
    private record Window(long start, int count) {}
    private final Map<String, Window> windows = new HashMap<>();
    private final Clock clock;

    public SalesRateLimiter() { this(Clock.systemUTC()); }
    SalesRateLimiter(Clock clock) { this.clock = clock; }

    public synchronized boolean allow(String address) {
        long now = clock.millis();
        windows.entrySet().removeIf(entry -> now - entry.getValue().start() >= 60_000);
        Window window = windows.get(address);
        if (window == null) {
            if (windows.size() >= 10_000) return false;
            windows.put(address, new Window(now, 1));
            return true;
        }
        if (window.count() >= 10) return false;
        windows.put(address, new Window(window.start(), window.count() + 1));
        return true;
    }
}
