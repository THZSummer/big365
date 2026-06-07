package org.big365.api.demo;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface DemoJobMapper {

    int insert(@Param("tableName") String tableName, @Param("job") DemoGenerationJob job);

    DemoGenerationJob findByJobId(@Param("tableName") String tableName, @Param("jobId") String jobId);

    int updateStatus(@Param("tableName") String tableName,
                     @Param("jobId") String jobId,
                     @Param("status") String status,
                     @Param("progress") int progress,
                     @Param("errorMessage") String errorMessage);

    int complete(@Param("tableName") String tableName,
                 @Param("jobId") String jobId,
                 @Param("totalRows") Long totalRows,
                 @Param("summary") String summary);
}
