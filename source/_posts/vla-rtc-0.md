---
index_img: >-
  https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-03-25-1774442387365.webp
banner_img: >-
  https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-03-25-1774421924055.webp
title: VLA-RTC：Introduction
categories:
  - 学习笔记
tags:
  - VLA
  - VLA-RTC
comments: true
typora-root-url: ..
abbrlink: 765f81f2
date: 2026-03-25 12:55:53
updated: 2026-03-26 13:20:25

---

## Stage 01: Control Basics

这一课只解决 5 个最基础的问题：

1. 什么是 robot policy
2. 什么是 observation
3. 什么是 action
4. 什么是 closed-loop
5. 什么是 control frequency

机器人控制最朴素的形式就是：

**看一眼当前世界 -> 决定一个动作 -> 执行动作 -> 世界变化 -> 再看一眼。**

### 1. 什么是 robot policy

#### 最简单定义

`policy` 就是一个规则，告诉机器人：

**看到某种情况时，应该输出什么动作。**

你可以先把它理解成一个函数：

```text
policy: observation -> action
```

如果 observation 更复杂，也可以写成：

```text
policy: (image, state, language) -> action
```

#### 例子

如果机器人看到杯子在桌子左边，policy 可能输出：

1. 手臂向左移动一点
2. 夹爪张开
3. 末端向下靠近

这不代表机器人“懂了杯子是什么”，而是代表它学会了：

**在某种输入下，什么动作更可能把任务做对。**

#### 在机器学习里，policy 常常是什么

在机器人学习里，policy 往往是一个神经网络。它不是手写 if-else，而是从数据里学出来的。

所以你看到论文里写：

```text
a_t = π(o_t)
```

它的意思只是：

**时刻 `t` 的动作 `a_t`，由 policy `π` 根据当前 observation `o_t` 决定。**

#### 在 RTC 里对应什么

RTC 里的 base policy 就是这个 `π`。RTC 不负责训练这个 policy，它负责的是：

**怎么让这个 policy 在有延迟的现实系统里更合理地执行。**

### 2. 什么是 observation

#### 最简单定义

`observation` 是机器人当前能拿到的输入信息。

这些信息不一定是“世界的完整真相”，只是机器人现在看得到、量得到的东西。

#### 常见 observation 有哪些

1. 相机图像
2. 关节角度
3. 关节速度
4. 末端位置
5. 夹爪开合状态
6. 语言指令
7. 力觉、触觉、深度信息

#### 为什么叫 observation，不直接叫 state

因为机器人通常看不到“完整世界状态”。

例如：

1. 桌子后面有什么可能看不见
2. 物体内部摩擦力看不见
3. 相机有遮挡、噪声、延迟

所以在很多论文里更谨慎的说法是 observation，而不是 state。

#### 在 RTC 里对应什么

论文里常写 `o_t`，意思就是：

**时刻 `t` 的 observation。**

RTC 的关键问题之一是：

当新 chunk 真正开始执行时，它对应的 observation 已经有点旧了。

### 3. 什么是 action

#### 最简单定义

`action` 是机器人在当前时刻实际发出去的控制指令。

你可以把它理解成：

**机器人下一刻准备怎么动。**

#### 常见 action 长什么样

不同系统里 action 的含义不一样，常见有：

1. 下一个关节位置
2. 关节速度
3. 关节力矩
4. 末端位姿增量
5. 夹爪开或关

#### 为什么 action 不是“完成任务”

因为机器人不是一步到位完成任务的。

“抓杯子”这种任务，在控制层面会被拆成很多很小的 action：

1. 手臂移动 1 厘米
2. 再移动一点
3. 夹爪张开
4. 再向下
5. 闭合夹爪

也就是说：

**任务是高层目标，action 是底层瞬时控制。**

#### 在 RTC 里对应什么

论文里写 `a_t`，就是时刻 `t` 执行的动作。

而 `A_t = [a_t, a_{t+1}, ..., a_{t+H-1}]` 表示一整个 action chunk，也就是一串未来动作。

### 4. 什么是 closed-loop

#### 最简单定义

`closed-loop` 的意思是：

**机器人会不断根据最新 observation 修正自己的动作。**

它不是一开始计划完所有动作，然后完全不再看环境。

#### 和 open-loop 的区别

**open-loop：**

先生成一串动作，然后不看新情况，直接执行。

例如：

1. 现在看到杯子在这里
2. 一口气规划未来 20 步
3. 中间不再看环境
4. 哪怕杯子被人碰歪了，还是照原计划执行

**closed-loop**

每执行一点，就重新看看世界，再修下一步。

例如：

1. 现在看到杯子在这里
2. 先走一步
3. 再看一眼，发现杯子偏了
4. 立刻修动作

#### 为什么机器人更需要 closed-loop

因为现实世界有太多不确定性：

1. 物体可能滑动
2. 相机有噪声
3. 执行动作会有误差
4. 外界可能突然变化

所以一个真正可靠的机器人系统，不能只靠 open-loop。

