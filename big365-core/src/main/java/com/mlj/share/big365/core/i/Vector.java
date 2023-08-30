package com.mlj.share.big365.core.i;

import java.util.List;
import java.util.function.Consumer;

public interface Vector {

    long getValue();

    List<Coordinate> getCoordinates();

    List<Vector> vectorBang();

    void vectorBang(Consumer<Vector> consumer);

    void vectorBangPro(Consumer<Vector> consumer);
}
