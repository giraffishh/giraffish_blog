---
index_img: 'https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788270806377.webp'
banner_img: 'https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/25-03-28-1743151467842.webp'
title: 'ACWM：[ICCV 2025] IRASim'
categories:
  - 论文批读
tags:
  - WM
  - IRASim
comments: true
abbrlink: f438cf9f
date: 2026-09-01 19:13:47
updated: 2026-09-01 21:58:22

---

## IRASim: A Fine-Grained World Model for Robot Manipulation

**作者**: Fangqi Zhu, Hongtao Wu, Song Guo, Yuxiao Liu, Chilam Cheang, Tao Kong
**机构**: Hong Kong University of Science and Technology；ByteDance Seed
**会议**: ICCV 2025（pp. 9834–9844）
**版本**: arXiv v1（2024-06-20，原题 *Learning Interactive Real-Robot Action Simulators*）；当前 v2（2025-07-29）
**链接**: [arXiv](https://arxiv.org/abs/2406.14540) · [ICCV Open Access](https://openaccess.thecvf.com/content/ICCV2025/html/Zhu_IRASim_A_Fine-Grained_World_Model_for_Robot_Manipulation_ICCV_2025_paper.html) · [项目主页](https://gen-irasim.github.io/) · [PDF](paper.pdf) · [MinerU 全文](full.md)


## 一句话总结

IRASim 在扩散 Transformer 中将无噪声历史帧作为上下文，并用 Frame-Ada 把每个机器人动作注入对应未来帧的空间块，从而增强动作—帧对齐，再将预测视频用于策略排序和候选轨迹规划。


## 核心贡献

1. **逐帧动作对齐**: 在 DiT 空间块中让第 i 帧使用第 i 个动作生成的 AdaLN 参数；时间块仍共享轨迹级条件，形成逐帧与全局时序结合的条件结构。
2. **多数据集视频预测**: 在 RT-1、Bridge、Language-Table 和 RoboNet 上评测短轨迹与自回归长轨迹，覆盖不同动作空间、最高 288×512 分辨率和 150+ 帧展示。
3. **策略评估**: 在一个 LIBERO 任务上比较四个策略，IRASim 与 MuJoCo 真值模拟器的成功率排序达到 Pearson 0.99；生成 rollout 仍由人工判定。
4. **测试时规划**: 用 IRASim 展开策略候选并由外部价值函数排序；Push-T 结果说明 post-training rollout 覆盖与候选数必须同步扩展。


## 📖 批读导航

| Section | 内容 |
|---------|------|
| [00 - Abstract](#Abstract) | 核心机制、主要结果与主张边界 |
| [01 - Introduction](#1-Introduction) | trajectory-to-video 动机与论文贡献 |
| [02 - Related Work](#2-Related-Work) | 视频世界模型、latent dynamics 与机器人规划谱系 |
| [03 - Methods](#3-Methods) | 历史帧条件、DiT 与 Video-Ada/Frame-Ada |
| [04 - Experiments](#4-Experiments) | 视频质量、策略排序、规划证据与限制 |
| [05 - Conclusion](#5-Conclusion-Limitation-and-Future-Work) | 贡献总结、实时性限制和后续方向 |
| [06 - Appendices A–H](#Appendices-A–H) | 公式、数据、基线、训练、实机规划与人评细节 |


## 关键数字

| 指标 | 数值 |
|------|------|
| 策略评估一致性 | 一个 LIBERO 任务、四个策略上，IRASim 与 MuJoCo 成功率 Pearson r=0.99；IRASim rollout 由人工判定。 |
| Push-T 规划 | P=1000 条 post-training rollout、K=50 个候选时，IoU 从 K=1 的 0.637 提升到 0.961；P=0 时增加 K 反而退化。 |
| 生成分辨率与长度 | 最高 288×512；长视频通过片段自回归生成，并展示超过 150 帧的案例。 |
| 模型规模 | IRASim-S/B/L/XL 为 33M / 132M / 461M / 679M 参数。 |
| 推理成本 | 附录报告 A100 上约 30 秒生成 16 帧、占用 8GB，尚不满足实时闭环。 |


## 方法概览

```text
历史图像 I[t-h:t] --VAE/无噪声上下文 token----┐
动作轨迹 a[t:t+n] --逐动作编码/Frame-Ada------|-> DiT 去噪 -> 未来视频
未来 latent 噪声 ----------------------------┘
未来视频 + 外部价值函数 + 候选策略 -> 排序后执行
```

空间块让动作 $a_i$ 调制第 $i$ 帧，时间块保留整段轨迹条件。IRASim 因此是视觉动力学模型而非动作生成策略；规划结果还依赖候选策略覆盖和价值函数准确性。


## 与相关方法对比

| 方法 | 核心机制 | 主要权衡 |
|------|------|------|
| VDM / LVDM | U-Net 视频扩散，整段轨迹编码为视频级条件 | 条件简单；动作—帧绑定较弱，且与 IRASim 的表示空间/容量并非完全一致 |
| iVideoGPT / MaskViT | 离散视觉 token 的自回归或迭代生成 | RoboNet 上有预训练/tokenizer 差异，不能视为纯架构消融 |
| IRASim Video-Ada | DiT + 整段轨迹共享 AdaLN 调制 | 同骨干下可控性改善，但仍压缩逐步动作身份 |
| **IRASim Frame-Ada** | **空间块逐帧动作调制 + 时间块轨迹级条件** | **对齐更强；扩散采样慢，自回归长时误差和候选排序偏差仍存在** |
| GPC-RANK / OPT | 自回归预测并排序，OPT 还对候选做梯度优化 | 可进一步优化动作；比较受额外 rollout 数量未公开影响 |


## 📊 Citation Landscape

**TLDR** (Semantic Scholar): *Condensed: generated videos outperform baselines, scale with compute, and enable policy evaluation correlated with the ground-truth simulator.*

**引用统计**: 参考文献 64 篇 | 被引 81 次 | Influential Citations: 19

### 参考文献分组 (Top 5 per category, by citations)

#### 世界模型与交互模拟

| 论文 | 年份 | 引用 |
|------|------|------|
| Learning Interactive Real-World Simulators | 2023 | 502 |
| Evaluating Real-World Robot Manipulation Policies in Simulation | 2024 | 499 |

#### 机器人数据与基准

| 论文 | 年份 | 引用 |
|------|------|------|
| RT-1: Robotics Transformer for Real-World Control at Scale | 2022 | 2,734 |
| LIBERO: Benchmarking Knowledge Transfer for Lifelong Robot Learning | 2023 | 1,432 |

#### 视频扩散与规划

| 论文 | 年份 | 引用 |
|------|------|------|
| Diffusion Policy: Visuomotor Policy Learning via Action Diffusion | 2023 | 4,012 |
| Video Diffusion Models | 2022 | 2,829 |

### 推荐论文（Semantic Scholar Recommendations）

| 论文 | 年份 | 方向 | arXiv |
|------|------|------|-------|
| DriftWorld: Fast World Modeling through Drifting | 2026 | 以 drifting 机制加速世界模型生成 | [2607.15065](https://arxiv.org/abs/2607.15065) |
| GeniWorld: A Generalizable Interactive World Model for Robotic Manipulation via Visual Actions | 2026 | 用 visual actions 建立可泛化交互式机器人世界模型 | [2608.06332](https://arxiv.org/abs/2608.06332) |
| World Action Planner: Generalizable Decision-Making with Action-Conditioned World Models | 2026 | 用动作条件世界模型支持可泛化决策规划 | [2607.27599](https://arxiv.org/abs/2607.27599) |
| RoboWorld: Fast and Reliable Neural Simulators for Generalist Robot Policy Evaluation | 2026 | 面向通用机器人策略评测的快速可靠神经模拟器 | [2607.01060](https://arxiv.org/abs/2607.01060) |
| BWM: A Low-Cost High-Fidelity World Simulator for Robot Learning | 2026 | 平衡机器人学习模拟器的成本与保真度 | [2607.29302](https://arxiv.org/abs/2607.29302) |
| RynnWorld-Teleop: An Action-Conditioned World Model for Digital Teleoperation | 2026 | 将动作条件世界模型用于数字遥操作 | [2607.06558](https://arxiv.org/abs/2607.06558) |

### 🔗 相关链接

- [arXiv](https://arxiv.org/abs/2406.14540)
- [ICCV Open Access](https://openaccess.thecvf.com/content/ICCV2025/html/Zhu_IRASim_A_Fine-Grained_World_Model_for_Robot_Manipulation_ICCV_2025_paper.html)
- [项目主页](https://gen-irasim.github.io/)
- [Semantic Scholar](https://www.semanticscholar.org/paper/280f2ea5ac05cab2d5a85c74f0a23257c7947690)

## Abstract

### 📌 预览

本节概括 IRASim 的任务定义、核心机制和四组实验主张。以研究综述视角阅读时，应把“逐帧动作条件”视为技术贡献，把策略评估与规划视为需要独立证据验证的下游用途。


World models allow autonomous agents to plan and explore by predicting the visual outcomes of diferent actions. However, for robot manipulation, it is challenging to accurately model the fine-grained robot-object interaction within the visual space using existing methods which overlooks precise alignment between each action and the corresponding frame. In this paper, we present IRASim, a novel world model capable of generating videos with fine-grained robot-object interaction details, conditioned on historical observations and robot action trajectories. We train a difusion transformer and introduce a novel frame-level action-conditioning module within each transformer block to explicitly model and strengthen the action-frame alignment. Extensive experiments show that: (1) the quality of the videos generated by our method surpasses all the baseline methods and scales efectively with increased model size and computation; (2) policy evaluations using IRASim exhibit a strong correlation with those using the ground-truth simulator, highlighting its potential to accelerate real-world policy evaluation; (3) testing-time scaling through model-based planning with IRASim significantly enhances policy performance, as evidenced by an improvement in the IoU metric on the Push-T benchmark from 0.637 to 0.961; (4) IRASim provides flexible action controllability, allowing virtual robotic arms in datasets to be controlled via a keyboard or VR controller.

### 🔖 Section 总结

IRASim 针对机器人 world model 中**动作轨迹与未来视频帧对齐不足**的问题，将机器人未来预测建模为历史观测与动作轨迹条件下的视频生成。模型采用 Diffusion Transformer，并在每个 Transformer Block 中加入 **frame-level action-conditioning**，显式建立

$$
a_t\leftrightarrow x_t
$$

的细粒度动作—帧对应关系，从而提高机器人—物体交互动态的可控性和准确性。

#### 核心洞察

1. 论文解决的是 trajectory-to-video，核心是Action-Frame Alignment

1. Frame-Ada 是方法新意；DiT、VAE 和扩散训练目标主要来自既有视频生成框架。

## 1 Introduction

### 📌 预览

本节从机器人世界模型的两类用途——策略改进与可扩展评测——引出 trajectory-to-video，并解释为什么文本级或视频级条件不足以表达动作 chunk。重点关注问题动机、IRASim 在动作条件视频模型谱系中的位置，以及论文各项贡献所对应的证据类型。


World models empower agents to foresee the outcomes of their actions by learning the fundamental dynamics of the world [1, 2]. This capability ofers two key applications for robot manipulation. Firstly, it allows robots to improve autonomous policies by exploring various action proposal in the model and selecting the optimal one for executing. Secondly, world models ofer the potential for scalable policy evaluation – they can generate realistic and reasonable physical interactions, providing an eficient alternative to real-world evaluation [3].

When training a world model for robot manipulation, accurately simulating the intricate interactions between the robot, objects, and the surrounding environment remains a substantial challenge. Manipulation tasks are inherently delicate, where even subtle variations can result in task failure. Consequently, constructing a fine-grained world model is essential for faithfully capturing these precise interactions. Moreover, modern robotic manipulation policy leverages an action chunking technique [4, 5] which generates action trajectories rather than single actions to accomplish complex manipulation tasks. In this paper, we focus on building a world model that generates videos, with fine-grained robot-object interaction details, of a robot executing an action trajectory given historical observation (Fig. 1). We refer to this task as the trajectory-to-video task. Inspired by recent advances in text-to-video generation [6, 7], we leverage generative models to capture visual details that are essential for representing the intricate dynamics of the world (e.g., robot-object contact and object articulation). However, text-to-video models are trained to generate videos based on high-level textual descriptions that provide general contextual cues rather than detailed, frame-level instructions. This is diferent from the trajectory-to-video task in which each action in the trajectory provides an exact description of the robot’s movement in each frame of the predicted video.

![Figure 1](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261236005.webp)

*Figure 1 Overview of IRASim. IRASim is a fine-grained world model for robot manipulation. It generates high-fidelity videos that simulate accurate robot-object interactions of a robot executes an action trajectory, given historical observation.*

To bridge this gap, we introduce IRASim, a new world model trained with a difusion transformer to capture complex environment dynamics. We incorporate a novel frame-level action-conditioning module within each transformer block, explicitly modeling and strengthening the alignment between each action and the corresponding frame. IRASim can generate high-fidelity videos to simulate fine-grained robot-object interactions, as shown in Fig. 1. To generate a long-horizon video that completes an entire task, IRASim can be rolled out in an autoregressive manner and maintain temporal consistency across each generated video clip.

> 💡 **动机**: 早期动作条件视频模型常把整段动作压成一个全局条件；IRASim 将“动作 chunk 中每一步都对应一个未来帧”提升为显式架构约束。长时生成仍靠片段级自回归，因此帧内对齐的改善并不消除跨片段误差累积。

We perform extensive experiments on four tasks to validate the efectiveness of the proposed method: 1) trajectory-conditioned video generation, 2) policy evaluation, 3) model-based planning, and 4) flexible action controllability. For trajectory-conditioned video generation, we validate IRASim on four real-robot manipulation datasets: RT-1 [8], Bridge [9], Language-Table [10], and RoboNet [11]. Results show that IRASim can generate high-quality videos of high resolution (up to 288×512) and long horizon (more than 150 frames). It outperforms all the comparing baseline methods in all four datasets and is more preferable in human evaluation. In addition, it scales efectively with increased model size and computation. For policy evaluation, we evaluate autonomous policies in both IRASim and the LIBERO simulation environment [12]. The evaluation results from IRASim strongly correlate with those from the ground truth simulator, indicating great potential for scalable real-world policy evaluation. Moreover, we leverage IRASim as a visual dynamics model for model-based planning in both simulation and real-world settings. IRASim significantly improves the policy performance on accomplishing complex manipulation tasks in both settings by allowing the policy to explore various trajectory proposals and select the optimal one for execution. IRASim improves the performance (IoU metric) of a vanilla difusion policy on the Push-T benchmark from 0.637 to 0.961. More importantly, the performance improvement scales well with increased test-time computation, highlighting a promising path towards test-time scaling [13] for robot manipulation. Finally, we demonstrate the flexible action controllability of IRASim by generating videos of controlling the virtual robots in the datasets via trajectories collected with a keyboard or VR controller. We recommend visiting the project page for ful videos. To summarize, the contribution of this paper is threefold:

> 💡 **评估实验**: 
> 1）轨迹条件视频生成；
> 2）策略评估；
> 3）基于模型的规划；
> 4）灵活动作可控性。

• We propose IRASim, a novel method that is capable of generating high-quality videos with fine-grained robot-object interaction details for the trajectory-to-video task. It achieves precise action-frame alignment via a novel frame-level action-conditioning module.

• We perform extensive experiments on trajectory-conditioned video generation. Results show that IRASim outperforms all the comparing baseline methods in video generation and scales efectively with increased model size and computation.

• We showcase the usefulness of IRASim in robot manipulation through policy evaluation and policy improvement. We observe a strong correlation of evaluation results between evaluating in IRASim and the ground-truth simulator. When combined with model-based planning algorithm, IRASim improves the policy performance on accomplishing complex manipulation tasks in both simulation and the real world.

### 🔖 Section 总结

引言把机器人动作 chunk 与未来视频帧的细粒度绑定定义为核心缺口，并提出在 DiT 块内注入逐帧条件。IRASim 的研究意义在于把高保真视频生成明确接到策略评估和采样式规划接口上。

#### 核心洞察

1. Frame-Ada 回答的是动作—帧绑定问题。
2. World Model 在机器人中的两个主要用途是 Model-Based Planning+Policy Evaluation
3. Robot manipulation 对动力学精度要求远高于普通视频预测

## 2 Related Work

### 📌 预览

本节梳理三条相关路线：通用世界模型、条件视频生成，以及用世界模型进行机器人规划与评测。综述重点是区分 IRASim 借用的生成骨干与真正新增的条件机制，并明确它相对于 UniSim、iVideoGPT、Dreamer/DayDreamer 和 FLIP 的接口差异。


World Models. Learning a world model (or dynamics model) [14, 15], which predicts future observations based on current observations and actions, has recently become increasingly popular [1, 16, 17]. In autonomous driving, world models have been used to infer future states of the environment for safe and robust driving [18–20]. World models are also leveraged as a promising approach for training safe and sample-eficient reinforcement learning agents in gaming [21, 22]. In robot manipulation, prior works [23, 24] train action-conditioned video prediction models for planning. Recently, iVideoGPT [25] proposes to train an autoregressive transformer for action-conditioned video prediction. VLP [26] and UniSim [2] use languages with action information to prompt text-to-video models for generating video. IRASim difers from these works in that it can generate high-resolution (up to 288×512) and long-horizon (up to 150+ frames) videos given the initial observation and a robot trajectory, accurately capturing fine-grained robot-object interactions. It showcases strong capabilities in improving policy through model-based planning and potential for scalable policy evaluation.

> 💡 **谱系对照**: IRASim 位于“动作条件视频世界模型”而非 Dreamer 式紧凑 latent dynamics 路线。与 UniSim 的语言/异构控制接口相比，它牺牲条件通用性，换取机器人低层动作与视频帧的明确时序对应。

Video Models. Video models generate video frames either unconditionally or with conditions including classes, initial frames, texts, strokes, and/or actions [27–30]. Recently, difusion models [31] are becoming more and more popular in video generation [6, 7, 32–34]. Sora [6] showcases extraordinary video generation capability with Difusion Transformers [35]. IRASim also leverages Difusion Transformers as the backbone. A relevant line of work is to control video synthesis with motions. These methods use either user-specified strokes [36, 37], bounding boxes [30], or human poses [38, 39] as conditions. In contrast, IRASim models complex 2D and 3D actions over timesteps via a novel frame-level action-conditioning module.

> 💡 **机制来源**: DiT 与视频扩散不是 IRASim 首创；贡献是把 adaptive normalization 从全视频条件细化到逐帧动作条件。因而公平比较应同时区分 backbone（U-Net/Transformer）、生成空间（pixel/latent）和条件粒度（video/frame）。

Robot Learning with World Models. World models hold the promise of allowing the robot to predict the efects of actions and plan solutions in complex environments [24, 40–43]. For policy learning, prior works combine action-conditioned video prediction with model-predictive control for robot manipulation [40, 42, 44]. DreamerV3 [45] and DayDreamer [46] leverage recurrent state space model (RSSMs) [47] to learn a latent representation of states by modeling a world model for reinforcement learning. Recently, FLIP [41] proposed generating video plans that maximizes reward by leveraging flow prediction and then performing inverse dynamics to generate actions. This difers from the model-based planning we use in that we can predict the rewards of actions by predicting future videos, thereby selecting the optimal actions for execution. To facilitate scalable policy evaluation, recent work [3] shows a correlation between evaluation in a physical simulator and on real robots. In contrast to using a physical simulator, our work aims to leverage powerful generative models to simulate the rollouts of policies to evaluate their quality.

> 💡 **下游差异**: FLIP 先生成视频计划再用逆动力学恢复动作（Inverse Dynamics）；IRASim 则从策略采样可执行轨迹，预测 action 后的 observation（Forward Dynamics）。

### 🔖 Section 总结

IRASim 将视频扩散的高保真视觉建模能力与低层机器人动作轨迹结合，研究定位介于生成式视频模型和机器人动力学模型之间。它相对既有工作的主要区分不是更一般的控制接口，而是更细的动作—帧对齐，以及将生成结果用于策略排序与规划。

#### 核心洞察

1. IRASim 属于显式预测视频的观察空间世界模型，而非紧凑 latent-state RL 世界模型。
2. 比较方法时必须控制 backbone、表示空间、预训练和条件注入方式等混杂因素。
3. 规划能力由世界模型、候选策略和价值函数共同决定。

## 3 Methods

### 📌 预览

本节依次定义 trajectory-to-video、回顾 latent diffusion，并展开 IRASim 的历史帧条件、时空注意力和 Video-Ada/Frame-Ada。阅读重点是识别哪些组件来自既有 DiT/扩散模型，哪些结构真正建立动作与帧的细粒度对应。


### 3.1 Problem Statement

We define the trajectory-to-video task as predicting the video of a robot that executes a trajectory $\mathbf { a } ^ { t : t + n }$ given the historical observation images $\mathbf { I } ^ { t - \bar { h } : t }$

$$
\mathbf {I} ^ {t + 1: t + n + 1} = f (\mathbf {I} ^ {t - h: t}, \mathbf {a} ^ {t: t + n})\tag{1}
$$

> 💡 **公式解读**: 输入是从时刻 $t-h$ 到 $t$ 的历史图像和从 $t$ 开始的 $n+1$ 个动作，输出是未来图像序列。

where h denotes the number of historical frames; n denotes the number of actions in the video; $\mathbf { a } ^ { i } \in \mathbb { R } ^ { d }$ denotes the action at the i-th timestep. In this paper, we focus on predicting videos for robot arms. A typical action space of a robot arm contains 7 degrees of freedom (DoFs), i.e., $\bar { \mathbf { a } } ^ { i } \in \mathbb { R } ^ { 7 }$ , where 3 DoFs represent translation in the 3D space, 3 DoFs correspond to 3D rotation, and 1 DoF accounts for the gripper action. Additional details regarding the number of historical frames h and action space dimension d are provided in Appendix B.

### 3.2 Preliminaries

Before delving into our method, we briefly review preliminaries of difusion models [31, 48]. Difusion models typically consist of a forward process and a reverse process. The forward process gradually adds Gaussian noises to data $\mathbf { x } _ { \mathrm { 0 } }$ over T timesteps. It can be formulated as $q \left( \mathbf { x } _ { t } | \mathbf { x } _ { 0 } \right) = \mathcal { N } \left( \mathbf { x } _ { t } ; \sqrt { \overline { { \alpha } } _ { t } } \mathbf { x } _ { 0 } , 1 - \overline { { \alpha } } _ { t } \mathbf { I } \right)$ , where $\mathbf { x } _ { t }$ is the difused data at the t-th difusion timestep and $\overline { { \alpha } } _ { t }$ is a constant defined by a variance schedule. The reverse process starts from $\mathbf { x } _ { T } \sim \mathcal { N } ( \mathbf { 0 } , \mathbf { I } )$ and gradually remove noises to recover $\mathbf { x } _ { \mathrm { 0 } }$ . It can be mathematically expressed as $p _ { \theta } ( \mathbf { x } _ { t - 1 } | \mathbf { x } _ { t } ) = \mathcal { N } ( \mathbf { x } _ { t - 1 } ; \mu _ { \theta } ( \mathbf { x } _ { t } , t ) , \Sigma _ { \theta } ( \mathbf { x } _ { t } , t ) )$ , where $\mu _ { \theta } ( \cdot )$ and $\Sigma _ { \theta } ( \cdot )$ denote the mean and covariance functions, respectively, and can be parameterized via a neural network.

In the training phase, we sample a timestep $t \in [ 1 , T ]$ and obtain $\mathbf { x } _ { t } = \sqrt { \overline { { \alpha } } _ { t } } \mathbf { x } _ { 0 } + \sqrt { 1 - \overline { { \alpha } } _ { t } } \epsilon _ { t }$ via the reparameterization trick [31] where $\epsilon _ { t } \in \mathcal { N } ( \mathbf { 0 } , \mathbf { I } )$ ). We leverage the simplified training objective to train a noise prediction

model $\epsilon _ { \theta }$ as in DDPM [31]:

$$
\mathcal {L} _ {\mathrm{simple}} (\theta) = | | \epsilon_ {\theta} (\mathbf {x} _ {t}, t) - \epsilon_ {t} | | ^ {2}\tag{2}
$$

> 💡 **公式解读**: 训练目标仍是标准 DDPM 噪声预测 L2 损失。IRASim 的差异不在损失函数，而在噪声预测网络如何接收历史帧和动作条件。

In the inference phase, we generate $\mathbf { x } _ { \mathrm { 0 } }$ by first sampling $\mathbf { x } _ { T }$ from $\mathcal { N } ( \mathbf { 0 } , \mathbf { I } )$ and iteratively compute

$$
\mathbf {x} _ {t - 1} = \frac {1}{\sqrt {\alpha_ {t}}} \left(\mathbf {x} _ {t} - \frac {1 - \alpha_ {t}}{\sqrt {1 - \bar {\alpha} _ {t}}} \epsilon_ {\theta} (\mathbf {x} _ {t}, t)\right)\tag{3}
$$

> 💡 **公式解读**: 推理继承DDPM的传统从高斯噪声反复去噪到未来视频 latent。迭代采样带来约 30 秒/16 帧的延迟，这也是作者在结论中把实时生成列为主要限制的原因。

until $t = 0$ . For conditional difusion processes, the noise prediction model $\epsilon _ { \theta }$ can be parameterized as $\epsilon _ { \theta } ( \mathbf { x } _ { t } , t , \mathbf { c } )$ where c is the condition that controls the generation process. Throughout the paper, we use superscript and subscript to indicate the timestep of a frame in the input video and the difusion timestep, respectively.

However, directly difusing the entire video in the pixel space is time-consuming and requires substantial computation to generate long videos with high resolutions [32]. Inspired by Ma et al. [28], we perform the difusion process in a low-dimension latent space z instead of the pixel space for computation eficiency. Following He et al. [33], we leverage the pre-trained variational autoencoder (VAE) in SDXL [49] to compress each frame I<sup>t</sup> in the video to a latent representation with the VAE encoder $\mathbf { z } ^ { t } = \mathrm { E n c } ( \mathbf { I } ^ { t } )$ The latent representation can be decoded back to the pixel space with the VAE decoder $\mathbf { I } ^ { t } = \mathrm { D e c } ( \mathbf { z } ^ { t } )$

> 💡 **视频输入：**对每帧独立使用 SDXL 的 pretrained VAE 降低维度后再输入 Dit 。

### 3.3 IRASim

![Figure 2](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261258772.webp)

*Figure 2 Network Architecture of IRASim. (a) shows the general difusion transformer architecture of IRASim. The input to IRASim includes the historical frames and the given trajectory. (b) Video-level adaptation (Video-Ada). (c) Frame-level adaptation (Frame-Ada).*

> 💡 **图 2 总览**：
>
> IRASim 的整体结构可以从下往上理解：
>
> (a) 首先将历史帧编码为 VAE latent，并与待生成未来帧的 noisy latent 拼成一个视频序列；随后经过多层 **Spatial Attention + Temporal Attention** 的 DiT block，最后预测未来 latent 中的噪声。动作轨迹和 diffusion timestep 不直接作为额外 token 拼接，而是通过 **AdaLN 的 scale / shift / gate 参数**调制 Transformer。
>
> (b) 和 (c) 分别对应全局的 Video-Ada 与逐帧的 Frame-Ada，后者 (c) 是 IRASim 的核心设计，(b) 作为对照。

IRASim is a conditional difusion model operating in the latent space of the VAE introduced in Sec. 3.2. The condition c consists of the latent representation of the historical frames, $\mathbf { z } ^ { t - h : t } = \operatorname { E n c } ( \mathbf { I } ^ { t - h : t } )$ , and an action trajectory, $\mathbf { a } ^ { t : t + n }$ . The difusion target is the latent representations of the subsequent n frames of the video in which the robot executes the action trajectory, i.e. $\mathbf { x } = \mathbf { z } ^ { t + 1 : t + n + 1 }$ . Inspired by Sora’s remarkable capability of understanding the physical world [6], we similarly adopt Difusion Transformers (DiT) [35] as the backbone of IRASim. In the design of IRASim, we aim to address three key aspects: 1) consistency with the given historical frames 2) adherence to the given action trajectory and 3) computation eficiency. In the following, we describe pivotal design choices to achieve the aforementioned objectives.

Standard transformer blocks apply Multi-Head Self-Attention (MHA) to all tokens in the input token sequence, resulting in quadratic computation cost. We thus leverage the memory-eficient spatial-temporal attention mechanism [16, 28, 50] in the transformer blocks of IRASim to reduce the computation cost (Fig. 2). The historical frame condition is achieved by treating the historical frames as the ground-truth portion in the input video sequence [6]. That is, during training, we only add noise to the tokens corresponding to the predicted frames z<sup>t+1:t+n+1</sup>, while keeping those of the historical frame $\mathbf { z } ^ { t - h : t }$ intact as it does not need to be predicted (Fig. 2). And the difusion loss is only computed upon the predicted frames. This condition approach ensures consistency with the historical frames by enabling the predicted frames to interact with them via attention mechanism.

> 💡 **历史帧条件的实现**：
>
> 训练时，历史 latent $\mathbf z^{t-h:t}$ 始终保持为干净的 ground-truth，只对未来 latent $\mathbf z^{t+1:t+n+1}$ 加 diffusion noise，并且 loss 也只计算未来部分。历史帧与未来帧仍作为同一视频序列进入 Transformer，因此未来 token 可以通过注意力直接读取真实的历史视觉状态。这有点类似 video inpainting / prefix-conditioned generation，历史部分被固定为已知上下文，模型只负责补全未来。
>
> **Spatial Attention：** 把每一帧单独处理，也就是对于某个 frame $i$：
>
> $$
> X^i \in \mathbb R^{P\times D}
> $$
>
> 只让这一帧里的 $P$ 个 spatial patches 互相 attention，复杂度 $O(NP^2)$
>
> Spatial Attention 后，tensor 被重新排列成：$(P,N,D)$，进入Temporal Attention
>
> **Temporal Attention：** 在 $N$ 个时间 token 之间做 MHA，复杂度 $O(N^2P)$
>
> 总体复杂度从直接attention的 $O(N^2P^2)$ 下降到 $O(NP^2+PN^2)$


To inject the trajectory condition into video generation, we follow Difusion Transformers [35] and utilize adaptive layer normalization for conditioning. Below, we outline two methods for incorporating the trajectory condition.

• Video-Level Condition. Similar to using a text embedding to condition the generation of the entire video in the text-to-video task, we use a linear layer to encode the trajectory into a single embedding for condition. The embedding is then added to the embedding of the difusion timestep t for generating the scale parameters γ and α and the shift parameters β for each spatial and temporal attention block. The overall framework is shown in Figure 2(b). See Appendix C.1 for more details.

> 💡 **对照基线 Video-Ada：**：
>
> 如图 2(b)，Video-Ada 先将整条动作轨迹 $\mathbf a^{1:N}$ 通过 MLP 编码成一个全局 trajectory embedding，再与 diffusion timestep $t$ 的 embedding 相加，得到统一的条件向量 $\mathbf c_{ST}$。随后由 $\mathbf c_{ST}$ 为 Spatial Block 和 Temporal Block 共同生成 AdaLN 所需的调制参数：空间块对应 $(\gamma_1,\beta_1,\alpha_1)$、$(\gamma_2,\beta_2,\alpha_2)$，时间块对应 $(\gamma_3,\beta_3,\alpha_3)$、$(\gamma_4,\beta_4,\alpha_4)$。
>
> 因此所有帧实际上都共享同一个 $\mathbf c_{ST}$，模型能够知道“**整段轨迹总体要怎么运动**”，但不同 timestep 的动作被压缩进同一个 embedding，缺少显式的 $a_i\leftrightarrow\text{frame}_i$ 对应关系。

• Frame-Level Condition. Unlike the text-to-video task where the text describes the entire video, the trajectory in the trajectory-to-video task is a finer description. Each action in the trajectory defines how the robot should move in each frame. And thus, each generated frame must match with its corresponding action in the trajectory. To achieve this precise frame-level alignment, we condition the generation of each frame by its corresponding action. Instead of encoding the action trajectory into a single embedding, we use a linear layer to encode each action into an individual embedding. The difusion timestep embedding is added to each action embedding to generate the scale and shift parameters for each individual frame in the spatial block. The scale and shift parameters of the temporal block for all frames share the same conditioning embedding which is derived similarly as in video-level condition. The overall framework is shown in Figure 2(c). See Appendix C.2 for more details.

> 💡 **本文核心 Frame-Ada**：
>
> 如图 2(c)，Frame-Ada 不再只构造一个统一的 $\mathbf c_{ST}$。对于 Spatial Block，每个动作 $a^i$ 都被单独编码，并分别与 diffusion timestep embedding 相加，得到一组逐帧条件 $\mathbf c_S^1,\ldots,\mathbf c_S^N$。第 $i$ 帧使用自己的 $\mathbf c_S^i$ 生成对应的 $(\gamma_1^i,\beta_1^i,\alpha_1^i)$ 和 $(\gamma_2^i,\beta_2^i,\alpha_2^i)$，从而让第 $i$ 帧的 spatial tokens 直接受到动作 $a^i$ 的调制，显式建立 $a^i\leftrightarrow\text{frame}_i$ 的对齐关系。
>
> 对于 Temporal Block，则仍将整条 trajectory 的全局 embedding 与 diffusion timestep embedding 结合得到共享条件 $\mathbf c_T$，并生成所有帧共用的 $(\gamma_3,\beta_3,\alpha_3)$ 和 $(\gamma_4,\beta_4,\alpha_4)$。

The output layer contains a linear layer which outputs the noise prediction $\hat { \epsilon } = \epsilon _ { \theta } ( \mathbf { x } _ { t } , t , \mathbf { c } )$ . $\hat{\epsilon}$ is used to compute the L2 loss with the ground-truth noise during training (Eq. 2). Note that the VAE is frozen during the whole training process. During inference, we sample $\mathbf { x } ^ { T }$ from $\mathcal{N}(0, I)$ and gradually denoise it via Eq. 3 to obtain the latent representation of the predicted frames $\hat { \mathbf { z } } ^ { t + 1 : t + n + 1 } = \mathbf { x } _ { 0 }$ . The predicted frames can be decoded with the VAE decoder $\hat { \mathbf { I } } ^ { t + 1 : t + n + 1 } = \operatorname { D e c } ( \hat { \mathbf { z } } ^ { t + 1 : t + n + 1 } )$

### 🔖 Section 总结

IRASim 冻结 SDXL VAE，在 latent 空间用 DiT 预测未来视频噪声；历史 latent 作为无噪声上下文参与注意力，未来 latent 承担扩散损失。Frame-Ada 在空间块中按帧注入对应动作，时间块保留全轨迹条件，从结构上加强动作—帧对齐。

#### 核心洞察

1. Frame-Ada 的混合设计同时保留逐帧控制和全局时序信息。
2. 方法依赖动作与视频帧同步，且自回归长时滚动仍可能累积生成误差。
3. 推理延迟限制了它作为在线闭环模拟器的直接使用。

## 4 Experiments

### 📌 预览

本节验证短/长轨迹视频预测、策略评估、Push-T 与实机规划，以及键盘/VR 控制。综述阅读重点是区分生成质量、相对策略排序和控制收益三类证据，并识别 post-training rollout、候选数 K、价值函数与人工判定带来的条件。


We perform extensive experiments to validate the efectiveness of IRASim. We aim to answer three main questions: 1) Is IRASim efective on modeling fine-grained robot-object interactions and solving the trajectoryto-video task on various real-robot datasets with diferent action spaces? 2) Can we leverage IRASim as a world model for policy evaluation on manipulation tasks? 3) Can we utilize IRASim for model-based planning and improve flat autonomous policies on manipulation tasks? We also perform extensive ablation studies to analyze the contribution of diferent components of the proposed method.

### 4.1 Trajectory-Conditioned Video Prediction

Experiment Setup We conduct experiments on four real-robot manipulation datasets: RT-1 [8], Bridge [9], Language-Table [10], and RoboNet [11]. The action space varies across datasets, with RT-1 and Bridge using 7 DoF, Language-Table 2 DoF, and RoboNet up to 5 DoF. Details of each dataset are provided in Appendix B. For RT-1, Bridge, and Language-Table, we use 1 historical frame and 15 actions as context to predict the next 15 frames. For RoboNet, we follow iVideoGPT [25] and use 2 historical frames and 10 actions to predict the next 10 frames. Videos are resized to 256×320 for RT-1 and Bridge, 288×512 for Language-Table, and 256×256 for RoboNet. We evaluate video generation on both short and long trajectories. Short trajectories contains n actions and the videos can be generated in a single generation pass. Long trajectories consists of more actions and the videos are generated autoregressively over multiple passes. The final generated frame from the previous pass serves as the conditional historical frame for the current one. We denote video-level and frame-level adaptation as IRASim-Video-Ada and IRASim-Frame-Ada, respectively, and refer to them as Frame-Ada and Video-Ada for brevity. Training details can be found in Appendix E.

> 💡 **数据集**: action space
>
> - RT-1：7 DoF
> - Bridge：7 DoF
> - Language-Table：2 DoF
> - RoboNet：最高 5 DoF

Baselines. We compare IRASim with two state-of-the-art methods, i.e., VDM [32] and LVDM [33]. Both methods are difusion models based on a U-Net architecture. This is in contrast to IRASim, which employs a Transformer architecture. LVDM difuses videos in a latent space, while VDM operates in the pixel space. To impose trajectory conditions on video generation, we encode the trajectory into an embedding to condition the difusion process for both methods. This is similar to the text embedding used for text-to-video generation in the original papers [32, 33]. Additionally, we compare with two state-of-the-art non-difusion methods, iVideoGPT [25] and MaskViT [24], on the RoboNet dataset. iVideoGPT autoregressively predicts the next visual token; MaskVit generates visual tokens via a iterative refinement process. More details about baselines can be found in Appendix D.

Metrics. Following [39], we evaluate the performance with two types of metrics: computation-based (PSNR [51], SSIM [52]) and model-based (Latent L2 loss, FID [53], and FVD [54]). Unlike the text-to-video task, where various videos may satisfy a single text condition, the trajectory-to-video task has much less variation: the robot in the predicted video must strictly follow the input trajectory. Therefore, we use video reconstruction metrics, Latent L2 loss and PSNR, as the primary evaluation metrics. In Appendix H, we showcase that Latent L2 loss and PSNR best align with human preferences among all the evaluated metrics. More details about evaluation can be found in Appendix F.

Video Generation of Short Trajectories. Qualitative results are shown in Fig. 3(a) and Fig. 10. Quantitative results are shown in Tab. 1. As shown in Fig. 3(a) and Fig. 10, IRASim-Frame-Ada efectively models fine-grained robot-object interactions and generates high-quality videos that closely align with the ground truth. It surpasses all the comparing baseline methods in our primary evaluation metrics, Latent L2 and PSNR, as well as the human evaluation in Sec 4.1. As illustrated in Appendix A.1 & A 11, baseline methods struggle to guide the robot arm along the given trajectory and fail to realistically simulate interactions between the robot and the objects.

![Figure 3](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261262759.webp)

*Figure 3 Qualitative Results. We show video generation of IRASim with (a) short trajectories and (b) long trajectories on the test set of RT-1, Bridge, and Language-Table. Ground-truths are in blue boxes. Predictions are in orange boxes. Initial ground-truth video frames are in green boxes. Please see our project page for videos.*

> 💡 **图 3 解读**: 绿色为历史真值、蓝色为未来真值、橙色为预测。

![Table 1](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261269349.webp)

*Table 1 Quantitative results for short-trajectory video generation. We prioritize Latent L2 and PSNR as the primary evaluation metrics. Video-Ada and Frame-Ada are variants of IRASim.*

> 💡 **表 1 解读**: 1. Computation-based
>
> **PSNR ↑**
>
> 它本质上与像素误差有关：
>
> $$
>\operatorname{PSNR} = 10\log_{10} \frac{MAX^2}{MSE}
> $$
>预测图像越接近 GT：$MSE\downarrow \Rightarrow PSNR\uparrow$
> 
> **SSIM ↑**
> 
>衡量图像结构相似度，例如边缘，亮度，局部结构
> 

![Table 2](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788257401975.webp)

*Table 2 Quantitative results for video generation on RoboNet dataset. &#42; indicates that the result is derived from [25].*

Video Generation of Long Trajectories. Qualitative results are shown in Fig. 3(b) and Fig. 11. Quantitative results are shown in Tab. 3. We compare IRASim with the best baseline method LVDM [33]. IRASim-Frame-Ada consistently outperforms the comparison methods in all three datasets on Latent L2 loss. Fig. 3(b) and Fig. 11 show that it retains the powerful capability of generating visually realistic and accurate videos as in the short trajectory setting.

![Table 3](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261272118.webp)

*Table 3 Quantitative Results on Video Generation of Long Trajectories.*

> 💡 **表 3 解读**: 长轨迹通过多次自回归生成。Frame-Ada 在三套数据的 Latent L2 与 PSNR 上都最好；相较 LVDM，其 Latent L2 分别下降约 6.2%、9.0% 和 2.6%。这支持长时滚动稳定性，但平均轨迹仅约 23.7–42.5 帧，不能据此推断任意长时域都稳定。

Human Preference Evaluation. We also perform a user study to help understand human preferences between IRASim-Frame-Ada and other methods. We juxtapose the videos of predicted by IRASim-Frame-Ada and the comparing method and ask humans which one they prefer. The ground-truth is also provided as a reference. IRASim-Frame-Ada beats all the comparing methods in all three datasets (Fig. 4). This result aligns with the Latent L2 loss which justifies the reason for using Latent L2 loss as one of the primary evaluation metrics.

![Figure 4](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261275172.webp)

*Figure 4 Human Preference Evaluation. We perform a user study to evaluate the human preference between IRASim-Frame-Ada and other baseline methods.*

> 💡 **图 4 解读**: 三套数据的人评都更偏好 Frame-Ada，且附录 H 报告 Latent L2 与人类偏好的对应最一致。不过研究只有 5 名参与者；每人比较 90 对视频，但每个数据集—基线组合仅来自 10 个真值片段。它能支持指标选择，尚不足以建立稳定的人类感知基准。

Scaling. We follow [35] and train IRASim-Frame-Ada with diferent model sizes, ranging from 33M to 679M. Detailed parameters of these models are shown Appendix E. Results are shown in Fig. 5. Across all three test datasets, IRASim scales efectively with larger model size and more training steps, highlighting its strong potential for further performance gains through increased computation.

![Figure 5](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261277952.webp)

*Figure 5 Scaling. IRASim scales efectively with the increase of model sizes and training steps.*

> 💡 **图 5 解读**: 在 33M–679M 参数和图示训练步数区间内，三套数据的 Latent L2 随规模与训练推进总体下降。它证明的是该实验区间内的经验趋势，不等于已经给出 scaling law；图中也没有归一化训练/推理算力，不能比较计算效率。

### 4.2 Policy Evaluation

In this section, we showcase that we can use IRASim as a simulator for policy evaluation. We use the LIBERO simulation benchmark [12] as a controlled environment for this experiment. In particular, we evaluate a difusion policy [5, 55] in IRASim and compare the evaluation results against those with the ground-truth simulator. We train the difusion policy on expert trajectories provided by the benchmark. An evaluator must be able to simulate both successful and failed rollouts. And the world model needs to learn from a broader set of data than the expert demonstrations, which contain only successful rollouts, in order to simulate both successes and failures accurately. Thus, we deploy the trained policy in the simulator to gather additional rollouts which contains both successes and failures. We refer to these rollouts as post-trained rollouts. The post-trained rollouts, along with the expert demonstrations, are used for training IRASim. Given the limited amount of training data, we initialize IRASim with the pre-trained weight of OpenSora [7] to expedite the training process. We incorporate our frame-level condition method (Sec. 3.3) to inject the trajectory condition into the model for trajectory-conditioned video generation.

We train the difusion policy with four diferent steps on the task of "pick up the black bowl between the plate and the ramekin and place it on the plate", resulting in four diferent individual models. We then evaluate the performance of these four models in both the Mujoco simulator of the LIBERO benchmark and IRASim. The Mujoco simulator serves as a ground truth for comparison. We evaluate each model in both IRASim and the ground-truth simulator for 50 runs each. The rollouts generated by IRASim were assessed by humans to determine their success or failure.

Fig. 6 shows successful and failed rollouts generated by IRASim. Notably, IRASim successfully simulates scenarios where the bowl slips from the gripper, demonstrating strong capabilities to model fine-grained robot-object interaction. Tab. 4 reports the success rates of diferent models evaluated with the ground-truth Mujoco simulator and IRASim. The Pearson correlation coeficient between the two evaluation results is 0.99, indicating a strong correlation between evaluating in the ground-truth Mujoco simulator and IRASim. This result showcases the potential of levaraging IRASim as a world model for scalable real-world policy evaluation.

![Figure 6](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261281469.webp)

*Figure 6 Policy Evaluation with IRASim. IRASim can simulate both successful and failed rollouts. Notably, it is able to simulate a bowl slipping from the gripper.*

> 💡 **图 6 解读**: 图中同时给出成功放置与碗从夹爪滑落的生成 rollout，说明模型的输出不只复制专家成功模式。

![Table 4](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261284648.webp)

*Table 4 Success rates of four diferent models evaluated in the two evaluators. We observe a strong correlation between the evaluation results from the ground-truth Mujoco simulator and IRASim. The Pearson correlation coeficient between the two evaluations is 0.99.*

> 💡 **表 4 解读**: 四个策略的排序完全一致，因而 Pearson $r=0.99$；但绝对成功率并未严格校准，例如最弱策略为 0.18 vs 0.28。再考虑只有 4 个策略点、1 个任务，且 IRASim rollout 由人工判定，这更适合作为“相对排序可行”的证据。

### 4.3 Model-based Planning for Policy Improvement

In this section, we perform experiments in both simulation and real-world settings to show that IRASim can be used as a world model for model-based planning to improve vanilla policies without planning on accomplishing complex manipulation tasks. Specifically, we adapt a simple ranking algorithm for model-based planning: 1) samples K trajectories from the policy, 2) unroll each trajectory in IRASim, and 3) select the trajectory with the highest value for executing.

> 💡 **与 GPC/经典 MPC 的关系**: 这是采样式 model-predictive ranking：模型不优化动作，只预测候选的视觉后果。相较 GPC-RANK+OPT，它避免对扩散过程求梯度，但计算量随候选数 K 线性增长。

![Figure 7](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261286903.webp)

*Figure 7 IRASim simulates the visual outcomes of diferent trajectories sampled from the policy and predicts the value of the final frame with a reward model. By selecting and executing the trajectory with the highest predicted value, we enhance the existing policy by spending more time thinking (test-time compute).*

> 💡 **图 7 解读**: 规划流程是 sample K trajectories → IRASim rollout → reward model 对最终帧估值 → 执行最高值。IRASim 只承担视觉动力学，性能也受候选覆盖和 reward model 偏差控制。

Push-T Simulation. In this experiment, we use the Push-T simulation benchmark from [56] for evaluation. The robot is tasked to push a T-shaped block (gray) to a target (green) with a circular end-efector (blue) (Fig. 7). In order to perform efective model-based planning, a challenge is that the world model need to accruately predict the complex dynamics of robot-block contact. We first train a difusion policy with 200 expert demonstrations. Similar to Sec. 4.2, we then collect post-trained rollouts, which contains both successfu and failed rollouts, with the trained policy. We use intersection over union (IoU) between the block and the target as the value function for model-based planning. To predict the IoU of a given observation, we train a ResNet50 model [57] using the post-trained rollouts. Similar to the experiments in Sec. 4.2, we initialize IRASim with the pre-trained weights of OpenSora and train it on both post-trained rollouts and expert demonstrations. We perform ablation studies to analyze the efect of varying the number of post-trained rollouts (denoted as P) on overall performance.

We compare with a recent state-of-the-art method, generative predictive control (GPC) [58]. GPC perform autoregressive next-frame prediction via difusion to generate a video. This contrasts with our trajectoryto-video approach, which generates all frames for a trajectory simultaneously. Similar to IRASim, GPC also enhances its video prediction with additional rollouts beyond expert demonstrations. And it also uses a difusion policy to generate action proposals. Specifically, we compare with two variants of GPC introduced in [58], i.e., GPC-RANK and GPC-RANK+OPT. GPC-RANK uses a similar ranking-based planning algorithm as our method. GPC-RANK+OPT utilizes a diferentiable reward model to optimize action proposals via gradient optimization. In Tab. 5, M denotes the number of gradient optimization steps, and GPC-RANK+OPT represents the approach that incorporates both the RANK method and gradient optimization.

Results are shown in Tab. 5. The K = 1 column show the performance of the vanilla difusion policy without model-based planning. To ensure a fair comparison, we train our difusion policy such that its IoU performance matches with that of reported in the GPC paper [58], i.e., 0.637 v.s. 0.642. Using 200 post-trained rollouts, IRASim outperforms the two GPC variants. And the advantage grows as more post-trained rollouts are used. In addition, when $K = 50, P = 1000$, IRASim improves the IoU of the vanilla policy from 0.637 to 0.961. We further explore the efect of varying K and P. When $P > 0$ , the policy performance consistently improves as the number of sampled trajectories K increases. This highlights the importance of including post-trained rollouts in training the world model. More importantly, this result indicates we can robustly improve policy performance by scaling up the number of sampled trajectories for ranking, highlighting a promising path toward test-time scaling [13] for robot manipulation. With the increase of P, the performance cosistently improves for larger K values. For smaller K values, the performance initially improves and then reaches a plateau when $P = 1000$. This results indicate that data size and test-time computation should scale simultaneously.

> 💡 **关键消融**: P=0 时 K 越大性能越差，体现典型的 model exploitation：候选越多，越容易选中世界模型错误乐观的轨迹。加入失败/非专家 rollout 后，世界模型覆盖扩大，K 的 scaling 才转为正向。

![Table 5](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261289772.webp)

*Table 5 Results on Push-T Benchmark. K denotes the number of sampled trajectory. P denotes the number of post-trained rollouts used for training IRASim. We report the average IoU over 100 trials. &#42;GPC also uses additional rollouts beyond expert demonstrations to train the world model, but the number of these rollouts is not available in the paper [58].*

> 💡 **表 5 解读**: $P=0$ 时把候选数从 $K=1$ 增至 50，IoU 反而由 0.637 降到 0.418；有 post-trained rollout 后，扩大 $K$ 才总体有益。最佳 0.961 同时依赖 $P=1000$ 与 $K=50$。与 GPC 的比较还受一个重要缺口限制：GPC 使用的额外 rollout 数未披露，数据预算并不完全可比。

Real-Robot Experiments. We train IRASim on a real-robot dataset and perform experiments on three diferent tasks in the training dataset. We leverage a goal-conditioned method which specifies the task via a goal image. We use the similarity between the final image of the predicted video and the goal image as the value function for model-based planning. We use a simple policy which samples 50 individual points from a sphere centered on the current end-efector position and generates a trajectory between the current position and each sampled point, resulting in K = 50 diferent sampled trajectories.

Qualitative results are shown in Fig. 8. Quantitative results are shown in Tab. 6. We experiment with two functions for similarity comparison: 1) mean squared error (MSE) and 2) cosine similarity of the feature extracted from ResNet50. We observe that the MSE for value functions significantly outperformed the ResNet counterpart. And both variants significantly outperform the policy without planning which randomly selects a trajectory for rollout. These results demonstrate the potential of IRASim as a real-world manipulation world model for model-based planning. More details and discussion can be found in Appendix G.

![Figure 8](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261292630.webp)

*Figure 8 Qualitative Results on Real-Robot Model-based Planning. Historical frames are highlighted in red boxes, goal images in green boxes, real-robot rollouts in blue boxes, and videos generated by IRASim are shown in orange boxes. IRASim can generate videos, that faithfully matches with the ground truth in tasks involving object transportation and articulated object manipulation, enabling efective model-based planning.*

> 💡 **图 8 解读**: 完整裁图把三个任务的历史帧、目标图、真实 rollout 与 IRASim 预测并列展示，可直接检查“预测结果是否足以给候选排序”。但三个任务都来自训练数据，且属于精选定性样例，因此不能单独证明对新任务或新场景的泛化。

![Table 6](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261296123.webp)

*Table 6 Quantitative Results on Real-Robot Model-based Planning.*

> 💡 **表 6 解读**: MSE 代价在三个任务上达到 0.80–0.87，明显高于 ResNet50 特征代价的 0.60–0.73，说明排序函数与世界模型共同决定规划效果。附录 G 的协议是每轮执行排名前 5 的轨迹、重复 3 轮，即每项 15 次执行；样本量仍小，论文也未报告置信区间。

### 4.4 Flexible Action Controllability

In this section, we perform qualitative experiments in which we “control” the virtual robot in two datasets, Language-Table [10] and RT-1 [8], using trajectories collected with two distinct input sources: a keyboard and a VR controller. Notably, the trajectories collected through these input sources exhibit distributions that deviate from those in the original dataset. For Language-Table with a 2D translation action space, we use the arrow keys on the keyboard to input action trajectories. For RT-1 with a 3D action space, we use a VR controller to collect action trajectories as input. Specifically, we prompt IRASim with an image from each dataset and a trajectory collected with the keyboard or VR controller. Fig. 9 shows the video generated by IRASim. IRASim is able to follow trajectories collected with diferent input sources and simulate robot-object interaction in a realistic and reasonable way. More importantly, it is able to robustly handle multimodality in generation. Fig. 9(a) shows videos generated with an identical initial frame but diferent trajectories. In Appendix A.4, we demonstrate that IRASim can also handle physically implausible trajectories robustly.

![Figure 9](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261299049.webp)

*Figure 9 Flexible Action Controllability. We showcase controlling (a) the virtual robot in Language-Table with arrow keys on a keyboard and (b) the robot in RT-1 with a VR controller. Predictions are in orange boxes; initial frames are in green boxes.*

> 💡 **图 9 解读**: 同一 Language-Table 初始帧配不同键盘轨迹得到不同运动结果，RT-1 则使用 VR 控制器输入 3D 轨迹；这说明模型能响应非原始采集接口的动作条件。由于没有报告动作分布距离、轨迹跟踪误差或任务成功率，它仍是 OOD 可控性的定性证据。

### 关键数字

| 证据 | 结果 | 解读边界 |
|---|---:|---|
| LIBERO 策略排序 | Pearson $r=0.99$ | 1 个任务、4 个策略、人工判断生成 rollout |
| Push-T 最佳规划 | IoU $0.637 \rightarrow 0.961$ | 同时使用 $P=1000$ rollout 与 $K=50$ 候选 |
| 实机规划 | MSE 代价成功率 0.80–0.87 | 3 个训练内任务，每项 15 次执行，无置信区间 |
| 推理成本 | 16 帧约 30 秒/A100 | 可能无法实时推理 |

### 🔖 Section 总结

实验显示 Frame-Ada 在多套动作条件视频任务上总体优于 Video-Ada 与所选基线，并能作为采样式规划的视觉动力学模型。最重要的系统结论不是“候选越多越好”，而是世界模型必须先用包含失败的 rollout 扩大覆盖，否则 test-time search 会放大模型误差。

#### 核心洞察

1. 同骨干的 Frame-Ada vs Video-Ada 是最直接的动作条件粒度消融。
2. 0.99 相关系数展示相对策略排序的可行性，但样本点与任务范围很小。
3. Push-T 结果揭示数据规模 P 与测试时计算 K 必须同步扩展。
4. 实机规划性能由世界模型、候选轨迹和代价函数共同决定。
5. 灵活控制与物理不可行轨迹主要是定性证据，不能替代闭环成功率。

## 5 Conclusion, Limitation and Future Work

### 📌 预览

本节总结论文贡献并给出作者明确承认的限制与未来方向。研究综述视角下，应把“扩散蒸馏以实现实时生成”与“在世界模型中进行强化学习”看作后来实时模拟器和 world-model RL 路线的直接前驱问题。


In this paper, we present IRASim, a novel world model that generates videos, with fine-grained robot-object interaction details, of a robot executing an action trajectory given historical observation. We achieve precise alignments between actions and video frames via a novel frame-level action-conditioning module. Extensive experiments show the videos quality generated by IRASim is able to generate long-horizon and high-resolution videos that accurately simulate the robot trajectory rollouts. Additionally, we showcase that IRASim can be leveraged as a simulator for policy evaluation and a dynamics model for model-based planning to improve policy performance. Similar to many other generative models, a limitation of IRASim is video generation is not real-time. In the future, we plan to explore leveraging difusion distillation [59] to accelerate generation speed. In addition, we plan to investigate utilizing IRASim as a dynamics model and improve robot policies within the world model via reinforcement leanring [21].

### 🔖 Section 总结

IRASim 证明了逐帧动作条件视频模型可以服务机器人策略评估和候选轨迹规划，但当前采样速度不足以实时运行。作者提出扩散蒸馏和在模型内强化学习作为后续方向；更广泛的可靠性、闭环校准和分布外泛化仍需后续工作解决。

#### 核心洞察

1. Frame-Ada 是可复用的动作—帧对齐设计。
2. 非实时扩散采样是作者明确列出的首要限制。
3. 从候选排序走向模型内策略学习，需要处理模型偏差被策略利用的问题。

## Appendices A–H

### 📌 预览

附录补充定性结果、数据集与动作空间、Video-Ada/Frame-Ada 公式、基线配置、训练评估细节、实机规划和人评流程。综述重点是利用这些细节判断主文比较是否公平、结果能否复现，以及作者主张的适用边界。


### A Additional Qualitative Results

In this section, we present additional qualitative video results on the following: 1) Short Trajectories: We compare IRASim with baseline methods using short trajectories from RT-1, Bridge, and Language-Table. We also provide additional qualitative results of IRASim on RoboNet; 2) Long Trajectories: We compare IRASim with baseline methods in the long trajectories setting; 3) Scaling: We compare diferent sizes of IRASim; 4) Robustness to Physically Implausible Trajectories: We show that IRASim can handle physically implausible trajectories.

