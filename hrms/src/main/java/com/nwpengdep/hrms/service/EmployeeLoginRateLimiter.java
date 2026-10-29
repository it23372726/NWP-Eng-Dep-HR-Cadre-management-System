package com.nwpengdep.hrms.service;

import org.springframework.stereotype.Component;
import java.time.Clock;
import java.util.HashMap;
import java.util.Map;

/** Bounded, per-instance limits. Never stores NIC/password values. */
@Component
public class EmployeeLoginRateLimiter {
    private static final long WINDOW = 15 * 60 * 1000L;
    private final Map<String, Window> attempts = new HashMap<>();
    private final Clock clock;
    public EmployeeLoginRateLimiter() { this(Clock.systemUTC()); }
    EmployeeLoginRateLimiter(Clock clock) { this.clock = clock; }
    private record Window(long start, int count) {}

    public synchronized boolean allow(String employeeNo, String address) {
        long now = clock.millis();
        attempts.entrySet().removeIf(e -> now - e.getValue().start() >= WINDOW);
        // The account limit also covers distributed guessing; IP limit covers account enumeration.
        return increment("account:" + employeeNo.toUpperCase(java.util.Locale.ROOT), 10, now)
                && increment("address:" + address, 100, now);
    }
    private boolean increment(String key, int limit, long now) {
        Window window = attempts.get(key);
        if (window == null) {
            if (attempts.size() >= 10000) return false;
            window = new Window(now, 0);
        }
        if (window.count() >= limit) return false;
        attempts.put(key, new Window(window.start(), window.count() + 1));
        return true;
    }
}
