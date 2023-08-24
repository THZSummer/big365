package com.mlj.share.big365.core.i;

import java.util.List;
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

        process(coordinateTree, coordinates, 0);

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
}