### A.1 Video Generation of Short Trajectories

Qualitative results are illustrated in Fig. 10 and Fig. 13. Fig. 10 demonstrates that IRASim-Frame-Ada surpasses other methods in aligning frames with actions and modeling the interaction between robots and objects. For the RoboNet dataset, we follow Wu et al. [25] and use two frames as context for prediction. Fig. 13 illustrates that IRASim is capable of simulating the manipulation of flexible objects, such as dragging clothes.

In terms of the number of context frames, we conduct an additional experiment on Bridge dataset and used 2 frames as context. The performance change is minor: the PNSR of using 1 context frame and 2 context frames are both 25. We hypothesize that the input trajectory itself contains suficient information about velocity. Thus, including more context frames does not bring about significant improvement.

### A.2 Video Generation of Long Trajectories

Qualitative results are illustrated in Fig. 11. IRASim-Frame-Ada generates consistent and long-horizon videos, accurately simulating the entire trajectory. Additionally, IRASim-Frame-Ada maintains its superior performance in frame-action alignment and robot-object interaction as observed in the short trajectory setting.

### A.3 Scaling

Qualitative results are shown in Fig. 12. IRASim-Frame-Ada consistently improves the quality of the generated video in terms of reality and accuracy with the increase of model size.

### A.4 Robustness to Physically Implausible Trajectories

