package com.truyenhay.backend.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class ReadingProgressDto {
    private Long novelId;
    private Integer last = -1;
    private List<Integer> read = new ArrayList<>();
}

