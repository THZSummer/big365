package com.mlj.share.bigdata365.schedule;

import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Date;

@Component
@EnableScheduling
public class DataSchedule {

    @Scheduled(cron = "0/5 * * * * ?")
    public void test() {
        System.out.println(new Date());
    }

}