We perform experiments on rolling out a physically implausible trajectory. In particular, we input a trajectory that commands the robot to move downward even after it touches the table. Physically, the robot cannot penetrate the table and thus will remain on the table even if the input control commands it to move down. We input this trajectory to IRASim to evaluate its performance in handling physically implausible trajectories. As shown in Fig. 14, IRASim can generate physically accurate videos where the robot stays on the table.

![Table 7](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261303761.webp)

*Table 7 Dataset Statistics. An "episode" is a single trial where the robot completes a task. A "sample" is a clip from an episode. "-" indicates that we follow previous work and do not use a validation set.*

### B Datasets

Dataset Statistics. We provide details on the four publicly available robot manipulation datasets: RT-1 [8], Bridge [9], Language-Table [10] and RoboNet [11]. A summary of the dataset statistics is presented in Table 7. For RT-1, Bridge and Language-Table, each training sample consists of a 4-second video clip containing 16 frames, extracted from an episode with a continuous sliding window. For testing and validation, frames are sampled at 16-frame intervals to reduce the number of evaluation videos and, consequently, lower evaluation costs. The original resolution for RT-1 is $256 \times 320$, for Bridge it is $480 \times 640$, and for Language-Table it is $360 \times 640$. To ensure eficient training, we resize the Bridge videos to a resolution of $256 \times 320$ and the Language-Table videos to $288 \times 512$. For RoboNet, we follow Wu et al. [25] and use 2 frames as context to predict the next 10 frames at a resolution of $256 \times 256$. Note that the mentioned "our own dataset" in Sec. 4.4 is similar in size to RT-1, and the action space is the same.