#### RTC 为什么会一直强调这个

因为 action chunking 天然会把系统往更 open-loop 的方向推。

一次输出一大段动作，意味着中间很多步都在执行“过去那个时刻做出的决定”。

RTC 想修补的核心之一就是：

**尽量保留 chunking 的平滑性，同时不要把系统变得太 open-loop。**

### 5. 什么是 control frequency

#### 最简单定义

`control frequency` 是机器人每秒更新多少次动作。

例如：

1. `10Hz` = 每秒更新 10 次 = 每 100ms 一次
2. `50Hz` = 每秒更新 50 次 = 每 20ms 一次
3. `100Hz` = 每秒更新 100 次 = 每 10ms 一次

#### 为什么它重要

因为它决定了机器人反应有多快。

如果控制频率太低，机器人就像“慢半拍”：

1. 看到变化晚
2. 发出修正动作也晚
3. 运动会显得迟钝

#### 一个很重要的量：控制周期

频率和周期是一回事的两种表达：

1. `50Hz` 对应 `20ms`
2. `20Hz` 对应 `50ms`

在 RTC 里，论文用 `Δt` 表示一个控制周期。

也就是：

**每隔 `Δt`，控制器就必须拿到一个新的 action。**

#### 为什么这会逼出“延迟问题”

假设机器人是 `50Hz`，也就是每 `20ms` 必须拿一个 action。

但如果模型推理一次要 `80ms`，那就意味着：

1. 控制器已经走了 4 步
2. 新动作还没出来

这就是 RTC 里反复强调的 `inference delay`。

### 6. 总结

**把这 5 个概念串起来**

现在把它们连成一条链：

1. 机器人通过 **observation** 看当前情况
2. **policy** 根据 observation 输出 **action**
3. 机器人按某个 **control frequency** 持续执行 action
4. 执行动作后环境变化，机器人再拿到新的 observation
5. 如果系统不断用新 observation 修正动作，这就是 **closed-loop**

也可以写成：

```text
observation -> policy -> action -> environment changes -> new observation
```

**这和 RTC 的关系到底是什么**

现在你可以把 RTC 的问题重新翻译成最基础的话：

1. 机器人需要高频 closed-loop 控制
2. 但大模型 policy 太慢，来不及每一步都重新算
3. 所以大家用 action chunking，一次算一串 action
4. 可是一串 action 执行太久，又会削弱 closed-loop 能力
5. RTC 就是在这个矛盾里做平衡

也就是说，RTC 不是凭空出现的新技巧，而是对这个基础控制回路的一个工程修补方案。

**你现在应该已经能回答的问题**

1. policy 是什么
2. observation 和 state 为什么不完全一样
3. action 为什么是底层控制指令，而不是任务本身
4. closed-loop 为什么对机器人特别重要
5. control frequency 为什么会把模型延迟变成真实问题

## Stage 02: Imitation Learning Basics

这一课只解决 4 个问题：

1. 什么是 imitation learning
2. 什么是 behavior cloning
3. 什么是 rollout
4. 什么是 train-test gap

这四个概念是你从“机器人会执行动作”过渡到“机器人策略是怎么学出来的”的关键一层。

### 1. 什么是 imitation learning

很多机器人策略不是靠手写规则，也不是靠自己慢慢试出来的，而是**先看人或专家怎么做，再学着模仿。**这就是 imitation learning 最朴素的直觉。

#### 最简单定义

`imitation learning` 就是：

**给机器人看一批示范数据，让它学会在类似情况下做出类似动作。**

这些示范数据通常长这样：

```text
(observation, action)
```

或者更完整一点：

```text
(observation_t, action_t) for t = 1, 2, 3, ...
```

也就是一段任务执行过程里，每一步“看到了什么”和“当时做了什么”。

#### 直觉例子

假设有人示范“把杯子拿起来放进盒子”：

1. 摄像头拍到杯子在桌子左边
2. 专家把手臂往左伸
3. 摄像头拍到手接近杯子
4. 专家闭合夹爪
5. 摄像头拍到杯子被拿起
6. 专家把杯子移到盒子上方

机器人看到很多这样的轨迹，就会学到：

**在某种 observation 下，专家通常会采取什么 action。**

#### imitation learning 和 reinforcement learning 的区别

你现在先只记住最粗的区别：

1. imitation learning：看示范，学模仿
2. reinforcement learning：自己试，靠奖励慢慢学

在机器人操作里，imitation learning 很常见，因为：

1. 真实机器人试错代价高
2. 数据采集通常就是人类示范或 teleoperation
3. 从 demonstration 起步更稳定

#### 在 RTC 里对应什么

RTC 默认你的 base policy 已经训练好了，而这个 base policy 往往就是通过 imitation learning 训练出来的。

所以 RTC 不是在解决“怎么学会任务”，而是在解决：

**已经学会了以后，怎么在真实时间约束下把动作执行得更好。**

### 2. 什么是 behavior cloning

