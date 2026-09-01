---
index_img: 'https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-31-1788167306005.webp'
banner_img: 'https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/25-03-28-1743151467842.webp'
title: 'ACWM：[Arxiv 2602.06949] DreamDojo'
categories:
  - 论文批读
tags:
  - WM
  - DreamDojo
comments: true
abbrlink: 730c6bb4
date: 2026-08-30 21:33:05
updated: 2026-09-01 21:58:22

---

## DreamDojo: A Generalist Robot World Model from Large-Scale Human Videos

**作者**: Shenyuan Gao, William Liang, Kaiyuan Zheng, Ayaan Malik, Seonghyeon Ye, Sihyun Yu, Wei-Cheng Tseng, Yuzhu Dong, Kaichun Mo, Chen-Hsuan Lin, Qianli Ma, Seungjun Nah, Loic Magne, Jiannan Xiang, Yuqi Xie, Ruijie Zheng, Dantong Niu, You Liang Tan, K. R. Zentner, George Kurian, Suneel Indupuru, Pooya Jannaty, Jinwei Gu, Jun Zhang, Jitendra Malik, Pieter Abbeel, Ming-Yu Liu, Yuke Zhu, Joel Jang, Linxi "Jim" Fan
**机构**: NVIDIA；HKUST；UC Berkeley；University of Washington；Stanford University；KAIST；University of Toronto；UC San Diego；UT Austin
**会议**: arXiv 2026
**版本**: arXiv v1（2026-02-06）
**链接**: [arXiv](https://arxiv.org/abs/2602.06949) · [项目主页](https://dreamdojo-world.github.io/) · [PDF](paper.pdf) · [MinerU 全文](full.md)


## 一句话总结

DreamDojo 先用连续潜动作从 4.4 万小时第一人称人类视频中自监督学习交互动力学，再用少量目标机器人数据后训练并蒸馏为实时生成器，从而统一支持遥操作预览、策略评估和基于模型的规划。


## 核心贡献

1. **互联网规模人类交互数据**: 构建 DreamDojo-HV，以 43,827 小时、约 113.5 万轨迹的人类第一人称视频覆盖约 6,015 类技能和大规模场景。
2. **连续潜动作桥接**: 用自监督 latent action model 从相邻帧提取连续代理动作，绕开人类视频缺少机器人控制标签和多 embodiment 动作格式不统一的问题。
3. **预训练—后训练—蒸馏**: 先学习通用物理和交互先验，再用小规模目标机器人数据适配连续控制，最后蒸馏以提高速度和上下文一致性。
4. **多用途验证**: 在 OOD、接触丰富任务中评测动作可控性，并展示实时遥操作、世界模型策略评估和模型预测规划。


## 📖 批读导航

| Section | 内容 |
|---------|------|
| [Abstract](#Abstract) | 数据规模、潜动作、蒸馏与主要应用 |
| [1 - Introduction](#1.-Introduction) | 人类视频迁移到机器人世界模型的动机 |
| [2 - Preliminary](#2.-Preliminary) | 视频生成和潜动作基础 |
| [3 - Approach](#3.-Approach) | 数据集、基础模型、后训练与蒸馏 |
| [4 - Experiments](#4.-Experiments) | 动作条件、数据混合、OOD 与应用评测 |
| [5 - Conclusion](#5.-Conclusion) | 结论与适用边界 |
| [B - Related Work](#B.-Related-Work) | 世界模型、潜动作与自回归视频生成脉络 |
| [C–D - Appendices](#C–D.-Evaluation-Details-and-Additional-Visualizations) | 人评、可视化、后训练曲线和价值模型 |


## 关键数字

| 指标 | 数值 |
|------|------|
| DreamDojo-HV | 43,827 小时、约 113.5 万轨迹、约 6,015 类技能；完整人类视频混合为 44,711 小时。 |
| 相对覆盖 | 论文称技能覆盖约为最丰富公开机器人数据集的 96×、场景约为 2,000×；这是作者按其数据口径给出的比较。 |
| 实时蒸馏 | 蒸馏模型达到 10.81 FPS，并改善长上下文一致性。 |
| 策略评估 | 成功率与真实世界 Pearson r=0.995，MMRV=0.003；该结果来自论文选定策略/任务集合。 |
| 应用范围 | 同一模型展示 live teleoperation、policy evaluation、model-based planning 三类下游。 |


## 方法概览

```text
  Robot 数据少 + Action label 少
                  │
                  ▼
       44k hours Human Videos
                  │
                  │ Human Videos 没有 action 怎么办？
                  ▼
       Continuous Latent Action
                  │
                  ▼
      大规模 World Model Pretrain
                  │
                  ▼
       少量 Robot Data Posttrain
                  │
                  ▼
             DreamDojo
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
   Physics    Action      Open-world
 Understanding Control   Generalization
                  │
                  ▼
              Distillation
                  │
                  ▼
             10.81 FPS
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
Teleoperation  Policy     Model-based
               Eval       Planning
```

连续潜动作是跨数据源的代理控制接口：它能从无标签视频中保留动作导致的视觉变化，但不等同于机器人可执行动作。因而后训练负责把通用交互先验重新锚定到目标 embodiment 的真实控制空间，蒸馏再解决在线滚动延迟。


## 与相关方法对比

| 方法 | 核心机制 | 主要权衡 |
|------|------|------|
| 仅机器人数据世界模型 | 真实动作监督 + 单/少量 embodiment 数据 | 动作语义可靠，但覆盖受采集成本限制 |
| 无动作视频预训练 | 纯视频预测或文本条件生成 | 数据巨大，但因果可控性弱 |
| **DreamDojo** | **人类视频连续潜动作预训练 + 机器人后训练 + 蒸馏** | **兼顾覆盖与控制；依赖潜动作质量及目标域校准** |


## 📊 Citation Landscape

**TLDR** (Semantic Scholar): *Condensed: OOD evaluations support open-world, contact-rich simulation and progress toward general-purpose robot world models.*

**引用统计**: 参考文献 125 篇 | 被引 100 次 | Influential Citations: 13

### 参考文献分组 (Top 5 per category, by citations)

#### 交互式世界模型

| 论文 | 年份 | 引用 |
|------|------|------|
| Genie: Generative Interactive Environments | 2024 | 772 |
| Learning Interactive Real-World Simulators | 2023 | 502 |

#### 机器人数据规模化

| 论文 | 年份 | 引用 |
|------|------|------|
| DROID: A Large-Scale In-The-Wild Robot Manipulation Dataset | 2024 | 995 |
| AgiBot World Colosseo: A Large-Scale Manipulation Platform for Scalable and Intelligent Embodied Systems | 2025 | 445 |

#### 动作条件机器人视频

| 论文 | 年份 | 引用 |
|------|------|------|
| RoboNet: Large-Scale Multi-Robot Learning | 2019 | 452 |
| IRASim: A Fine-Grained World Model for Robot Manipulation | 2024 | 81 |

### 推荐论文（Semantic Scholar Recommendations）

| 论文 | 年份 | 方向 | arXiv |
|------|------|------|-------|
| MoWorld: A Flash World Model | 2026 | 探索高效快速的通用世界模型 | [2607.06216](https://arxiv.org/abs/2607.06216) |
| Vid2WAM: Distilling Video Diffusion Priors into World Action Models | 2026 | 将视频扩散先验蒸馏到 world-action model | [2608.08558](https://arxiv.org/abs/2608.08558) |
| Native Video-Action Pretraining for Generalizable Robot Control | 2026 | 联合视频—动作预训练以提高机器人控制泛化 | [2607.08639](https://arxiv.org/abs/2607.08639) |
| DREAMSTEER: Latent World Models Can Steer VLA Policies During Deployment Without Any Finetuning | 2026 | 用 latent world model 在部署期直接引导 VLA | [2607.02865](https://arxiv.org/abs/2607.02865) |
| MiniWorld: Democratizing the Training of Video World Models from Scratch | 2026 | 降低从零训练视频世界模型的门槛 | [2608.01127](https://arxiv.org/abs/2608.01127) |
| Ego2Robot: Scalable Robot Data Synthesis from Egocentric Human Data | 2026 | 从第一人称人类数据扩展机器人训练数据合成 | [2608.02580](https://arxiv.org/abs/2608.02580) |

### 🔗 相关链接

- [arXiv](https://arxiv.org/abs/2602.06949)
- [项目主页](https://dreamdojo-world.github.io/)
- [Semantic Scholar](https://www.semanticscholar.org/paper/ca524f499028275f21776ea4b1fd41fd2ff7844b)

## Abstract

### 📌 预览

先用 4.4 万小时第一视角人类视频扩展交互覆盖，再以连续潜动作恢复视频中缺失的“动作条件”，随后用少量目标机器人数据完成具身适配，最后通过蒸馏达到实时生成。阅读时应把数据、动作表示、后训练和蒸馏视为四个前后依赖的阶段，并区分论文提出的能力主张与正文真正提供的验证证据。


Being able to simulate the outcomes of actions in varied environments will revolutionize the development of generalist agents at scale. However, modeling these world dynamics, especially for dexterous robotics tasks, poses significant challenges due to limited data coverage and scarce action labels. As an endeavor towards this end, we introduce DREAMDOJO, a foundation world model that learns diverse interactions and dexterous controls from 44k hours of egocentric human videos. Our data mixture represents the largest video dataset to date for world model pretraining, spanning a wide range of daily scenarios with diverse objects and skills. To address the scarcity of action labels, we introduce continuous latent actions as unified proxy actions, enhancing interaction knowledge transfer from unlabeled videos. After post-training on small-scale target robot data, DREAMDOJO demonstrates a strong understanding of physics and precise action controllability. We also devise a distillation pipeline that accelerates DREAMDOJO to a real-time speed of 10.81 FPS and further improves context consistency. Our work enables several important applications based on generative world models, including live teleoperation, policy evaluation, and model-based planning. Systematic evaluation on multiple challenging out-of-distribution (OOD) benchmarks verifies the significance of our method for simulating open-world, contact-rich tasks, paving the way for general-purpose robot world models.

> 💡 **摘要**:
>
> - **要解决的矛盾**：开放世界机器人需要广覆盖的接触动力学数据，但机器人轨迹昂贵、动作标签又无法在不同具身之间直接统一。
> - **DREAMDOJO 的接口设计**：人类视频负责提供“见过什么交互”，连续潜动作负责标出“画面为何发生变化”，目标机器人后训练再把这一代理控制接口替换为真实连续动作。
> - **部署转换**：基础模型仍是多步、定长的视频扩散模型；蒸馏把它改造成少步因果学生，10.81 FPS 指的是该学生的生成吞吐。
> - **证据边界**：摘要中的“强物理理解”“精确控制”和“开放世界”是综合主张。正文分别用重建指标、两维人评、六套构造基准和三个下游案例支撑它们，并未给出覆盖任意环境的成功率保证。

### 🔖 Section 总结

DREAMDOJO 的核心不是单纯扩大视频预训练，而是把大规模无标签交互视频转化为可迁移的动作条件训练数据。其训练路径依次解决覆盖不足、动作缺失、具身不匹配和推理过慢四个问题，并将最终用途落到策略评估、候选动作规划与虚拟机器人实时遥操作。

#### 核心洞察

1. **规模化的对象不是机器人动作，而是人类交互经验。** 44k 小时数据扩大了场景、物体和技能覆盖，但其价值取决于能否保留动作—结果关系。
2. **潜动作是整条迁移路线的关键中介。** 它只在预训练阶段充当统一伪标签，部署到目标机器人后，模型接收的仍是真实机器人动作。
3. **后训练与蒸馏解决不同问题。** 前者校准具身和动作空间，后者改变生成方式以降低延迟和长时分布偏移。
4. **论文验证的是受控 OOD 泛化和应用可行性。** 这些结果支持把模型用作比较与规划工具，但不等于已经获得可靠的通用物理仿真器。

## 1. Introduction

### 📌 预览

引言首先解释现有机器人视频世界模型为何容易“只会复现训练场景”：机器人数据覆盖窄，专家示范中的动作意图又过于集中，模型因此既缺少长尾物理经验，也缺少反事实动作监督。作者随后给出一条跨具身训练路线——用人类视频扩展经验分布、用潜动作保留因果控制、用目标机器人数据完成校准，再用 Self Forcing 蒸馏支持在线交互。


World models, which predict futures based on actions, have emerged as a key component in the development of generalist robots (Hu et al., 2023; LeCun, 2022; Richens et al., 2025; Sutton, 1991). Recent advances in video generation (Ali et al., 2025; Wan et al., 2025) have driven video world models, in which future states are represented as video frames (Ball et al., 2025; Russell et al., 2025; Sun et al., 2025). However, they primarily plateau at discrete controls, while the high-dimensional action spaces for contact-rich robot tasks have yet to make similar progress. Unlike game and driving data, robot data often has limited coverage due to hardware variability and collection cost. The nearly infinite variety of real-world environments can easily exceed the distribution of available robot data. Additionally, existing datasets predominantly consist of expert demonstrations, lacking the stochasticity in intentions necessary for learning strong action controllability. As a result, existing video world models remain confined to simulating observed setups and are often unresponsive to counterfactual actions, constraining their applicability for diverse scenarios and complex tasks.

> 💡 **问题诊断**: 
>
> 状态分布缺口来自场景、物体和机器人硬件覆盖有限
>
> 动作分布缺口来自专家示范只记录“正确做法”，很少包含伸手落空、拍打或错误接触等反事实结果。

In this work, we introduce DREAMDojo, a foundation world model for open-world dexterous robot tasks. Unlike previous methods that typically rely on teleoperation data, we exploit human videos for pretraining. Despite the embodiment gap, the underlying physics during interactions is largely consistent between humans and robots, enabling effective knowledge transfer. Therefore, we curate the largest egocentric human video dataset to date, DreamDojo-HV (Human Videos), which comprises 44k hours of video sequences, surpassing the datasets used in prior works by several orders of magnitude. In addition to its scale, DreamDojo-HV incorporates an exceptionally diverse range of activities, encompassing approximately 96× more skills and 2,000× more scenes than the most diverse public datasets for robot learning (Bu et al., 2025; Khazatsky et al., 2024). This provides us with a rich corpus for learning physics and dynamics about diverse interactions.

> 💡 **迁移假设**: 人手与机器人关节的控制参数不同，但接触、遮挡、刚体运动、容器约束等视觉后果具有共享结构。论文假定大规模视频可以先学习这些“具身无关”的规律，再由少量机器人数据校准具体动作空间。

Nevertheless, fine-grained action labels are much scarcer than raw videos at scale. Naively training on passive videos overlooks the causality between video observations and actions, leading to inferior knowledge transfer for action-conditioned world simulation. Moreover, converting various action formats into a unified one entails inevitable engineering effort. To address these challenges, we introduce continuous latent actions (Gao et al., 2025) as unified proxy actions for all videos. The proposed latent action model can extract semantically meaningful actions between frames in a self-supervised manner, ensuring effective transfer of both physics and controllability as the data scales to the internet level. Through rigorous designs of model architecture and training recipe, DREAMDoJO is able to acquire a comprehensive understanding of physics, achieving plausible simulations across diverse environments and fine-grained controllability over continuous robot actions.

> 💡 **为什么不能只做下一帧预测**: 被动预测允许模型通过外观和数据偏差猜测最可能未来，不必解释“哪个动作导致了变化”。潜动作把相邻帧变化压缩成连续向量，并作为生成条件重新送给世界模型，相当于为无标签视频补上一条代理控制通道。它避免手工统一 MANO、关节角等异构动作格式，但也只是从像素反推的表示，可能混入相机运动或遗漏不可见的力。

To achieve real-time prediction without visual degradation, we further introduce a distillation pipeline following the Self Forcing paradigm (Huang et al., 2025). Our distillation also enhances the long-horizon consistency by efficiently modeling a short temporal context. The resulting model can autoregressively predict future frames at a resolution of $640 \times 480$ at 10.81 FPS for an arbitrary horizon, significantly reducing the cost for various downstream applications such as live teleoperation and model-based planning.

> 💡 **部署目标**: 蒸馏同时改动两个维度：把 35 个去噪步压到 4 步以提高吞吐，并把双向、固定窗口教师改为因果学生以便逐帧流式生成。

In summary, our main contributions include:

\- A large-scale video dataset, DreamDojo-HV, that accumulates 44k hours of egocentric experiences from a wide spectrum of daily activities. To the best of our knowledge, this is the largest and most diverse data corpus to date for world model learning.

\- A foundation world model for general-purpose robots. By scaling up human videos and introducing continuous latent actions as unified proxy, we present DREAMDoJO, the first world model of its kind that shows zero-shot generalization to unseen objects and novel environments.

\- A distillation pipeline that enables efficient autoregressive prediction and improves context consistency. The final model can be interacted with for more than 1 minute in real time without degradation.

\- Multiple downstream applications highlight the potential of DREAMDOJO in performing live teleoperation, policy evaluation, model-based planning, etc., accelerating the development of robot policies.

![Figure 1](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-30-1788097139626.webp)
*Figure 1: DREAMDOJO overview. DREAMDOJO acquires comprehensive physical knowledge from large-scale human datasets by utilizing latent actions as unified labels. After post-training and distillation on the target robots, our model can predict the future world in real time with continuous action controls. DREAMDOJO can robustly generalize to various objects and environments, facilitating large-scale policy evaluation without real-world deployment. It also enables live teleoperation and online model-based planning.*

> 💡 **图 1 读法**:
>
> `人类视频帧 → 连续潜动作 → 预训练世界模型 → 目标机器人真实动作 → 蒸馏因果少步学生 → 评估 / 规划 / 遥操作`
>
> 潜动作的作用于跨数据源预训练；后训练时动作投影层被重置，模型学习目标机器人的真实控制量。右侧案例展示能力类型。

### 🔖 Section 总结

引言将 DREAMDOJO 定位为从大规模人类交互经验到目标机器人实时世界模拟的完整训练路线。它同时处理状态覆盖、动作监督、跨具身适配和在线生成四个瓶颈，并把“是否受动作控制”置于单纯视频真实感之上。

#### 核心洞察

1. **数据多不等于动作可控。** 开放场景覆盖和反事实动作覆盖是两个独立问题，必须分别通过数据规模与动作条件解决。
2. **跨具身迁移建立在共享视觉动力学上。** 人类视频提供广泛先验，目标机器人后训练负责吸收不可共享的动作几何与控制语义。
3. **潜动作是训练期代理标签，不是部署期控制协议。** 它统一无标签视频；真正下游模型仍需学习每个目标机器人的连续动作空间。
4. **实时性来自生成范式转换。** 4 步因果学生支持流式输出和短历史上下文，但“可无限滚动”仍受累积误差与长尾失败限制。

## 2. Preliminary

### 📌 预览

先把世界模型定义为动作条件状态转移分布，然后说明 Cosmos-Predict2.5 如何在视频潜空间用 flow matching 实现条件生成。阅读时需要分清三个“时间”：环境时刻 $t$、视频潜帧索引，以及扩散/flow 的噪声时间；后续时间一致性损失约束的是相邻视频潜帧，而不是扩散时间步。


Interactive world model. The objective of an interactive world model is to infer future states based on actions. Formally, given an action $a \in A$ , the interactive world model acts as a state transition function that samples the next state:

$$
s _ {t + 1} \sim p (\cdot | s _ {t}, a _ {t}),\tag{1}
$$

where $p : S \times A \to \Delta(S)$ is the transition distribution. In this paper, the term “world model” refers specifically to this category unless otherwise stated.

> 💡 **式 (1) 的含义**: 给定同一状态 $s_t$ 和动作 $a_t$，模型采样的是一个可能的下一状态，而不是确定映射。随机性可以来自未观测环境变量、接触结果或视频生成噪声。DREAMDOJO 用未来视频帧作为状态的可见代理，因此它学到的是**观测空间动力学**，不是完整的三维物理状态转移。

Cosmos-Predict2.5 model. We establish our world model on the pretrained Cosmos-Predict2.5 model (Ali et al., 2025), a latent video diffusion model that predicts future frames with text and conditional frame inputs. The Cosmos-Predict2.5 model operates in the continuous latent space produced by WAN2.2 tokenizer (Wan et al., 2025). It injects language and timestep conditions into each DiT block (Peebles and Xie, 2023). The text embedding is processed by cross-attention layers, while the timestep information is first encoded by sinusoidal embeddings, projected by a lightweight MLP, and then used by adaptive layer normalization for dynamic modulations (scale, shift, gate) (Ali et al., 2025). The whole network is trained using flow matching loss (Lipman et al., 2022). Specifically, given the noise corrupted video latent $x_{t}$ at timestep t, the flow matching loss minimizes the prediction error with the ground-truth velocity $v_{t}$ :

> 💡 **条件注入接口**: WAN2.2 tokenizer 先把像素视频压成连续 latent，DiT 再在该空间预测生成轨迹。文本通过 cross-attention 进入网络，扩散时间通过 AdaLN 的 scale/shift/gate 调制每个 block；第 3 节把动作 embedding 加到时间 embedding 上，复用这条 AdaLN 条件通路。
>
> ```text
> Video latent
>     ↓
> Patch / Tokenize
>     ↓
> ┌─────────────────┐
> │   DiT Block     │
> │                 │
> │ Self-Attention  │
> │ Cross-Attention │ ← Text
> │ FFN             │
> │ AdaLN           │ ← timestep
> └─────────────────┘
>     ↓
> ...
>     ↓
> velocity prediction
> ```
>
> 

$$
\mathcal {L} _ {\mathrm{flow}} (\theta) = \mathbb {E} _ {\mathbf {x}, \epsilon , \mathbf {c}, t} \left\| \mathbf {u} (\mathbf {x} _ {t}, t, \mathbf {c}; \theta) - \mathbf {v} _ {t} \right\| ^ {2},\tag{2}
$$

where $v_{t}$ is a difference between the noise $\epsilon$ and the clean sample x (i.e., $v_{t} = \epsilon - x$ ), c denotes any conditions (e.g., text, conditional frames, and actions for world models), and $\mathbf{u}(\cdot; \theta)$ is the denoiser parametrized by $\theta$ .

> 💡 **式 (2) 的执行逻辑**:
>
> 1. 从干净视频 latent $\mathbf{x}$ 与噪声 $\epsilon$ 构造噪声状态 $\mathbf{x}_t$；
> 2. 网络 $\mathbf{u}(\mathbf{x}_t,t,\mathbf{c};\theta)$ 接收噪声视频、扩散时间和条件 $\mathbf{c}$；
> 3. 以 $\mathbf{v}_t=\epsilon-\mathbf{x}$ 为监督回归速度场，推理时沿该速度场把噪声推进为视频。
>
> DREAMDOJO 保留这个逐元素 flow loss，把机器人或潜动作并入 $\mathbf{c}$，从而融入action。

### 🔖 Section 总结

DREAMDOJO 将交互式世界建模转化为潜视频空间中的动作条件生成问题：任务层目标是建模 \(p(s_{t+1}\mid s_t,a_t)\)，模型层则基于 Cosmos-Predict2.5，在 WAN2.2 压缩得到的视频 latent 上用 DiT 预测 flow velocity，并通过数值积分将噪声逐步推进为未来视频 latent。文本通过 cross-attention 注入，flow timestep 通过 AdaLN 的 scale/shift/gate 调制网络；后续 DREAMDOJO 再将动作条件接入这条 AdaLN 通路，使不同动作能够导向不同的未来生成轨迹。

#### 核心洞察

1. **“世界模型”的关键是动作可控的未来预测。** 单纯预测最可能出现的自然视频未来并不够，模型必须让不同 $a_t$ 改变 velocity field，从而产生对应的 counterfactual future。
2. **生成状态是视频 latent，不是显式物理状态。** 这带来高维视觉表达能力，也留下不可观测变量和物理可验证性的缺口。
3. **动作通过既有条件通路进入 DiT。** 这种复用保留了预训练底座，但动作可控性仍取决于动作表示和时间对齐是否正确。
4. **标准 flow loss 与时间一致性 loss 分工互补。** 前者学习各 latent 的去噪方向，后者约束相邻 latent 的动态变化。

## 3. Approach

### 📌 预览

本章给出 DREAMDOJO 从人类视频到实时机器人世界模型的四层方法：数据层扩展场景与技能覆盖，表示层用连续潜动作统一无标签视频，模型层通过相对动作、时间分块注入和时序损失增强可控性，部署层再以机器人后训练和 Self Forcing 蒸馏完成接口替换与实时化。阅读重点是追踪动作表示在三个阶段中的变化，以及每个结构如何对应“跨具身迁移、因果对齐、长时误差”中的一个具体问题。


### 3.1. Overview

In this section, we first introduce the features of our dataset in Sec. 3.2, and then describe the architecture of DREAMDoJo and its training recipe in Sec. 3.3. Our whole training procedure consists of three phases:

1. Pretraining from human videos. At this stage, we curate three egocentric human datasets for pretraining: In-lab, EgoDex, and DreamDojo-HV. Continuous latent actions are introduced as conditions for all videos.

2. Post-training on target robots. To adapt DREAMDOJO to different embodiments, we reset the action conditioning layer and learn the new action space through finetuning. The post-training can be conducted on a target robot dataset collected from limited scenarios.

3. Distillation. Once DREAMDoJO has learned the target action space, a distillation process can be applied to improve real-time interactivity and context consistency.

> 💡 **三阶段RoadMap**:
>
> DreamDojo 的训练采用 **Human Pretraining → Robot Post-training → Distillation** 三阶段路线。首先利用大规模第一视角人类视频学习通用交互动力学，并通过连续 latent action 补足人类视频缺少显式控制信号的问题；随后针对目标机器人重置动作条件层，用少量机器人数据把新的控制空间映射到已有的世界动态模型；最后通过蒸馏减少生成开销并增强长时序 rollout 的上下文一致性。其核心思想可以概括为：**把“世界如何响应交互”和“某个具体身体如何表达动作”尽可能解耦，从而用廉价的人类视频学习世界，再用昂贵但少量的机器人数据学习 embodiment。**

### 3.2. DreamDojo-HV Dataset

Existing robot world models are primarily limited to in-distribution settings and fall short in generalizing to unseen interactions with new objects (Team et al., 2025; Zhang et al., 2025). In essence, this limitation arises because most datasets only cover a relatively narrow distribution with limited verbs, objects, and environments, thereby restricting the breadth of interaction patterns. As a result, training on these datasets often fails to preserve the model's abilities when extending to out-of-distribution scenarios.

To address this limitation, one might consider increasing the scale of real robot data. However, this may not be the most efficient approach to encompass all potential interaction types, as each new trajectory involves costly teleoperation. On the other hand, human videos, which can be captured during daily activities, emerge as a promising axis to empower robot learning (Bi et al., 2025; Chen et al., 2025; Career et al., 2025; Li et al., 2025; Liu et al., 2025; Luo et al., 2025; Qiu et al., 2025; Wang et al., 2024; Yang et al., 2025; Ye et al., 2025; Zheng et al., 2025). Inspired by these studies, we scale up human videos as a pioneering step for world model pretraining. Our human data comes from three sources:

> 💡 **数据设计逻辑**: 三种互补数据：In-lab 提供可精确重定向的动作对照，EgoDex 提供高质量手部姿态与日常物体，DreamDojo-HV 则提供主要的规模、场景和技能长尾。三者分别服务于机制验证、跨数据集迁移与开放分布覆盖；它们的采集质量和标注精度并不相同。

1. In-lab is collected in our tabletop settings at our laboratory to validate our core designs. The collectors are wearing Manus gloves with Vive Ultimate Tracker to capture precise hand poses, which can be readily retargeted to the GR-1 robot actions. It contains several new objects and new verbs that are unseen in our default robot training dataset.

2. EgoDex (Hoque et al., 2025) is a public dexterous human manipulation dataset with egocentric views recorded by Apple Vision Pro. It has 829 hours of egocentric videos with high-precision 3D hand and finger poses collected at the time of recording. It also contains a variety of everyday household objects. We include it to our data suite to enrich object variety.

3. DreamDojo-HV is a large-scale in-house dataset collected through crowdsourcing. It features a wide spectrum of loco-manipulation skills and extremely diverse environments, such as household, industrial, retail, educational, and administrative (see Fig. 2 for the distribution), which significantly increases the scale and diversity of our data corpus. Each episode is annotated with a text that describes the task being performed.

![Figure 2](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-30-1788097145835.webp)

*Figure 2: Distribution analysis of DreamDojo-HV. (a) Distribution of the scenarios and random examples from the most frequent categories. (b) [Left]: Distribution of subtask numbers within each video. Most videos involve long-horizon tasks that require multiple interactions to accomplish. [Right]: Representative skills in DreamDojo-HV and their frequencies. Our dataset covers a wide range of interaction types beyond pick-and-place. (c) Visualization of skill verbs and object names based on their frequency of occurrence in language annotations.*

> 💡 **图 2 读法**: (a) 描述场景分布，(b) 左侧统计单视频的子任务数量、右侧列出代表性技能，(c) 用语言标注中的动词和物体频率展示长尾。图中“长视频包含多个子任务”说明数据不仅是孤立 pick-and-place，而长尾动词/物体为 OOD 交互提供了潜在覆盖。需要注意，这些类别来自整段视频的语言标注，并不等价于逐帧动作真值；频数会受到标注粒度、同义词合并和众包采样偏差影响。

As shown in Tab. 1, our final dataset comprises a total of 44,711 hours, making it the largest human interaction dataset to date for world model pretraining. It includes more than 9,869 unique scenes, 6,015 unique tasks, and 43,237 unique objects, representing the majority of interactions in daily activities. Its scale and diversity also provide thorough coverage of various action distributions and increase the stochasticity of the future, thereby enhancing the controllability of actions. In Sec. 4.3, we demonstrate that increasing the data scale and diversity continues to enhance model performance across all benchmarks.

![Table 1](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-30-1788097782644.webp)

*Table 1: Scale and diversity comparison to existing large-scale datasets used by previous world models. Our curated data mixture excels in both scale and diversity, encompassing $15 \times$ longer duration, $96 \times$ more skills, and $2,000 \times$ more scenes than the previously largest dataset for world model training. $\dagger$ Estimated by GPT based on the global language annotation of each video clip.*

### 3.3. DREAMDojo Foundation World Model

#### 3.3.1. Model Architecture

Unlike conventional video generators (Ali et al., 2025; Wan et al., 2025), world models are distinct in their prioritization on action controllability (Huang et al., 2025; Yang et al., 2025, 2024). Different from interactive games with discrete inputs (Parker-Holder et al., 2024), achieving genuine controllability for robot actions presents more challenges due to its high dimensionality and contact-rich nature.

To realize precise action following, we propose two improvements based on the original architecture. First, instead of using the absolute robot joint poses, we transform them into relative actions by rebaselining the inputs with the pose at the beginning of each latent frame (i.e., every 4 timesteps). Since relative actions are often concentrated in a narrower space shared across various trajectories, this significantly reduces modeling complexity, thereby enhancing generalization to continuous and compositional robot actions.

> 💡 **相对动作**: 对每个视频 latent 对应的 4 个像素帧，作者不直接使用绝对机器人位姿，而是以每个 video latent 对应片段的起始 pose 为基准，将动作转换成 relative action。这样模型学习的是“接下来相对移动多少”，而不是记忆不同初始关节位形的绝对坐标。

Second, since the consequences of interactions strictly follow causality, observing future actions does not aid predictions at the current timestep but rather increases irrelevant noise. Therefore, instead of sending the entire relative action trajectory as a global condition for all latent frames, we inject actions into the latent frames as chunks (Guo et al., 2025; Huang et al., 2025; Zhu et al., 2025). Specifically, since the temporal compression ratio of the WAN2.2 tokenizer (Wan et al., 2025) is 4 (i.e., video latent $x^i$ corresponds to 4 frames $f^{i:i+4}$ in the pixel space, $x^{i+1}$ corresponds to $f^{i+4:i+8}$ , and so on), we concatenate 4 consecutive actions $a^{t:t+4}$ as a chunk and send them to the corresponding latent frame together. This strong prior can greatly mitigate the causality confusion, thereby improving learning efficiency and ultimately enhancing controllability. We show the effects of these two designs above on both expert and counterfactual trajectories in Sec. 4.5.

> 💡 **时间对齐**: WAN2.2 把 4 个像素帧压成 1 个视频 latent，因此模型先把对应的 4 个连续动作拼成一个 chunk，再只注入到该 latent。相比把整条动作序列广播给所有时间位置，这一设计显式规定
>
> `a[t:t+4] → x[i]，a[t+4:t+8] → x[i+1]`
>
> 从而减少当前预测“偷看”后续动作造成的因果混淆。代价是控制分辨率受 tokenizer 的时间压缩限制，并假定视频和动作时间戳已经可靠同步。

#### 3.3.2. Pretraining from Human Videos

Latent action as proxy action. While our data suite includes comprehensive real-world activities, it does not come with fine-grained action annotations. To inherit the rich knowledge from this unlabeled dataset, one straightforward solution is to pretrain the model by passively predicting future frames. In our experiments, we found that this simple approach can transfer certain physical knowledge from human videos, resulting in more physically plausible modeling for unseen objects. Nevertheless, since world models must learn the consequences of actions, relying solely on actionless videos may lead to an inadequate understanding of the causality, ultimately resulting in inferior interactivity when adapting to the target robots.

To address the inefficient knowledge transfer caused by absence of action labels, it is crucial to derive pseudo labels from pixels that describe the current actions. While off-the-shelf models like HaMeR (Pavlakos et al., 2024) can extract hand poses at scale, these models struggle to represent actions beyond the hands (e.g., arm movements and locomotions) and often face challenges in inferring hand positions in heavy occlusions and camera movements. In addition, they primarily focus on low-level features of the human hands, which may hinder effective knowledge transfer to the target robot when there is a significant embodiment gap.

On the other hand, latent actions (Bruce et al., 2024; Gao et al., 2025; Ye et al., 2025), which extract action information purely from videos in a self-supervised manner and provide consistent action interpretation across embodiments, have gained increasing attention recently. Inspired by (Gao et al., 2025), we adopt continuous latent actions due to their superiority in cross-embodiment generalization and efficient adaptability. We establish a latent action model as a VAE (Kingma and Welling, 2013) using the spatiotemporal Transformer architecture (Bruce et al., 2024). It has an information bottleneck design that can automatically disentangle the most critical action information from the context. Specifically, unlike the standard VAE, our VAE encoder takes two consecutive frames $f^{t:t+1}$ , extracts spatiotemporal features, and projects the global features to a low-dimensional embedding $\hat{a}_{t}$ . The VAE decoder receives this embedding along with the former frame $f^{t}$ , aggregates the information and predicts the subsequent frame $f^{t+1}$ . The entire VAE is supervised by the reconstruction loss of the later frame and the KL divergence. The compactness of the embedding and the regularization term together create an information bottleneck. To reconstruct the later frame, the model has to disentangle and compress the most critical motions between frames.

![Figure 3](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-30-1788097164263.webp)

*Figure 3: Latent action model. [Left]: The information bottleneck design of our latent action model enforces action disentanglement, producing a continuous latent vector that represents actions between frames. [Right]: We retrieve and group the frame pairs from different datasets that share the most similar latent actions. The embodiments are performing the same actions despite the significant differences in context.*

> 💡 **图 3 机制**: 编码器观察相邻两帧 $(f^t,f^{t+1})$，只能通过低维随机变量 $\hat a_t$ 把变化信息传给解码器；解码器同时拿到前一帧 $f^t$，因此没有必要再由 $\hat a_t$ 重复编码静态背景。信息瓶颈由低维表示与 KL 正则共同形成，目标是让它优先保留运动，局限是不能排除相机自运动等背景运动被编码为动作。
>
> Latent Action Model (LAM) 本身是一个 VAE：
>
> ```text
>               f^t ─────────────┐
>                │               │
>                │               ▼
> f^t  ──┐       │           ┌─────────┐
>        ├─ Encoder ─→ â_t ─→│ Decoder │──→ f̂^{t+1}
> f^{t+1}┘                   └─────────┘
> ```
>
> Encoder：
>
> $$
> q_\phi( \hat a_t \mid f^t,f^{t+1} )
> $$
>
> Decoder：
>
> $$
> p_\theta( f^{t+1} \mid f^t,\hat a_t )
> $$
>
> 


$$
\mathcal {L} _ {\theta , \phi} ^ {p r e d} (f ^ {t + 1}) = \mathbb {E} _ {q _ {\phi} (\hat {a} | f ^ {t: t + 1})} \log p _ {\theta} (f ^ {t + 1} | \hat {a}, f ^ {t}) - \beta D _ {K L} (q _ {\phi} (\hat {a} | f ^ {t: t + 1}) | | p (\hat {a})).\tag{3}
$$

> 💡 **式 (3) 拆解**: 
>
> **第一项**
>$$
> \mathbb E_q[ \log p_\theta(f^{t+1}\mid \hat a,f^t) ]
> $$
> 
>要求给 Decoder 当前帧 $f^t$ 和 latent action $\hat a$，必须能够重建真实下一帧，所以它迫使 $\hat a$ 包含足够的 transition information。
> 
>**第二项**
> $$
>\beta D_{\mathrm{KL}}(q_\phi\parallel p)
> $$
>
> 限制 latent 不要什么都记，即“你当然可以重建，但不能直接把 $f^{t+1}$ 全抄进 latent。”
>
> 实验中 $\hat a$ 为 32 维、$\beta=10^{-6}$：较弱的 KL 保留细粒度变化，但也意味着“动作/外观解耦”主要依靠条件重建结构与低维瓶颈，而非强正则本身。

In egocentric human videos, we found that this embedding particularly captures the human actions and can be transferred across embodiments (see Fig. 3). Ultimately, we are able to utilize latent actions as unified proxy labels for world models. During pretraining, we condition each latent frame on the chunked latent actions. Concretely, after extracting latent actions from consecutive frames, we project them using a lightweight MLP to match the dimensions of the timestep embeddings. The last layer of the action MLP is initialized with zeros to avoid perturbing the pretrained model state at the beginning of training (Zhang et al., 2023), which we empirically found leads to improved physics. The projected embeddings are added with the timestep embeddings and then fed into the adaptive layer normalization within each DiT block.

> 💡 **潜动作进入世界模型**: 提取器先为相邻帧生成潜动作，再按视频 latent 的时间块组织动作 chunk，经轻量 MLP 投影到与 diffusion timestep embedding 相同的维度，二者相加后通过 AdaLN 注入每个 DiT block。动作 MLP 的末层零初始化使训练起点等价于原始 Cosmos-Predict2.5，随后逐渐“打开”动作通道，减少随机新层一上来就破坏 pretrain 的风险。

Training objective. As mentioned in Sec. 2, Cosmos-Predict2.5 employs the standard flow matching loss (Eq. (2)) as its training objective. However, this individual supervision of each frame overlooks the temporal correlation between video frames, which could provide a more direct signal for learning object dynamics and action following. Inspired by previous studies (Gao et al., 2024; Wang et al., 2024; Yang et al., 2025), we modify Eq. (2) to a new loss that aims to match the ground-truth temporal transitions. Let $\mathbf{z}_{t} = \mathbf{u}(\mathbf{x}_{t}, t, \mathbf{c}; \theta)$ represent the predicted velocity, then the proposed temporal consistency loss can be expressed as:

$$
\mathcal {L} _ {\text {temporal}} (\theta) = \mathbb {E} \left[ \sum_ {i = 1} ^ {K - 1} \left\| (z ^ {i + 1} - z ^ {i}) - (v ^ {i + 1} - v ^ {i}) \right\| ^ {2} \right].\tag{4}
$$

Here, K is the total length of the video latent, $[z^{1}, z^{2}, \ldots, z^{k}]$ and $[v^{1}, v^{2}, \ldots, v^{k}]$ are frames in $z_{t}$ and $v_{t}$ , respectively. In practice, we found that this loss term not only accelerates the learning of action controllability but also effectively enhances object completeness and reduces artifacts. Therefore, our final training objective becomes:

$$
\mathcal {L} _ {\mathrm{final}} (\theta) = \mathcal {L} _ {\mathrm{flow}} (\theta) + \lambda \mathcal {L} _ {\mathrm{temporal}} (\theta),\tag{5}
$$

where $\lambda > 0$ is a trade-off coefficient to balance the optimization. We use $\lambda = 0.1$ in our experiments.

> 💡 **式 (4)–(5) 解读**: 标准 flow loss 要求每个位置的预测速度 $z^i$ 接近真值 $v^i$；temporal loss 进一步要求相邻位置的速度变化 $(z^{i+1}-z^i)$ 对齐 $(v^{i+1}-v^i)$。它相当于对视频时间维做一阶差分监督，直接惩罚物体形状、位置或动作响应在相邻 latent 间的不连续。最终以 $\lambda=0.1$ 与 flow loss 相加，计算开销只增加差分与求和；但它约束的是潜空间局部平滑和变化一致性，并不是显式的几何或接触定律。
>
> >作者定义：
> >
> >$$
> >z_\tau = u(x_\tau,\tau,c;\theta)
> >$$
> >
> >这是模型预测的整个视频 latent velocity。
> >
> >如果视频长度是 $K$，就有：$z_\tau= [z^1,z^2,\dots,z^K]$ ，真实目标：$v_\tau= [v^1,v^2,\dots,v^K]$
> >
> >然后作者不只比较 $z^i\overset{?}{=}v^i$
> >
> >还比较相邻 frame 的差：$z^{i+1}-z^i$ 和 $v^{i+1}-v^i$
> >
> >于是：
> >
> >$$
> >{ \mathcal L_{\text{temporal}} = \mathbb E \left[ \sum_{i=1}^{K-1} \left\| (z^{i+1}-z^i) - (v^{i+1}-v^i) \right\|^2 \right] }
> >$$

#### 3.3.3. Post-Training on Target Robots

Although learning from human videos exposes the model to a wide range of physics interactions, we still require a post-training stage on the target robot data to adapt our model for downstream applications. To achieve this, we flatten the ground-truth actions of the target robot into a sequence and project the entire sequence through the action MLP. To match the target action space, we reinitialize the first layer of the action MLP and fully finetune it along with all other pretrained weights. Thanks to strong pretraining, the target robot dataset can be collected in limited domains at a small scale while still achieving zero-shot generalization after finetuning. The continuity of our latent action space also ensures better adaptation results compared to other variants (Gao et al., 2025).

> 💡 **后训练是“换接口 + 全量适配”**: 目标机器人真实动作的维度和语义不同于 32 维潜动作，因此动作 MLP 第一层重新初始化，其余动作投影结构与所有世界模型权重一起全量微调。零样本泛化不是指模型无需机器人数据，而是指它只在有限机器人场景后训练后，能迁移到该具身的未见对象或环境。全量微调也带来预训练知识遗忘风险，论文在限制中明确尚未系统研究这一点。

#### 3.3.4. Distillation

In order to unlock capabilities like live teleoperation and online model-based planning, our world model must be able to run autoregressively in real time (Huang, 2025). However, existing video diffusion models are often limited in achieving this due to (1) their bidirectional attention architecture, which defines a fixed horizon length, and (2) a large number of denoising timesteps (e.g., 50), which severely hampers inference speed.

Thus, we introduce an additional distillation stage that converts the foundation DREAMDOJO model into an autoregressive, few-step diffusion model. We build on the process introduced by Self Forcing (Huang et al., 2025), which uses two training stages to distill teacher $G_{teacher}$ to student $G_{student}$ . We construct $G_{student}$ with the same architecture and model weights of $G_{teacher}$ , with the exception of the bidirectional attention mechanism, which is replaced with causal attention, and the timestep schedule, which is shortened to a few steps (e.g., 4).

> 💡 **教师到学生的结构转换**: 教师以 Bidirectional attention 一次生成固定视频块，并用 35 个去噪步；学生继承权重，但改用 Causal attention 和 4 步日程。Causal attention 让每个新 latent 只依赖过去，从而支持流式自回归和滑动历史；少步日程负责加速。

Warmup stage. In the first “warmup” stage, we regress student predictions to match ODE solutions generated by our teacher,

$$
\mathcal {L} _ {\mathrm{warmup}} (G _ {\mathrm{teacher}}, G _ {\mathrm{student}}) = \mathbb {E} _ {x, t} \| G _ {\mathrm{student}} (x _ {t}, t) - x _ {0} \| ^ {2},\tag{6}
$$

where $x_0$ is from the teacher's ODE trajectory. In this stage, the student generates via teacher forcing, i.e., its context consists of latents generated by the teacher.

> 💡 **式 (6)：先学会单步模仿**: warmup 从教师 ODE 轨迹取得目标 $x_0$，学生在教师生成的正确历史上下文上回归该终点（不将学生自己的预测作为上下文）。这个阶段把多步教师压入少步学生，但上下文始终正确，尚未训练学生处理自身历史中的误差。

Distillation stage. Afterwards, in the second “distillation” stage, we construct the student context with its own previously-generated latents, instead of continuing teacher forcing from the first stage. This aligns the training distribution with what the model will receive at inference time, thereby reducing compounding error. To supervise this stage, we guide the student distribution toward the teacher via a distribution matching loss (Yin et al., 2024) based on the Kullback-Leibler (KL) divergence between real (teacher) and fake (student) distributions,

$$
\mathcal {L} _ {\text { distill }} = D _ {\mathrm{KL}} (p _ {\text { teacher }} \| p _ {\text { student }}).\tag{7}
$$

> 💡 **式 (7)：再对齐自回归分布**: 正式阶段把上下文改成学生先前生成的 latent，使训练输入与推理时一致；目标是缩小教师分布与学生分布的 KL。关键不是对某个教师样本做逐像素回归，而是让学生在**自己的历史**上仍朝教师分布移动，从而直接暴露并纠正累积误差。

Computing the loss in this form is intractable, but we can directly compute its gradient, using real and fake diffusion models $s_{real}$ and $s_{fake}$ to estimate the score,

$$
\nabla \mathcal {L} _ {\mathrm{distill}} = - \mathbb {E} _ {z, t} \left[ (s _ {\mathrm{real}} (x _ {t}, t) - s _ {\mathrm{fake}} (x _ {t}, t)) \frac {d G _ {\mathrm{student}}}{d \theta} \right],\tag{8}
$$

where $z \sim \mathcal{N}(0, I)$ is noise, $x_{t}$ is produced via forward diffusion with $G_{student}$ starting at z, and $s_{real}$ is estimated by $G_{teacher}$ whereas $s_{fake}$ is estimated by a model trained on the predictions of $G_{student}$ .

> 💡 **式 (8)：可计算的训练信号**: KL 本身难以直接求值，作者改用教师 score $s_{real}$ 与学生生成分布的 score $s_{fake}$ 之差构造梯度，再通过 $dG_{student}/d\theta$ 更新学生。实现上需要保留教师，并额外训练 fake score model；推理虽然轻量，蒸馏训练并不便宜。这个阶段不需要老师自己生成片段，只需要针对学生生成的片段提供监督信号即可。

This process minimizes the train-test distribution mismatch, as the student is trained to generate from its previous outputs. However, despite this alignment, generation quality can still degrade over long horizons. To improve robustness against compounding errors, we propose to have the student generate $N' > N$ frames, where N represents the horizon of the teacher. This simulates longer student rollouts, thus further minimizing the train-test discrepancy. To supervise the student's prediction, we randomly select a window of size N, which receives gradients via the $L_{distill}$ loss (Eq. (8)).

> 💡 **长 rollout、短监督窗**: 训练时学生随机生成 13–49 帧，但只在最后 13 帧窗口上计算蒸馏损失。前面的自生成帧用于制造真实的误差上下文，后窗用于控制显存和监督范围。这让模型见到比教师固定 horizon 更差的历史状态，却不等于对 49 帧所有位置都施加直接监督。

### 🔖 Section 总结

方法章把 DREAMDOJO 组织成一条连续的表示与接口转换流程。三类人类数据先提供广覆盖视频，VAE 式潜动作模型从相邻帧中抽取统一代理动作，世界模型再以相对动作、分块注入和时序差分损失学习可控视频动力学。后训练用真实机器人动作替换代理接口，蒸馏则将固定窗口多步教师转成使用自身历史的 4 步因果学生。

#### 核心洞察

1. **数据规模只有与代理动作配对才转化为可控性。** 被动预测能迁移视觉与部分物理先验，潜动作才显式连接“做了什么”和“随后发生什么”。
2. **统一动作空间只存在于预训练阶段。** 目标具身仍需重置输入层并用真实动作全量后训练，跨具身能力不是零成本获得的。
3. **三个可控性设计各有分工。** 相对动作收窄数值分布，chunk 注入建立动作—latent 时间对齐，temporal loss 约束相邻动态变化。
4. **蒸馏同时改变采样步数、注意力方向和训练上下文。** 4 步提高速度，因果滑窗支持流式历史，Self Forcing 缓解学生自身误差造成的分布偏移。
5. **方法仍依赖若干未显式保证的假设。** 潜动作可能混入相机运动，动作/视频需准确同步，潜空间平滑不等于物理守恒，全量后训练还可能遗忘长尾先验。

## 4. Experiments

### 📌 预览

本章沿五条证据链检验 DREAMDOJO：潜动作是否优于被动视频预训练，增加不同人类数据是否改善 OOD 交互，模型容量与三个控制设计是否有效，蒸馏能否在速度与质量间取得可用折中，以及生成视频能否支持策略排序、候选动作选择和实时遥操作。阅读时应特别区分不同表中的训练预算与数据配方，并把自动重建指标、人类偏好、实机成功率相关性看作互补而非可互换的证据。


In this section, we conduct extensive experiments to demonstrate DREAMDOJO's strengths. Specifically, we aim to answer the following questions: (1) Compared to actionless pretraining, can latent actions enable more effective transfer from human videos? (Sec. 4.2) (2) Can more diverse data help generalize to new types of physical interaction and scenarios? (Sec. 4.3 and Sec. 4.4) (3) Can our architectural design and training objective improve the action-conditioned prediction? (Sec. 4.5) (4) Can our distillation pipeline accelerate and stabilize long-horizon interactions? (Sec. 4.6) (5) How can we apply DREAMDOJO in downstream applications to facilitate robot learning? (Sec. 4.7)

### 4.1. Experimental Setup

Training and inference. The latent action model is a 700M spatiotemporal Transformer (Bruce et al., 2024) that is trained for 400k steps with a total batch size of 256. The dimension of the latent action is 32. The model has 24 encoder blocks for latent action extraction and 24 decoder blocks for forward dynamics prediction. It is trained on a data mixture of the three human video datasets, as well as our in-house robot datasets, including Unitree G1, Fourier GR-1, AgiBot, and YAM. The original videos are temporally downsampled by a random factor of $\{1, 2, 3, 4\}$ to capture various kinds of motions. The video frames are center cropped and resized to a fixed resolution of $320 \times 240$ . The $\beta$ in Eq. (3) is set to $10^{-6}$ to achieve a good trade-off between representation capacity and transferability for post-training. We employ the AdamW (Loshchilov and Hutter, 2019) with a weight decay of 0.01 and a constant learning rate of $2.5 \times 10^{-5}$ to train the latent action model from scratch.

> 💡 **潜动作模型设置**: 700M 编码器—解码器先独立训练 400k 步，输出 32 维连续动作。训练混合人类与四类机器人视频，并随机以 1–4 倍时间降采样，让同一表示覆盖不同运动速度。$\beta=10^{-6}$ 很小，更重视重建容量；跨具身解耦不能仅由 KL 正则保证，还依赖低维瓶颈、条件解码和混合数据本身。

The world model is initialized from Cosmos-Predict2.5 (Ali et al., 2025) and pretrained on the mixture of our In-lab, EgoDex, and DreamDojo-HV datasets, with a sampling ratio of 1:2:10, respectively. The video frames are center cropped and resized to a fixed resolution of $640 \times 480$ , and then clipped into sequences with a length of 13 for pretraining. The text condition is fixed as an empty prompt. We present two variants of DREAMDOJO: a 2B model and a 14B model. Both models are pretrained for 140k steps with an effective batch size of 1024 using 256 NVIDIA H100 GPUs. We use AdamW (Loshchilov and Hutter, 2019) with a weight decay of 0.1, and set the learning rate to $1.6 \times 10^{-4}$ . An exponential moving average (EMA) is maintained throughout the training and used to generate all our results.

> 💡 **最终预训练配方**: 2B 与 14B 都训练 140k 步，三数据源按 1:2:10 采样；这与 4.3 节为控制变量而采用的“50k 步 + 各数据源均匀采样”不同。文本条件固定为空，实验中的可控性主要来自图像历史和动作，而不是任务语言。256 张 H100、有效 batch 1024 也表明这里的“可扩展”指数据与表示机制，不代表训练成本低。

In the post-training stage, the videos of the target embodiment (e.g., G1, GR-1, AgiBot) are sampled at roughly 10 Hz to capture feasible motions. The video clips are then organized as sequences with a length of 13. The first frame serves as the condition frame, and the raw actions are processed as relative actions with a length of 12. The world model is finetuned with all weights updated using a similar hyperparameter setting as in the pretraining stage. By default, post-training is conducted with 128 NVIDIA H100 GPUs for 50k steps with a batch size of 512.

The distillation stage initializes the autoregressive student model with the weights of the teacher, while replacing bidirectional attention with causal attention over a sliding window size of 12 frames. First, for the warmup stage, we generate 10k ODE trajectories and train for 10k iterations. Next, for the distillation step, we have the student randomly generate between 13 and 49 frames during training, and compute loss on the last 13 generated frames. We run this distillation step for 3k iterations. All distillation is conducted on 64 NVIDIA H100 GPUs, using a batch size of 256 for the warmup stage and 64 for the distillation stage.

> 💡 **蒸馏预算与上下文**: warmup 用 10k 条教师 ODE 轨迹训练 10k 次，正式 Self Forcing 只训练 3k 次，但每次让学生先自回归 13–49 帧，再在最后 13 帧反传。学生部署时的 context length 为 12；训练中的长前缀专门用来制造累积误差，而不是扩大单次监督窗口。

During inference, the teacher model utilizes 35 denoising steps for generation, while the distilled model reduces this number to 4 steps. Classifier-free guidance (Ho and Salimans, 2022) is disabled as we empirically found it brought limited benefits.

Benchmark construction. To demonstrate the effectiveness of our method, we conduct a systematic evaluation that emphasizes out-of-distribution scenarios and counterfactual actions. To be specific, we mirror the diverse and novel interactions in the three human datasets and construct three corresponding evaluation sets using the Fourier GR-1 humanoid robot: (1) In-lab Eval, (2) EgoDex Eval, (3) DreamDojo-HV Eval. We make every effort to replicate the objects observed in the human videos, allowing our robots to perform the same interactions that reflect similar underlying physics. We also collect a (4) Counterfactual Eval set that focuses on counterfactual actions not present in current robot learning datasets, such as patting a toy or reaching toward an object but missing it. To assess DREAMDOJO's generalization to diverse environmental changes, we further employ Gemini 2.5 Flash Image (a.k.a. Nano Banana) (Comanici et al., 2025) to edit the backgrounds of EgoDex Eval and DreamDojo-HV Eval to replicate typical observations in the original datasets. This results in (5) EgoDex-novel Eval and (6) DreamDojo-HV-novel Eval, with each consisting of 25 samples. A glimpse of the samples from our benchmarks is provided in Fig. 4.

![Figure 4](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-30-1788097179403.webp)

*Figure 4: Benchmark visualization. We rigorously construct six evaluation benchmarks that reflect the diverse scenarios and actions present in human datasets, while being out-of-distribution for the robot training datasets.*

> 💡 **图 4 与六套基准**:
>
> - **交互迁移**：In-lab、EgoDex、DreamDojo-HV Eval 让 GR-1 复现对应人类数据中的对象与动作，检验人类视频先验能否跨具身迁移。
> - **动作反事实**：Counterfactual Eval 包含拍玩具、伸手但未碰到等机器人训练集罕见动作，检验模型是否真的响应控制输入。
> - **背景 OOD**：两个 `-novel` 集合用 Gemini 编辑背景，各 25 个样本，检验外观变化下的物理与动作判断。
>
> 前四套有配对真值，可计算 PSNR/SSIM/LPIPS；编辑背景后没有真实未来，只能做人类成对偏好。因此六套基准不能汇总成一个统一分数，且“复刻人类数据场景”仍是人工构造的受控 OOD，不等于自然开放世界抽样。

Evaluation protocol. To quantify the model performance on our evaluation sets, we use PSNR (Hore and Ziou, 2010), SSIM (Hore and Ziou, 2010), and LPIPS (Zhang et al., 2018) as our three main automatic metrics. When evaluating the models without distillation, we generate 100 future videos over three rounds by autoregressively resetting the condition frame with the last prediction to make the discrepancies between different variants more discriminative, resulting in 100 samples with 49 frames for most of our evaluations. We choose Fourier GR-1 as a representative target embodiment for most ablative studies.

> 💡 **指标与 rollout 口径**: PSNR、SSIM 越高越好，LPIPS 越低越好；三者都比较生成视频与唯一真值的视觉接近度，无法单独判断接触因果是否正确。多数非蒸馏实验将模型连续滚动 3 轮得到 49 帧、共 100 个样本，故指标也包含误差累积。主要消融只在 Fourier GR-1 上完成，多具身主张更多来自应用展示和训练覆盖。

Since the ground-truth videos are unavailable for EgoDex-novel Eval and DreamDojo-HV-novel Eval, we design a human preference evaluation protocol following recent advances (Gao et al., 2024; Wan et al., 2025; Yin et al., 2025). Specifically, we make a web UI and invite 12 volunteers to judge side-by-side video pairs from physics correctness of object interactions and action following compared to the ground-truth video. For physics correctness, they are suggested to focus on object permanence, shape consistency, and contact causality. For action following, we encourage the evaluators to pay more attention to the pose of the robots and allow for a “tie”. We also provide evaluation examples beforehand to justify the key factors the evaluators should focus on. The order of the videos in each pair will be randomly switched to avoid bias, and we average all win rates against the anchor model to obtain the final results. More details can be found in the Appendix.

> 💡 **人评回答什么**: 12 名评审分别判断物体持续性/形状/接触因果与机器人姿态跟随，并允许动作维度判平；左右顺序随机化降低位置偏差。最终是相对 anchor 的平均胜率，因此 60% 表示更常被偏好，不是“60% 视频物理正确”。论文没有报告评审间一致性或置信区间，接近的胜率差应谨慎解读。

### 4.2. Effects of Different Action Conditions

We conduct experiments on both In-lab Eval and EgoDex Eval. To demonstrate the efficacy of the proposed latent action conditioning, we compare our method with three representative baselines:

1. Without pretraining. In this setup, the model is initialized from Cosmos-Predict2.5 directly for post-training without observing the human videos.

2. Action-free pretraining. In this baseline, we pretrain the world model on unlabeled videos as passive future prediction. The pretrained model is then used for post-training.

3. Ground-truth action conditioning. In this baseline, we pretrain the world model with ground-truth action conditioning. This is an ideal setting, where additional equipment is required to obtain high-quality action labels. Specifically, on the In-lab dataset, we condition our model on retargeted GR-1 actions captured by Manus gloves with a Vive Ultimate Tracker, which are mapped to the real GR-1 action specifications for each degree of freedom. The EgoDex dataset utilizes Apple Vision Pro to capture hand poses, which are subsequently transformed into MANO (Romero et al., 2022) by ourselves as conditions during pretraining.

All compared methods are pretrained for 50k steps on the corresponding human datasets and post-trained for 25k steps on the in-distribution GR-1 dataset. The post-trained models are evaluated on In-lab Eval and EgoDex Eval, which contain novel objects and actions not present in the GR-1 training dataset. The results are reported in Tab. 2. While pretraining on human videos through action-free video prediction brings marginal benefits, introducing latent actions significantly narrows the gap to the ideal scenario where ground-truth action labels are available. We also provide the PSNR curves throughout the post-training stage in the Appendix. Pretraining with latent actions can reach a much higher upper bound than action-free pretraining and without pretraining. Note that, although MANO actions can also be extracted from videos (Pavlakos et al., 2024), it is likely not as precise as using the Apple Vision Pro to derive the MANO labels in Tab. 2. Hence, we choose latent actions as unified proxy actions for all human videos during pretraining.

![Table 2](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-30-1788097187676.webp)

*Table 2: Effects of different action conditioning methods. Latent action conditioning performs on par with the ideal settings in simulation quality and is the most scalable in use. We denote retargeted action and MANO in gray because they represent ideal collection setups when additional action capture devices are equipped. The best results are marked with bold, and the second best results are underlined.*

> 💡 **表 2 的干净对照**: 四种初始化都用对应人类数据预训练 50k 步、再在同一 GR-1 数据上后训练 25k 步。action-free 在两套评测中几乎没有稳定增益；latent action 在 In-lab 达到 20.913 PSNR、0.776 SSIM、0.219 LPIPS，在 EgoDex 达到 20.344/0.790/0.214，整体接近或部分优于 retargeted action/MANO。结论应表述为“潜动作在该预算下接近设备真值上界且更易规模化”，而不是它比真实动作本身更准确；灰色基线依赖 Manus/Vive 或 Vision Pro，数据采集条件不同。

### 4.3. Effects of Different Data Mixtures

We also conduct a dataset ablation to validate the benefits of increasing data diversity. Specifically, we pretrain our model on different data combinations for 50k steps, and then post-train on the GR-1 dataset for 25k steps. Unlike our final models, the sampling ratio is uniform across each dataset for the model variants in this ablation study. We evaluate the post-trained models on In-lab Eval, EgoDex Eval, and DreamDojo-HV Eval, which contain unseen object interactions, as well as on Counterfactual Eval, which features counterfactual actions. From the results in Tab. 3, increasing data diversity not only improves physics modeling but also enhances the controllability for out-of-distribution actions.

![Table 3](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-30-1788097194632.webp)

*Table 3: Effects of using different data mixtures. Adding more human datasets to pretraining consistently improves the performance for both out-of-distribution scenarios and counterfactual actions, highlighting the potential of our approach. The best results are marked with bold, and the second best results are underlined.*

> 💡 **表 3 的正确读法**: 数据混合消融固定 50k 预训练步、25k 后训练步，并对已加入的数据源均匀采样，所以增加数据源实际上会改变每个数据源获得的样本占比。最稳定的趋势出现在 PSNR：从 Cosmos 到完整三源混合，四套评测均提高；SSIM/LPIPS 并非每加一个数据源都单调改善，例如完整混合在 EgoDex 与 DreamDojo-HV 的部分感知指标略有回落。表底 2B/14B 最终模型采用 140k 步和 1:2:10 配方，只适合作为规模化参考，不能与上方消融归因混用。

### 4.4. Generalization to Unseen Scenarios

To benchmark the generalization ability in unseen scenarios, we generate video samples using the two final models, DREAMDoJO-2B and DREAMDoJO-14B, and conduct evaluations with Cosmos-Predict2.5 without human video pretraining. All models are post-trained for 30k steps. After post-training, we ask 12 volunteers to evaluate three model pairs: DREAMDoJO-2B vs. Cosmos-Predict2.5, DREAMDoJO-14B vs. Cosmos-Predict2.5, and DREAMDoJO-14B vs. DREAMDoJO-2B. The evaluation is conducted on 50 samples from EgoDex-novel Eval and DreamDojo-HV-novel Eval. The results in Tab. 4 show that our DREAMDoJO-2B surpass the original Cosmos-Predict2.5 in both physics correctness and action following by a non-trivial margin, while DREAMDoJO-14B exhibits a clear advantage over DREAMDoJO-2B in both axes due to its large capacity.

![Table 4](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-30-1788097203168.webp)

*Table 4: Human preference evaluation in diverse out-of-distribution scenarios. DREAMDOJO outperforms the pretrained Cosmos-Predict2.5 by a non-trivial margin. Our DREAMDOJO-14B demonstrates the most competitive performance in both physics correctness and action following.*

> 💡 **表 4 的三组配对**: DREAMDOJO-2B 对 Cosmos 的物理/动作胜率为 62.50%/63.45%，14B 对 Cosmos 为 73.50%/72.55%，14B 对 2B 仍有 72.50%/65.53%。这同时支持人类视频预训练和模型容量两项因素，但三组并非完整因子实验：没有“未经人类预训练的 14B”来完全分离规模效应。评测仅含两个编辑背景集合共 50 个样本、12 名评审，适合作为受控视觉 OOD 证据，不是开放世界成功率。

### 4.5. Ablations of Our Design Choices

To efficiently verify the effectiveness of our architectural design and training objective, we finetune Cosmos-Predict2.5 for 30k steps only on the GR-1 training dataset. The finetuned models are then evaluated on a held-out GR-1 validation set with expert demonstrations and the Counterfactual Eval set. Starting with the simple Cosmos-Predict2.5 base architecture, we gradually apply our modifications: relative action transformation, chunked action injection, and the temporal consistency loss. The evaluation results are shown in Tab. 5. Both relative actions and chunked injection can significantly improve simulation quality, indicating their importance for achieving precise action controllability. The proposed temporal consistency loss further improves performance on both benchmarks, demonstrating its effectiveness in enhancing action following and object modeling. In the Appendix, we also provide qualitative comparisons for these variants.

![Table 5](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-30-1788097208188.webp)

*Table 5: Ablations of architecture and loss designs. Our design choices can effectively enhance the simulation quality of both expert and counterfactual trajectories.*

> 💡 **表 5 的增益归属**: 累加式消融显示 relative 带来小幅改善，加入 chunked 后增益最大：GR-1 Val 的 PSNR 从 16.522 升至 17.626，Counterfactual Eval 从 19.482 升至 20.783；temporal loss 再把两者推至 17.630 与 20.980，并改善 SSIM/LPIPS。由此最强证据指向动作—latent 时间对齐，时序损失提供额外补强。

### 4.6. Benefits of Distillation

To unlock real-time inference, we distill the GR-1 post-trained variant of DREAMDOJO-2B using the same GR-1 dataset. Stress testing the capabilities of this distillation process, we run both the teacher and student models on GR-1 Long Eval, generating 600 frames (1 minute) of long-horizon, multi-stage tasks. As seen in Tab. 6, our student model, despite being few-step and autoregressive, achieves performance close to that of the teacher while running nearly $4 \times$ faster on a single NVIDIA H100 GPU. In addition, the autoregressive architecture of our student offers two extra advantages. First, since the student generates each latent frame autoregressively, it enables real-time streaming, which we demonstrate in Sec. 4.7 is crucial for multiple downstream applications. Second, unlike the teacher that is conditioned on a single initial frame, the distilled model can naturally incorporate multiple frames as context, resulting in superior robustness to occlusions and camera shifts. See our Appendix for qualitative samples.

![Table 6](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-30-1788097221974.webp)

*Table 6: Results of our distillation pipeline. Our distilled model is significantly faster, able to inference at real-time 10.81 FPS with minor degradation in long-horizon rollouts and performance close to that of the teacher. The autoregressive causal prediction of the student model also provides finer granularity for interaction and better context awareness.*

> 💡 **表 6 的速度—质量交换**: 单张 H100 上学生从 2.72 提升到 10.81 FPS（约 $3.97\times$），代价：600 帧长 rollout 中 PSNR 14.086→13.146、SSIM 0.442→0.379、LPIPS 0.412→0.485，三个自动指标都变差。学生的优势是每次预测 4 帧、保留 12 帧历史，可实时流式交互；教师一次预测 12 帧、上下文仅 1 帧，学生遮挡一致性改善来自更长历史。

Lastly, we ablate the choice of teacher model in Tab. 7, evaluating the distillation results of a teacher pretrained on human videos versus one without pretraining (Cosmos-Predict2.5). Across all four evaluation datasets, we observe that the former significantly outperforms the latter. This suggests that the benefits of generalization achieved through our human video pre-training are preserved after distillation, resulting in student models that also excel in unseen scenarios.

![Table 7](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-30-1788097234337.webp)

*Table 7: Generalization ability after distillation. Thanks to our strong pretraining, DREAMDOJO shows consistently better generalization than the baseline after distillation.*

> 💡 **表 7**: 从有人类视频预训练的教师蒸馏后，学生在四套评测的 PSNR 均高于无预训练版本，In-lab、EgoDex、DreamDojo-HV 的 SSIM/LPIPS 也更好；但 Counterfactual Eval 的 SSIM 0.746 低于 0.758、LPIPS 0.234 略差于 0.232。更稳妥的结论是预训练收益在蒸馏后**大体保留、尤其体现在 PSNR**，而不是所有指标无损继承。该表也没有展示同一教师蒸馏前后的差值，无法量化蒸馏遗忘。

### 4.7. Downstream Applications

Policy evaluation. One of the most straightforward application of world models is for policy evaluation (Li et al., 2025; Quevedo et al., 2025; Team et al., 2025; Tseng et al., 2025; Zbinden et al., 2025). In this work, we choose AgiBot fruit packing as a typical long-horizon task to verify whether DREAMDOJO can perform policy evaluation accurately. We train a single-view state-free variant of GR00T N1.5 (Bjorck et al., 2025) on the fruit packing dataset. We also post-train DREAMDOJO-2B on the same AgiBot dataset. Afterwards, we deploy different checkpoints from training to collect closed-loop rollouts in the real world.

We set up 20 different scenes for the fruit packing tasks, covering various combinations of multiple fruits (pear, mango, banana, and starfruit) located in different places on the table. The success rate is determined by the number of fruits successfully picked up from the table and placed into the bag, with 5 fruits designated as 100% success. For each scene, we collect an approximately 80-second rollout in the real world and simulate the entire rollout with the post-trained DREAMDoJO-2B using the same initial frame. The generated rollouts are scored by human evaluators based on consistent criteria as the real world. The final success rate is averaged across all 20 scenes for both real-world and DREAMDoJO.

Following WorldEval (Li et al., 2025) and SIMPLER (Li et al., 2024), we utilize Pearson correlation coefficient to quantify linear agreement between real-world and DREAMDOJO's success rates and Mean Maximum Rank Violation (MMRV) to measure the rank consistency between these two. Fig. 5a shows that DREAMDOJO's success rate has a strong linear correlation with real-world success rate (Pearson r=0.995) and maintains a highly consistent ranking (MMRV=0.003), indicating that DREAMDOJO is able to serve as a reliable simulator for policy evaluation.

> 💡 **策略评估的真正结论**: 图 5(a) 比较 6 个 GR00T checkpoint，在 20 个水果打包场景中各执行约 80 秒真实与生成 rollout。Pearson $r=0.995$ 和 MMRV 0.003 说明**checkpoint 的相对趋势和排序**高度一致；散点整体位于 $x>y$ 区域，表明 DREAMDOJO 成功率系统性高于真实成功率。

Model-based planning. Being able to simulate future outcomes conditioned on actions allows model-based planning that can strengthen and correct the policies at test time (Qi et al., 2025). In this paper, we adopt a simple algorithm for model-based planning. Specifically, similar to the policy evaluation experiment above, we setup 10 AgiBot fruit packing scenes as our touchstone. We ensemble 5 model checkpoints from training to generate action proposals that exhibit sufficient variance at inference time. These action proposals are sent to DREAMDOJO to predict future video trajectories. To ensure execution efficiency, we batch all the action inputs and process them using the distilled DREAMDOJO-2B. Subsequently, the best proposal is selected by an external value model that takes a short video clip as input and is executed by the robot. The implementation details of the value model are provided in the Appendix.

![Figure 5](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-30-1788097244048.webp)

*Figure 5: Downstream applications. We show evidences that can be readily applied to benefit robot learning in policy evaluation without requiring real-world deployment, as well as for test-time model-based planning.*

> 💡 **图 5(b) 的规划链路**: 5 个 policy checkpoint 各提出一个动作候选，蒸馏版 DREAMDOJO 批量生成 5 条未来视频，外部 value model 选择预测进度最好的方案，再把该动作交给真实机器人。高方差组从均匀采样 37% 提升到 70%，并比最佳单 checkpoint 53% 高 17 个百分点；收敛组从 55% 提升到 68%，只比最佳单模型 63% 高 5 个百分点。

We experiment with two different groups of checkpoints. The results are presented in Fig. 5b. While our world model will introduce additional latency, it will also significantly improve the overall performance. With the help of DREAMDoJO, the policies can anticipate the outcomes of their predictions in advance and adaptively select the most promising mode for execution. For the policy group that has a larger performance variance, our approach improves the success rate by 17% over the best model checkpoint. Compared to uniformly sampling from all policy proposals, applying model-based planning with DREAMDoJO yields nearly a $2\times$ increase in success rate. Another policy group, which mainly consists of converged checkpoints, yields a smaller yet still nearly a $2\times$ increase in success rate. These results highlight the huge promise of DREAMDoJO for online policy steering. Based on the observation that ensembling models with greater variance has a higher probability of improvement, we anticipate that using policies from more diverse architectures (Cao et al., 2025) may further boost performance gains.

Live teleoperation. We can also provide action conditions by connecting the teleoperation devices used for robot data collection to DREAMDOJO. To verify this, we deploy DREAMDOJO-2B on a local desktop equipped with an NVIDIA RTX 5090 GPU and connect a PICO VR controller to capture the upper-body action inputs for the G1 robot. As a result, we found that we could directly teleoperate the virtual robot at real-time speed. An example is shown in Fig. 6. For live teleoperation videos, please visit our website.

![Figure 6](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-30-1788097361917.webp)

*Figure 6: Live teleoperation. We can teleoperate a virtual G1 robot using the PICO VR controller in real time.*

> 💡 **图 6 的系统边界**: PICO 控制器实时产生 G1 上身动作，RTX 5090 上的 DREAMDOJO-2B 根据这些动作生成虚拟机器人反馈。演示证明模型可以接入真实遥操作输入并达到可交互延迟，但操作者控制的是**生成的虚拟 G1**。

### 🔖 Section 总结

实验总体支持 DREAMDOJO 的核心路线：潜动作预训练明显优于被动视频预测，增加人类数据后 PSNR 和部分感知指标在受控 OOD 基准上改善，chunked action injection 是结构消融中最显著的增益来源。蒸馏用可测的画质代价换取约 $4\times$ 速度和更长历史上下文；下游实验则证明模型能较好排序策略，并在候选足够多样、价值模型有效时提高实机成功率。证据仍主要来自 GR-1 消融、构造 OOD 集合和少量应用任务。

1. **潜动作是最明确的迁移变量。** 在相同训练预算下，它远强于 action-free，并接近需要额外传感设备的动作真值预训练。
2. **数据扩展的收益存在指标差异。** PSNR 趋势最稳定，SSIM/LPIPS 并非逐源单调提升；不能把“更多数据”简化成所有维度一致变好。
3. **时间对齐先验比局部损失更关键。** 累加消融中 chunked injection 带来最大跃升，temporal loss 在其上继续补强。
4. **实时学生是速度—质量折中。** 约 $4\times$ 加速和 12 帧上下文伴随三项长时重建指标下降，适合在线交互但不是无损替代教师。
5. **世界模型更像排序器而非校准仿真器。** 它能复现策略相对优劣并帮助选择候选，却系统性高估绝对成功率，规划收益还依赖外部 value model 与候选多样性。

## 5. Conclusion

### 📌 预览

本节总结 DREAMDOJO 在受控 OOD 泛化、实时长时生成和三类下游应用上的主要结果，并集中列出尚未解决的部署风险。阅读重点是把限制分成数据覆盖、概率校准、观测接口、推理效率和跨具身遗忘五类；这些限制直接决定世界模型可以用于“辅助比较”，还是可以被当作可信仿真环境。


In this paper, we introduce DREAMDOJO, a foundation world model that can simulate dexterous robotics tasks and generalize to unseen scenarios. Our model is pretrained on large-scale human datasets that encompass a wide variety of daily interactions. To further enhance knowledge transfer and action controllability, continuous latent actions are introduced as proxy actions for all videos. We further introduce a distillation pipeline that enables stable long-horizon interactions at real-time speed. Extensive evaluations underscore the significance of DREAMDOJO, demonstrating improved physics understanding and action following in out-of-distribution scenarios, a positive correlation with real-world evaluations, and real-time interactivity for live teleoperation and test-time policy steering. We hope our effort can pave the way for general-purpose robot world models.

> 💡 **结论强度分级**: 论文最强的定量证据是“潜动作优于被动预训练”“构造 OOD 基准上更好”“策略 checkpoint 排序高度相关”和“2B 学生达到 10.81 FPS”。“foundation”“open-world”“general-purpose”则是研究方向定位，尚未通过随机开放环境、多任务绝对成功率或安全闭环测试建立同等强度的证据。

Limitations. While DREAMDOJO demonstrates significant improvements over the baseline, it is by no means perfect when simulating uncommon actions, such as slapping and fast waving. Additionally, when conducting policy evaluation, the absolute success rates in DREAMDOJO are often higher than their real counterparts, indicating a limitation in accurately generating nuanced failures. Future work should explore how to cover broader action distribution, e.g., using policy rollouts (Ho et al., 2025; Zhu et al., 2025). We also believe that there remains significant space for improving inference speed through engineering optimizations (Ball et al., 2025; Hong et al., 2025; Team et al., 2026; Ye et al., 2026). In addition, our model does not naturally support multi-view simulation, which is crucial for state-of-the-art policies (Bjorck et al., 2025; Black et al., 2024). Moreover, how to retain the pretrained knowledge as much as possible has not been studied in depth. Future work could explore other fine-tuning strategies (Hu et al., 2022; Yadav et al., 2025) to achieve better post-training performance on the target embodiment.

> 💡 **五类局限**:
>
> | 局限 | 可能造成的误判 | 论文给出的方向 |
> |---|---|---|
> | 罕见/快速动作覆盖不足 | 拍击、快速挥动的接触与运动失真 | 加入 policy rollout，扩大动作分布 |
> | 细微失败生成不足 | 模拟成功率系统性高于真实值 | 收集更多成功与失败轨迹并做校准 |
> | 推理仍有额外延迟 | 在线规划预算受限 | 工程优化与更高效生成 |
> | 不原生支持多视角 | 无法直接服务依赖多相机状态的策略 | 扩展多视角条件与一致性建模 |
> | 全量后训练可能遗忘 | 人类视频中的长尾先验在目标域适配后丢失 | 参数高效或抗遗忘微调 |
>
> 因而当前更合理的部署角色是**带真实环境校准的策略比较器或候选筛选器**。排序相关性高不代表成功概率准确，生成视频看起来合理也不能作为安全执行判据。

### 🔖 Section 总结

DREAMDOJO 证明了“大规模人类交互视频 + 潜动作 + 目标具身适配 + 因果蒸馏”可以形成可运行的机器人视频世界模型，并在受控 OOD 与策略排序上带来实质收益。其当前能力更适合辅助评估和规划，而非替代真实物理仿真：长尾动作、细微失败、绝对成功率校准、多视角和知识保持仍是关键缺口。

#### 核心洞察

1. **数据长尾决定物理长尾。** 大规模小时数不能自动覆盖罕见高速动作，后续需要主动收集失败和 policy rollout。
3. **视频观测接口仍不完整。** 单视角模型难以满足多相机策略，也无法显式验证不可见物理状态。
4. **适配过程本身可能损害泛化。** 全量后训练把模型接到新具身，却可能忘掉预训练获得的开放场景先验。
5. **实时只是必要条件，不是可靠部署的充分条件。** 速度之外仍需概率校准、异常检测和真实环境闭环验证。

## B. Related Work

### 📌 预览

本节从三条研究脉络定位 DREAMDOJO：机器人视频世界模型解决“如何预测动作后果”，视频/潜动作预训练解决“如何利用无标签、跨具身数据”，自回归蒸馏解决“如何把离线生成器变成在线交互模型”。阅读重点是区分论文复用的成熟组件与真正的系统级贡献，并比较相关方法在数据覆盖、控制接口和实时性上的不同取舍。


World model. World models can simulate world transitions in response to actions, which have been proven critical for developing intelligent agents (Alonso et al., 2024; Ha and Schmidhuber, 2018; Hafner et al., 2025; Richens et al., 2025). Building upon advances in generative models, a surge of works have developed high-quality video world models for simulating interactive games (Alonso et al., 2024; Ball et al., 2025; Guo et al., 2025; Hafner et al., 2025; Kanervisto et al., 2025; Kim et al., 2020; Parker-Holder et al., 2024; Sun et al., 2025; Ye et al., 2025; Yu et al., 2025) and autonomous driving (Bar et al., 2025; Hu et al., 2023; Kim et al., 2021; Kong et al., 2025; Russell et al., 2025; Yang et al., 2024). Motivated by successes in these domains, recent works have also introduced video generative models to simulate robot manipulation tasks (Guo et al., 2025; Jiang et al., 2025; Li et al., 2025; Wang et al., 2025; Wu et al., 2024; Zhu et al., 2025), which hold great promise for scalable policy evaluation (Li et al., 2025; Quevedo et al., 2025; Team et al., 2025; Tseng et al., 2025; Zbinden et al., 2025), reinforcement learning (Jiang et al., 2025; Li et al., 2025; Xiao et al., 2025; Yang et al., 2024; Zhang et al., 2025; Zhu et al., 2025), and policy steering (Assran et al., 2025; Du and Song, 2025; Jain et al., 2025; Qi et al., 2025; Wu et al., 2025; Zhou et al., 2025). However, existing models are typically trained and evaluated in in-distribution settings, leaving it unclear whether these models can truly facilitate planning in unseen scenarios.

> 💡 **从游戏/驾驶到机器人，难点发生了变化**: 游戏常用离散按键，驾驶动作空间相对规则；灵巧操作则是高维连续控制，结果强依赖接触时序与细小姿态误差。已有机器人世界模型已能服务评估、强化学习和策略引导，但多在训练分布内验证。DREAMDOJO 主要把问题前移到“未见对象、动作与背景是否仍可控”，而不是首次提出视频世界模型的下游用途。

Another thread of research focuses on world model pretraining from internet-scale videos to improve downstream performance (Mendonca et al., 2023; Seo et al., 2022; Wu et al., 2023; Zhang et al., 2024). Our work is more related to works such as VAP (Wang et al., 2025) which utilizes 2D skeletons to unify action conditions from different robots and hands for joint training, as well as AdaWorld (Gao et al., 2025) and the follow-up works (Garrido et al., 2026; Wang et al., 2025) which propose pretraining a world model with latent actions to enhance transferability. Additionally, DexWM (Goswami et al., 2025) leverages human videos to help generalization to unseen dexterous manipulation skills. However, they primarily focus on tabletop datasets in laboratory setups and demonstrate inferior visual quality compared to recent advancements. In contrast, we introduce the first foundation world model for dexterous manipulation, which exhibits strong generalization in simulating diverse out-of-distribution manipulation skills across multiple embodiments.

> 💡 **最接近工作的差异轴**: VAP 用显式 2D 骨架统一手和机器人动作，接口可解释但依赖姿态估计；AdaWorld 系列用潜动作增强跨具身迁移，接口更通用但语义不显式；DexWM 同样借助人类视频，不过更集中于实验室桌面灵巧操作。DREAMDOJO 的主要增量是把潜动作路线扩展到 44k 小时、更多日常与 loco-manipulation 场景，并将其接到实时蒸馏和下游应用。论文关于“first foundation world model”的表述属于作者的范围界定，不应替代逐项机制比较。

Latent action. Internet-scale video is an intriguing source for sparking emergent abilities (Wiedemer et al., 2025; Yang et al., 2024), but the unavailability of action labels could significantly hinder learning efficiency. To address this issue, latent actions have recently been proposed as a promising approach for learning from unlabeled videos (Bu et al., 2025; Jang et al., 2025; Schmidt and Jiang, 2024; Ye et al., 2025; Zhang et al., 2025). Besides serving as supervision for policy learning, latent actions can also be utilized as a control interface for world models (Bruce et al., 2024; Chen et al., 2024; Gao et al., 2025; Garrido et al., 2026; Wang et al., 2025). Several works have also demonstrated the effectiveness of continuous latent actions (Gao et al., 2025; Liang et al., 2025; Liu et al., 2025; Yang et al., 2025). Inspired by these explorations, we extract latent actions as a unified proxy for our foundation world model and investigate how this approach can promote robust generalization when interacting with unseen objects after adapting to new embodiments.

> 💡 **潜动作在本文中的角色**: 文献中潜动作既可作为策略学习监督，也可直接成为世界模型控制接口；DREAMDOJO 选择后者用于预训练，但目标机器人后训练后会切换到真实动作。选择**连续**而非离散潜动作，是为了保留细粒度运动邻近关系和适配连续控制空间。其优势是免动作标签、跨数据格式，风险是表示可能吸收相机运动、外观变化或其他非控制因素。

Autoregressive video generation. Autoregressive video generation offers the finest granularity and flexibility for interaction (Weng et al., 2024), which is well-suited for action-conditioned world modeling (Bruce et al., 2024; Gao et al., 2025; Huang, 2025; Valevski et al., 2025). To accelerate inference speed, previous methods (Lin et al., 2025; Yin et al., 2025) distill the bidirectional model into an autoregressive student model that only requires fewer steps to generate videos of comparable quality. More recently, Self Forcing and its follow-ups (Cui et al., 2025; Huang et al., 2025; Liu et al., 2025; Shin et al., 2025; Zhang et al., 2025) further reduce long-term drift by mirroring the inference process during training. Building upon these techniques, we present a distillation pipeline that significantly boosts inference speed to real-time levels while ensuring the final model is aware of historical context. This makes our distilled model readily applicable to various downstream tasks, such as performing long-horizon dexterous teleoperation in real time.

> 💡 **为什么使用 Self Forcing**: 普通少步蒸馏主要压缩单个视频块的生成成本，自回归部署时却会不断读入学生自己的错误输出。Self Forcing 在训练期就让学生以自身历史继续生成，再用教师/学生分布差监督，因此针对的是长期 train–test mismatch。DREAMDOJO 的新意不在单独提出这一算法，而在于把它用于已完成机器人动作适配的世界模型，并结合 12 帧滑窗支持实时上下文。
>
> 💡 **整体定位**: DREAMDOJO 是三条成熟技术线的系统化组合：Cosmos 类视频扩散提供生成底座，连续潜动作把大规模无标签人类视频转成动作条件数据，Self Forcing 把固定窗口教师变成在线学生。它的差异化证据主要来自数据覆盖规模、受控 OOD 评测和端到端应用，而不是每个基础组件都从零提出。

### 🔖 Section 总结

相关工作表明 DREAMDOJO 的贡献位于系统交汇处：它沿用视频扩散、连续潜动作与 Self Forcing 的既有机制，但用更大、更开放的人类交互视频将三者连接成跨具身预训练—后训练—实时部署流程。相较最接近方法，其主要差异轴是数据分布更广、动作代理更统一，以及最终模型具备实时因果生成能力。

#### 核心洞察

1. **机器人世界模型的研究缺口已从画质转向 OOD 可控性。** 高维连续动作和接触时序使机器人问题比游戏/驾驶更难直接迁移。
2. **动作统一存在显式与隐式两条路线。** 2D 骨架更可解释但依赖估计器，潜动作更通用但缺少语义保证。
3. **DREAMDOJO 的核心增量是规模和系统闭环。** 它把潜动作预训练扩展到广覆盖人类视频，并继续完成具身适配与实时部署。
4. **Self Forcing 主要解决自生成历史导致的分布偏移。** 少步负责速度，因果滑窗和学生 rollout 负责长期上下文。

## C–D. Evaluation Details and Additional Visualizations

### 📌 预览

本节补充正文中无法由单个汇总数字回答的问题：人评究竟看到了什么，数据/结构/蒸馏的差异在视频中表现为何种失败，潜动作预训练只是加速收敛还是改变后训练上限，以及规划用的价值模型如何把生成视频转成候选排序。阅读定性图时应沿时间检查动作响应、接触因果、物体持续性和身份恢复，而不是只比较最后一帧清晰度。


### C. Human Preference Evaluation

Fig. 7 shows our web UI for our human preference evaluation, allowing the evaluators to assess physics correctness and action following intuitively.

![Figure 7](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-30-1788097296319.webp)

*Figure 7: Web UI for human preference evaluation. To intuitively compare physics correctness and action controls, we devise a web UI that can display the ground-truth video alongside two videos generated by two different models simultaneously. The order of the generated videos will be randomly switched to avoid any potential bias.*

### D. Additional Visualizations

### D.1. Effects of Our Data Mixtures

In addition to the quantitative evaluations, we demonstrate the effectiveness of human data pretraining through visualizations. The samples in Fig. 8 verify that incorporating human data pretraining is essential for precise physics modeling of objects not captured by the robot dataset.

![Figure 8](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-30-1788097302511.webp)

*Figure 8: Qualitative comparison of human data pretraining effects. Through pretraining on diverse human interaction data, DREAMDOJO acquires a generalizable understanding of general physics, resulting in more realistic simulation for objects that are unseen in the target robot dataset.*

### D.2. Effects of Our Model Designs

We provide qualitative comparisons of the results from different model designs as outlined in Tab. 5. Both relative actions and chunked injection significantly enhance simulation quality, underscoring their importance for achieving precise action controllability. Additionally, the proposed temporal consistency loss further reinforces the modeling quality of objects.

![Figure 9](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-30-1788097308283.webp)

*Figure 9: Qualitative comparison of our design choices. Applying all our techniques results in the best capabilities for object modeling and action following.*

### D.3. Benefits of Distillation

We compare the 1-minute videos generated by the teacher model and the student model in Fig. 10. DREAMDOJO can continuously predict long-horizon rollouts in real time with strong stability and action following.

![Figure 10](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-30-1788097317593.webp)

*Figure 10: Long-horizon rollouts for 1 minute. Note that the teacher model generates videos in a chunk-wise manner and operates at a speed (2.72 FPS) that is $4 \times$ slower than that of the student model (10.81 FPS).*

In Fig. 11, we also visualize representative samples that illustrate the superior consistency of the student model. The distilled DREAMDOJO can recover objects from occlusions by modeling a short context, whereas the teacher model is unable to achieve this due to its single-frame conditioning.

![Figure 11](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-30-1788097323434.webp)

*Figure 11: The advantage of student context. The student model exhibits better consistency in handling occlusions and camera shifts, while the teacher model has no way to ensure that due to the missing context.*

### D.4. DreamDojo-HV Samples

To assist a better understanding of the DreamDojo-HV dataset, we visualize more data samples in Fig. 12, highlighting its extensive coverage of interaction types and scenarios.

![Figure 12](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-30-1788097329692.webp)

*Figure 12: Diversity of DreamDojo-HV. We visualize more samples from the curated DreamDojo-HV dataset, which encompasses extremely diverse actions and tool-using scenarios.*

### D.5. PSNR Curves in Post-Training

We visualize how the PSNR scores will evolve during post-training. Fig. 13 shows that pretraining with latent actions can reach a much higher upper bound than action-free pretraining and without pretraining, especially on EgoDex Eval.

![Figure 13](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-30-1788097337869.webp)

*Figure 13: Post-training PSNR curves using different action conditioning. Latent action conditioning can achieve comparable performance as high-quality action labels obtained using extra devices. On EgoDex Eval, our approach can also reach a much higher upper bound compared to action-free pretraining and without pretraining.*

> 💡 **图 13 区分“优化加速”与“更好初始化”**: 如果潜动作只让后训练更快，各曲线最终应收敛到相近平台；图中 latent-action 曲线不仅早期更高，在 EgoDex Eval 后期仍保持明显优势，并接近设备采集 MANO/retargeted action，说明预训练改变了可达解而非仅缩短 warmup。该判断基于 PSNR，仍需表 2 的 SSIM/LPIPS 与动作跟随证据共同确认，不能直接等同于控制因果更准确。

### D.6. Value Model

To automatically judge the value of the predicted futures, we train an external model based on the DINOv2 (Oquab et al., 2023) architecture. Our value model takes a video clip consisting of 4 frames as input. The DINOv2 backbone is frozen and independently extracts image features from each frame. The features from all frames are then processed by a value prediction module with global attention. The value prediction module is trained to estimate the number of time steps remaining until each subtask boundary, which is defined as the keyframe between consecutive subtask language annotations. The ground-truth value is normalized by the maximum subtask interval in the dataset. For each generated video, the value estimation is performed as a sliding window with a stride of 1. The final value of the current video is defined as the average of all clips from the start to the dip before the estimated value increases. The action proposal with the lowest value (i.e., closest to subtask completion) will be selected for real-world execution. A visualization of the accuracy of our value model is shown in Fig. 14.

> 💡 **Value Model执行流**:
>
> $$
> \text{Policy 提方案}
> \rightarrow
> \text{World Model 想象后果}
> \rightarrow
> \text{Value Model 看哪个后果进度最快}
> \rightarrow
> \text{执行那个方案}
> $$

![Figure 14](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-08-30-1788097341863.webp)

*Figure 14: Value model estimation. We visualize the estimated value and the ground-truth value of two representative episodes. Our value model reliably estimates the number of steps remaining to complete the current subtask.*

> 💡 **图 14 **: 横轴沿 episode 时间推进，纵轴越低表示越接近当前子任务完成；预测曲线若能复现真值下降与边界后的回升，就能用于比较候选进展。

### 🔖 Section 总结

人类视频预训练主要改善未见对象接触后的完整性，chunked 与 temporal 设计改善动作时序和连续性，因果学生用历史上下文恢复遮挡对象但总体画质仍有损失。外部价值模型再把生成视频转成“距子任务边界的剩余步数”，使世界模型能够参与候选动作排序。

#### 核心洞察

1. **蒸馏带来结构性收益与数值性损失。** 12 帧历史改善遮挡恢复，4 步学生的总体重建指标仍低于教师。
2. **潜动作预训练不仅加快后训练。** PSNR 后期平台仍更高，说明它提供了更有利的可适配初始化。
3. **规划是世界模型与价值模型的联合系统。** 生成偏差或进度估计偏差都可能被候选选择放大，尤其要警惕视觉“伪完成”。
