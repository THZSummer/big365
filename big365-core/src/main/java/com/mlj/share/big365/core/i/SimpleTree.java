package com.mlj.share.big365.core.i;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.function.Consumer;

public class SimpleTree<E> implements Tree<E> {

    E element;
    SimpleTree<E> left;
    SimpleTree<E> right;

    public SimpleTree() {
    }

    public SimpleTree(E element) {
        this.element = element;
    }

    @Override
    public Tree<E> getTree() {
        return  this;
    }

    @Override
    public E get() {
        return this.element;
    }

    @Override
    public Tree<E> getLeftTree() {
        return this.left;
    }

    @Override
    public E getLeft() {
        return this.left.element;
    }

    @Override
    public Tree<E> getRightTree() {
        return this.right;
    }

    @Override
    public E getRight() {
        return this.right.element;
    }

    @Override
    public void set(E e) {
        this.element = e;
    }

    @Override
    public void setLeft(E e) {
        this.left = new SimpleTree<>(e);
    }

    @Override
    public void setRight(E e) {
        this.right = new SimpleTree<>(e);
    }

    @Override
    public List<List<E>> tileTree() {
        return this.doTileTree();
    }

    private List<List<E>> doTileTree() {
        List<List<E>> listList = new ArrayList<>();


        if (null == this.left && null == this.right) {
            if (null == this.element) {
                return new ArrayList<>();
            } else {
                List<E> eList = new ArrayList<>();
                eList.add(this.element);
                return Collections.singletonList(eList);
            }
        }

        List<List<E>> leftList;
        if (null != this.left) {
            leftList = this.left.doTileTree();
            for (List<E> list : leftList) {
                if (null != this.element) {
                    list.add(0, this.element);
                }
                listList.add(list);
            }
        }

        List<List<E>> rightList;

        if (null != this.right) {
            rightList = this.right.doTileTree();
            for (List<E> list : rightList) {
                if (null != this.element) {
                    list.add(0, this.element);
                }
                listList.add(list);
            }
        }

        return listList;
    }


    @Override
    public void taleTree(Consumer<List<E>> consumer) {
        this.doTileTrees(Collections.emptyList(), consumer);
    }

    private void doTileTrees(List<E> prevList, Consumer<List<E>> consumer) {

        List<E> leftList = new ArrayList<>(prevList);
        if (null != this.left) {
            leftList.add(this.left.element);
            this.left.doTileTrees(leftList, consumer);
        } else {
            consumer.accept(leftList);
        }

        List<E> rightList = new ArrayList<>(prevList);

        if (null != this.right) {
            rightList.add(this.right.element);
            this.right.doTileTrees(rightList, consumer);
        }
    }
}