#### 最简单定义

`behavior cloning` 是 imitation learning 里最经典、最直接的一种做法：

**把专家动作当成监督信号，直接训练一个模型从 observation 预测 action。**

可以把它理解成监督学习：

```text
input  = observation
label  = expert action
model  = policy
```

#### 用一句式子表示

```text
policy(observation) ≈ expert action
```

也就是说，模型要学到：

**专家在这个 observation 下会怎么做，我也尽量输出一样的动作**

#### 为什么叫 cloning

因为它本质上是在“复制专家行为”

不是让模型自己发明新策略，而是尽量把专家示范复刻出来

#### 行为克隆的优点

1. 简单直接
2. 容易训练
3. 不需要在线试错
4. 很适合先把机器人做起来

#### 行为克隆的局限

它最核心的问题是：

**训练时看到的是专家轨迹，测试时执行的是模型自己的轨迹。**

一旦模型稍微偏一点，后面看到的 observation 就会和训练数据里的 observation 越来越不一样

这就引出了后面要讲的 `train-test gap`

#### 在 RTC 里对应什么

很多 action chunking policy、本体模型、甚至 VLA 的底层动作专家，都是某种 behavior cloning 风格训练出来的

RTC 之所以会很在意“动作不要突变”，一个重要原因就是：

**突变会把系统带到训练数据没覆盖的状态，导致模型更容易失控。**

### 3. 什么是 rollout

#### 最简单定义

`rollout` 就是：

**让 policy 真正一帧一帧地跑起来，连续和环境交互，看看最终会发生什么。**

你可以把它理解成“把模型放出去执行一整段任务”

#### 为什么 rollout 很重要

因为训练时模型只是在做单步预测，但机器人任务真正关心的是：

**连续执行很多步之后，任务到底成没成功。**

一个 policy 可能单步预测看起来不错，但 rollout 一长就崩。

#### 一个直觉例子

假设模型每一步都只有一点点误差：

1. 本来该向左 1cm，结果向左 0.8cm
2. 下一步 observation 已经有一点偏差
3. 模型又在偏掉的 observation 上再犯一点小错
4. 误差逐步积累

于是：

**单步看起来还行，整段 rollout 却失败。**

#### 训练和 rollout 的差别

训练时通常是：

1. 拿专家给的数据
2. 看当前 observation
3. 预测专家 action
4. 算 loss

rollout 时则是：

1. 模型自己输出 action
2. 环境真的跟着变
3. 下一个 observation 是模型自己“造成”的
4. 一路滚下去

所以 rollout 更接近真实部署。

#### 在 RTC 里对应什么

RTC 论文里仿真和真实实验，本质上都是在比较不同执行策略下的 rollout 效果：

1. 同步推理 rollout 如何
2. naive async rollout 如何
3. RTC rollout 如何

也就是说，RTC 关心的不是单步 loss，而是：

**在长时间连续执行里，系统还能不能稳、快、准。**

### 4. 什么是 train-test gap

#### 最简单定义

`train-test gap` 指的是：

**训练时模型接触到的数据分布，和测试时真正遇到的数据分布，不一样。**

这是机器人 imitation learning 里最关键的问题之一

#### 为什么会出现

因为训练时你喂给模型的，大多是专家轨迹上的 observation

但测试时，执行动作的是模型自己，不是专家

只要模型有一点误差，形成了误差累积，一个小偏差会层层传递，就会把自己带到训练里没怎么见过的新状态

#### 这和 closed-loop 的关系

closed-loop 能部分缓解这个问题，因为系统会不断重新看 observation 并修正

但如果你的动作执行方式让系统越来越像 open-loop，train-test gap 就更容易放大

#### 这和 RTC 的关系

RTC 很关心 chunk 边界处的 jerk 和 discontinuity，不只是因为“看起来不平滑”，更因为：

**这种不连续动作会把机器人带进更偏、更怪、更 OOD 的状态，放大 train-test gap。**

所以 RTC 的价值不只是更顺，还在于：

**它减少了执行时把 policy 推出训练分布的风险。**

### 5. 总结

现在把第二课的核心链路串起来：

1. 先收集 expert demonstration
2. 用 imitation learning / behavior cloning 训练出一个 policy
3. 训练时看的是专家给的数据
4. 测试时让 policy 自己 rollout
5. rollout 一旦偏掉，就会暴露 train-test gap

这也是为什么机器人论文不能只看训练 loss，必须看 rollout 和成功率

**为什么这层知识对 RTC 很重要**

因为 RTC 不是“训练一个更强的 policy”，而是“让已有 policy 的 rollout 更稳定”

换句话说：

1. 第一课告诉你 control loop 是什么
2. 第二课告诉你这个 loop 里的 policy 通常是怎么学来的，以及为什么 rollout 容易崩
3. RTC 则是在这之上处理实时执行与连续性问题

所以第二课其实是在回答：

**为什么机器人系统这么怕动作突变、延迟和分布偏移。**

**你现在应该已经能回答的问题：**

