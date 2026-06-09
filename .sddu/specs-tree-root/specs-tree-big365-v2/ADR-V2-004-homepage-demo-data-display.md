# ADR-V2-004: 首页预置数据采用预设查询模式

## 状态
PROPOSED

## 背景

V2 需要将 HomePage 从「概念卡片 + 健康检查」改造为「预置数据直展」模式（FR-V2-050~054）。核心目标是让新用户 Compose 启动后 30 秒内看到可交互的预置演示数据，无需手动注册业务、定义维度、生成数据。

Spec 开放问题 OQ-V2-006 要求决定首页展示形式。

候选方案：
1. **预设查询模式**：首页加载时自动检测 demo_logs → 执行时间区间查询 → 渲染汇总表
2. **预计算展示**：后端预计算每日汇总数据 → 首页直接读取缓存
3. **自动触发查询**：用户打开首页时自动模拟下钻操作展示数据

## 决策

采用 **预设查询模式**。

### 实现逻辑

```typescript
// HomePage 加载流程
useEffect(() => {
  // 1. 健康检查（独立，不阻塞预置数据加载）
  checkHealth();
  
  // 2. 检测 demo_logs 是否存在
  listBiz().then(bizList => {
    if (bizList.items.find(b => b.bizName === 'demo_logs')) {
      loadPresetData();
    } else {
      showFallbackConceptCards();
    }
  }).catch(() => showFallbackConceptCards());
}, []);

async function loadPresetData() {
  const today = formatDate(new Date());
  const weekAgo = formatDate(new Date(Date.now() - 7 * 86400000));
  
  // 对每个 app (1,2,3) 执行时间区间查询
  const apps = [1, 2, 3];
  const results = await Promise.all(apps.map(app =>
    querySpace('demo_logs', {
      [`coordinates[app]`]: app,
      [`coordinates[endpoint]`]: 0,    // ALL
      [`coordinates[statusCode]`]: 0,   // ALL
      [`coordinates[env]`]: 0,          // ALL
      [`coordinates[region]`]: 0,       // ALL
      dateFrom: weekAgo,
      dateTo: today
    })
  ));
  
  // 构建汇总表数据
  setDemoData(results.map((r, i) => ({
    app: apps[i],
    total: r.data.value,
    scannedDates: r.data.scannedDates
  })));
}
```

### 展示形态

采用 **汇总表**（表格形式，非图表）展示最近 7 天各应用的请求量趋势：

```
最近 7 天各应用请求量

┌────────────┬───────────────┬───────────────┬───────────────┐
│ 日期       │ app=order-svc │ app=user-svc  │ app=payment   │
├────────────┼───────────────┼───────────────┼───────────────┤
│ 2026-06-10 │     15,200    │     18,350    │     12,100    │
│ 2026-06-09 │     14,800    │     17,200    │     11,800    │
│ ...        │     ...       │     ...       │     ...       │
├────────────┼───────────────┼───────────────┼───────────────┤
│ 7天汇总    │    102,500    │    118,600    │     85,300    │
└────────────┴───────────────┴───────────────┴───────────────┘

[🔍 进入下钻分析] → /biz/demo_logs/space
```

### 为什么不是预计算展示

预计算展示需要后端在 Compose 启动时预先计算所有可能的查询组合并缓存，这在首版数据量下过度设计且维护缓存一致性复杂。

### 为什么不是自动触发查询

自动触发查询缺少清晰的「步骤感」，用户不知道数据从哪里来、为什么能展示，降低了后续自定义业务的引导效果。

## 后果

### 正面影响
- 直接验证 V2 时间区间查询端点的端到端可用性（FR-V2-054）
- 用户可见「预设查询 → 展示」的完整数据流
- 无额外后端计算或缓存需求
- 降级逻辑简单（demo_logs 不存在 → 回退概念卡片）
- 为后续版本引入图表（如折线图）保留数据接口

### 负面影响
- 首页加载时发起 3 次 HTTP 请求（每个 app 一次时间区间查询）
- 首次加载比纯概念卡片慢（增加 ~500ms 查询耗时）

### 缓解措施
- 3 次查询使用 `Promise.all` 并行发起，不串行等待
- Loading 状态独立于健康检查展示（不阻塞页面其余部分）
- 查询失败时自动降级到概念卡片模式
- 预置数据查询结果可考虑在 sessionStorage 中缓存（避免每次刷新重新查询）
