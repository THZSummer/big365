package com.mlj.share.big365.example.service;

import com.mlj.share.big365.example.vo.Dimension;

import java.util.List;

public interface DimensionServiceI {
    int create(Dimension dimension);

    int remove(Dimension dimension);

    int removeByPid(String pid);

    int modified(Dimension dimension);

    Dimension find(Dimension dimension);

    Dimension findByPid(String pid);

    List<Dimension> findList(Dimension dimension);

}
