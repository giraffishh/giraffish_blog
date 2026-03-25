---
index_img: >-
  https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-03-14-1773458241802.webp
banner_img: >-
  https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/25-12-27-1766802296337.webp
title: CS208 Algorithm Design and Analysis
categories:
  - 学习笔记
tags:
  - 算法
comments: true
typora-root-url: ..
abbrlink: 395236f4
date: 2026-03-14 11:06:58
updated: 2026-03-25 20:30:03

---

## Stable Matching 稳定匹配问题

### Introduction
稳定匹配问题最早由 David Gale 和 Lloyd Shapley 在 1962 年提出。其最经典的背景是 **“稳定婚姻问题” (Stable Marriage Problem)**：给定 $n$ 位男性和 $n$ 位女性，每位男性都对所有女性有一个偏好排序，每位女性也对所有男性有一个偏好排序。我们的目标是找到一个完备匹配（Perfect Matching），使得在该匹配中不存在“不稳定”的因素

除了婚姻，该问题在现实中有着极其广泛的应用，例如：
- **住院医师规范化培训挂钩 (National Resident Matching Program)**：医学院毕业生与医院之间的分配
- **学校录取系统**：学生与学校之间的双向选择
- **内容分发网络 (CDN)**：用户请求与服务器节点之间的匹配

### Unstable Pairs 不稳定对 
为了定义“稳定”，我们首先需要定义什么是“不稳定”

在一个匹配 $M$ 中，如果存在一位男性 $m$ 和一位女性 $w$，满足以下三个条件，则 $(m, w)$ 被称为一个 **不稳定对 (Blocking Pair / Unstable Pair)**：
1. $m$ 与 $w$ 当前并没有匹配在一起
2. $m$ 相比于他当前的配偶，更喜欢 $w$。
3. $w$ 相比于她当前的配偶，更喜欢 $m$。

**直观理解：**
想象一下，$m$ 和 $w$ 虽然各自都有另一半，但他们私下里都觉得对方比自己现在的另一半更好。在这种情况下，$m$ 和 $w$ 极有可能“背弃”各自当前的伴侣而私奔。这种“私奔”的倾向就是匹配中的“不稳定”因素

**稳定匹配 (Stable Matching)** 的定义：如果一个完备匹配中不存在任何“不稳定对”，则该匹配是稳定的

### 稳定匹配是否一定存在
这是一个非常深刻的问题，答案取决于问题的约束条件

#### 1. 稳定室友问题 (Stable Roommates Problem)
如果我们将人群不再分为两类（男/女），而是 $2n$ 个人互相匹配（例如室友分配），那么**稳定匹配不一定存在**

*反例（4人情况）：* 考虑 A, B, C, D 四个人，他们的偏好如下：

- **A**: B > C > D
- **B**: C > A > D
- **C**: A > B > D
- **D**: (任何排序)

在这个例子中，A, B, C 构成了一个“剪刀石头布”式的循环偏好，而 D 是所有人最不喜欢的对象。我们可以穷举所有可能的匹配方案：
1. 若匹配为 **{A-B, C-D}**：观察 C 和 B。C 此时配偶是 D（最差），他显然更喜欢 B；而 B 此时配偶是 A，但 B 的偏好是 C > A。因此 **(B, C)** 是一个不稳定对
2. 若匹配为 **{A-C, B-D}**：观察 A 和 B。A 此时配偶是 C，但他更喜欢 B；而 B 此时配偶是 D（最差），他显然更喜欢 A。因此 **(A, B)** 是一个不稳定对
3. 若匹配为 **{A-D, B-C}**：观察 A 和 C。A 此时配偶是 D（最差），他显然更喜欢 C；而 C 此时配偶是 B，但 C 的偏好是 A > B。因此 **(A, C)** 是一个不稳定对

由于所有可能的匹配方案都存在不稳定对，因此在室友问题中，无法保证一定存在稳定匹配

#### 2. 稳定婚姻问题 (Bipartite Matching)
在二分图（男性和女性两类群体）的背景下，**稳定匹配一定存在**。这就是接下来 Gale-Shapley 算法要证明的核心结论

### Gale-Shapley 算法

#### 1. 实现逻辑与原理：求婚-拒绝机制 (Propose-and-Reject)
Gale-Shapley 算法（简称 GS 算法）采用了一种“推迟认可”（Deferred Acceptance）的策略。其核心思想是：**男性主动出击（求婚），女性按优筛选（保留或拒绝）

