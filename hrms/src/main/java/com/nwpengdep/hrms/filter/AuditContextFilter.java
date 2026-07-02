package com.nwpengdep.hrms.filter;

import com.nwpengdep.hrms.audit.AuditContext;
import com.nwpengdep.hrms.audit.AuditContextHolder;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class AuditContextFilter extends OncePerRequestFilter {

    private static final String CORRELATION_HEADER = "X-Correlation-Id";
    private static final String CLIENT_HOST_HEADER = "X-Client-Host";
    private static final String SESSION_HEADER = "X-Session-Id";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            String correlationId = request.getHeader(CORRELATION_HEADER);
            if (correlationId == null || correlationId.isBlank()) {
                correlationId = UUID.randomUUID().toString();
            }

            AuditContext context = AuditContext.builder()
                    .ipAddress(resolveClientIp(request))
                    .userAgent(trimToLength(request.getHeader("User-Agent"), 512))
                    .clientHost(trimToLength(request.getHeader(CLIENT_HOST_HEADER), 255))
                    .correlationId(correlationId)
                    .sessionId(trimToLength(request.getHeader(SESSION_HEADER), 64))
                    .httpMethod(request.getMethod())
                    .requestPath(request.getRequestURI())
                    .build();

            AuditContextHolder.set(context);
            response.setHeader(CORRELATION_HEADER, correlationId);
            filterChain.doFilter(request, response);
        } finally {
            AuditContextHolder.clear();
        }
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String trimToLength(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
