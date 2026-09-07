package com.trainify.lms.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.function.Function;

@Component
public class JwtUtil {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms}")
    private long jwtExpirationMs;

    @Value("${app.jwt.refresh-expiration-ms:604800000}")
    private long jwtRefreshExpirationMs;

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(CustomUserDetails userDetails) {
        return buildToken(userDetails, jwtExpirationMs);
    }

    public String generateRefreshToken(CustomUserDetails userDetails) {
        return buildToken(userDetails, jwtRefreshExpirationMs);
    }

    private String buildToken(CustomUserDetails userDetails, long expirationMs) {
        return Jwts.builder()
                .id(java.util.UUID.randomUUID().toString())
                .subject(userDetails.getUsername())
                .claim("tenant_id", userDetails.getTenantId().toString())
                .claim("user_id", userDetails.getId().toString())
                .claim("role", userDetails.getAuthorities().iterator().next().getAuthority())
                .claim("name", userDetails.getName())
                .claim("avatar", userDetails.getAvatar())
                .issuedAt(new Date())
                .expiration(new Date((new Date()).getTime() + expirationMs))
                .signWith(getSigningKey(), Jwts.SIG.HS256)
                .compact();
    }

    public String extractJti(String token) {
        return extractClaim(token, Claims::getId);
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public String extractTenantId(String token) {
        return extractAllClaims(token).get("tenant_id", String.class);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }
}