Action Space. Diferent datasets have diferent action spaces. In RT-1 and Bridge, a robot arm with a gripper moves in the 3D space to perform manipulation which interacts with objects in the scene. The action spaces of RT-1 and Bridge consist of 1) 6-DoF arm actions in 3D space, $T \in S E { ( 3 ) }$ , and 2) continuous gripper actions, $g \in [ 0 , 1 ]$ . In Language-Table, a robot arm moves in a 2D plane to move blocks with a cylindrical end-efector. The action space of Language-Table is 2-DoF translation in 2D space, $p \in R ^ { 2 }$ . We convert the arm action of all datasets to relative delta actions. Specifically, we specify the action of RT-1 and Bridge with a 7-dim vector, i.e., $a = [ \Delta x , \Delta y , \Delta z , \Delta \alpha , \Delta \beta , \Delta \gamma , g ]$ where $\Delta x , \Delta y .$ and $\Delta z { \mathrm { ~ a r e ~ } }$ the delta XYZ position; $\Delta \alpha , \Delta \beta ,$ , and $\Delta \gamma$ are the delta Euler angles; g indicates the gripper joint-angle position in the next step. For Language-Table, we specify the action with a 2-dim vector, i.e., $a = [ \Delta x , \Delta y ]$ which indicates the delta position in the xy-plane. RoboNet is a large-scale robot manipulation dataset featuring 7 robot platforms with varying action spaces (2, 4, or 5 dimensions). Following Dasari et al. [11], to unify the data, a 5-dimensional vector is used to represent a universal action space, padding zeros for missing dimensions. This vector represents delta XYZ position, delta yaw angle, and gripper joint-angle value: $\boldsymbol { a } = [ \Delta x , \Delta y , \Delta z , \Delta \gamma , g ]$ For instance, if a robot doesn’t control the z-axis, $\Delta z$ is set to 0.

