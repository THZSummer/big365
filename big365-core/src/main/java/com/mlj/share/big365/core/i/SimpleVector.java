package com.mlj.share.big365.core.i;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.StringJoiner;
import java.util.function.Consumer;
import java.util.stream.Collectors;

public class SimpleVector implements Vector {

    private final List<Coordinate> coordinates;

    private final long value;

    public SimpleVector(List<Coordinate> coordinates, long value) {
        this.coordinates = coordinates;
        this.value = value;
    }


    @Override
    public long getValue() {
        return this.value;
    }

    @Override
    public List<Coordinate> getCoordinates() {
        return this.coordinates;
    }

    @Override
    public List<Vector> vectorBang() {
        Tree<Coordinate> coordinateTree = new SimpleTree<>();

        Coordinate[] coordinates = this.coordinates.toArray(new Coordinate[0]);

        // 118MB
        this.process(coordinateTree, coordinates, 0);

        // 401MB
        List<List<Coordinate>> lists = coordinateTree.tileTree();

        return lists.stream().map(list -> new SimpleVector(list, this.value)).collect(Collectors.toList());
    }

    private void process(Tree<Coordinate> tree, Coordinate[] coordinates, int index) {
        if (index < coordinates.length) {
            Coordinate coordinate = coordinates[index];
            tree.setLeft(coordinate);
            tree.setRight(coordinate.getInstance(coordinate.getDimension(), 0));
            index++;
            process(tree.getLeftTree(), coordinates, index);
            process(tree.getRightTree(), coordinates, index);
        }
    }

    @Override
    public void vectorBang(Consumer<Vector> consumer) {
        Tree<Coordinate> coordinateTree = new SimpleTree<>();

        Coordinate[] coordinates = this.coordinates.toArray(new Coordinate[0]);

        // 118MB
        this.process(coordinateTree, coordinates, 0);

        coordinateTree.taleTree(list -> consumer.accept(new SimpleVector(list, SimpleVector.this.value)));
    }

    @Override
    public void vectorBangPro(Consumer<Vector> consumer) {
        Coordinate[] coordinates = this.coordinates.toArray(new Coordinate[0]);

        this.bangBang(Collections.emptyList(), 0, coordinates, list -> consumer.accept(new SimpleVector(list, SimpleVector.this.value)));
    }

    private void bangBang(List<Coordinate> prevList, int index, Coordinate[] coordinates, Consumer<List<Coordinate>> consumer) {
        if (index < coordinates.length) {

            List<Coordinate> leftList = new ArrayList<>(prevList);

            leftList.add(coordinates[index]);
            this.bangBang(leftList, index + 1, coordinates, consumer);

            List<Coordinate> rightList = new ArrayList<>(prevList);
            rightList.add(new SimpleCoordinate(coordinates[index].getDimension(), 0));
            this.bangBang(rightList, index + 1, coordinates, consumer);
        } else {
            consumer.accept(prevList);
        }
    }

    @Override
    public String toString() {
        StringJoiner stringJoiner = new StringJoiner(",");

        for (Coordinate coordinate : this.coordinates) {
            stringJoiner.add(coordinate.getDimension() + "." + coordinate.getValue());
        }

        return "(" + stringJoiner + ")=" + this.value;
    }
}