1. imitation learning 和 reinforcement learning 最粗的区别是什么
2. behavior cloning 为什么可以看成监督学习
3. rollout 为什么比单步预测更接近真实部署
4. train-test gap 为什么会在机器人里累积放大
5. RTC 为什么会在意动作连续性，而不只是最终能不能动起来

## Stage 03: VLA Basics

这一课只解决 4 个问题：

1. 什么是 VLA
2. 它和传统专用 robot policy 有什么区别
3. 为什么它更强
4. 为什么它也更慢，并因此催生 RTC 这类方法

这节课是你从“普通机器人策略”走向“为什么 RTC 主要讨论 VLA”的关键一层。

### 1. 什么是 VLA

`VLA = Vision-Language-Action`

最朴素地说，就是一种机器人策略，它不只看状态和图像，还试图理解语言指令，并输出动作。

你可以先把它理解成：

```text
(image, state, language) -> action
```

或者更完整一点：

```text
(image, state, language, history) -> action or action chunk
```

#### 最简单定义

VLA 是一种把视觉、语言和动作统一起来的机器人模型。

它的目标不是只会一个固定任务，而是希望机器人能在更多任务、更复杂场景里工作。

#### 它的三个部分分别是什么

1. `Vision`
   机器人看图像、视频、多视角相机画面
2. `Language`
   机器人接收文字任务，如“把红杯子放进盒子里”
3. `Action`
   机器人输出真正的控制动作

#### 在 RTC 里为什么总提 VLA

因为 RTC 的动机之一就是：

**这类模型越来越强，但推理越来越慢。**

一旦它们被用于真实机器人控制，延迟就会变成核心矛盾。

> 前面已经说过，`policy` 的抽象定义一直是：
>
> ```text
> observation -> action
> ```
>
> 只要一个模型根据 observation 输出 action，它就是一种 robot policy，所以VLA 是 **robot policy 里更大、更通用的一类**

### 3. 为什么 VLA 更强

#### 原因 1：输入信息更多

它不只看状态，还看图像，还可能看语言。

这意味着它对任务背景和环境变化有更丰富的感知能力。

#### 原因 2：可以利用 vision-language 预训练

很多 VLA 并不是从零开始学机器人，而是站在已有视觉语言模型能力之上。

这让模型可能具备：

1. 更好的语义理解
2. 更好的视觉表征
3. 更强的开放世界泛化潜力

#### 原因 3：任务表达更自然

如果任务可以用语言指定，那么一个模型就更容易覆盖多任务，而不是每个任务都单独做接口。

#### 原因 4：数据规模更大

VLA 往往想吸收更多来源的数据：

1. 机器人 demonstration
2. 多任务数据
3. 视觉语言预训练知识

> 但要注意，VLA 不是“万能机器人大脑”，只是比传统单任务策略更朝通用化方向走了一步
>

### 4. 为什么 VLA 也更慢

#### 最直接原因：模型更大

更强通常意味着：

1. 更多参数
2. 更重的视觉编码器
3. 更复杂的 transformer / decoder
4. 更长的输入序列

所以推理自然更慢。

#### 原因 2：输入模态更多

处理两路图像、状态、语言，成本本身就比只吃一个 state 大得多。

#### 原因 3：很多 VLA 不是一步出动作

有些 VLA 还会：

1. 输出 action chunk
2. 用 diffusion / flow matching 多步生成动作

这里的 diffusion / flow policy 可以先这样理解：

- **它们不是一步直接吐出动作**，而是从一个随机噪声开始，经过多步迭代，逐渐把噪声变成合理的 action chunk。
- **diffusion-based policy**：更像“反复去噪”，一步一步把噪声还原成动作序列。
- **flow-based policy**：更像“沿着一个学到的更新方向持续推进”，把噪声逐步推到真实动作分布上。
- 对初学者来说，这两类方法现在只要记住一个共同点就够了：**它们都是迭代生成动作 chunk，而不是一次前向就直接输出动作。**

这件事和 RTC 的关系非常直接：

1. 这类模型往往推理更慢，因为它们要做多步生成；
2. 但它们也天然更适合做 **inpainting / guidance**，因为你可以在生成过程中不断施加约束；
3. RTC 正是利用这一点，先把必须和旧 chunk 对齐的前缀“冻住”，再在约束下补全剩余动作。

这会进一步增加延迟。

#### 关键矛盾

机器人控制想要的是：**高频、实时、闭环。**

但 VLA 给你的是：**更强、更大、更慢。**

这就是 RTC 这条研究线要解决的核心张力。

### 5.  VLA 与 action chunking

#### 最朴素原因

如果模型太慢，就不可能每一步都重新推理。

于是常见做法变成：

1. 一次推理输出一串未来动作
2. 连续执行其中一部分
3. 再去算下一串

这就是 action chunking

#### 好处

1. 降低推理调用频率
2. 动作更平滑
3. 大模型更容易在实际系统里跑起来

#### 代价