### C IRASim Model Details

In this section, we introduce more details about two types of trajectory condition methods in Sec. 3.3: Video-Level Condition and Frame-Level Condition.

### C.1 Video-Level Conditioning

In video-level condition (Fig. 2(b)), we first obtain the conditioning embedding $\mathbf { c } _ { S T }$ by adding the difusion timestep embedding to the trajectory embedding. We then use c<sub>ST</sub> to regress the scale parameters γ and α, as well as the shift parameters $\beta .$ Specifically, the computation of the spatial block is as follows:

$$
\mathbf {x} = \mathbf {x} + (1 + \alpha_ {1}) \times \operatorname{MHA} (\gamma_ {1} \times \text { LayerNorm } (\mathbf {x}) + \beta_ {1})\tag{4}
$$

$$
\mathbf {x} = \mathbf {x} + (1 + \alpha_ {2}) \times \mathrm{FFN} (\gamma_ {2} \times \mathrm{LayerNorm} (\mathbf {x}) + \beta_ {2})\tag{5}
$$

where $\mathbf { x } ,$ with a shape of $( N , P , D )$ , denotes the token embeddings. x is reshaped as $( P , N , D )$ before entering the temporal block. The computation of the temporal block is:

$$
\mathbf {x} = \mathbf {x} + (1 + \alpha_ {3}) \times \mathrm{MHA} (\gamma_ {3} \times \text { LayerNorm } (\mathbf {x}) + \beta_ {3})\tag{6}
$$

