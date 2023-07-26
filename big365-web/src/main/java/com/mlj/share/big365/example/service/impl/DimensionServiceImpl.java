package com.mlj.share.big365.example.service.impl;

import com.mlj.share.big365.example.vo.Dimension;
import com.mlj.share.big365.example.mapper.DimensionMapper;
import com.mlj.share.big365.example.service.DimensionServiceI;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DimensionServiceImpl implements DimensionServiceI {
    // --------------------------------------------------- filed -------------------------------------------------------
    DimensionMapper dimensionMapper;


    // --------------------------------------------------- method ------------------------------------------------------
    @Override
    public int create(Dimension dimension) {
        return dimensionMapper.insert(dimension);
    }

    @Override
    public int remove(Dimension dimension) {
        return dimensionMapper.delete(dimension);
    }

    @Override
    public int removeByPid(String pid) {
        return dimensionMapper.deleteByPid(pid);
    }

    @Override
    public int modified(Dimension dimension) {
        return dimensionMapper.update(dimension);
    }

    @Override
    public Dimension find(Dimension dimension) {
        return dimensionMapper.select(dimension);
    }

    @Override
    public Dimension findByPid(String pid) {
        return dimensionMapper.selectByPid(pid);
    }

    @Override
    public List<Dimension> findList(Dimension dimension) {
        return dimensionMapper.selectList(dimension);
    }

    // ------------------------------------------------- @Autowired ----------------------------------------------------
    @Autowired
    public void setDimensionMapper(DimensionMapper dimensionMapper) {
        this.dimensionMapper = dimensionMapper;
    }
}
