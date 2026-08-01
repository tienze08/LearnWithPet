package com.vocabpet.backend.dto.AuthRe;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;

    private String refreshToken;

    private Long id;

    private String name;

    private String email;

}