1. chunk 执行期间反应性下降
2. chunk 之间可能不连续
3. inference delay 会让 prediction 和真正 execution 错位

于是你可以看到：

**VLA 越大 -> 越需要 chunking -> 越容易暴露实时执行问题 -> 越需要 RTC 这类方法。**

### 6. RTC 在 VLA 生态里的位置

现在你可以把 RTC 的定位说清楚了：

它不是在回答：

1. 如何训练一个更强的 VLA
2. 如何让 VLA 拥有更好的语言理解
3. 如何扩大机器人数据集

它回答的是：

**当你已经有了一个强但慢的 action-chunking VLA，怎样让它在真实时间约束下更平滑地执行。**

这就是 RTC 的精确位置。

> 第一次读 RTC，你完全不需要掌握所有 VLA 论文。
>
> 你只需要先知道：
>
> 1. VLA 是面向通用机器人操作的大模型策略
> 2. 它通常输入视觉、语言和状态，输出动作
> 3. 它往往很大，所以延迟高
> 4. 为了部署，常常使用 action chunking
> 5. RTC 就是在这个部署阶段修补实时性问题
>

### 7. 总结

**第一课告诉你**

机器人控制是：

```text
observation -> policy -> action -> new observation
```

**第二课告诉你**

这个 policy 往往是通过 demonstration 和 behavior cloning 学出来的，而且 rollout 时会有 train-test gap。

**第三课告诉你**

现在这个 policy 可能不再是一个小而专用的模型，而是一个更大、更通用、也更慢的 VLA

于是 RTC 的问题自然出现：

**如何让这种强但慢的策略，仍然能在高频控制里工作**

## Stage 04: Action Chunking Basics

这一课只解决 5 个问题：

1. 什么是 action chunking
2. 为什么大家会用它
3. 它解决了什么问题
4. 它又制造了什么新问题
5. RTC 里的 `H / s / d` 到底分别是什么

这一课是进入 RTC 论文正文前最关键的一层，因为 RTC 的整个问题设定都建立在 action chunking 上。

### 1. 什么是 action chunk

action chunking 的核心就是：

**模型一次不只生成 1 个动作，而是一次生成未来一小段动作序列**

你可以把它理解成“打包预测未来几步动作”

#### 最简单定义

`action chunk` 就是一串未来动作

例如：

```text
A_t = [a_t, a_{t+1}, a_{t+2}, a_{t+3}, ...]
```

这里：

1. `a_t` 是当前时刻的动作
2. `a_{t+1}` 是下一步动作
3. `a_{t+2}` 是下下步动作
4. 整个 `A_t` 就是时刻 `t` 预测出来的一整段 future actions

#### 和单步 action 的区别

如果不用 chunking，模型每次只输出一步：

```text
o_t -> a_t
```

用了 chunking 以后，模型每次输出一串：

```text
o_t -> [a_t, a_{t+1}, ..., a_{t+H-1}]
```

这就是从“单步控制”变成了“分段控制”

### 2. 为什么大家会用 action chunking

>它能让大模型更容易部署，也能让动作更连贯

#### 原因 1：减少推理频率

如果模型每一步都要重新推理一次，计算成本会很高

但如果一次就产出未来一串动作，那么：

1. 模型推理次数更少
2. 系统更容易在现实中跑起来
3. 对大模型尤其重要

#### 原因 2：动作通常更平滑

一次输出一段未来动作，模型更容易给出连贯的轨迹，而不是一步一步抖着走

#### 原因 3：更符合很多操作任务的短时结构

很多动作在短时间内本来就不是完全独立的

例如：

1. 伸手去抓一个物体
2. 闭合夹爪
3. 抬起物体

这些动作天然就有局部连续性。一次预测一小段，往往更自然

### 3. action chunking 带来的核心代价

你一次预测得越远，中间就越少有机会重新看环境并修正动作

这意味着：

**chunking 在提升平滑性和计算效率的同时，会牺牲反应性。**

> 假设机器人看到杯子在桌子中央，于是一次预测了未来 8 步动作，但刚执行到第 3 步时，杯子被人碰歪了一点，如果系统还在执行旧 chunk 的后半段，那它接下来的动作仍然是基于“旧杯子位置”做出的决定
> 
> 这就是 reactivity 下降

#### 所以 chunking 的本质 trade-off 是什么

1. chunk 长一些：推理少、动作稳，但更像 open-loop
2. chunk 短一些：更灵活，但边界更频繁，切换更容易出问题

RTC 整篇论文都在围绕这个 trade-off 打转

### 4. RTC 里最关键的三个量：H、s、d

这一课你一定要把这三个量记牢

#### `H`: prediction horizon

**一个 chunk 总共预测多少步动作。**

例如 `H = 8`，就表示一次输出未来 8 步动作。

#### `s`: execution horizon

**当前这个 chunk 实际先执行多少步，再切到下一次推理出来的新 chunk。**

注意：

模型可以预测 `H` 步，但不一定会把这 `H` 步全都执行完

