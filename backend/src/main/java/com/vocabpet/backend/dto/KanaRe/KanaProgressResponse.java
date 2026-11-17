package com.vocabpet.backend.dto.KanaRe;

import lombok.*;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class KanaProgressResponse {
    private List<KanaSectionProgress> sections;
}