- **男性的策略**：按照自己的偏好列表，从最喜欢的女性开始，依次向下求婚
- **女性的策略**：对于求婚，女性不会立刻给出终身承诺，而是先“暂时保留”当前收到的最好的求婚。如果之后有更喜欢的男性向她求婚，她会果断“抛弃”当前的未婚夫，转而选择更优秀的
- **关键状态**：
    - 一旦女性被求婚，她就从“自由”变为“订婚”状态，且从此不会再变回自由（只会换更心仪的未婚夫）
    - 男性可能会在“订婚”和“自由”状态之间反复（如果被女性抛弃）

#### 2. 伪代码 (Pseudocode)
```text
Initialize each man m ∈ M and woman w ∈ W to be free
While (there exists a free man m who still has a woman w to propose to) {
    w = m's highest ranked woman in his preference list to whom he has not proposed
    If (w is free) {
        (m, w) become engaged
    } Else If (w prefers m to her current fiancé m') {
        (m, w) become engaged
        m' becomes free
    } Else {
        m remains free (w rejects m)
    }
}
Return the set S of engaged pairs
```

#### 3. 正确性证明
算法的正确性需要从三个维度来证明：

##### (1) 终止性 (Termination)
*   **证明**：在每一轮迭代中，至少有一位男性向一位他从未求过婚的女性求婚。由于总共有 $n$ 位男性和 $n$ 位女性，总的求婚对数上限为 $n^2$。因此，算法最多在 $n^2$ 步内必然终止

##### (2) 完备性/全匹配 (Perfect Matching)
*   **证明**：假设算法终止时，存在一个男性 $m$ 仍然是自由的
    1. 因为男女数量相等，如果 $m$ 自由，则必然存在一个女性 $w$ 也是自由的
    2. 根据算法，只有当 $m$ 向他列表中的**所有**女性都求过婚且都被拒绝时，他才会保持自由并停止
    3. 然而，女性一旦收到求婚就会进入“订婚”状态且永不恢复自由。如果 $m$ 曾向 $w$ 求过婚，那么 $w$ 现在一定处于订婚状态，这与 $w$ 是自由的假设矛盾
    4. 因此，算法结束时，所有人都必然被匹配

##### (3) 稳定性 (Stability)
*   **证明**：假设存在一对不在匹配结果中的男女 $(m, w)$，我们要证明他们不会构成“不稳定对”
    1. 既然 $(m, w)$ 不在最终匹配中，那么 $m$ 的最终配偶一定是 $w'$
    2. 情况一：如果 $m$ 喜欢 $w'$ 超过 $w$，那么 $(m, w)$ 显然不是不稳定对（$m$ 没有动力私奔）
    3. 情况二：如果 $m$ 喜欢 $w$ 超过 $w'$。根据算法，因为 $m$ 是按顺序求婚的，他在向 $w'$ 求婚之前，一定已经向 $w$ 求过婚了
    4. 既然 $m$ 最终没和 $w$ 在一起，说明 $w$ 当时拒绝了 $m$，或者后来为了更好的男性抛弃了 $m$
    5. 由于女性在匹配过程中，她的配偶只会越来越好（根据她的偏好排序向上移），这说明 $w$ 的最终配偶一定比 $m$ 更好
    6. 因此，$w$ 没有动力私奔。结论：不存在不稳定对

#### 4. 性质分析：男性最优性 (Man-Optimality)
GS 算法的一个令人惊讶的性质是：**在所有可能的稳定匹配中，每一位男性都得到了他所能得到的“最好”的伴侣**

* **有效伴侣 (Valid Partner)**：如果存在**至少一个**稳定匹配使得 $(m, w)$ 在一起，则称 $w$ 是 $m$ 的一个有效伴侣

* **证明结论**：GS 算法产生的匹配 $S^*$ 中，每个男性匹配到的都是他在所有有效伴侣中最喜欢的那一个。

> 与之相对，GS 算法对女性是**最差的 (Weakly Woman-Pessimal)**，在所有稳定匹配中，每位女性最终匹配到的都是她所有有效伴侣中最差的一个

### Java 高效实现 (Efficiency and Implementation)

为了在算法竞赛或实际工程中达到最优的 $O(n^2)$ 时间复杂度，我们需要精巧地选择数据结构。以下是基于 `main.java` 的实现详解：

#### 1. 数据预处理与排名表优化 (Pre-processing)

