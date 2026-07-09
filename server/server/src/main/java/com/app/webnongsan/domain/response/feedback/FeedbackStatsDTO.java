package com.app.webnongsan.domain.response.feedback;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class FeedbackStatsDTO {
    private double avgRating;
    private long totalFeedbacks;
    private long hiddenCount;
    private List<RatingCountDTO> ratingDistribution;
}
