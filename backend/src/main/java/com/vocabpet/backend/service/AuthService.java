package com.vocabpet.backend.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.vocabpet.backend.dto.AuthRe.AuthResponse;
import com.vocabpet.backend.dto.AuthRe.LoginRequest;
import com.vocabpet.backend.dto.AuthRe.RegisterRequest;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.enums.Role;
import com.vocabpet.backend.exception.EmailAlreadyExistsException;
import com.vocabpet.backend.exception.InvalidCredentialsException;
import com.vocabpet.backend.repository.UserRepository;
import com.vocabpet.backend.repository.RefreshTokenRepository;
import com.vocabpet.backend.entity.RefreshToken;

import lombok.RequiredArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;
        private final JwtService jwtService;
        private final RefreshTokenRepository refreshTokenRepository;

        public void register(RegisterRequest request) {

                if (userRepository.existsByEmail(request.getEmail())) {
                        throw new EmailAlreadyExistsException(
                                        "Email already exists");
                }

                User user = User.builder()
                                .email(request.getEmail())
                                .password(passwordEncoder.encode(request.getPassword()))
                                .name(request.getName())
                                .role(Role.USER)
                                .level(1)
                                .xp(0)
                                .build();

                userRepository.save(user);
        }

        @Transactional
        public AuthResponse login(LoginRequest request) {

                User user = userRepository
                                .findByEmail(request.getEmail())
                                .orElseThrow(() -> new InvalidCredentialsException(
                                                "Invalid email or password"));

                if (!passwordEncoder.matches(
                                request.getPassword(),
                                user.getPassword())) {

                        throw new InvalidCredentialsException(
                                        "Invalid email or password");
                }

                String token = jwtService.generateToken(user);
                String refreshToken = createRefreshToken(user);

                return new AuthResponse(
                                token,
                                refreshToken,
                                user.getId(),
                                user.getName(),
                                user.getEmail());
        }

        @Transactional
        public AuthResponse refresh(String refreshToken) {
                RefreshToken savedToken = refreshTokenRepository.findByToken(refreshToken)
                                .filter(token -> token.getExpiryDate().isAfter(LocalDateTime.now()))
                                .orElseThrow(() -> new InvalidCredentialsException("Session expired. Please sign in again."));

                User user = savedToken.getUser();
                return new AuthResponse(
                                jwtService.generateToken(user),
                                refreshToken,
                                user.getId(),
                                user.getName(),
                                user.getEmail());
        }

        private String createRefreshToken(User user) {
                refreshTokenRepository.deleteByUser(user);
                String token = UUID.randomUUID().toString();
                refreshTokenRepository.save(RefreshToken.builder()
                                .token(token)
                                .user(user)
                                .createdAt(LocalDateTime.now())
                                .expiryDate(LocalDateTime.now().plusDays(30))
                                .build());
                return token;
        }
}