$$
\mathbf {x} = \mathbf {x} + (1 + \alpha_ {4}) \times \mathrm{FFN} (\gamma_ {4} \times \mathrm{LayerNorm} (\mathbf {x}) + \beta_ {4})\tag{7}
$$

> 💡 **公式 4–7 解读**: Video-Ada 对空间 MHA/FFN 与时间 MHA/FFN 都使用由同一个全轨迹 embedding 回归出的 AdaLN scale、shift 和 residual gate。形状 $(N,P,D)$ 表示 N 帧、每帧 P 个 patch、D 维特征；进入时间块前转为 $(P,N,D)$。

Note that layer normalization is performed before scaling and shifting.

### C.2 Frame-Level Condition

In frame-level condition (Fig. 2(c)), spatial attention blocks and temporal attention blocks are conditioned diferently. The derivation of the conditioning embedding for temporal attention blocks $\mathbf { c } _ { T }$ is the same as in video-level condition, where we add the difusion timestep embedding to the trajectory embedding. Diferent frames are conditioned diferently in spatial attention blocks. We denote the conditioning embedding of spatial attention blocks for the i-th frame as $\mathbf { c } _ { S } ^ { i }$ . To derive $\mathbf { c } _ { S } ^ { i }$ , the i-th action in the trajectory is first encoded to an embedding through a linear layer. The difusion timestep embedding is then added to the encoded embedding to obtain $\mathbf { c } _ { S } ^ { i }$ . We use $\mathbf { c } _ { S } ^ { 1 } , \ldots , \mathbf { c } _ { S } ^ { N }$ and $\mathbf { c } _ { T }$ to regress the corresponding scale parameters $\gamma$ and α, as well as the shift parameters $\beta .$ While the computation of the temporal blocks is the same as the video-level condition (Eq. 6 and 7), the computation of spatial blocks is diferent:

