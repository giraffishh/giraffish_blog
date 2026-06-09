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
updated: 2026-06-10 01:20:10

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

## Interval Scheduling 区间调度

### 问题定义

![](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-06-09-1781018226006.webp)

**输入 (Input)**：给定一组 jobs，每个 job $j$ 都有开始时间 $s_j$ 和结束时间 $f_j$。

**目标 (Goal)**：找到一个**最大基数 (maximum cardinality)** 的 job 子集，使得这些 jobs 两两兼容。

所谓兼容 (compatible)，指两个 jobs 的时间区间不重叠。通常采用半开区间的理解：如果一个 job 在时间 $t$ 结束，另一个 job 正好在时间 $t$ 开始，则二者兼容，即 $f_i \le s_j$ 或 $f_j \le s_i$。

图中的无权区间调度例子可以表示为：

| Job | Start | Finish |
| --- | ---: | ---: |
| $a$ | 0 | 6 |
| $b$ | 1 | 4 |
| $c$ | 3 | 5 |
| $d$ | 3 | 8 |
| $e$ | 4 | 7 |
| $f$ | 5 | 9 |
| $g$ | 6 | 10 |
| $h$ | 8 | 11 |

其中一个最大兼容子集是 $\{b, e, h\}$，它们的时间分别为 $[1,4]$、$[4,7]$、$[8,11]$，两两不重叠，基数为 3。

### 贪心算法：按最早结束时间选择

区间调度的经典最优策略是：**每一步选择当前所有可选 jobs 中结束时间最早的 job**。

```text
Sort jobs by finish time so that f1 <= f2 <= ... <= fn
A = empty set
currentFinish = -infinity

For each job j in sorted order:
    If s_j >= currentFinish:
        Add j to A
        currentFinish = f_j

Return A
```

在图中的例子中，按结束时间排序后会依次考虑：

$$
b(1,4), c(3,5), a(0,6), e(4,7), d(3,8), f(5,9), g(6,10), h(8,11)
$$

贪心过程为：
1. 选择结束最早的 $b=[1,4]$
2. 跳过与 $b$ 冲突的 $c$ 和 $a$
3. 选择 $e=[4,7]$
4. 跳过与 $e$ 冲突的 $d,f,g$
5. 选择 $h=[8,11]$

最终得到 $\{b,e,h\}$。

### 正确性证明：交换论证

设 $g$ 是所有 jobs 中结束时间最早的 job。我们证明：一定存在一个最优解包含 $g$。

假设某个最优解 $O$ 的第一个 job 是 $j$，而不是 $g$。由于 $g$ 是结束时间最早的 job，因此：

$$
f_g \le f_j
$$

把 $O$ 中的第一个 job $j$ 替换为 $g$ 后，新的解仍然可行。原因是 $g$ 不会比 $j$ 更晚结束，所以原来能在 $j$ 之后开始的 jobs，也一定能在 $g$ 之后开始。

因此，存在一个包含 $g$ 的最优解。选择 $g$ 后，问题就缩小为所有开始时间不早于 $f_g$ 的 jobs 上的同类子问题。对这个子问题重复同样的论证，就得到按最早结束时间贪心选择的最优性。

### 复杂度

- 排序需要 $O(n \log n)$
- 扫描一遍 jobs 需要 $O(n)$
- 总时间复杂度为 $O(n \log n)$
- 额外空间复杂度为 $O(1)$ 或 $O(n)$，取决于是否需要显式存储答案集合

### Weighted Interval Scheduling 带权区间调度

#### 问题定义

![](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-06-09-1781018328875.webp)

**输入 (Input)**：给定一组 jobs，每个 job $j$ 都有开始时间 $s_j$、结束时间 $f_j$ 和权重 $w_j$。

**目标 (Goal)**：找到一个**最大权重 (maximum weight)** 的兼容 job 子集。

和无权版本不同，带权区间调度不能只追求 job 数量最多，而是要让总权重最大。图中的带权例子为：

| Job | Start | Finish | Weight |
| --- | ---: | ---: | ---: |
| $a$ | 0 | 6 | 23 |
| $b$ | 1 | 4 | 12 |
| $c$ | 3 | 5 | 20 |
| $d$ | 3 | 8 | 26 |
| $e$ | 4 | 7 | 13 |
| $f$ | 5 | 9 | 20 |
| $g$ | 6 | 10 | 11 |
| $h$ | 8 | 11 | 16 |

