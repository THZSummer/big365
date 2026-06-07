package org.big365.api.dimension;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface DimensionMapper {

    Dimension findById(@Param("tableName") String tableName, @Param("id") Long id);

    int countByColumnName(@Param("tableName") String tableName, @Param("columnName") String columnName);

    int insert(@Param("tableName") String tableName, @Param("dim") Dimension dim);

    int update(@Param("tableName") String tableName, @Param("dim") Dimension dim);

    int disable(@Param("tableName") String tableName, @Param("id") Long id);

    List<Dimension> listByBizName(@Param("tableName") String tableName,
                                  @Param("offset") int offset,
                                  @Param("limit") int limit);

    long countByBizName(@Param("tableName") String tableName);
}