$$
\mathbf {x} ^ {i} = \mathbf {x} ^ {i} + (1 + \alpha_ {1} ^ {i}) \times \mathrm{MHA} (\gamma_ {1} ^ {i} \times \mathrm{LayerNorm} (\mathbf {x} ^ {i} + \beta_ {1} ^ {i})),\tag{8}
$$

$$
\mathbf {x} ^ {i} = \mathbf {x} ^ {i} + (1 + \alpha_ {2} ^ {i}) \times \mathrm{FFN} (\gamma_ {2} ^ {i} \times \mathrm{LayerNorm} (\mathbf {x} ^ {i} + \beta_ {2} ^ {i})).\tag{9}
$$

> 💡 **公式 8–9 解读**: Frame-Ada 让第 $i$ 帧的空间 token 使用由动作 $a_i$ 生成的独立参数 $\alpha^i,\gamma^i,\beta^i$；时间块仍沿用公式 6–7 的全局条件。这是论文“逐帧对齐”在张量层面的具体实现。

where $\alpha _ { 1 } ^ { i } , \gamma _ { 1 } ^ { i } , \beta _ { 1 } ^ { i } , \alpha _ { 2 } ^ { i } , \gamma _ { 2 } ^ { i } , \beta _ { 2 } ^ { i }$ denote the scale and shift parameters for the i-th frame. They are regressed from $\mathbf { c } _ { S } ^ { i }$

### D Baselines Details

In this section, we detail the baseline implementation. For VDM [32], we leverage the implementation provided in <sup>1</sup>, which utilizes a 3D U-Net architecture for controllable video generation. We use only the model component from this code and keep the training setting consistent with IRASim. LVDM [33] employs the same model architecture as VDM. It performs difusion in the latent space while VDM performs difusion in the pixel space. We use an MLP to encode the trajectory into an embedding. It is then concatenated with the embedding of the difusion timestep to form the conditioning embedding. This is similar to the original methods in the paper where the text embedding is concatenated with the difusion timestep embedding to form the conditioning embedding. The initial frame condition method of VDM and LVDM is the same as IRASim as described in Sec. 3.3. LVDM and IRASim share the same VAE model and training setting. Given that the resolution of Language-Table [10] is up to $288 \times 512$, we resize the video to 144 × 256 in the training of VDM to make the computational cost afordable. During evaluation, we resize the generated video back to 288 × 512 for comparison with other methods. For RT-1 and Bridge, the training of VDM is performed at a resolution of $256 \times 320$. The training hyperparameters for VDM and LVDM are shown in Tab. 8 and 9. More training hyperparameters that share with IRASim can be found in Tab. 10.