图中蓝色选择的是 $d=[3,8], w=26$ 和 $h=[8,11], w=16$，总权重为：

$$
26 + 16 = 42
$$

这比 $\{b,e,h\}$ 的总权重 $12+13+16=41$ 更大，因此带权版本的最优解不一定等于无权版本的最大基数解。

#### 动态规划算法

<iframe
src="/widgets/ada_weighted_interval_scheduling.html"
width="100%"
style="height: 75vh; border: 1px solid #e2e8f0; border-radius: 8px;"
frameborder="0"
sandbox="allow-scripts allow-same-origin"
></iframe>

先将所有 jobs 按结束时间递增排序，记排序后的 jobs 为 $1,2,\dots,n$。

定义 $p(j)$ 为在 job $j$ 开始之前结束的、编号最大的兼容 job：

$$
p(j)=\max\{i<j \mid f_i \le s_j\}
$$

如果不存在这样的 job，则 $p(j)=0$。

定义 $OPT(j)$ 表示只考虑前 $j$ 个 jobs 时，可以得到的最大总权重。对于 job $j$，只有两种选择：

1. **不选 job $j$**：答案为 $OPT(j-1)$
2. **选择 job $j$**：答案为 $w_j + OPT(p(j))$

因此递推式为：

$$
OPT(j)=\max\{OPT(j-1), w_j + OPT(p(j))\}
$$

边界条件：

$$
OPT(0)=0
$$

#### 伪代码

```text
Sort jobs by finish time
Compute p(j) for each job j

OPT[0] = 0
For j = 1 to n:
    OPT[j] = max(OPT[j - 1], w_j + OPT[p(j)])

Return OPT[n]
```

如果只需要最优权重，递推数组就足够；如果还需要恢复具体选择的 jobs，可以从 $j=n$ 倒着追踪：

```text
Find-Solution(j):
    If j == 0:
        return
    If w_j + OPT[p(j)] > OPT[j - 1]:
        output job j
        Find-Solution(p(j))
    Else:
        Find-Solution(j - 1)
```

#### 图中例子的 DP 计算

按结束时间排序后：

| $j$ | Job | Interval | Weight | $p(j)$ |
| ---: | --- | --- | ---: | ---: |
| 1 | $b$ | $[1,4]$ | 12 | 0 |
| 2 | $c$ | $[3,5]$ | 20 | 0 |
| 3 | $a$ | $[0,6]$ | 23 | 0 |
| 4 | $e$ | $[4,7]$ | 13 | 1 |
| 5 | $d$ | $[3,8]$ | 26 | 0 |
| 6 | $f$ | $[5,9]$ | 20 | 2 |
| 7 | $g$ | $[6,10]$ | 11 | 3 |
| 8 | $h$ | $[8,11]$ | 16 | 5 |

对应的 DP 值为：

| $j$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| $OPT(j)$ | 0 | 12 | 20 | 23 | 25 | 26 | 40 | 40 | 42 |

最终：

$$
OPT(8)=42
$$

恢复解时，$h$ 被选中，然后跳到 $p(8)=5$；$d$ 被选中，然后跳到 $p(5)=0$。所以最优解为：

$$
\{d,h\}
$$

#### 复杂度

- 按结束时间排序：$O(n \log n)$
- 对每个 job 用二分查找计算 $p(j)$：$O(n \log n)$
- DP 递推：$O(n)$
- 总时间复杂度：$O(n \log n)$
- 空间复杂度：$O(n)$

## Bipartite Matching 二分图匹配

### 问题定义

二分图匹配问题研究的是：给定一个二分图 $G=(L \cup R, E)$，其中每条边都连接左侧点集 $L$ 中的一个点和右侧点集 $R$ 中的一个点。我们希望选择尽可能多的边，使得任意两条被选择的边都不共享端点。

这样的边集称为一个**匹配 (Matching)**。如果一个匹配包含的边数最多，则称为**最大匹配 (Maximum Matching)**。

注意这里的 Bipartite Matching 和前面的 Stable Matching 不同：

- Stable Matching 中每个点有偏好列表，目标是不存在 blocking pair
- Bipartite Matching 中通常没有偏好，目标只是让匹配边数最大

形式化地说，输入为：

- 左侧点集 $L=\{1,2,\dots,n\}$
- 右侧点集 $R=\{1,2,\dots,m\}$
- 边集 $E \subseteq L \times R$

目标是找到最大的边集 $M \subseteq E$，满足：

