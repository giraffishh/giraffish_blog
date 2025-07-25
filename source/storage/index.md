---
title: 储物间
layout: storage
comments: true
date: 2025-06-01 17:56:45
---
<div class="markdown-body">

## 🍀Giraffish的储物间

> 📌：高学习有限度
> ❄️：低学习优先度

### Learning TodoList

#### 0. Python

1.  基础语法📌✅
2.  面向对象📌✅
3.  numpy / panda / Matplotlib📌✅

> 3：https://www.bilibili.com/video/BV1Ex411L7oT/?share_source=copy_web&vd_source=d8ddaf8c8f498cc1cdb5fb20b19e913c
> 3：https://www.bilibili.com/video/BV1wN4y1T7K9/?p=2&share_source=copy_web&vd_source=d8ddaf8c8f498cc1cdb5fb20b19e913c

#### 1. 数据处理

1. 数据清洗与数据集成📌✅
2. 数据规约📌✅
3. 数据转换与数据降维📌✅
4. Apriori算法❄️（数据挖掘题）
5. FP-growth算法❄️（数据挖掘题）

> 数据清洗：https://www.bilibili.com/video/BV1qb411M7ew/?share_source=copy_web&vd_source=d8ddaf8c8f498cc1cdb5fb20b19e913c
>
> 预处理：https://www.bilibili.com/video/BV1kC4y1a7Ee/?p=23&share_source=copy_web&vd_source=d8ddaf8c8f498cc1cdb5fb20b19e913c
>
> 降维 PCA / t-SNE / UMAP：https://www.bilibili.com/video/BV1dpStYvEh8/?share_source=copy_web&vd_source=d8ddaf8c8f498cc1cdb5fb20b19e913c
>
> UMAP详解：https://www.bilibili.com/video/BV1qB4y1p7CF/?share_source=copy_web&vd_source=d8ddaf8c8f498cc1cdb5fb20b19e913c

#### 2. 数据检验

1. 正态性检验，均匀性检验，独立性检验方法📌
2. 方差分析方法📌
3. 拟合优度检验方法📌
4. t检验方法📌
5. 秩和检验方法
6. 相关性分析

#### 3. 规划类模型

1. 线性规划📌✅
2. 整数规划📌✅
3. 非线性规划📌✅
4. 动态规划✅
5. 多目标规划✅

> 1 / 2 / 3 / 5：https://www.bilibili.com/video/BV1kC4y1a7Ee/?p=6&share_source=copy_web&vd_source=d8ddaf8c8f498cc1cdb5fb20b19e913c
> 2 / 4 / 5：https://www.bilibili.com/video/BV1bc411n7yv/?p=19&share_source=copy_web&vd_source=d8ddaf8c8f498cc1cdb5fb20b19e913c

#### 4. 评价类模型

1. 层次分析法、熵权法📌✅
2. 模糊综合评价法📌 ✅
3. TOPSIS综合评价算法📌✅
4. 灰色关联分析 📌✅
5. PCA 主成分分析📌✅
6. DEA 数据包络分析📌✅
7. RSR 秩和比评价模型 ✅

| 方法                 | 使用频率 🌟 | 适用范围 📌                   | 学习难度 🎓 | 是否赋权                 | 是否需标准化 | 学习优先级 |
| -------------------- | ---------- | ---------------------------- | ---------- | ------------------------ | ------------ | ---------- |
| **熵权TOPSIS**       | ⭐⭐⭐⭐⭐      | 多指标优劣排序               | ★★★        | ✅ 是                     | ✅ 是         | 1          |
| **DEA 数据包络分析** | ⭐⭐⭐⭐☆      | 效率评价（投入-产出）        | ★★★☆       | ❌ 自动确定               | ✅ 是         | 2          |
| **灰色关联分析**     | ⭐⭐⭐⭐       | 小样本、趋势分析             | ★★☆        | ❌ 不需要                 | ✅ 是         | 2          |
| **模糊综合评价法**   | ⭐⭐⭐⭐       | 主观语言打分类               | ★★★☆       | ✅ 可结合AHP/熵权         | ❌ 不需要     | 2          |
| **AHP 层次分析法**   | ⭐⭐⭐⭐       | 指标间有层级逻辑，需主观赋权 | ★★★        | ✅ 主观（配合一致性检验） | ❌ 不需要     | 2          |
| **RSR 秩和比法**     | ⭐⭐☆        | 样本小、排序需求             | ★          | ❌ 不需要                 | ❌ 不需要     | 3          |

> 1 / 2 / 3 / 4 /5 ：https://www.bilibili.com/video/BV1bc411n7yv/?share_source=copy_web&vd_source=d8ddaf8c8f498cc1cdb5fb20b19e913c
> 6 / 7 ：https://www.bilibili.com/video/BV1Kh4y1n7x3/?share_source=copy_web&vd_source=d8ddaf8c8f498cc1cdb5fb20b19e913c

#### 5. 预测类模型

**回归:**

