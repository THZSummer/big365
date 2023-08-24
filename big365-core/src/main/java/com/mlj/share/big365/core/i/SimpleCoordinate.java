package com.mlj.share.big365.core.i;

public class SimpleCoordinate implements Coordinate {

    private long dimension;

    private long value;

    public SimpleCoordinate() {
    }

    public SimpleCoordinate(long dimension, long value) {
        this.dimension = dimension;
        this.value = value;
    }

    @Override
    public long getDimension() {
        return this.dimension;
    }

    @Override
    public long getValue() {
        return this.value;
    }

    @Override
    public Coordinate getInstance(long dimension, long value) {
        return new SimpleCoordinate(dimension, value);
    }
}
