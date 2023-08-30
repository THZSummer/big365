package com.mlj.share.big365.core.i;

import org.junit.Assert;
import org.junit.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

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
        coordinateList.add(new SimpleCoordinate(6, 23));
        coordinateList.add(new SimpleCoordinate(7, 96));
        coordinateList.add(new SimpleCoordinate(8, 15));
        coordinateList.add(new SimpleCoordinate(9, 61));
        coordinateList.add(new SimpleCoordinate(10, 47));
//        coordinateList.add(new SimpleCoordinate(11, 34));
//        coordinateList.add(new SimpleCoordinate(12, 79));
//        coordinateList.add(new SimpleCoordinate(13, 86));
//        coordinateList.add(new SimpleCoordinate(14, 16));
//        coordinateList.add(new SimpleCoordinate(15, 37));
//        coordinateList.add(new SimpleCoordinate(16, 23));
//        coordinateList.add(new SimpleCoordinate(17, 96));
//        coordinateList.add(new SimpleCoordinate(18, 15));
//        coordinateList.add(new SimpleCoordinate(19, 61));
//        coordinateList.add(new SimpleCoordinate(20, 47));
//        coordinateList.add(new SimpleCoordinate(21, 34));
//        coordinateList.add(new SimpleCoordinate(22, 79));
//        coordinateList.add(new SimpleCoordinate(23, 86));
//        coordinateList.add(new SimpleCoordinate(24, 16));
//        coordinateList.add(new SimpleCoordinate(25, 37));
//        coordinateList.add(new SimpleCoordinate(26, 23));
//        coordinateList.add(new SimpleCoordinate(27, 96));
//        coordinateList.add(new SimpleCoordinate(28, 15));
//        coordinateList.add(new SimpleCoordinate(29, 61));
//        coordinateList.add(new SimpleCoordinate(30, 47));

        vector = new SimpleVector(coordinateList, 25);
    }


    @Test
    public void testVectorBang() {
        // 1920ms
        List<Vector> vectorList = vector.vectorBang();
        AtomicLong count = new AtomicLong();

        // 1220MB
        for (Vector vector : vectorList) {
            count.getAndIncrement();
//            System.out.println(vector.toString());
        }

        Assert.assertEquals(Math.floor(Math.pow(2, coordinateList.size())), count.get(), 0.0);
    }

    @Test
    public void testVectorBangs() {
        AtomicLong count = new AtomicLong();
        // 227ms
        vector.vectorBang(vector -> {
            count.getAndIncrement();
//            System.out.println(vector.toString());
        });
        Assert.assertEquals(Math.floor(Math.pow(2, coordinateList.size())), count.get(), 0.0);
    }

    @Test
    public void testVectorBangPro() {
        AtomicLong count = new AtomicLong();
        // 119ms
        vector.vectorBangPro(vector -> {
            count.getAndIncrement();
            System.out.println(vector.toString());
        });
        Assert.assertEquals(Math.floor(Math.pow(2, coordinateList.size())), count.get(), 0.0);
    }
}