很多时候只先执行前 `s` 步

#### `d`: inference delay

**从 observation 进来，到新 chunk 真正生成出来，中间晚了多少个控制步。**

如果控制器每 `20ms` 必须拿一个动作，而模型推理要 `80ms`，那就大约意味着：

```text
d = 4
```

也就是模型“慢了 4 步”

**举例：**

> 假设：
>
> 1. 模型一次预测 `H = 8` 步
> 2. 每次实际先执行 `s = 4` 步
> 3. 推理延迟 `d = 2`
>
> 这表示：
>
> 1. 现在模型根据 `o_t` 预测出 8 步动作
> 2. 系统先执行其中 4 步
> 3. 但下一次 chunk 不会立刻可用，而是要晚 2 个控制步才出来
>

这时你就会开始碰到 chunk 切换问题：

`d` 越大，说明新 chunk 越晚到

新 chunk 越晚到，就越需要依赖旧 chunk 顶住前面的动作

这也是 RTC 里为什么会有“frozen prefix”的原因

### 5. 为什么 `s` 不是越小越好，也不是越大越好

**如果 `s` 很大**

优点：

1. 切换少
2. 轨迹连续
3. 推理压力小

问题：

1. 反应慢
2. 新 observation 很久才能影响动作
3. 更像 open-loop

**如果 `s` 很小**

优点：

1. 理论上更灵活
2. 更接近 closed-loop

问题：

1. chunk 切换更频繁
2. 不连续问题更容易暴露
3. 如果 `d` 不小，新 chunk 根本来不及接上

`s`  实际是在平衡：

**反应性、平滑性、计算延迟、切换风险。**

> 如果没有延迟，也就是 `d = 0`，事情会简单很多
>
> 模型看到 `o_t`，几乎立刻就给出新 chunk
>
> 但现实里通常不是这样
>
> 一旦 `d > 0`：
>
> 1. 环境继续变化
> 2. 机器人自己也继续在动
> 3. 新 chunk 真正接管时，世界已经不是最初那个样子了
>
> 这时新 chunk 和旧 chunk 之间就更容易：
>
> 1. 对不上
> 2. 跳变
> 3. 产生 jerky motion
>

### 6. 关键约束

RTC 论文里有一个很关键的关系：

```text
d <= s <= H - d
```

你现在先不用抠证明，只要先理解它的直觉

#### 为什么要 `d <= s`

因为如果你执行得比延迟还短，新 chunk 还没到，旧 chunk 就先用完了。

那中间就会出现“没动作可执行”的空档。

#### 为什么要 `s <= H - d`

一个新 chunk 虽然总共预测了 H 步，但它出来时已经晚了 d 步。

所以它前面的 d 个动作，其实已经过时了，不能再拿来执行，能用的只剩 `H - d`步

这两个约束共同保证：

**当你异步生成下一个 chunk 时，当前系统总还有足够的动作可执行，不至于断掉。**

### 7.  action chunking 解决与制造的问题

#### 它解决的问题

1. 大模型不可能每一步都重新推理
2. 单步动作容易抖
3. 一次预测一段更符合短时连续运动

#### 它制造的问题

1. 反应性下降
2. chunk 边界可能不连续
3. inference delay 会导致 prediction-execution mismatch
4. 系统更容易偏向 open-loop

于是 RTC 的问题终于完整出现：

**当一个强但慢的模型用 chunking 来执行动作时，如何在有延迟的情况下仍然平滑、连续、及时地控制机器人。**

### 8. 总结

**第一课**

机器人控制是一个闭环：

```text
observation -> policy -> action -> new observation
```

**第二课**

这个 policy 通常是通过 imitation learning 学出来的，rollout 里会暴露 train-test gap。

**第三课**

这个 policy 可能还是一个很大的 VLA，因此更强，但也更慢。

**第四课**

为了让慢模型能部署，大家常常一次预测一串动作，也就是 action chunking

**你现在应该已经能回答的问题**

1. action chunking 是什么
2. 为什么它能减少推理频率
3. 为什么它会降低 reactivity
4. `H / s / d` 各自表示什么
5. 为什么 RTC 的问题本质上是“有延迟的 action chunking”

如果这 5 个问题你能讲清楚，第四层地基就有了


## Stage 05: Real-Time Inference Basics

这一课只解决 5 个问题：

1. 什么是 synchronous inference
2. 什么是 asynchronous inference
3. naive async 为什么会出问题
4. 什么是 prediction-execution mismatch
5. 为什么 RTC 会把问题写成 inpainting

这节课是从“知道 action chunking 是什么”，真正走到“为什么 RTC 非做不可”的关键一层。

第五课的核心矛盾可以先记成一句话：

**模型太慢，所以必须提前算下一段动作；但一旦提前算，真正执行时的世界就已经变了。**

这就是 RTC 要解决的问题原型。

### 1. 什么是 synchronous inference

#### 最简单定义

`synchronous inference` 就是：

