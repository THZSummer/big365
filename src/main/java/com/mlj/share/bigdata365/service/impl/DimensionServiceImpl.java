package com.mlj.share.bigdata365.service.impl;

import com.mlj.share.bigdata365.bean.Coordinate;
import com.mlj.share.bigdata365.bean.Dimension;
import com.mlj.share.bigdata365.bean.DimensionEnum;
import com.mlj.share.bigdata365.mapper.DimensionMapper;
import com.mlj.share.bigdata365.service.DimensionServiceI;
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

    @Override
    public Coordinate parseFromString(DimensionEnum dimensionEnum, String val) {
        return null;
    }

    // ------------------------------------------------- @Autowired ----------------------------------------------------
    @Autowired
    public void setDimensionMapper(DimensionMapper dimensionMapper) {
        this.dimensionMapper = dimensionMapper;
    }
}