We also briefly introduce the baseline details of iVideoGPT [25] and MaskViT [24]. Both of them use VQGAN [60] as the image tokenizer and require additional finetuning it on RoboNet, while IRASim employs the VAE encoder from SDXL [49] without the need for extra finetuning. Their parameter sizes are 436M and 228M, respectively. Moreover, iVideoGPT undergoes extensive pre-training on OpenX-Embodiment [61], whereas IRASim achieves better video prediction performance with training only on RoboNet.

![Table 8](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261307486.webp)

*Table 8 Hyperparameters for VDM.*

> 💡 **表 8 解读**: VDM 的表格给出较小 40M U-Net 配置；它还在 Language-Table 上降低训练分辨率，因此与 IRASim-XL 的总结果比较包含显著容量和分辨率差异。

![Table 9](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261310044.webp)

*Table 9 Hyperparameters for LVDM.*

> 💡 **表 9 解读**: LVDM 为 687M 参数，与 IRASim-XL 规模接近且共享 VAE/训练设置，是比 VDM 更接近的 latent diffusion 基线，但骨干和条件注入仍不同。

### E Training Details

For all models, we use AdamW [62] for training. We use a constant learning rate of 1e-4 and train for 300k steps with a batch size of 64. The gradient clipping is set to 0.1. We found the training of IRASim very stable – no loss spikes were observed even without gradient clipping. However, loss spikes often occur in LVDM and VDM when gradient clipping is not used. Following Peebles and Xie [35], we utilize the Exponential Moving Average (EMA) technique with a decay of 0.9999. All other hyperparameters are set the same as Peebles and Xie [35]. Tab. 10 lists further hyperparameters. All models are trained from scratch. We utilize PNDM [63] with 50 sampling steps for eficient video generation during evaluation. IRASim generates a 16-frame video with a duration of approximately 4 seconds, requiring only 30 seconds on an A100 GPU using 8GB of memory. Although there is still significant room for latency improvement, our method features high throughput and is memory-friendly during inference.

For scaling results in Fig. 4, the configurations of four diferent sizes of IRASim are shown in Tab. 11. We study the scale performance of IRASim-Frame-Ada since it performs best.

The information about computing resources for training our IRASim is provided in Tab. 12.

### F Evaluation Details

We introduce the evaluation details in this section.

Evaluation Metrics. Latent L2 loss and PSNR measure the L2 distance between the predicted video and the ground-truth video in the latent space and pixel space, respectively. SSIM evaluates the similarity between videos in terms of image brightness, contrast, and structure. FID and FVD assess video quality by analyzing the similarity of video feature distributions.

Evaluation Setup. We evaluate the video quality generated by IRASim and the baselines under two settings: short trajectories and long trajectories. In the short trajectory setting, the input consists of one initial frame and a short trajectory containing 15 actions, resulting in the generation of 15 subsequent frames. These short trajectories are sampled from episodes using a sliding window with an interval of 16. In the long trajectory setting, the input comprises one initial frame and a complete long trajectory, with the output being the generated subsequent frames. The average lengths of the long trajectories are 42.5, 33.4, and 23.7 frames for RT-1, Bridge, and Language-Table, respectively. These lengths also represent the average number of frames for the generated long videos, which are produced in an autoregressive manner, as detailed in Sec. 4.1. The statistics of the generated short and long videos used for evaluation are presented in Tab. 7.

Metric Calculation. In all metric calculations, we ignore the initial frame and only evaluate the quality of the generated frames. For PSNR and SSIM, we refer to skimage <sup>2</sup> for calculation. For FID and FVD, we refer to <sup>3</sup> and <sup>4</sup> for calculation, splitting the generated videos into frames and using their codebases to compute the FID and FVD values. However, we do not calculate FID and FVD metrics for long videos because we find that these metrics do not reflect human preferences well, even in the short trajectory setting. This could be because FID and FVD essentially calculate the similarity between the distributions of two datasets, whereas the trajectory-to-video task is a reconstruction task, making reconstruction loss a more suitable evaluation metric.

### G Real-Robot Model-based Planning Details

In this section, we detail the real-robot model-based planning experiment. The experiment demonstrates that IRASim can efectively plan trajectories to finish manipulation tasks by generating the outcomes of executing diferent candidate trajectories.

Experiment Setup. We follow Babaeizadeh et al. [23] to set up this experiment. We implement a model-based policy to show the usefulness of IRASim. Our policy consists of a sampling-based planner, a cost function, and IRASim as the dynamic function. We first train IRASim with our own real robot dataset.

![Table 10](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261313215.webp)

*Table 10 Hyperparameters for training IRASim.*

The input of our policy includes the initial image, the initial position of the end-efector, and a goal image to indicate the task. The output is a predicted trajectory. We use a simple sampling-based planner to generate candidate trajectories. The planner samples 50 individual points from a circle centered on the initial end-efector position and then generates a trajectory between the initial position and each sampled point, resulting in 50 diferent candidate trajectories. We input the initial image and each trajectory to IRASim to generate the video of executing each trajectory. We use a cost function to calculate the similarity between each predicted video and the goal image. We experiment with 2 cost functions: 1) mean squared error (MSE) and 2) cosine similarity of the feature extracted from ResNet50. We execute the top 5 trajectories with the lowest cost (i.e., the predicted video most similar to the goal image) in the real world and calculate the average success rate. The experiment is repeated three times for each task.

Results Qualitative results are shown in Fig. 7. Quantitative results are shown in Tab. 5. We compare our method with a baseline that randomly picks a trajectory from the 50 candidates. The results show that using IRASim significantly increases the success rate compared to the random baseline.

Discussion About Cost Function. We also explore how diferent cost functions impact the model’s performance. We find that the MSE cost function is generally superior to the ResNet cost function. But the MSE cost function is not always perfect; sometimes it selects incorrect prediction videos, leading to task failure. This suggests that we need to explore better cost functions in future work, considering that the success rate is influenced by both the accuracy of video prediction and the accuracy of the cost function. A suboptimal cost function could afect the evaluation of the video prediction model, as also mentioned by iVideoGPT [25] and VLMPC [42].

Discussion About Sample Policy. Although we use a simple sampling-based planner as the sample policy in this experiment, we note that IRASim can be combined with any policy that has trajectory sampling capabilities (i.e., action chunk techniques [4, 5]). The performance and range of tasks that IRASim can handle could be further enhanced by adopting a more advanced policy [4, 5], which is capable of generating more precise and complex trajectories.

### H Human Preference Evaluation

Five participants took part in the human evaluation. For each participant, we randomly sampled 10 groundtruth video clips from the test set for each of the 3 datasets. And for each video clip, we juxtapose the predictions of IRASim-Frame-Ada with those of VDM, LVDM, and IRASim-Video-Ada (Fig. 15). Thus, a participant evaluated 90 pairs of video clips. Note that the orders of the juxtaposition are random for diferent clips. See the caption of Fig. 15 for more details. We compare the results of all evaluated video clips and calculate the win, tie, and loss rates.

The screenshot of the GUI used in the human evaluation is shown in Fig. 15. The full text of the instruction given to participants is as follows:

You are asked to choose the more realistic and accurate video from two generated videos (shown above). The ground-truth video is given as a reference (shown below). Please carefully examine the given videos. If you can find a significant diference between the two generated videos, you may choose which one is better immediately. If not, please replay the videos more times. If you are still not able to find diferences, you may choose the "similar" option. Please do not guess. Your decision needs solid evidence.

![Table 11](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261317710.webp)

*Table 11 Model Sizes. We use IRASim as an abbreviation of IRASim-Frame-Ada for brevity.*

![Table 12](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261320571.webp)

*Table 12 Compution resources for training IRASim.*

![Figure 10](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261323567.webp)

*Figure 10 Additional Qualitative Results on Video Generation of Short Trajectories. We compare the results of diferent methods on (a) RT-1, (b) Bridge, and (c) Language-Table. Diferences between IRASim-Frame-Ada and other methods are highlighted in green and red boxes.*

![Figure 11](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261329154.webp)

*Figure 11 Additional Qualitative Results on Video Generation of Long Trajectories. We compare the results of diferent methods on (a) RT-1, (b) Bridge, and (c) Language-Table. Diferences between IRASim-Frame-Ada and other methods are highlighted in green and red boxes. Note that the input trajectory is the entire trajectory of an episode.*

![Figure 12](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261334215.webp)

*Figure 12 Additional Qualitative Results on Scaling. We compare the results of IRASim-Frame-Ada with diferent model sizes on (a) RT-1, (b) Bridge, and (c) Language-Table.*

![Figure 13](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261339339.webp)

*Figure 13 Quantitative results of IRASim-Frame-Ada on the RoboNet dataset. The robot is dragging the clothes, indicating that IRASim is capable of simulating the deformation of flexible objects.*

![Figure 14](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261343219.webp)

*Figure 14 Quantitative results show that IRASim is robust to physically implausible trajectories. We control the robot to poke at the table and record the command trajectory, which is very dangerous as it could damage the robot. As a result, the robotic arm is blocked by the table. We find that executing the same trajectory in IRASim yields similar results, rather than the robotic arm passing through the table. This indicates that IRASim has a certain understanding of the physical laws of the real world.*

![Figure 15](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-09-01-1788261345956.webp)

*Figure 15 Screenshot of the GUI in Human Preference Evaluation. The two videos in the upper row are generated by IRASim-Frame-Ada and a comparing method, arranged in a random left-right order. The video in the lower row is the ground-truth video.*

### 🔖 Section 总结

技术附录把 IRASim 的条件调制落实到张量与公式层面，并补足数据、算力、基线和人评设置。它同时揭示几项关键 caveat：基线分辨率和预训练并不完全一致、训练步数存在文本冲突、长轨迹为自回归生成、人评规模有限。

#### 核心洞察

1. Frame-Ada 只在空间块逐帧调制，时间块仍共享轨迹级条件。
2. VDM/LVDM/IRASim 比较包含容量、表示空间与分辨率等混杂因素。
3. 单个不可行轨迹示例支持局部鲁棒性，不足以证明一般物理理解。