**执行完当前一段动作后，停下来等待模型算出下一段动作，再继续执行。**

你可以把它理解成：

```text
执行 chunk A -> 停下等待 -> 得到 chunk B -> 再执行 chunk B
```

#### 为什么它很自然

因为它实现最直接：

1. 不需要后台并发推理
2. 不需要考虑新旧 chunk 怎么衔接
3. 系统逻辑最直观

#### 它的问题是什么

如果模型很慢，就会出现明显停顿。

例如：

1. 当前 chunk 执行完了
2. 新 chunk 还没算完
3. 机器人只能停着等

#### 为什么这在机器人里不好

因为机器人不是离线程序，它处在持续变化的物理世界里。

停顿会带来两类问题：

1. **速度变慢**
2. **动力学分布变了**

第二点尤其关键。很多模型训练时看到的是连续动作轨迹，但部署时却变成：

```text
动一会 -> 停一下 -> 再动一会
```

这会造成新的分布偏移。

#### 在 RTC 里对应什么

RTC 把 synchronous 作为最基础的 baseline，因为很多真实机器人系统默认就是这么运行的。

### 2. 什么是 asynchronous inference

#### 最简单定义

`asynchronous inference` 就是：

**机器人在执行当前 chunk 的同时，后台开始计算下一个 chunk。**

也就是：

```text
执行 chunk A 的同时 -> 后台推理 chunk B
```

这样理想情况下，当前 chunk 还没执行完，下一个 chunk 就已经准备好了。

#### 它的直接好处

1. 没有明显停顿
2. 推理时间被“藏”在执行时间后面
3. 运动会更连续

如果模型推理一次要几十到几百毫秒，而控制频率又很高，那么同步等待几乎一定会让系统变得很卡。

所以只要模型不够快，异步执行就会变成一个非常自然的选择。

异步虽然消除了等待，但会引入新的问题：

**新 chunk 是根据过去的 observation 算出来的，可它真正开始执行时已经是未来了。**

这就引出后面最重要的 mismatch。

### 3. naive async 是什么

#### 最简单定义

`naive async` 就是最朴素的异步版本：

1. 后台并行推理下一个 chunk
2. 新 chunk 一算好，就直接切过去
3. 不特别处理新旧 chunk 的兼容性

你可以把它理解成：

```text
旧 chunk 用到新 chunk 到达为止 -> 立刻切换到新 chunk
```

它比 synchronous 少了停顿，而且实现复杂度也不高

**但是：**

它默认认为：

**只要新 chunk 来了，就可以直接接上。**

可现实中这通常不成立，因为旧 chunk 和新 chunk 可能来自两个不同的“短期计划”，它们在边界处不一定连续。

#### 一个直觉例子

假设机器人绕开一个障碍物有两种模式：

1. 从左边绕
2. 从右边绕

旧 chunk 可能在执行“从左边绕”的动作。

而新 chunk 因为看到的是更早一点的 observation，或者因为生成模型采样到了另一种模式，可能倾向“从右边绕”。

这时如果直接切换，就会出现：

1. 位置、速度、加速度突变
2. 动作在边界处非常不自然
3. 机器人进入训练时没见过的动态状态

这就是论文里说的 jerk、mode-jumping 和 discontinuity。

### 4. 什么是 prediction-execution mismatch

#### 最简单定义

`prediction-execution mismatch` 指的是：

**模型预测动作时假定的时间区间，和这些动作真正被执行的时间区间，不是同一个区间。**

这是 RTC 背后最核心的问题。

#### 为什么会发生

因为推理需要时间。

模型在时刻 `t` 收到 `o_t`，开始预测未来动作。

但这些动作不会立刻执行，而是要等推理完成后才开始执行。

也就是说：

1. **prediction interval**：模型以为自己在为“现在开始的未来”做计划
2. **execution interval**：这些动作其实是在“更晚一点的未来”才真正落地

#### 一个非常直观的理解

模型像是在根据“2 秒前看到的画面”，给“现在”发动作指令。

即使是同一个动作序列，放在不同时间点执行，效果也可能完全不同。

#### 为什么机器人里这特别严重

因为在推理期间：

1. 环境在变
2. 机器人自己也在变
3. 旧 chunk 还在继续执行

所以到新 chunk 真正接管时，系统状态已经偏离了 prediction 时的假设。

**模型给出的动作，本来是对 prediction 时刻合理的，但拿到 execution 时刻去用，就可能不合理了。**

### 5. prediction interval 和 execution interval

#### prediction interval

模型开始推理时，默认自己在为哪一段未来时间生成动作。

#### execution interval

这些动作真正落在机器人身上的那段时间。

当 `d > 0` 时，新 chunk 并不是“现在就执行”，而是“晚几步才执行”。

所以你可以直觉地记成：

```text
execution interval = prediction interval 向后平移了 d 步
```

这就是为什么 naive async 虽然更快，却可能更不稳定。

### 6. 为什么 mismatch 会直接导致边界不连续

