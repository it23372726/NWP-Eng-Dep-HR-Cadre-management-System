package com.nwpengdep.hrms.audit;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuditContext {

    private String ipAddress;
    private String userAgent;
    private String clientHost;
    private String correlationId;
    private String sessionId;
    private String httpMethod;
    private String requestPath;
}