$$
\forall e_1,e_2 \in M,\ e_1 \ne e_2,\quad e_1 \text{ and } e_2 \text{ do not share endpoints}
$$

### 增广路思想

解决二分图最大匹配的核心概念是**增广路 (Augmenting Path)**。

相对于当前匹配 $M$，一条增广路满足：

1. 起点是一个未匹配的左侧点
2. 终点是一个未匹配的右侧点
3. 路径上的边在「未匹配边」和「已匹配边」之间交替出现

如果找到一条增广路，就可以把路径上的边状态全部反转：

- 原来不在匹配中的边加入匹配
- 原来在匹配中的边移出匹配

由于增广路以未匹配点开始、以未匹配点结束，反转后匹配大小会增加 1。

**Berge 定理**：一个匹配 $M$ 是最大匹配，当且仅当图中不存在关于 $M$ 的增广路。

### DFS 解法：Kuhn Algorithm

最直接的做法是：依次尝试让每个左侧点 $u$ 找到一个可以匹配的右侧点。如果 $u$ 想匹配的右侧点 $v$ 已经被其他左侧点 $u'$ 占用，就递归尝试让 $u'$ 改匹配到别的点。

这本质上是在用 DFS 寻找一条从 $u$ 出发的增广路。

#### 伪代码

```text
matchR[v] = the left vertex currently matched with v, initially NIL

DFS(u):
    For each v in adj[u]:
        If v has been visited in this DFS:
            continue
        Mark v as visited

        If matchR[v] == NIL or DFS(matchR[v]):
            matchR[v] = u
            return true

    return false

answer = 0
For each u in L:
    Clear visited array for R
    If DFS(u):
        answer = answer + 1

Return answer
```

其中 `matchR[v] = u` 表示右侧点 $v$ 当前匹配给左侧点 $u$。

递归里的关键判断是：

```text
If matchR[v] == NIL or DFS(matchR[v])
```

含义是：

- 如果 $v$ 没有人匹配，那么 $u$ 可以直接匹配 $v$
- 如果 $v$ 已经被 $u'$ 匹配，那么尝试让 $u'$ 递归重新找一个位置；如果成功，$v$ 就可以让给 $u$

#### 小例子

假设边为：

$$
1-a,\quad 1-b,\quad 2-a
$$

先处理 $1$，它可以匹配到 $a$：

$$
M=\{(1,a)\}
$$

再处理 $2$，它也想匹配 $a$。此时 $a$ 已经被 $1$ 占用，于是 DFS 尝试让 $1$ 改去 $b$。因为 $b$ 为空，所以重排成功：

$$
M=\{(1,b),(2,a)\}
$$

这就是一次增广：看起来 $2$ 抢了 $a$，但本质上是找到了一条增广路：

$$
2-a-1-b
$$

#### 正确性直觉

每次 DFS 成功时，都找到了一条增广路，并让匹配大小增加 1。算法不断从未处理的左侧点尝试增广；当所有左侧点都无法再通过 DFS 找到增广路时，根据 Berge 定理，当前匹配就是最大匹配。

#### 复杂度

设左侧点数为 $|L|=n$，右侧点数为 $|R|=m$，边数为 $|E|$。

- 每次 DFS 最多扫描 $O(|E|)$ 条边
- 最多对每个左侧点做一次外层 DFS
- 总时间复杂度为 $O(|L||E|)$
- 空间复杂度为 $O(|R|+|E|)$，主要来自匹配数组、访问数组和邻接表

DFS 解法实现简单，在中小规模图上很常用；但在稠密图或点数较大时，复杂度可能偏高。

### Hopcroft-Karp 解法

<iframe
src="/widgets/ada_hopcroft_karp.html"
width="100%"
style="height: 82vh; border: 1px solid #e2e8f0; border-radius: 8px;"
frameborder="0"
sandbox="allow-scripts allow-same-origin"
></iframe>

Hopcroft-Karp 是二分图最大匹配的经典优化算法。它仍然基于增广路，但不是一次只找一条增广路，而是在每一轮中同时寻找多条**最短增广路**。

它分为两步：

1. **BFS 分层**：从所有未匹配的左侧点同时出发，只沿着可能构成交替路的方向扩展，计算到各点的层数，并找到最短增广路长度
2. **DFS 增广**：只沿着 BFS 建好的层级图寻找增广路，一轮内尽可能找出多条点不相交的最短增广路

这种「一轮 BFS + 多次 DFS」的方式显著减少了增广轮数。

#### 交替路方向

为了维持增广路的结构，搜索方向可以理解为：