首先，通过 `HashMap` 将字符串姓名映射为整数索引，并利用**排名表**将女性的偏好比对优化至 $O(1)$

```java
// 1. 利用 Map 实现姓名与索引的解耦
Map<String, Integer> boyNameToIdx = new HashMap<>(); 
Map<String, Integer> girlNameToIdx = new HashMap<>();
// ... (读取姓名并填充 Map)

// 2. 核心优化：预处理女性偏好排名表 (Ranking Table)
// girlPrefRank[g][b] 存储的是：男生 b 在女生 g 心中的排名（越小越优）
int[][] girlPrefRank = new int[n][n]; 
for (int i = 0; i < n; i++) {
    for (int j = 0; j < n; j++) {
        String bName = sc.next();
        int bIdx = boyNameToIdx.get(bName);
        girlPrefRank[i][bIdx] = j; // 记录排名，后续比对只需 O(1)
    }
}
```
> **解读**：传统的偏好列表是“排名 $\to$ 姓名”，但在比对时我们需要“姓名 $\to$ 排名”。通过预处理 `girlPrefRank`，我们避免了在 $n$ 长度的列表中线性查找男生的优先级，将判定复杂度从 $O(n)$ 降至 $O(1)$，这是整体 $O(n^2)$ 复杂度的关键

#### 2. Gale-Shapley 主循环 (Main Loop)

使用队列维护自由男性，并利用求婚进度数组确保不重复求婚

```java
// 初始化状态
int[] girlMatchedWith = new int[n]; // 记录女生当前配偶的索引
Arrays.fill(girlMatchedWith, -1);
int[] boyNextProposal = new int[n]; // 记录男生下一次该向第几个偏好求婚 (0 ~ n-1)

Queue<Integer> freeBoys = new ArrayDeque<>();
for (int i = 0; i < n; i++) freeBoys.offer(i);

while (!freeBoys.isEmpty()) {
    int b = freeBoys.poll();
    // 获取男生 b 下一个要提案的女生索引 g
    int g = boyPrefs[b][boyNextProposal[b]++]; 

    if (girlMatchedWith[g] == -1) {
        // 场景 A：女生单身，直接订婚
        girlMatchedWith[g] = b;
    } else {
        // 场景 B：女生已订婚，进行比对
        int currentB = girlMatchedWith[g];
        if (girlPrefRank[g][b] < girlPrefRank[g][currentB]) {
            // 女生更喜欢新求婚者 b：更换伴侣，原伴侣 currentB 恢复自由
            girlMatchedWith[g] = b;
            freeBoys.offer(currentB); 
        } else {
            // 女生拒绝 b：b 重新入队，准备向下一个偏好求婚
            freeBoys.offer(b);
        }
    }
}
```
> **解读**：`boyNextProposal` 数组充当了男生的“求婚指针”，它保证了每个男生只会按照偏好顺序向下移动，且绝不回头。`ArrayDeque` 提供了高效的 $O(1)$ 入队出队操作，模拟了算法中自由男性的动态变化

#### 3. 结果整理与字典序排序 (Sorting and Output)

算法结束后，按照男生姓名的字典序输出匹配结果

```java
// 1. 整理匹配关系：将“女生-男生”反转为“男生-女生”
String[] finalMatches = new String[n];
for (int g = 0; g < n; g++) {
    finalMatches[girlMatchedWith[g]] = girlNames[g];
}

// 2. 字典序排序：对男生索引进行排序 (Integer 数组方便使用 Comparator)
Integer[] sortedBoyIndices = new Integer[n];
for (int i = 0; i < n; i++) sortedBoyIndices[i] = i;

Arrays.sort(sortedBoyIndices, (i, j) -> boyNames[i].compareTo(boyNames[j]));

// 3. 格式化输出
for (int bIdx : sortedBoyIndices) {
    out.println(boyNames[bIdx] + " " + finalMatches[bIdx]);
}
```
> **解读**：由于算法主循环中处理的是整数索引，最后需要利用 `finalMatches` 数组将关系映射回字符串。通过对索引数组 `sortedBoyIndices` 进行自定义比较器排序，我们可以灵活地满足题目要求的字典序输出，而不会破坏原有数据结构的索引关系

#### 复杂度总结
- **时间复杂度**：$O(n^2)$。预处理 $O(n^2)$，主循环最多迭代 $n^2$ 次，排序 $O(n \log n)$
- **空间复杂度**：$O(n^2)$。主要开销为存储偏好矩阵和排名矩阵