假设新 chunk 是根据 `o_t` 生成的。

但当它真正开始执行时，机器人已经因为旧 chunk 的后续动作移动到了别的位置。

这意味着：

1. 新 chunk 的第一步动作，默认的起点状态不对
2. 新旧 chunk 在拼接点上就容易冲突
3. 轨迹可能在边界处突然换方向或突然加速

所以边界不连续不是偶然现象，而是 mismatch 的自然结果。

### 7. 为什么 synchronous 和 naive async 都不够好

现在你可以非常清楚地看两者的 trade-off：

#### synchronous

优点：

1. 简单
2. 边界问题相对少

缺点：

1. 会停顿
2. 速度慢
3. 改变系统真实动力学

#### naive async

优点：

1. 没有停顿
2. 更连续地输出动作

缺点：

1. prediction-execution mismatch 直接暴露
2. 新旧 chunk 容易不连续
3. 可能产生非常 OOD 的加速度和轨迹

#### RTC 想同时修什么

RTC 想同时保住两件事：

1. **不要像 synchronous 那样停**
2. **也不要像 naive async 那样边界乱跳**

这就是 RTC 最精确的定位。

### 8. 为什么 RTC 要把问题写成 inpainting

#### 先看 RTC 面对的现实

当新 chunk 快要接管时：

1. 旧 chunk 的前一部分已经执行掉了
2. 旧 chunk 的后一部分还有参考价值
3. 新 chunk 又不能完全照抄旧 chunk，因为还得响应新 observation

所以 RTC 需要一种机制，既能：

1. 强制前面来不及改的部分与旧 chunk 对齐
2. 又允许后面部分根据新信息重新生成

#### 这为什么像 inpainting

图像 inpainting 是：

1. 已知一部分内容
2. 补全剩余部分
3. 补出来的结果要和已知部分自然衔接

RTC 里的对应关系是：

1. 已经确定要执行的动作前缀 = 已知部分
2. 还没决定好的未来动作 = 需要补全的部分
3. 新 chunk = 补全结果

所以 RTC 的核心直觉就是：

**不要把下一段动作当成“从零另起炉灶地生成”，而要把它当成“在旧 chunk 约束下补全出来”。**

这就是方法层的入口。

### 9. RTC 的三段式结构是怎么从这里来的

理解了 mismatch 和 inpainting 之后，RTC 的三段式结构就不再是拍脑袋设计：

1. **frozen prefix**
   这部分在新 chunk 到来前就已经注定要执行，必须和旧 chunk 一致
2. **soft guidance region**
   这部分旧 chunk 还有参考意义，但不能硬性锁死
3. **free generation region**
   这部分可以更自由地响应新 observation

这三段本质上是在回答一个问题：

**哪些动作已经来不及改，哪些动作可以参考旧计划，哪些动作应该重新生成。**

### 10. 总结

**synchronous inference**

先执行完当前 chunk，再等待下一个 chunk 算出来。

它简单，但会停顿。

**asynchronous inference**

一边执行当前 chunk，一边后台计算下一个 chunk。

它更连续，但会引入延迟带来的时间错位。

**naive async 的问题**

新 chunk 来了就直接切换，默认新旧 chunk 可以自然衔接。

这个假设通常不成立，所以边界容易跳变。

**prediction-execution mismatch**

模型预测动作时假定的时间区间，和这些动作真正执行的时间区间，不是同一个区间。

这就是异步执行下最核心的问题。

**RTC 为什么像 inpainting**

因为它不是从零重生一整段动作，而是在旧 chunk 约束下，对未来动作做补全。

**你现在应该已经能回答的问题**

1. synchronous inference 和 asynchronous inference 的区别是什么
2. 为什么 naive async 不等于“问题已经解决”
3. prediction-execution mismatch 的本质是什么
4. 为什么 mismatch 会导致 chunk 边界不连续
5. 为什么 RTC 自然会走向 inpainting 这个建模方式

## Stage 01-05 串联总结

如果把前五课压成一条主线，其实就是：

**机器人控制本来是一个闭环系统；这个闭环策略通常靠 imitation learning 学出来；现在这个策略又越来越像强但慢的 VLA；为了让慢模型能部署，大家引入 action chunking；而一旦 chunking 遇到真实推理延迟，就会出现 synchronous 的停顿和 naive async 的不连续，RTC 就是在这里出现的。**

也可以把它拆成 5 句话记：

1. `Stage 1` 机器人控制最基本的闭环结构：`observation -> policy -> action`。
2. `Stage 2` 这个 policy 往往是从示范里学出来的，而且 rollout 很怕分布偏移。
3. `Stage 3` 今天的 policy 往往不只是小控制器，而可能是更强也更慢的 VLA。
4. `Stage 4` 为了部署慢模型，系统会一次生成一段动作，也就是 action chunking。
5. `Stage 5` 当 chunking 遇到真实延迟时，为什么会出现 prediction-execution mismatch，以及 RTC 为什么自然会走向 inpainting

