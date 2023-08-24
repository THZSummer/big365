package com.mlj.share.big365.core.i;

import java.util.List;

public interface Vector {

    long getValue();

    List<Coordinate> getCoordinates();

    List<Vector> vectorBang();
}