1. 线性回归✅
2. 逻辑回归✅
3. 非线性回归✅
4. 神经网络预测✅
5. 梯度提升树GBDT（XGBoost/LightGBM/CATBoost）✅

> 学GBDT前应先学决策树&随机森林
>
> GBDT -> https://www.bilibili.com/video/BV1U5411n7vH/?share_source=copy_web&vd_source=d8ddaf8c8f498cc1cdb5fb20b19e913c
>
> XGBoost -> https://www.bilibili.com/video/BV1yq4y1z7jK/?share_source=copy_web&vd_source=d8ddaf8c8f498cc1cdb5fb20b19e913c
>
> XGBoost推导 -> https://www.bilibili.com/video/BV1Zk4y1F7JE/?share_source=copy_web&vd_source=d8ddaf8c8f498cc1cdb5fb20b19e913c

**时间序列预测:**

5. 灰色预测✅
6. ARIMA时间序列预测✅

**分类:**

7. 朴素贝叶斯✅
8. 决策树📌✅
9. KNN (K近邻算法)📌✅
10. SVM (支持向量机)📌✅
11. 随机森林✅

> 1 / 2 / 3 / 4 / 8 / 9 / 11 -> 吴恩达机器学习：https://www.bilibili.com/video/BV1Bq421A74G/?p=42&share_source=copy_web&vd_source=d8ddaf8c8f498cc1cdb5fb20b19e913c
> 1 / 3 / 5 / 6：https://www.bilibili.com/video/BV1bc411n7yv/?p=36&share_source=copy_web&vd_source=d8ddaf8c8f498cc1cdb5fb20b19e913c
> 7 / 10 -> 白板推导： https://www.bilibili.com/video/BV1aE411o7qd/?share_source=copy_web&vd_source=d8ddaf8c8f498cc1cdb5fb20b19e913c

**其他：**

12. 蒙特卡洛方法✅
13. 马尔可夫链 / 隐马尔可夫HMM✅

> 12 -> https://www.bilibili.com/video/BV1bc411n7yv/?p=18&share_source=copy_web&vd_source=d8ddaf8c8f498cc1cdb5fb20b19e913c
>
> 13 -> https://www.bilibili.com/video/BV1xa4y1w7aT/?share_source=copy_web&vd_source=d8ddaf8c8f498cc1cdb5fb20b19e913c

#### 6. 智能优化模型

1. 图论搜索算法✅

2. 遗传算法、改进遗传算法✅📌

3. 粒子群算法与蚁群算法✅❄️

4. 多目标进化 NSGA-II算法❄️

   > https://www.bilibili.com/video/BV1YL411W7zH/?share_source=copy_web&vd_source=d8ddaf8c8f498cc1cdb5fb20b19e913c

#### 模型检验

1. 敏感性分析

***
### 一些资源

> 以下所有资源都是自费挂载在阿里云OSS中

#### 算法py示例

* {% btn https://hexo-blog-netlify.oss-cn-shenzhen.aliyuncs.com/storage/%E5%9F%BA%E7%A1%80%E7%AE%97%E6%B3%95.zip, 基础算法,https://hexo-blog-netlify.oss-cn-shenzhen.aliyuncs.com/storage/%E5%9F%BA%E7%A1%80%E7%AE%97%E6%B3%95.zip%}
* {% btn https://hexo-blog-netlify.oss-cn-shenzhen.aliyuncs.com/storage/%E8%BF%9B%E9%98%B6%E7%AE%97%E6%B3%95.zip, 进阶算法,https://hexo-blog-netlify.oss-cn-shenzhen.aliyuncs.com/storage/%E8%BF%9B%E9%98%B6%E7%AE%97%E6%B3%95.zip%}
* {% btn https://hexo-blog-netlify.oss-cn-shenzhen.aliyuncs.com/storage/%E8%A1%A5%E5%85%85%E7%AE%97%E6%B3%95.zip, 补充算法,https://hexo-blog-netlify.oss-cn-shenzhen.aliyuncs.com/storage/%E8%A1%A5%E5%85%85%E7%AE%97%E6%B3%95.zip%}

#### 算法练习题

* {% btn https://hexo-blog-netlify.oss-cn-shenzhen.aliyuncs.com/storage/%E6%95%B0%E5%AD%A6%E5%BB%BA%E6%A8%A1%E7%AE%97%E6%B3%95%E4%B8%8E%E5%BA%94%E7%94%A8%E4%B9%A0%E9%A2%98%E8%A7%A3%E7%AD%94.pdf, 数学建模算法与应用习题解答（PDF),https://hexo-blog-netlify.oss-cn-shenzhen.aliyuncs.com/storage/%E6%95%B0%E5%AD%A6%E5%BB%BA%E6%A8%A1%E7%AE%97%E6%B3%95%E4%B8%8E%E5%BA%94%E7%94%A8%E4%B9%A0%E9%A2%98%E8%A7%A3%E7%AD%94.pdf%}