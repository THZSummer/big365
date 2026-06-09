package org.big365.api.demo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.big365.api.model.Coordinate;
import org.big365.api.model.DimensionConcept;
import org.big365.api.model.Vector;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Slf4j
@Component
@RequiredArgsConstructor
public class DemoDataGenerator {

    private static final DateTimeFormatter DTF = DateTimeFormatter.ofPattern("yyyyMMdd");

    /**
     * Create generation parameters based on scale and date range.
     * The dimension list is used to inform parameter defaults (e.g., appCount).
     */
    public DemoDataParameters createParameters(String scale,
                                                org.big365.api.dto.DateRange dateRange,
                                                List<DimensionConcept> dimensions) {
        DemoDataParameters params = DemoDataParameters.defaultsFor(scale, dateRange);

        // Adjust appCount/endpointCount based on actual dimension leaf ranges if available
        if (dimensions != null && !dimensions.isEmpty()) {
            int i = 0;
            for (DimensionConcept dim : dimensions) {
                int range = dim.getLeafMax() - dim.getLeafMin() + 1;
                if (i == 0) {
                    params.setAppCount(Math.min(range, params.getAppCount()));
                } else if (i == 1) {
                    params.setEndpointCount(Math.min(range, params.getEndpointCount()));
                }
                i++;
            }
        }
        return params;
    }

    /**
     * Generate a batch of random data vectors.
     * Each vector has random coordinates within dimension leaf ranges,
     * a random date within the date range, and a random metric value.
     *
     * @param count      number of vectors to generate in this batch
     * @param params     generation parameters
     * @param dimensions dimension definitions (ordered)
     * @return list of generated vectors
     */
    public List<Vector> generateBatch(int count,
                                       DemoDataParameters params,
                                       List<DimensionConcept> dimensions) {
        List<Vector> vectors = new ArrayList<>(count);
        Random rng = new Random();

        // Parse date range
        LocalDate fromDate = LocalDate.parse(params.getDateRange().getFrom(), DTF);
        LocalDate toDate = LocalDate.parse(params.getDateRange().getTo(), DTF);
        long fromEpoch = fromDate.toEpochDay();
        long toEpoch = toDate.toEpochDay();
        long dayRange = toEpoch - fromEpoch + 1;

        // Discrete status codes for realistic log analysis demo (FR-V2-003)
        final int[] STATUS_CODES = {200, 404, 500};

        for (int i = 0; i < count; i++) {
            List<Coordinate> coordinates = new ArrayList<>(dimensions.size());
            for (DimensionConcept dim : dimensions) {
                int val;
                if ("statusCode".equals(dim.getColumnName())) {
                    val = STATUS_CODES[rng.nextInt(STATUS_CODES.length)];
                } else {
                    val = dim.getLeafMin() + rng.nextInt(dim.getLeafMax() - dim.getLeafMin() + 1);
                }
                coordinates.add(new Coordinate(dim.getColumnName(), val));
            }

            // Random date within range
            String date = DTF.format(LocalDate.ofEpochDay(fromEpoch + rng.nextLong(dayRange)));

            // Random metric value (1 ~ 1000)
            long value = 1 + rng.nextLong(1001);

            vectors.add(Vector.builder()
                    .coordinates(coordinates)
                    .date(date)
                    .value(value)
                    .build());
        }
        return vectors;
    }

    /**
     * Generate all data for a given parameter set.
     * Internally delegates to generateBatch() in batchSize chunks.
     *
     * @param params     generation parameters
     * @param dimensions dimension definitions
     * @param callback   called with each batch and progress (0.0~1.0); return false to abort
     */
    public void generateAll(DemoDataParameters params,
                            List<DimensionConcept> dimensions,
                            BatchCallback callback) {
        int totalRows = params.getTotalRows();
        int batchSize = params.getBatchSize();
        int remaining = totalRows;

        while (remaining > 0) {
            int count = Math.min(batchSize, remaining);
            List<Vector> batch = generateBatch(count, params, dimensions);

            double progress = (double) (totalRows - remaining + count) / totalRows;
            boolean shouldContinue = callback.onBatch(batch, progress);
            if (!shouldContinue) {
                log.warn("Generation aborted by callback at {}/{} rows", totalRows - remaining, totalRows);
                break;
            }
            remaining -= count;
        }
    }

    /**
     * Callback interface for batch generation.
     */
    @FunctionalInterface
    public interface BatchCallback {
        /**
         * Called with a batch of generated vectors and current progress (0.0~1.0).
         * @return true to continue, false to abort
         */
        boolean onBatch(List<Vector> batch, double progress);
    }
}
