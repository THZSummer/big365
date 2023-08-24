package com.mlj.share.big365.core.i;

public interface Coordinate {

    long getDimension();

    long getValue();

    Coordinate getInstance(long dimension, long value);
}
