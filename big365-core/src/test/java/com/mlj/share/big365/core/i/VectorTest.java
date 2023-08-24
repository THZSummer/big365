package com.mlj.share.big365.core.i;

import org.junit.Assert;
import org.junit.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.StringJoiner;

public class VectorTest {

    public static final Vector vector;
    public static final List<Coordinate> coordinateList;

    static {
        coordinateList = new ArrayList<>();
        coordinateList.add(new SimpleCoordinate(1, 34));
        coordinateList.add(new SimpleCoordinate(2, 79));
        coordinateList.add(new SimpleCoordinate(3, 86));
        coordinateList.add(new SimpleCoordinate(4, 16));
        coordinateList.add(new SimpleCoordinate(5, 37));

        vector = new SimpleVector(coordinateList, 25);
    }


    @Test
    public void test() {
        List<Vector> vectorList = vector.vectorBang();

        for (Vector vector : vectorList) {
            List<Coordinate> coordinates = vector.getCoordinates();

            StringJoiner stringJoiner = new StringJoiner(",");

            for (Coordinate coordinate : coordinates) {
                stringJoiner.add(coordinate.getDimension() + "." + coordinate.getValue());
            }

            System.out.println("(" + stringJoiner + ")=" + vector.getValue());
        }

        Assert.assertEquals(vectorList.size(), Math.floor(Math.pow(2, coordinateList.size())), 0.0);
    }
}