- 从左侧点 $u$ 出发时，走一条未匹配边 $(u,v)$ 到右侧点 $v$
- 如果 $v$ 已经匹配给某个左侧点 $u'$，则下一步只能沿着已匹配边回到 $u'$
- 如果 $v$ 未匹配，则找到一条增广路

BFS 的目标不是立即修改匹配，而是确定最短增广路的层级结构。DFS 只在这个结构中搜索，因此不会浪费时间走明显不可能成为最短增广路的边。

#### 伪代码

```text
pairU[u] = the right vertex matched with u, initially NIL
// pairU[u] 表示左侧点 u 当前匹配到哪个右侧点；NIL 表示 u 还未匹配

pairV[v] = the left vertex matched with v, initially NIL
// pairV[v] 表示右侧点 v 当前匹配到哪个左侧点；NIL 表示 v 还未匹配

dist[u] = BFS level of left vertex u
// dist[u] 只给左侧点分层，用来限制 DFS 只沿最短增广路方向走

BFS():
    queue = empty queue

    For each u in L:
        If pairU[u] == NIL:
            // 所有未匹配的左侧点都是 BFS 的起点
            dist[u] = 0
            push u into queue
        Else:
            // 已匹配的左侧点暂时不可达，后面可能通过匹配边被访问到
            dist[u] = INF

    found = false
    // found 表示这一轮 BFS 是否能到达某个未匹配的右侧点

    While queue is not empty:
        u = pop queue
        For each v in adj[u]:
            If pairV[v] == NIL:
                // 从 u 走到一个 free 的 v，说明发现了最短增广路的终点
                found = true
            Else if dist[pairV[v]] == INF:
                // v 已经匹配给 pairV[v]，沿匹配边回到左侧下一层
                dist[pairV[v]] = dist[u] + 1
                push pairV[v] into queue

    Return found

DFS(u):
    For each v in adj[u]:
        If pairV[v] == NIL or
           (dist[pairV[v]] == dist[u] + 1 and DFS(pairV[v])):
            // 情况 1：v 是 free 的，直接接上增广路
            // 情况 2：v 已匹配，但它的匹配点位于下一层，可以递归继续找
            // 一旦递归成功，就反转路径上的匹配关系
            pairU[u] = v
            pairV[v] = u
            return true

    // 从 u 出发找不到当前最短增广路，标记为 INF 以避免本轮重复搜索
    dist[u] = INF
    return false

matching = 0
While BFS():
    // 每一轮 BFS 固定一张最短增广路的层级图
    For each u in L:
        If pairU[u] == NIL and DFS(u):
            // DFS 只从 free 的左侧点出发；成功一次，匹配数加 1
            matching = matching + 1

Return matching
```

其中 `dist[u] = INF` 的作用是剪枝：如果 DFS 已经证明从 $u$ 出发无法在当前层级图中找到增广路，就不必在同一轮中重复搜索它。

#### 为什么更快

普通 DFS 解法每次最多只增加一条匹配边；Hopcroft-Karp 在每一轮中会找出一组互不冲突的最短增广路，并一次性增广多条。

更重要的是，每轮增广之后，下一轮最短增广路的长度会变长。可以证明，Hopcroft-Karp 的增广轮数为 $O(\sqrt{|V|})$，每一轮 BFS 和 DFS 总共扫描 $O(|E|)$ 条边，因此总时间复杂度为：

$$
O(|E|\sqrt{|V|})
$$

其中 $|V|=|L|+|R|$。

#### 复杂度

- BFS 分层：$O(|E|)$
- 一轮 DFS 增广：$O(|E|)$
- 增广轮数：$O(\sqrt{|V|})$
- 总时间复杂度：$O(|E|\sqrt{|V|})$
- 空间复杂度：$O(|V|+|E|)$

### 两种算法对比

| 算法 | 核心思想 | 时间复杂度 | 适用场景 |
| --- | --- | --- | --- |
| DFS/Kuhn | 每次用 DFS 找一条增广路 | $O(|L||E|)$ | 实现简单，适合中小规模图 |
| Hopcroft-Karp | BFS 分层后批量寻找最短增广路 | $O(|E|\sqrt{|V|})$ | 大规模二分图最大匹配 |

总结来说，二分图最大匹配的本质是不断寻找增广路。DFS 解法是最朴素的增广路算法；Hopcroft-Karp 则通过 BFS 分层，把多条最短增广路合并到同一轮中处理，从而得到更优复杂度。
