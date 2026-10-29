package com.nwpengdep.hrms.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    private Key key;

    @PostConstruct
    public void init() {
        key = Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateToken(String username) {

        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String generateEmployeeToken(com.nwpengdep.hrms.entity.Employee employee) {
        return Jwts.builder()
                .setSubject(String.valueOf(employee.getId()))
                .claim("identityType", "EMPLOYEE")
                .claim("credentialStamp", employeeCredentialStamp(employee))
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + Math.min(jwtExpiration, 3600000L)))
                .signWith(key, SignatureAlgorithm.HS256).compact();
    }

    public Claims extractClaims(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
    }

    // Keyed fingerprint invalidates sessions after identifier changes without putting NIC in the JWT.
    public String employeeCredentialStamp(com.nwpengdep.hrms.entity.Employee employee) {
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"));
            String value = employee.getId() + "\n" + employee.getEmployeeNo() + "\n" + employee.getNic();
            return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(
                    mac.doFinal(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException("Cannot validate employee session", e);
        }
    }

    public String extractUsername(String token) {

        Claims claims = Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();

        return claims.getSubject();
    }

    public boolean isTokenValid(String token, String username) {

        String extractedUsername = extractUsername(token);

        return extractedUsername.equals(username);
    }
}