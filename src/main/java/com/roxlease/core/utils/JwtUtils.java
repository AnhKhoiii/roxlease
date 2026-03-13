package com.roxlease.core.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.function.Function;

@Component
public class JwtUtils {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    //1. TẠO TOKEN: Dùng khi user đăng nhập thành công
    public String generateToken(String username) {
        return Jwts.builder()
                .setSubject(username) // Đặt username làm "chủ thể" của token
                .setIssuedAt(new Date(System.currentTimeMillis())) // Thời gian tạo
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration)) // Thời gian hết hạn
                .signWith(getSignInKey(), SignatureAlgorithm.HS256) // Ký tên bằng Secret Key
                .compact();
    }

    //2. LẤY USERNAME TỪ TOKEN: Dùng khi user gửi token lên để xác thực
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    // 3. KIỂM TRA TOKEN CÒN HẠN & HỢP LỆ KHÔNG
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        // Kiểm tra xem username trong token có khớp với DB không, và token còn hạn không
        return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
    }

    // KIỂM TRA THỜI GIAN HẾT HẠN
    private boolean isTokenExpired(String token) {
        try {
            return extractExpiration(token).before(new Date());
        } catch (Exception e) {
            return true; // Nếu có lỗi (token sai định dạng, bị sửa đổi...) thì coi như đã hỏng/hết hạn
        }
    }

    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    // Biến chuỗi String Secret Key thành đối tượng Key của thư viện
    private Key getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}