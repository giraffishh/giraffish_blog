index_img: >-
  https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-03-25-1774442387365.webp
banner_img: >-
  https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-03-25-1774421924055.webp
title: VLA-RTC：[NeurIPS 2025] RTC
categories:
  - 论文批读
tags:
  - VLA
  - VLA-RTC
comments: true
abbrlink: bfc37577
date: 2026-03-25 22:55:53
updated: 2026-03-25 21:05:00

# Real-Time Execution of Action Chunking Flow Policies (RTC)

**作者**: Kevin Black, Manuel Y. Galliker, Sergey Levine
**机构**: Physical Intelligence, UC Berkeley
**会议**: NeurIPS 2025
**链接**: [arXiv 2506.07339](https://arxiv.org/abs/2506.07339) | [项目页面](https://pi.website/research/real_time_chunking) | [代码 (仿真)](https://github.com/Physical-Intelligence/real-time-chunking-kinetix)


## 一句话总结

RTC 是一种纯推理时算法，通过将异步 action chunking 建模为 **inpainting 问题**（冻住已执行 action + soft masking guidance 填充剩余部分），让任何 diffusion/flow-based VLA 实现平滑实时执行，**无需重新训练**。


## 核心贡献

1. **Inpainting 框架**: 首次将 diffusion/flow inpainting（ΠGDM guidance）应用于实时机器人控制
2. **Soft Masking**: 指数衰减的 guidance 权重，确保跨 chunk 连续性，比 hard masking 显著更好
3. **Guidance Weight Clipping (β)**: 适配少 denoising steps 的控制场景，防止 action chunk 发散
4. **Kinetix Benchmark**: 12 个高动态仿真任务，填补现有 quasi-static benchmark 的空白
5. **大规模真实实验**: 6 个双臂任务 × 480 episodes × 28h 机器人时间，用 π₀.₅ 验证


## 📖 批读导航

| Section                                            | 内容                                                       |
| -------------------------------------------------- | ---------------------------------------------------------- |
| [00 - Abstract](sections/00-abstract.md)           | 摘要 + Figure 1（点火柴演示 + 轨迹对比）                   |
| [01 - Introduction](sections/01-introduction.md)   | 动机：物理世界不等你 + action chunking 的两难              |
| [02 - Preliminaries](sections/02-preliminaries.md) | 符号定义 + flow matching 基础 + 延迟数据 + Figure 2/3      |
| [03 - Method](sections/03-method.md)               | **核心方法**：ΠGDM inpainting + soft masking + Algorithm 1 |
| [04 - Experiments](sections/04-experiments.md)     | 仿真 12 任务 + 真实 6 任务 + Figure 5/6                    |
| [05 - Related Work](sections/05-related-work.md)   | 定位：vs 加速推理、MPC、BID、System 1/2                    |
| [06 - Discussion](sections/06-discussion.md)       | 局限性 + 未来方向                                          |
| [07 - Appendix](sections/07-appendix.md)           | β 消融 + 延迟分解 + soft masking 消融 + 超参数             |


## 关键数字

| 指标                  | 数值                         |
| --------------------- | ---------------------------- |
| RTC 模型延迟          | 97ms (vs 76ms vanilla π₀.₅)  |
| 延迟开销              | +28% (来自反向传播)          |
| 控制频率              | 50Hz (Δt = 20ms)             |
| 支持的最大延迟        | 300ms+ (d ≈ 16, H=50 的 32%) |
| BID 延迟              | 223ms (RTC 的 2.3x)          |
| 仿真任务              | 12 (Kinetix, 高动态)         |
| 真实任务              | 6 (双臂, 含 2 个移动操作)    |
| 真实评估量            | 480 episodes, 28h            |
| β (guidance clipping) | 5                            |
| Denoising steps       | 5                            |


## 方法概览

```
执行线程 (50Hz)                推理线程 (后台)
─────────────────              ─────────────────
执行 chunk A:                  
  a₀ a₁ a₂ a₃ ...            收到 o，开始生成 chunk B
  ───────────────              ┌─────────────────────┐
  ↑ frozen (d步)               │ ΠGDM Inpainting:    │
  已执行，不可更改              │  frozen: W=1         │
                               │  soft:   W=exp decay │
  ↑ soft guidance              │  free:   W=0         │
  前一个 chunk 有参考值         └──────────┬──────────┘
                                          │
  ↑ free generation                       ↓
  前一个 chunk 没覆盖            新 chunk B 就绪 → 替换
```


## 与相关方法对比

| 方法                | 原理                       | 需要训练？      | 计算开销  | 延迟鲁棒性        |
| ------------------- | -------------------------- | --------------- | --------- | ----------------- |
| Synchronous         | 执行完停下等               | 否              | 1x        | ❌ 线性下降        |
| Temporal Ensembling | 多 chunk 取平均            | 否              | 1x        | ❌❌ 高延迟直接崩溃 |
| BID                 | 采样 N 个挑最好            | 需要 weak model | ~50x      | ⚠️ 中等            |
| **RTC**             | **Inpainting + soft mask** | **否**          | **~1.3x** | **✅ 完全鲁棒**    |


## 📊 Citation Landscape

**TLDR** (Semantic Scholar): *Results demonstrate that RTC is fast, performant, and uniquely robust to inference delay, significantly improving task throughput and enabling high success rates in precise tasks - such as lighting a match - even in the presence of significant latency.*

**引用统计**: 参考文献 70 篇 | 被引 71 次 | Influential Citations: 12

### 参考文献分组 (Top 5 per category, by citations)

#### Action Chunking / Real-Time Inference
| 论文                                                         | 年份 | 引用 |
| ------------------------------------------------------------ | ---- | ---- |
| Fine-Tuning Vision-Language-Action Models: Optimizing Speed and Success | 2025 | 350  |
| FAST: Efficient Action Tokenization for Vision-Language-Action Models | 2025 | 343  |
| Real-Time Neural MPC: Deep Learning Model Predictive Control for Quadrotors and Agile Robotic Platforms | 2022 | 193  |
| Control delay in Reinforcement Learning for real-time dynamic systems: A memoryless approach | 2010 | 75   |
| Bidirectional Decoding: Improving Action Chunking via Closed-Loop Resampling | 2024 | 25   |

#### VLA / Robot Policy
| 论文                                                         | 年份 | 引用  |
| ------------------------------------------------------------ | ---- | ----- |
| Diffusion policy: Visuomotor policy learning via action diffusion | 2023 | 2,702 |
| RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control | 2023 | 2,621 |
| OpenVLA: An Open-Source Vision-Language-Action Model         | 2024 | 1,832 |
| Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware | 2023 | 1,449 |
| π0: A Vision-Language-Action Flow Model for General Robot Control | 2024 | 1,327 |

#### Diffusion / Flow / Inverse Problems
| 论文                                                         | 年份 | 引用   |
| ------------------------------------------------------------ | ---- | ------ |
| Denoising Diffusion Probabilistic Models                     | 2020 | 28,506 |
| Flow Matching for Generative Modeling                        | 2022 | 3,719  |
| Flow Straight and Fast: Learning to Generate and Transfer Data with Rectified Flow | 2022 | 2,510  |
| RePaint: Inpainting using Denoising Diffusion Probabilistic Models | 2022 | 1,954  |
| Consistency Models                                           | 2023 | 1,636  |

#### Benchmarks / Datasets / Embodiment
| 论文                                                         | 年份 | 引用 |
| ------------------------------------------------------------ | ---- | ---- |
| BridgeData V2: A Dataset for Robot Learning at Scale         | 2023 | 574  |
| Open X-Embodiment: Robotic Learning Datasets and RT-X Models | -    | 284  |
| ALOHA Unleashed: A Simple Recipe for Robot Dexterity         | 2024 | 176  |
| RH20T: A Comprehensive Robotic Dataset for Learning Diverse Skills in One-Shot | 2023 | 171  |
| Kinetix: Investigating the Training of General Agents through Open-Ended Physics-Based Control Tasks | 2024 | 27   |

#### Control / Planning
| 论文                                                         | 年份 | 引用 |
| ------------------------------------------------------------ | ---- | ---- |
| Temporal Difference Learning for Model Predictive Control    | 2022 | 374  |
| QueST: Self-Supervised Skill Abstractions for Learning Continuous Control | 2024 | 47   |
| Thinking While Moving: Deep Reinforcement Learning with Concurrent Control | 2020 | 42   |
| Planning and Learning in Environments with Delayed Feedback  | 2007 | 34   |
| Process Systems Analysis and Control , chapter 18            | 2009 | 0    |

### 推荐论文（Semantic Scholar Recommendations）

| 论文                                                         | 年份 | 引用 | arXiv                                          |
| ------------------------------------------------------------ | ---- | ---- | ---------------------------------------------- |
| Causal World Modeling for Robot Control                      | 2026 | 10   | [2601.21998](https://arxiv.org/abs/2601.21998) |
| DynamicVLA: A Vision-Language-Action Model for Dynamic Object Manipulation | 2026 | 5    | [2601.22153](https://arxiv.org/abs/2601.22153) |
| RISE: Self-Improving Robot Policy with Compositional World Model | 2026 | 4    | [2602.11075](https://arxiv.org/abs/2602.11075) |
| VLAW: Iterative Co-Improvement of Vision-Language-Action Policy and World Model | 2026 | 4    | [2602.12063](https://arxiv.org/abs/2602.12063) |
| AsyncVLA: An Asynchronous VLA for Fast and Robust Navigation on the Edge | 2026 | 3    | [2602.13476](https://arxiv.org/abs/2602.13476) |
| WoVR: World Models as Reliable Simulators for Post-Training VLA Policies with RL | 2026 | 3    | [2602.13977](https://arxiv.org/abs/2602.13977) |
| World-Gymnast: Training Robots with Reinforcement Learning in a World Model | 2026 | 3    | [2602.02454](https://arxiv.org/abs/2602.02454) |
| How Fast Can I Run My VLA? Demystifying VLA Inference Performance with VLA-Perf | 2026 | 2    | [2602.18397](https://arxiv.org/abs/2602.18397) |
| Learning Native Continuation for Action Chunking Flow Policies | 2026 | 2    | [2602.12978](https://arxiv.org/abs/2602.12978) |
| RL-VLA3: Reinforcement Learning VLA Accelerating via Full Asynchronism | 2026 | 2    | [2602.05765](https://arxiv.org/abs/2602.05765) |

### 🔗 相关链接

- [Connected Papers](https://www.connectedpapers.com/main/2506.07339)
- [Semantic Scholar](https://www.semanticscholar.org/paper/d0f525dba7d3425e36316127424e67fe2c2fdb0d)
- [arXiv](https://arxiv.org/abs/2506.07339)

## Abstract

### 📌 预览

本文提出 Real-Time Chunking (RTC)，一种推理时算法，让 action chunking 的 diffusion/flow VLA 策略能平滑异步执行。核心思想：在执行当前 chunk 的同时生成下一个 chunk，通过 inpainting 保证 chunk 之间的连续性。无需重新训练，即插即用。

Modern AI systems, especially those interacting with the physical world, increasingly require real-time performance. However, the high latency of state-of-the-art generalist models, including recent vision-language-action models (VLAs), poses a significant challenge. While action chunking has enabled temporal consistency in high-frequency control tasks, it does not fully address the latency problem, leading to pauses or out-of-distribution jerky movements at chunk boundaries. This paper presents a novel inference-time algorithm that enables smooth asynchronous execution of action chunking policies. Our method, real-time chunking (RTC), is applicable to any diffusion- or flow-based VLA out of the box with no re-training. It generates the next action chunk while executing the current one, "freezing" actions guaranteed to execute and "inpainting" the rest. To test RTC, we introduce a new benchmark of 12 highly dynamic tasks in the Kinetix simulator, as well as evaluate 6 challenging real-world bimanual manipulation tasks. Results demonstrate that RTC is fast, performant, and uniquely robust to inference delay, significantly improving task throughput and enabling high success rates in precise tasks—such as lighting a match—even in the presence of significant latency. See https://pi.website/research/real_time_chunking for videos.

> 💡 **Abstract 批读**:
> - **问题**: VLA 模型太大（数十亿参数），推理延迟高，但机器人需要实时控制。Action chunking 只是部分解决方案——它在 chunk 边界处仍然会出现 **停顿**（同步推理等待）或 **抖动**（chunk 之间不连续）。
> - **方法**: RTC = 异步推理 + inpainting。核心操作两步：
>   1. **Freeze**: 把一定会被执行的 action（因为推理还没完成时它们已经在执行了）冻住
>   2. **Inpaint**: 基于冻住的前缀，用 flow matching 的 guidance 机制"填充"剩余 action，保证连续性
> - **关键卖点**: 纯推理时方法，**不需要重新训练**任何模型。适用于任何 diffusion 或 flow-based VLA。
> - **实验**: Kinetix 仿真（12 个高动态任务）+ 真实双臂操作（6 个任务，用 π₀.₅ 作为 base policy）
> - **结果**: 即使在 300ms+ 推理延迟下，仍能完成点火柴这种高精度任务。速度比同步推理快 20%，平滑性优于所有竞争方法。

![](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-03-25-1774451320771.webp)
*Figure 1: Top: RTC 使机器人能在超过 300ms 的推理延迟下完成高灵巧、高动态任务（如点火柴)。Bottom: RTC 比同步推理快 20%，比 temporal ensembling 更平滑。展示的是一只手臂肩关节在真实自主点火柴过程前 10 秒的位置、速度和加速度。*

> 💡 **Figure 1 批读**:
> - 上半部分的点火柴任务非常能说明问题：这需要精确的力控和时序配合，300ms 延迟意味着模型"看到"的世界已经是 0.3 秒前的了。
> - 下半部分的 joint 轨迹对比很直观：
>   - **Synchronous**（黑色）: 有明显的阶梯状停顿（chunk 边界处等待推理）
>   - **TE (Temporal Ensembling)**（绿色）: 虽然连续但抖动严重（加速度曲线波动大）
>   - **RTC**（蓝色）: 平滑且连续，加速度曲线最稳定
> - 这是 Physical Intelligence (π) 的工作，用的是 π₀.₅ 模型，3B 参数级别的 VLA。

### 🔖 Section 总结

#### 核心洞察
1. **VLA 延迟问题不可回避**: 模型越大越强，延迟也越高。即使硬件进步，模型也会跟着变大。
2. **Action chunking 不够**: 它只解决了时序一致性，没解决延迟带来的 chunk 边界不连续。
3. **RTC 的定位很聪明**: 不改训练、不改模型，只在推理时做文章。这意味着可以直接给现有 VLA "加装"。

## 1 Introduction

### 📌 预览
Introduction 从 AI 系统越来越直接控制物理世界出发，引出实时性的核心矛盾：模型越大越强，但也越慢。然后分析 action chunking 的不足（仍有延迟问题），引出 RTC 的 inpainting 思路。


As AI systems have become more capable, they have also interacted more and more directly with their environment. Whether they're executing terminal commands [45], playing Pokémon on livestream [20], or browsing the web on your behalf [65], recent advances—driven primarily by large-scale deep learning—have enabled these systems to increasingly control, rather than merely process, the vast heterogeneity of the outside world. Embodied agents, where machine learning models directly control real, physical constructs, are perhaps the quintessential example. The same advances fueling agentic language and vision models are also making great strides in physical intelligence on platforms ranging from humanoid robots [4] to autonomous cars [60].

> 💡 **开场批读**: 作者先把 embodied AI 放在一个更大的叙事里——从执行命令、玩游戏到浏览网页，AI 正在从"处理信息"转向"控制世界"。引用了 Gemini 玩 Pokémon [20] 和 BrowseComp [65] 来说明这个趋势。Physical Intelligence 嘛，名字就说明了方向。


Cyber-physical systems, unlike chatbots and image generators, always operate in real time. While a robot is "thinking", the world around it evolves according to physical laws. Thus, delays between inputs and outputs have a tangible impact on performance. For a language model, the difference between fast and slow generation is a satisfied or annoyed user; for a robot action model, on the other hand, it could be the difference between a robot handing you a hot coffee or spilling it in your lap.

> 💡 **核心矛盾**: 这段话精确地指出了 embodied AI 和 chatbot 的本质区别——**物理世界不会等你**。LLM 慢一点用户只是不耐烦，但机器人慢一点可能就把咖啡洒了。这是整篇论文的动机。


Unfortunately, the effectiveness of modern large-scale machine learning comes with high latency as an unavoidable side effect. Large language models (LLMs), vision-language models (VLMs), and vision-language-action models (VLAs)—the last referring to a class of models designed for visuomotor control—have billions of parameters [8, 30, 5, 4, 58]. These models are not only slow to run, but also require heavy-duty hardware that is difficult to attach to edge devices such as mobile robots, adding even more overhead for remote inference. Edge hardware will improve over time, but as robot datasets grow in size, so will the best VLAs [28].

> 💡 **延迟不可避免**: 这里引用了 scaling law [28] 来论证：硬件会进步，但模型也会跟着变大。所以**延迟问题不会自己消失**，需要从算法层面解决。这个论点很有说服力——你不能指望等 GPU 变快来解决问题。


Thus, applying large models to real-time control problems effectively will require some form of asynchronicity: that is, a model must think about its future actions while executing a previous one. Action chunking [68, 33, 11], where a model outputs and executes a sequence of multiple actions for each inference call, presents a partial solution. Although action chunking has already achieved many state-of-the-art results in dexterous manipulation [5, 4, 58], it still suffers from the latency problem. Chunking sacrifices the reactivity of a system to external stimuli and also introduces discontinuities in the transition points between chunks, as adjacent chunks may jump between different modes (or "strategies") from the learned action distribution. Such anomalies are especially harmful to learning-based systems, as they produce a distribution shift in dynamics that the model is likely not equipped to handle. Naive smoothing strategies, such as averaging multiple predictions together [68], are not guaranteed to produce valid actions and may only make matters worse (e.g., see Figure 2).

> 💡 **Action chunking 的两难**: 这段分析得很到位：
> - **Execution horizon 长** → 不够灵活，对新信息反应慢
> - **Execution horizon 短** → chunk 边界频繁切换，容易 **mode-jumping**（上一个 chunk 想走左边，下一个想走右边）
> - **Temporal Ensembling** 取平均，看似能平滑，但**平均多个有效 action 不一定还是有效 action**（想想多模态分布的均值）
>
> 关键概念 **mode-jumping**: 这在 multi-modal 策略中是个严重问题。比如绕障碍物可以走左边也可以走右边，两个连续 chunk 如果选了不同模式，中间的突变就是 OOD 的。


A good real-time system must produce a consistent and continuous control signal, incorporating the latest observations without perturbing the environment's natural dynamics or the model's ability to produce correct actions. In this work, we present real-time chunking (RTC), which poses asynchronous action chunking as an inpainting problem. Our algorithm generates the next action chunk while executing the previous one, freezing the actions that are guaranteed to be executed (due to inference delay) and "inpainting" the rest. It is applicable to any diffusion- [22] or flow-based [36] VLA, and operates purely at inference time, requiring no changes to existing training recipes.

> 💡 **RTC 核心思想**: "asynchronous action chunking as an inpainting problem"——把异步执行看成 inpainting 问题。已经被执行（或必将被执行）的 action 就是"已知像素"，需要生成的新 action 就是"被 mask 掉的区域"。这个类比非常自然，因为 diffusion/flow 模型本身就擅长 inpainting。


Our contributions are as follows. First, we present a novel system for asynchronous, real-time inference of action chunking diffusion- or flow-based policies for continuous control. Since standard simulation benchmarks are quasi-static—and have mostly been saturated with pseudo open-loop inference strategies [11]—we devise a new benchmark based on the Kinetix simulator [43] consisting of 12 highly dynamic manipulation and locomotion tasks. In the real world, we evaluate RTC on 6 challenging bimanual manipulation tasks using the π₀.₅ VLA [24] as the base policy. Across both simulation and the real world, we demonstrate that RTC is fast and performant; it is uniquely robust to inference latency, even in highly precise tasks such as lighting a match (Figure 1), and it achieves greatly improved task throughput on all real tasks.

> 💡 **贡献总结**:
> 1. **RTC 算法本身**: 推理时 inpainting 框架，适用于 diffusion/flow VLA
> 2. **新 benchmark**: 现有仿真 benchmark 太简单（quasi-static），被 open-loop 策略就能搞定了。Kinetix 的 12 个高动态任务更能检验实时性
> 3. **大规模真实实验**: 6 个任务 × 多种延迟配置 × 10 trials = 480 episodes，28 小时纯机器人执行时间。这个实验量在 VLA 领域算很大了。


### 🔖 Section 总结

#### 核心洞察
1. **物理世界不等你** — 延迟对 embodied AI 的影响是致命的，不同于 NLP/CV
2. **Action chunking 是把双刃剑** — 解决了时序一致性，但引入了 chunk 边界不连续
3. **Temporal Ensembling 不靠谱** — 对多模态分布取平均可能产生无效 action
4. **RTC 的定位: 推理时算法** — 不改训练、不改模型，利用 flow/diffusion 的 inpainting 能力

## 2 Preliminaries and Motivation

### 📌 预览
这个 Section 定义了 action chunking 的数学符号，解释了 flow matching 的基本机制，然后通过具体的延迟数据（π₀ 的 KV cache prefill 就需要 46ms）说明为什么实时性是个硬问题。最后分析了 naive 异步推理的缺陷。


We begin with an action chunking policy denoted by $\pi(\mathbf{A}_t | \mathbf{o}_t)$, where $\mathbf{A}_t = [\mathbf{a}_t, \mathbf{a}_{t+1}, ..., \mathbf{a}_{t+H-1}]$ is a chunk of future actions, $\mathbf{o}_t$ is an observation, and $t$ indicates a controller timestep. We call $H$ the prediction horizon. When action chunking policies are rolled out, only the first $s \leq H$ actions from each chunk are executed. We call $s$ the execution horizon; often it is shorter than the prediction horizon, but still much greater than 1 (e.g., $s \approx H/2$ [11, 5, 24]). Chunked execution ensures temporal consistency at the expense of reactivity. A long execution horizon reduces a policy's responsiveness to new information, while a short one increases the likelihood of mode-jumping, jerky behavior resulting from discontinuities between chunks.

> 💡 **关键符号定义**:
> | 符号           | 含义                                                   | 典型值              |
> | -------------- | ------------------------------------------------------ | ------------------- |
> | $H$            | **Prediction horizon** — 每个 chunk 预测的 action 总数 | 8 (仿真), 50 (真实) |
> | $s$            | **Execution horizon** — 实际执行的 action 数           | $\approx H/2$       |
> | $\mathbf{A}_t$ | 从 $t$ 时刻开始的 action chunk                         | $H$ 维向量          |
> | $\mathbf{o}_t$ | $t$ 时刻的 observation                                 | 图像 + 状态         |
>
> **核心 trade-off**: $s$ 大 → 稳定但不灵活；$s$ 小 → 灵活但可能 mode-jump。


In this paper, we consider policies trained with conditional flow matching [36], though our method can also be used with diffusion policies by converting them to flow policies at inference time [48, 18]. To generate an action chunk from a flow policy, random noise $\mathbf{A}_t^0$ is first sampled from a standard Gaussian, and then the flow's velocity field, $\mathbf{v}_\pi$ (a learned neural network) is integrated from $\tau = 0$ to 1 using the update rule

$$
\mathbf{A}_t^{\tau+\frac{1}{n}} = \mathbf{A}_t^{\tau} + \frac{1}{n}\mathbf{v}_\pi(\mathbf{A}_t^{\tau}, \mathbf{o}_t, \tau)
$$

where $\tau \in [0, 1)$ denotes a flow matching timestep, and $n$ determines the number of denoising steps.

> 💡 **Flow Matching 101**:
> - 从高斯噪声 $\mathbf{A}^0 \sim \mathcal{N}(0, I)$ 出发
> - 学一个速度场 $\mathbf{v}_\pi$，沿着速度场从 $\tau=0$ 积分到 $\tau=1$
> - 每步更新: $\mathbf{A}^{\tau+1/n} = \mathbf{A}^\tau + \frac{1}{n}\mathbf{v}_\pi(\mathbf{A}^\tau, \mathbf{o}, \tau)$
> - 积分完成后 $\mathbf{A}^1$ 就是最终的 action chunk
> 
> **下一步的动作 chunk = 当前动作 chunk + 一个由网络给出的“小修正”。**
> 
> 其中：
> - $\mathbf{A}^0$：初始噪声，不是最终动作
> - $\mathbf{v}_\pi$：一个神经网络，输入当前 chunk、observation 和当前生成进度 $\tau$，输出“下一小步该往哪里改”
> - $\tau$：生成过程内部的进度条，不是物理时间。$\tau=0$ 时更像噪声，$\tau=1$ 时更接近最终动作
> - $n$：总共要走多少小步，也就是 denoising / integration steps。$n$ 越大，通常生成更细，但推理更慢
> 
> 跟 diffusion 的关系：flow matching 是 diffusion 的一个更 clean 的 formulation（直线路径 vs 随机路径）。而且 diffusion policy 可以在推理时转换为 flow policy [48, 18]，所以 RTC 实际上对两者都适用。


Now, let $\Delta t$ be sampling period of the controller, i.e., the duration of a controller timestep, and let $\delta$ be the time it takes for the policy to generate an action chunk. We say that a system is real-time if it is guaranteed to produce a response (in our case: $\mathbf{a}_t$) to an event (receiving $\mathbf{o}_t$) within a fixed time constraint ($\Delta t$). If $\delta \leq \Delta t$, then meeting the real-time constraint is trivial, since an entire chunk can be generated between two controller timesteps. However, this is near impossible to achieve with modern VLAs. For example, with an RTX 4090 GPU, the 3 billion parameter π₀ VLA spends 46ms on the KV cache prefill alone, before any denoising steps [5], and targets a 50Hz control frequency ($\Delta t = 20\text{ms}$). Run in remote inference for mobile manipulation, π₀ lists 13ms of network latency, in perfect conditions with a wired connection. In a more realistic setting, the network overhead alone could easily exceed 20ms. Kim et al. [31], who optimize the 7B OpenVLA model [30] specifically for inference speed, achieve no better than 321ms of latency on a server-grade A100 GPU.

> 💡 **延迟数据——为什么实时性是硬问题**:
> | 模型/组件              | 延迟      | 说明                         |
> | ---------------------- | --------- | ---------------------------- |
> | π₀ KV cache prefill    | **46ms**  | 还没开始 denoise 就花了 46ms |
> | 控制周期 Δt (50Hz)     | **20ms**  | 目标：每 20ms 一个 action    |
> | π₀ 网络延迟 (有线 LAN) | **13ms**  | 理想条件                     |
> | OpenVLA 7B (A100)      | **321ms** | 专门优化过的最佳数字         |
>
> **结论**: 即使只看 prefill (46ms) vs Δt (20ms)，就已经不可能实时了。加上 denoising steps + 网络延迟，总延迟是控制周期的好几倍。


![Figure 2](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-03-26-1774454416490.webp)
*Figure 2: 连续 chunk 之间典型的分叉示意。推理在 timestep 3 和 4 之间开始。原始 chunk（黑色）计划从障碍物上方绕过，而新生成的 chunk（红色）从下方绕过。但新 chunk 要 d=7 步后才可用。Naive 异步算法会从 a₁₀ 跳到 a'₁₁，产生非常高的 OOD 加速度。Temporal ensembling 减小了加速度但产生了糟糕的 action。*

> 💡 **Figure 2 批读**:
> - 这张图是理解 RTC 动机的关键。它展示了 action chunking 的核心难题——**mode bifurcation**（模式分叉）。
> - 场景：障碍物前面有两种绕行策略（上方/下方）。连续两个 chunk 选了不同策略，中间就出现断裂。
> - **Naive async**: 直接拼接 → OOD 加速度（从"往上走"突然跳到"往下走"）
> - **Temporal Ensembling**: 两个方向取平均 → 撞障碍物（上+下的平均 = 直走）
> - **这就是为什么需要 inpainting**: 新 chunk 必须"兼容"已执行的前缀，不能自己另起炉灶。


Naive synchronous inference, the default in many prior works [5, 30, 8, 24, 31, 59], simply starts inference at the end of the execution horizon and waits while the policy generates the next chunk. When $\delta > \Delta t$, this introduces visible pauses between chunks that not only slow down execution but also change the dynamics of the robot, introducing distribution shift between training and evaluation. To develop a real-time strategy, we must first introduce asynchronous inference, where inference is started early and happens concurrently with execution.

> 💡 **同步推理的问题**:
> - 执行完 $s$ 个 action → **停下来等待**新 chunk 生成 → 继续
> - 等待期间机器人**静止不动**，但训练数据里没有这种停顿
> - 这就产生了 **train-eval distribution shift**: 训练时动作连续，部署时有停顿


We define $d := \lfloor\delta/\Delta t\rfloor$ and call this quantity the inference delay, corresponding to number of controller timesteps between when $\mathbf{o}_t$ is received and when $\mathbf{A}_t$ is available. Let $\mathbf{a}_{t'|t}$ denote the $(t'-t)$-th action of chunk $\mathbf{A}_t$, generated from observing $\mathbf{o}_t$. If $\mathbf{A}_0$ is currently executing, and we desire an execution horizon of $s$, then an asynchronous algorithm must start inference at $s - d$. So long as $d \leq H - s$, then this strategy will satisfy the real-time constraint and guarantee that an action is always available when it is needed. However, since the policy cannot know what will happen between steps $s - d$ and $s$ while generating $\mathbf{A}_{s-d}$, the transition point between $\mathbf{a}_{s-1|0}$ and $\mathbf{a}_{s|s-d}$ may be arbitrarily discontinuous and out-of-distribution. Similar to a too-short execution horizon, this strategy leads to jerky behavior that is worsened dramatically with higher delays; see Figure 2.

> 💡 **Inference delay 的形式化**:
> - $d = \lfloor\delta/\Delta t\rfloor$: 推理延迟（以控制步为单位）
> - $\mathbf{a}_{t'|t}$: 基于 $\mathbf{o}_t$ 生成的 chunk 中，对应 $t'$ 时刻的 action
> - **异步策略**: 在 $s-d$ 时刻就开始推理（提前 $d$ 步），这样到 $s$ 时刻新 chunk 刚好可用
> - **约束**: $d \leq H - s$，否则即使提前开始也来不及
> - **问题**: 从 $s-d$ 开始推理，但 $s-d$ 到 $s$ 之间会发生什么，模型不知道 → 新旧 chunk 在 $s$ 处可能不连续


![Figure 3](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-03-26-1774454444359.webp)

*Figure 3: RTC 中 action 生成如何关注前一个 action chunk 的示意图。如果推理在 a₋₁ 执行后开始，inference delay d=4，则新 chunk 在 a₃ 被消费后才可用。因此 a₀:₃ 被"冻住"，guidance weight 为 1。中间区域 a₄:₁₀ 的前一个 chunk action 可用但可以更新，指导权重指数衰减。最后 s=5 个 action 超出了前一个 chunk 的范围，需要全新生成。*

> 💡 **Figure 3 批读——RTC 的核心设计图**:
> 这张图是整篇论文最重要的插图。它把 RTC 的三个区域讲得很清楚：
>
> | 区域                  | Action 范围           | 含义                                              | Guidance weight |
> | --------------------- | --------------------- | ------------------------------------------------- | --------------- |
> | 🔴 **Frozen**          | $a_0$ ~ $a_{d-1}$     | 推理完成前已经执行了，必须跟前一个 chunk 完全一致 | **W = 1**       |
> | 🟡 **Soft guidance**   | $a_d$ ~ $a_{H-s-1}$   | 前一个 chunk 有预测值，但可以更新。越远的越不确定 | **指数衰减**    |
> | 🟢 **Free generation** | $a_{H-s}$ ~ $a_{H-1}$ | 前一个 chunk 没有覆盖到，完全新生成               | **W = 0**       |
>
> 关键 insight: **$d$ 决定了 frozen 区域的大小**。$d$ 越大，frozen 区域越大，新 chunk 的自由度越小。但同时 soft guidance 区域保证了即使 $d$ 小，新 chunk 也不会跟前一个分叉。


### 🔖 Section 总结

#### 关键数字速查
| 指标                | 数值             |
| ------------------- | ---------------- |
| π₀ KV cache prefill | 46ms (RTX 4090)  |
| 控制频率            | 50Hz (Δt = 20ms) |
| OpenVLA 7B 推理延迟 | 321ms (A100)     |
| π₀ 网络延迟         | 13ms (有线 LAN)  |

#### 核心洞察
1. **实时性的数学定义**: $\delta \leq \Delta t$，但现代 VLA 根本做不到
2. **异步推理是必须的**: 在执行当前 chunk 的同时计算下一个
3. **Naive 异步的问题**: chunk 边界不连续 → mode-jumping + OOD dynamics
4. **Temporal Ensembling 更糟**: 多模态分布的均值不是有效 action

## 3 Real-Time Chunking via Inpainting

### 📌 预览
这是全文的核心方法章节。RTC 把异步 action chunking 建模为 inpainting 问题：冻住必须执行的 action，用 ΠGDM guidance 填充剩余部分。关键创新是 **soft masking**——不只冻住前 $d$ 个 action，而是对所有重叠区域用指数衰减的权重进行引导，确保跨 chunk 连续性。


The key challenge in real-time execution is to maintain continuity between chunks. By the time a new chunk is available, the previous one has already been executed partway, and therefore the new chunk must be "compatible" with the previous one. At the same time, the new chunk should still incorporate new observations, so that the policy does not lose the ability to react and make corrections.

> 💡 **核心挑战**: 两个目标之间的平衡：
> 1. **兼容性**: 新 chunk 必须跟已执行的 action 衔接
> 2. **反应性**: 新 chunk 要能利用最新 observation 做修正
> 
> 这两个目标是矛盾的——越兼容旧 chunk，就越像 open-loop；越响应新 observation，就越可能跟旧 chunk 分叉。


Our key insight is to pose real-time chunking as an inpainting problem. To make the new chunk "compatible", we must use the overlapping timesteps where we have access to the remaining actions of the previous chunk. The first $d$ actions from the new chunk cannot be used, since those timesteps will have already passed by the time the new chunk becomes available. Thus, it makes sense to "freeze" those actions to the values that we know will be executed; our goal is then to fill in the remainder of the new chunk in a way that is consistent with this frozen prefix (see Figure 3), much like inpainting a section of an image that has been removed. We describe this basic inpainting principle in Sec. 3.1. In Sec. 3.2, we introduce a soft masking extension that is critical for full cross-chunk continuity; finally, we describe our full real-time chunking system in Sec. 3.3.

> 💡 **Inpainting 类比**:
> - 图像 inpainting: 已知部分像素，生成完整图像
> - RTC inpainting: 已知前 $d$ 个 action（必须执行的），生成完整 chunk
> - 关键区别：RTC 还有一个 **soft guidance 区域**（前一个 chunk 的剩余 action），这些不是硬约束，而是参考


### 3.1 Inference-Time Inpainting with Flow Matching

Inpainting is a known strength of iterative denoising frameworks such as diffusion and flow matching. We build on the training-free image inpainting algorithm from Pokle et al. [48], which is itself based on pseudoinverse guidance (ΠGDM; [55]). The algorithm operates by adding a gradient-based guidance term to the learned velocity field $\mathbf{v}$ at each denoising step (Equation 1) that encourages the final generation to match some target value, $\mathbf{Y}$, which is a corrupted version of the desired result. In the case of image inpainting, the corruption operator is masking, $\mathbf{Y}$ is the masked image, and the desired result is a full image consistent with $\mathbf{Y}$ in the non-masked areas. The ΠGDM gradient correction, specialized to our setting, is given by

![Equation 2](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-03-26-1774490456101.webp)

> 💡 **ΠGDM Guidance 公式解读**:
> 这个公式是 RTC 的数学核心。让我分步解释：
>
> **整体结构**: 在标准 flow matching 的速度场 $\mathbf{v}$ 上加一个 gradient correction 项
>
> **各部分含义**:
>
> - $\widehat{\mathbf{A}_t^1} = \mathbf{A}_t^\tau + (1-\tau)\mathbf{v}(\mathbf{A}_t^\tau, \mathbf{o}_t, \tau)$: 从当前 denoising 状态估计最终 action chunk（one-step 估计）
> - $\mathbf{Y} - \widehat{\mathbf{A}_t^1}$: 目标值和当前估计的**误差**
> - $\text{diag}(\mathbf{W})$: **mask 权重**，给这个偏差加权，控制哪些 action 需要匹配，哪些可以自由生成
> - $\frac{\partial \widehat{\mathbf{A}_t^1}}{\partial \mathbf{A}_t^\tau}$: Jacobian，通过反向传播计算
> - $\min(\beta, \frac{1-\tau}{\tau \cdot r_\tau^2})$: guidance 权重，$\beta$ 是截断值（作者的新增）
>
> **直觉**: 每一步 denoising 时，计算"当前生成的 action 离目标 $\mathbf{Y}$ 有多远"，然后把梯度加到速度场上，把生成结果**拉向目标**。
>
> **$\beta$ 截断的必要性**: 防止为了强行接上旧 chunk，把还没稳定的新 chunk 拉坏。在 $\tau \to 0$ 时 guidance 权重会趋向无穷大。图像 inpainting 用 100 步问题不大，但 VLA 只用 5 步 denoising，不截断会导致 action chunk 发散（见 Appendix A.2）。

$\widehat{\mathbf{A}_t^1}$ is an estimate of the final, fully denoised action chunk and $\mathbf{W}$ is the mask. We are abusing notation by treating $\mathbf{Y}$, $\mathbf{A}_t$, and $\mathbf{W}$ as vectors of dimension $HM$ where $M$ is the dimension of each action. Thus, the guidance term is a vector-Jacobian product and can be computed using backpropagation. The guidance weight clipping, $\beta$, is our addition; we found that without it, the algorithm became unstable with the small number of denoising steps commonly used in control problems (see A.2 for an ablation).

> 💡 **实现细节**:
> - VJP (vector-Jacobian product) 可以用反向传播高效计算，无需显式构造 Jacobian 矩阵
> - $\beta = 5$ 是作者通过消融实验确定的保守值
> - 计算代价：每个 denoising step 需要一次额外的反向传播 → RTC 延迟 97ms vs 标准 76ms（增加 ~28%）


### 3.2 Soft Masking for Improved Cross-Chunk Continuity

In practice, naively inpainting using only the first $d$ timesteps of the previous action chunk is often insufficient to ensure that the new chunk takes a consistent strategy, particularly when $d$ is small (e.g., see Figure 4). The ΠGDM correction is not perfect, and a small $d$ leads to a weak guidance signal, which can allow for the new chunk to still switch strategies and cause discontinuities. Our solution, illustrated in Figure 3, is to give our policy more cross-chunk continuity by considering not just the first $d$ overlapping actions, but all $H - s$ overlapping actions. We do this via soft masking, setting $\mathbf{W}$ to real-valued weights rather than 1s and 0s. The first $d$ actions get a weight of 1; the last $s$ actions of the new chunk do not overlap with the previous chunk, so they get a weight of 0; the actions in between get weights that exponentially decay from 1 to 0, accounting for the fact that actions further in the future should be treated with more uncertainty. The resulting expression for W is given by

$$
\mathbf{W}_i = \begin{cases} 1 & \text{if } i < d \\ c_i \frac{e^{c_i} - 1}{e - 1} & \text{if } d \leq i < H - s \\ 0 & \text{if } i \geq H - s \end{cases} \text{ where } c_i = \frac{H - s - i}{H - s - d + 1}
$$

> 💡 **Soft Masking 设计——RTC 的关键创新**:
> 
> **为什么 hard masking 不够？**
> - 如果 $d$ 很小（比如 $d=1$），只冻住 1 个 action 的 guidance 信号太弱
> - ΠGDM 不是完美的，弱信号可能不足以阻止新 chunk 切换策略
> 
> **Soft masking 的三个区域**:
> ```
> Weight
> 1.0 |████████|
>     |        |▓▓▓▓
>     |        |    ▓▓▓
>     |        |       ▓▓
>     |        |         ▓
> 0.0 |        |           |░░░░░░|
>     |--d-----|--H-s-d----|--s---|
>     frozen    soft decay   free
> ```
> 
> - **Frozen** ($i < d$): 权重=1，hard constraint
> - **Soft decay** ($d \leq i < H-s$): 指数衰减，越远越不确定
> - **Free** ($i \geq H-s$): 权重=0，完全自由生成
> 
> **直觉**: 前一个 chunk 对近期 action 的预测比远期更可靠，所以近期给更高权重。

Intuitively, W modulates the "attention" paid to each corresponding action from the previous chunk. See Appendix A.4 for a comparison between different decay schedules.


![Figure 4](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-03-26-1774490545266.webp)

*Figure 4: Hard masking 和 soft masking 的对比。Hard masking 不能很好地匹配 frozen 区域，方向变化更剧烈。*

> 💡 **Figure 4 批读**:
> - **Hard masking**（左）: 新 chunk 在 frozen 区域结束后立刻偏离，方向变化突然
> - **Soft masking**（右）: 新 chunk 平滑地从前一个 chunk 过渡到新策略
> - 这说明 soft masking 的 "渐进放手" 策略确实有效——不是在 $d$ 处突然放开控制，而是逐渐放开


### 3.3 Real-Time Chunking

We present our full real-time chunking system in Algorithm 1 (complemented by Figure 3). The controller interfaces with our algorithm via GETACTION, which is called every $\Delta t$ to consume an action $\mathbf{a}_{t-1}$ and provide the next observation $\mathbf{o}_t$. The INFERENCELOOP runs in a background thread so that an action is always available. It forecasts the next delay, $d$, by keeping a buffer of past delays. The execution horizon, $s$, can change from chunk to chunk; the user provides a minimum desired horizon, $s_\text{min}$, and the actual horizon for a given chunk is $\max(d, s_\text{min})$ where $d$ is the delay encountered when computing the next chunk. Finally, the algorithm describes the inpainting with soft masking procedure in GUIDEDINFERENCE, which explicitly defines a denoising function (Eq. 3) and computes a vector-Jacobian product, which can be done with reverse-mode autodifferentiation [2].

> 💡 **Algorithm 1 解读——系统架构**:
> 
> RTC 是一个 **双线程系统**:
> 
> **线程 1: Controller (GETACTION)**
> - 每 $\Delta t$ 调用一次
> - 从当前 chunk 中取出下一个 action 返回给控制器
> - 同时提供最新 observation
> 
> **线程 2: Inference (INFERENCELOOP)**
> - 后台持续运行
> - 等到执行了 $s_\text{min}$ 个 action 后开始新的推理
> - 用过去的延迟历史估计下一次延迟 $d$（取 max，保守估计）
> - 调用 GUIDEDINFERENCE 生成新 chunk
> - 新 chunk 就绪后立刻替换旧 chunk
> 
> **GUIDEDINFERENCE 流程**:
> 1. 计算 soft mask $\mathbf{W}$
> 2. 初始化噪声 $\mathbf{A}^0 \sim \mathcal{N}(0, I)$
> 3. 每个 denoising step:
>    - 估计最终 action $\widehat{\mathbf{A}^1}$
>    - 计算加权误差
>    - 反向传播得到 gradient correction
>    - 更新 $\mathbf{A}^\tau$
> 4. 返回 $\mathbf{A}^1$
> 
> **自适应 execution horizon**: $s = \max(d, s_\text{min})$。如果延迟大（$d$ 大），就多执行一些 action 再切换。这让 RTC 自动适应不同的推理条件。


### 🔖 Section 总结

#### 关键数字速查
| 指标 | 数值 |
|------|------|
| β (guidance clipping) | 5 |
| RTC 额外延迟 | ~21ms (97ms vs 76ms) |
| Denoising steps | 5 |

#### 核心洞察
1. **Inpainting = 兼容性 + 反应性的统一框架**: 用 guidance 把新 chunk 拉向旧 chunk 的已执行部分，同时允许远期 action 自由响应新 observation
2. **Soft masking 是关键**: Hard masking 的 guidance 信号太弱，特别是 $d$ 小的时候。指数衰减的 soft mask 让过渡平滑
3. **双线程架构**: Controller 不等推理，推理后台持续运行。Action 总是可用的
4. **计算代价可控**: 每步多一次反向传播，总延迟增加 ~28%（76ms → 97ms）。但因为是异步的，这个增量不影响控制频率