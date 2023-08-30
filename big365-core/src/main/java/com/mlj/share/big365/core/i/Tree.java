package com.mlj.share.big365.core.i;

import java.util.List;
import java.util.function.Consumer;

public interface Tree<T> {

    Tree<T> getTree();

    T get();

    Tree<T> getLeftTree();

    T getLeft();

    Tree<T> getRightTree();

    T getRight();

    void set(T t);

    void setLeft(T t);

    void setRight(T t);

    List<List<T>> tileTree();

    void taleTree(Consumer<List<T>> consumer);
}
