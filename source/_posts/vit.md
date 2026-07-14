---
index_img: 'https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784027999697.webp'
banner_img: 'https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/25-03-28-1743151467842.webp'
title: 'Vision-Transformer：[ICLR 2021] ViT'
categories:
  - 论文批读
tags:
  - VLM
  - ViT
comments: true
abbrlink: 4be186a7
date: 2026-07-14 18:17:58
updated: 2026-07-14 19:48:13

---

## An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale (ViT)

**作者**: Alexey Dosovitskiy, Lucas Beyer, Alexander Kolesnikov, Dirk Weissenborn, Xiaohua Zhai, Thomas Unterthiner, Mostafa Dehghani, Matthias Minderer, Georg Heigold, Sylvain Gelly, Jakob Uszkoreit, Neil Houlsby
**机构**: Google Research, Brain Team
**会议**: ICLR 2021
**链接**: [arXiv 2010.11929](https://arxiv.org/abs/2010.11929) | [OpenReview](https://openreview.net/forum?id=YicbFdNTTy) | [代码](https://github.com/google-research/vision_transformer)


## 一句话总结

ViT 把图像切成固定大小的 **patch token**，几乎原样复用标准 Transformer Encoder；它用更弱的视觉归纳偏置换取更强的规模扩展能力，在足够大的预训练数据上以更少训练计算达到或超过强 CNN。


## 核心贡献

1. **纯 Transformer 视觉骨干**: 用 patchify + 线性投影替代卷积特征提取，主干直接采用标准 Transformer Encoder
2. **数据规模—归纳偏置关系**: 小数据区 CNN 更稳，大规模预训练后 ViT 才能兑现大模型容量
3. **性能—计算优势**: JFT-300M 上 ViT 在多项迁移任务达到当时 SOTA，受控实验中同精度约少用 2–4× 预训练计算
4. **高分辨率迁移机制**: 保持 patch 大小，通过二维插值位置编码适配更长 token 网格
5. **内部表征分析**: 位置向量、attention distance 与 rollout 显示模型会从数据中学习二维邻接、局部—全局分工和语义聚合


## 📖 批读导航

| Section | 内容 |
|---------|------|
| [00 - Abstract](#AN-IMAGE-IS-WORTH-16X16-WORDS-TRANSFORMERS-FOR-IMAGE-RECOGNITION-AT-SCALE) | 摘要 + 论文主张成立的前提 |
| [01 - Introduction](#1-INTRODUCTION) | 动机：标准 Transformer 能否摆脱 CNN 视觉先验 |
| [02 - Related Work](#2-RELATED-WORK) | 定位：vs 视觉注意力、iGPT、大规模 CNN 迁移 |
| [03 - Method](#3-METHOD) | **核心方法**：patch embedding + class token + Pre-LN Encoder + 位置插值 |
| [04 - Experiments](#4-EXPERIMENTS) | 数据规模、SOTA、性能—计算曲线、内部表征、自监督先导实验 |
| [05 - Conclusion](#5-CONCLUSION) | 成立条件、局限与检测/分割/自监督方向 |
| [06 - Appendix A](#APPENDIX) | MSA 公式：q/k/v、注意力矩阵、multi-head 输出 |
| [07 - Appendix B](#B-EXPERIMENT-DETAILS) | 预训练、微调和 masked patch prediction 配方 |
| [08 - Appendix C](#C-ADDITIONAL-RESULTS) | Figure 3/5 对应的逐模型结果与计算量 |
| [09 - Appendix D](#D-ADDITIONAL-ANALYSES) | 优化器、模型形状、分类头、位置编码、硬件与注意力消融 |


## 关键数字

| 指标 | 数值 |
|------|------|
| 典型输入 / patch | 224×224 / 16×16 |
| ViT-B/16 token 数 | 196 patches + 1 class token |
| 最大预训练集 | JFT-300M |
| ViT-H/14 ImageNet | 88.55% |
| ViT-H/14 ImageNet-ReaL | 90.72% |
| ViT-H/14 CIFAR-100 | 94.55% |
| ViT-H/14 VTAB | 77.63% |
| ViT-H/14 预训练成本 | 2.5k TPUv3-core-days |
| BiT-L 预训练成本 | 9.9k TPUv3-core-days |
| 受控实验计算优势 | 同精度约少用 2–4× compute |
| Masked patch 自监督 | 79.9% ImageNet（ViT-B/16） |


## 方法概览

```text
输入图像                              标准 Transformer 主干
B × 224 × 224 × 3
        │ 切成 16 × 16 patch
        ▼
196 个 patch × 768 像素值
        │ 线性投影 E: 768 → D
        ▼
B × 196 × D
        │ 拼接 class token + 加一维位置编码
        ▼
B × 197 × D ───────────────────────┐
                                   │ L × Encoder Block
                                   │ ┌─────────────────────────┐
                                   ├→│ LN → MSA → Residual     │
                                   │ │ LN → MLP → Residual     │
                                   │ └─────────────────────────┘
                                   ▼
                            读取 LN(zᴸ₀): B × D
                                   │ 新的线性分类头
                                   ▼
                               B × K logits

高分辨率微调：224 → 384 时，网格 14×14 → 24×24，
token 数 197 → 577；位置编码做二维插值，注意力成本约增至 8.6×。
```


## 与相关方法对比

| 方法 | 输入表示 / 主干 | 视觉归纳偏置 | 数据需求 | 主要特点 |
|------|-----------------|-------------|---------|---------|
| ResNet / BiT | 卷积特征层级 | 强：局部性、平移等变、二维邻域 | 较低 | 小数据更稳，但大规模迁移的计算成本更高 |
| Non-local / Axial Attention | CNN + 局部/稀疏注意力 | 中到强 | 中等 | 保留 CNN 结构，需要专用注意力实现 |
| iGPT | 像素序列 + Transformer | 弱 | 很高 | 像素级序列过长，分辨率和计算受限 |
| Hybrid ViT | CNN feature map + Transformer | 中等 | 中等 | 小计算预算略优，规模增大后优势消失 |
| **ViT** | **patch token + 标准 Transformer** | **弱** | **高** | **小数据易过拟合，大数据区扩展性和计算效率更强** |


## 📊 Citation Landscape

> 数据快照：Semantic Scholar，2026-07-13。引用数字会随时间变化。

**TLDR** (Semantic Scholar): *Vision Transformer (ViT) attains excellent results compared to state-of-the-art convolutional networks while requiring substantially fewer computational resources to train.*

**引用统计**: 参考文献 65 篇 | 被引 65,857 次 | Influential Citations: 7,203

### 参考文献分组 (Top 5 per category, by citations)

#### Transformer / Language Pretraining

| 论文 | 年份 | 引用 |
|------|------|------|
| Attention Is All You Need | 2017 | 184,059 |
| BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding | 2019 | 117,442 |
| Language Models are Few-Shot Learners | 2020 | 60,534 |
| Language Models are Unsupervised Multitask Learners | 2019 | 29,373 |
| Generating Long Sequences with Sparse Transformers | 2019 | 2,573 |

#### CNN / Large-Scale Transfer

| 论文 | 年份 | 引用 |
|------|------|------|
| Deep Residual Learning for Image Recognition | 2015 | 233,262 |
| ImageNet Classification with Deep Convolutional Neural Networks | 2012 | 130,101 |
| Batch Normalization | 2015 | 47,169 |
| Self-Training with Noisy Student Improves ImageNet Classification | 2019 | 2,797 |
| Big Transfer (BiT): General Visual Representation Learning | 2019 | 1,386 |

#### Self-Supervised Visual Representation

| 论文 | 年份 | 引用 |
|------|------|------|
| A Simple Framework for Contrastive Learning of Visual Representations (SimCLR) | 2020 | 25,168 |
| Momentum Contrast for Unsupervised Visual Representation Learning (MoCo) | 2019 | 15,292 |
| Learning Representations by Maximizing Mutual Information Across Views | 2019 | 1,650 |
| Data-Efficient Image Recognition with Contrastive Predictive Coding | 2019 | 1,572 |
| S4L: Self-Supervised Semi-Supervised Learning | 2019 | 862 |

#### Visual Attention / Transformer Precursors

| 论文 | 年份 | 引用 |
|------|------|------|
| End-to-End Object Detection with Transformers (DETR) | 2020 | 18,945 |
| Non-local Neural Networks | 2017 | 10,250 |
| CCNet: Criss-Cross Attention for Semantic Segmentation | 2018 | 3,037 |
| Image Transformer | 2018 | 1,922 |
| Generative Pretraining From Pixels (iGPT) | 2020 | 1,823 |

#### Datasets / Transfer Benchmarks

| 论文 | 年份 | 引用 |
|------|------|------|
| ImageNet: A Large-Scale Hierarchical Image Database | 2009 | 74,504 |
| Learning Multiple Layers of Features from Tiny Images (CIFAR) | 2009 | 43,143 |
| Automated Flower Classification over a Large Number of Classes | 2008 | 4,960 |
| Cats and Dogs | 2003 | 1,109 |
| A Large-Scale Study of Representation Learning with VTAB | 2019 | 558 |

### 推荐论文（Semantic Scholar Recommendations）

| 论文 | 年份 | 方向 | arXiv |
|------|------|------|-------|
| Is an Image Also Worth 16x16=256 Superpixels? | 2026 | 用 superpixel 重新审视固定 patch tokenization | [2605.27144](https://arxiv.org/abs/2605.27144) |
| Vision Transformers for Face Recognition Need More Registers | 2026 | register token 与人脸识别表征 | [2606.12036](https://arxiv.org/abs/2606.12036) |
| Full Glyph Images Beat Token Embeddings | 2026 | 对照完整字形图像与 token embedding | [2607.03994](https://arxiv.org/abs/2607.03994) |
| ViT Backbone Optimization with Multi-Scale Patch Embedding | 2026 | 自适应多尺度 patch embedding | [Semantic Scholar](https://www.semanticscholar.org/paper/c6bf775c26a79edbe5e231f1ec776a15f7311f63) |
| Token-Space Mask Prediction for Efficient Vision Transformer Segmentation | 2026 | token 空间掩码预测与分割效率 | [2605.18177](https://arxiv.org/abs/2605.18177) |
| UtVAA: Ultra-tiny Vision Transformer with Affix Attention | 2026 | 面向移动端的轻量注意力设计 | [2606.14735](https://arxiv.org/abs/2606.14735) |
| Recursive Block-Diagonal Coupling for Resource-Efficient Training | 2026 | 资源受限训练中的块结构耦合 | [2605.23656](https://arxiv.org/abs/2605.23656) |

### 🔗 相关链接

- [Connected Papers](https://www.connectedpapers.com/main/2010.11929)
- [Semantic Scholar](https://www.semanticscholar.org/paper/268d347e8a55b5eb82fb5e7d2f800e33c75ab18a)
- [arXiv](https://arxiv.org/abs/2010.11929)
- [OpenReview](https://openreview.net/forum?id=YicbFdNTTy)
- [官方代码](https://github.com/google-research/vision_transformer)

## AN IMAGE IS WORTH 16X16 WORDS: TRANSFORMERS FOR IMAGE RECOGNITION AT SCALE

### 📌 预览
论文把图像切成固定大小的 patch，将 patch 序列直接交给标准 Transformer，以检验图像分类是否真的需要卷积主干。摘要给出的结论有明确条件：ViT 需要先在大规模数据上预训练，再迁移到中小型任务，才能在准确率和训练成本上与最强 CNN 竞争。


Alexey Dosovitskiy<sup>∗,†</sup>, Lucas Beyer<sup>∗</sup>, Alexander Kolesnikov<sup>∗</sup>, Dirk Weissenborn<sup>∗</sup>,Xiaohua Zhai<sup>∗</sup>, Thomas Unterthiner, Mostafa Dehghani, Matthias Minderer,Georg Heigold, Sylvain Gelly, Jakob Uszkoreit, Neil Houlsby<sup>∗,†</sup><sup>∗</sup>equal technical contribution, <sup>†</sup>equal advising Google Research, Brain Team {adosovitskiy, neilhoulsby}@google.com

### ABSTRACT

> 💡 **标题与研究问题**: “An Image is Worth 16×16 Words” 不是说一张图等于 256 个单词，而是说每个 $16\times16$ 像素块被当作一个视觉 token。以 $224\times224$ 图像为例，共得到 $14\times14=196$ 个 patch token；这种粗粒度 tokenization 把原本像素级的超长序列压缩到标准全局注意力能够处理的范围。此前已有大量 CNN + attention 工作，但是**图像分类是否还必须依赖卷积主干，还是可以只做一次 patch 化，之后直接使用标准 Transformer**
>

While the Transformer architecture has become the de-facto standard for natural language processing tasks, its applications to computer vision remain limited. In vision, attention is either applied in conjunction with convolutional networks, or used to replace certain components of convolutional networks while keeping their overall structure in place. We show that this reliance on CNNs is not necessary and a pure transformer applied directly to sequences of image patches can perform very well on image classification tasks. When pre-trained on large amounts of data and transferred to multiple mid-sized or small image recognition benchmarks (ImageNet, CIFAR-100, VTAB, etc.), Vision Transformer (ViT) attains excellent results compared to state-of-the-art convolutional networks while requiring substantially fewer computational resources to train.<sup>1</sup>

<sup>1</sup> Fine-tuning code and pre-trained models are available at <https://github.com/google-research/vision_transformer>.

> 💡 **主张、条件与证据**:
> - **结构主张**：ViT 的贡献不是发明新的 attention，而是把“patch 化 + 标准 Transformer”组合成纯 Transformer 视觉骨干，证明它“能做”图像分类。
> - **性能条件**：摘要中的比较对象是“大规模预训练后再迁移的 ViT”与先进 CNN，不是“在任意小数据集上从零训练的 ViT”。后者表现较差并不反驳摘要，反而是论文后续主动分析的现象。
> - **效率边界**：“更少计算资源”指在论文的大规模预训练比较中，达到相近迁移性能所需的总训练计算更少；它不等于每个 ViT 在任意分辨率、硬件和 batch size 下都比 CNN 快。
>
> 因此要分开检查两类证据：模型结构证明纯 Transformer **能做**视觉分类；数据规模和受控计算实验才检验它在什么条件下 **能做好且更高效**。

### 🔖 Section 总结

#### 核心洞察

1. ViT 的最小设计是把图像 patch 化并直接复用标准 Transformer，而不是为视觉重新设计注意力算子。
2. patch 化既是图像到序列的模态转换，也是关键计算折中：patch 越大，token 越少，但局部空间细节压缩得越早。
3. 真正的性能转折来自大规模预训练：数据用来弥补模型缺少局部性、权重共享和平移等变等视觉先验的问题。
4. 摘要中的优势是条件性结论：评估 ViT 时必须同时检查预训练数据、迁移任务、计算预算与比较协议。

### 1 INTRODUCTION

### 📌 预览
本节从 NLP 中“大模型预训练后迁移”的规模化经验出发，追问标准 Transformer 能否几乎不加修改地用于图像分类。作者先坦率给出 ViT 在中等规模数据上不如 ResNet 的负面结果，再用 14M–300M 图像的预训练说明规模如何弥补局部性和平移等变等归纳偏置的缺失。阅读时应把“架构更简洁”与“训练所需数据更多”视为同一设计的两面。


Self-attention-based architectures, in particular Transformers (Vaswani et al., 2017), have become the model of choice in natural language processing (NLP). The dominant approach is to pre-train on a large text corpus and then fine-tune on a smaller task-specific dataset (Devlin et al., 2019). Thanks to Transformers’ computational efficiency and scalability, it has become possible to train models of unprecedented size, with over 100B parameters (Brown et al., 2020; Lepikhin et al., 2020). With the models and datasets growing, there is still no sign of saturating performance.

> 💡 **问题设定**: 作者借用的不只是 Transformer 结构，而是 NLP 的整套训练范式：用大数据学通用表示，再用小数据适配任务。因此论文需要回答的不是“注意力能否处理像素”，而是“这条规模化曲线能否从文本迁移到视觉”。
>
> 换句话说，ViT 的研究对象是一个完整范式：
> ```text
> 大规模通用数据预训练 → 学习可迁移表示 → 在较小下游任务微调
> ```
> 这也是它后来成为视觉 foundation model 基础架构的重要原因。

In computer vision, however, convolutional architectures remain dominant (LeCun et al., 1989; Krizhevsky et al., 2012; He et al., 2016). Inspired by NLP successes, multiple works try combining CNN-like architectures with self-attention (Wang et al., 2018; Carion et al., 2020), some replacing the convolutions entirely (Ramachandran et al., 2019; Wang et al., 2020a). The latter models, while theoretically efficient, have not yet been scaled effectively on modern hardware accelerators due to the use of specialized attention patterns. Therefore, in large-scale image recognition, classic ResNet-like architectures are still state of the art (Mahajan et al., 2018; Xie et al., 2020; Kolesnikov et al., 2020).

> 💡 **设计取舍**: 当时的视觉注意力并非缺少表达能力，而是局部、稀疏或轴向等专用模式难以充分利用现成加速器。ViT 选择先降低 token 数，再运行密集、标准的全局注意力；这用粒度损失换取了实现简洁性与硬件效率。
>
> 以 $224\times224$ 图像为例，如果每个像素都是 token，则 $N=50{,}176$，注意力矩阵约有 25 亿个元素；改用 $16\times16$ patch 后，$N$ 降到 196，注意力矩阵只有 38,416 个元素。patchify 因而不只是输入格式变化，更是让标准全局注意力在图像上可计算的关键。

Inspired by the Transformer scaling successes in NLP, we experiment with applying a standard Transformer directly to images, with the fewest possible modifications. To do so, we split an image into patches and provide the sequence of linear embeddings of these patches as an input to a Transformer. Image patches are treated the same way as tokens (words) in an NLP application. We train the model on image classification in supervised fashion.

> 💡 **执行流程**: 核心接口只有一次模态转换：每个 $P\times P\times C$ patch 展平后线性投影成一个 token，加上位置信息后交给标准 Transformer。以 ViT-B/16 为例，一个 RGB patch 含 $16\times16\times3=768$ 个数，恰好投影到 $D=768$ 维 token。模型主干因此能直接复用 NLP 实现，但一个 patch 内的 256 个像素在进入主干前已被压成一个向量。所以 patch 大小同时控制两件互相冲突的事：大 patch 让序列更短、训练更便宜，却更早压缩局部细节；小 patch 保留更细空间粒度，却会快速放大全局注意力的计算和显存。
>

When trained on mid-sized datasets such as ImageNet without strong regularization, these models yield modest accuracies of a few percentage points below ResNets of comparable size. This seemingly discouraging outcome may be expected: Transformers lack some of the inductive biases inherent to CNNs, such as translation equivariance and locality, and therefore do not generalize well when trained on insufficient amounts of data.

> 💡 **为何小数据不占优**: CNN 把局部连接、权重共享和平移等变写入结构，所以不需要从数据重新学习“相邻像素通常更相关”“同一种边缘可以出现在不同位置”等规律。ViT 的全局注意力更自由，但必须自己学会哪些位置是邻居、何时聚合局部或全局信息；样本不足时，这种自由会变成更高的样本复杂度和过拟合风险。可以把两种架构的差别记成：**CNN 的起跑线更靠前，ViT 的跑道可能更长。** 前者用正确先验获得小数据效率，后者用较少结构限制换取大数据下更高的容量上限。
>

However, the picture changes if the models are trained on larger datasets (14M-300M images). We find that large scale training trumps inductive bias. Our Vision Transformer (ViT) attains excellent results when pre-trained at sufficient scale and transferred to tasks with fewer datapoints. When pre-trained on the public ImageNet-21k dataset or the in-house JFT-300M dataset, ViT approaches or beats state of the art on multiple image recognition benchmarks. In particular, the best model reaches the accuracy of 88.55% on ImageNet, 90.72% on ImageNet-ReaL, 94.55% on CIFAR-100, and 77.63% on the VTAB suite of 19 tasks.

> 💡 **“Large scale training trumps inductive bias” 怎么理解**: 它不是说归纳偏置从此没有价值，而是说其相对收益会随数据规模变化：数据不足时，CNN 的视觉先验提供更高样本效率；数据充分时，ViT 可以从数据中学出所需空间规律，较少的硬编码限制反而可能带来更高上限。
>
> **证据边界**: 14M 到 300M 图像上的旗舰数字是“模型结构 + 模型规模 + 预训练数据 + 优化与迁移配方”的联合结果，不能单独归因于 patch tokenization。后续实验还需要控制数据来源和计算预算，才能判断优势究竟来自架构还是更多资源。

> 🧭 **Introduction 论证链**:
> ```text
> Transformer 在 NLP 中展现规模扩展能力
>                 ↓
> 既有视觉注意力仍依赖 CNN 或专用算子
>                 ↓
> patchify 缩短序列，标准 Transformer 可直接处理图像
>                 ↓
> 小数据：弱视觉先验导致 ViT 落后
>                 ↓
> 大数据：模型从数据学习空间规律并兑现容量优势
> ```

### 🔖 Section 总结

#### 关键数字

| 设定 / 任务 | 结果 |
|---|---:|
| 大规模预训练数据 | 14M–300M 图像 |
| ImageNet | 88.55% |
| ImageNet-ReaL | 90.72% |
| CIFAR-100 | 94.55% |
| VTAB（19 个任务） | 77.63% |

#### 核心洞察

1. ViT 迁移的是 NLP 的“标准 Transformer + 大规模预训练 + 下游微调”范式，而不只是自注意力算子。
2. patch 化降低了序列长度，使密集全局注意力可用；代价是 patch 内细节在进入主干前被压缩。
3. ViT 在中等规模数据上落后、在大规模预训练后反超，是论文最重要的经验分界线。
4. 更弱的视觉归纳偏置带来更强的表达自由，也带来更高的数据门槛；小数据劣势与大数据潜力是同一个设计选择的两面。
5. Introduction 中的旗舰精度还不是纯架构证据，必须到实验部分检查数据规模、训练配方和计算预算是否受控。

### 2 RELATED WORK

### 📌 预览
本节沿三条线索定位 ViT：标准 Transformer 的预训练范式、视觉注意力的计算近似，以及大规模图像迁移学习。与已有 patch attention、CNN-注意力混合模型和 iGPT 的对比表明，ViT 的新意不在“第一次对图像使用 Transformer”，而在证明粗粒度 patch 能把标准全局注意力扩展到中等分辨率，并从大数据预训练中获益。阅读时可用“token 粒度、注意力范围、预训练目标”三个维度区分这些工作。


Transformers were proposed by Vaswani et al. (2017) for machine translation, and have since become the state of the art method in many NLP tasks. Large Transformer-based models are often pre-trained on large corpora and then fine-tuned for the task at hand: BERT (Devlin et al., 2019) uses a denoising self-supervised pre-training task, while the GPT line of work uses language modeling as its pre-training task (Radford et al., 2018; 2019; Brown et al., 2020).

> 💡 **范式来源**: BERT 和 GPT 的共同点是先用大规模数据学习可迁移表示，差别在预训练目标。ViT 接续了“预训练—微调”流程和编码器架构，却在本文中使用有监督图像分类预训练；因而它证明的是架构可迁移性，不是自监督目标本身的优势。

Naive application of self-attention to images would require that each pixel attends to every other pixel. With quadratic cost in the number of pixels, this does not scale to realistic input sizes. Thus, to apply Transformers in the context of image processing, several approximations have been tried in the past. Parmar et al. (2018) applied the self-attention only in local neighborhoods for each query pixel instead of globally. Such local multi-head dot-product self attention blocks can completely replace convolutions (Hu et al., 2019; Ramachandran et al., 2019; Zhao et al., 2020). In a different line of work, Sparse Transformers (Child et al., 2019) employ scalable approximations to global self-attention in order to be applicable to images. An alternative way to scale attention is to apply it in blocks of varying sizes (Weissenborn et al., 2019), in the extreme case only along individual axes (Ho et al., 2019; Wang et al., 2020a). Many of these specialized attention architectures demonstrate promising results on computer vision tasks, but require complex engineering to be implemented efficiently on hardware accelerators.

> 💡 **复杂度与工程取舍**: 若图像有 $M=HW$ 个像素，像素级全局注意力需要 $O(M^2)$ 的交互；改用 $P\times P$ patch 后，token 数变为 $N=HW/P^2$，注意力部分变为 $O(N^2)$。先前工作通过局部、稀疏或轴向注意力减少交互，ViT 则通过降低 token 分辨率保留密集全局注意力；前者增加算子复杂度，后者牺牲 patch 内空间细节。

Most related to ours is the model of Cordonnier et al. (2020), which extracts patches of size 2 × 2 from the input image and applies full self-attention on top. This model is very similar to ViT, but our work goes further to demonstrate that large scale pre-training makes vanilla transformers competitive with (or even better than) state-of-the-art CNNs. Moreover, Cordonnier et al. (2020) use a small patch size of 2 × 2 pixels, which makes the model applicable only to small-resolution images, while we handle medium-resolution images as well.

> 💡 **最近邻对比**: 与 Cordonnier et al. 相比，ViT 的核心模块并不新，差异主要在 token 粒度和规模化证据。例如 $224\times224$ 图像使用 $2\times2$ patch 会产生 12,544 个 token，而 $16\times16$ patch 只有 196 个；后者使标准全局注意力可执行，但也让小物体和边界细节更依赖 patch 投影如何编码。

There has also been a lot of interest in combining convolutional neural networks (CNNs) with forms of self-attention, e.g. by augmenting feature maps for image classification (Bello et al., 2019) or by further processing the output of a CNN using self-attention, e.g. for object detection (Hu et al., 2018; Carion et al., 2020), video processing (Wang et al., 2018; Sun et al., 2019), image classification (Wu et al., 2020), unsupervised object discovery (Locatello et al., 2020), or unified text-vision tasks (Chen et al., 2020c; Lu et al., 2019; Li et al., 2019).

> 💡 **与混合路线的区别**: 这些方法保留 CNN 来产生局部特征，再用注意力做长程建模，因而同时保留视觉先验与全局交互。纯 ViT 则把问题推得更彻底：除了 patch 切分外，不再借助卷积主干，从而能更直接检验视觉归纳偏置是否可以由数据规模替代。

Another recent related model is image GPT (iGPT) (Chen et al., 2020a), which applies Transformers to image pixels after reducing image resolution and color space. The model is trained in an unsupervised fashion as a generative model, and the resulting representation can then be fine-tuned or probed linearly for classification performance, achieving a maximal accuracy of 72% on ImageNet.

> 💡 **iGPT 对比**: iGPT 在低分辨率像素序列上做自回归生成，学到表示后才评估分类；ViT 则直接以 patch 为 token 做有监督分类预训练。因而 72% 不是一个可与 ViT 直接公平比较的单变量结果，它更适合说明“Transformer 可以从视觉 token 中学习可迁移表示”这个前提已有先例。

Our work adds to the increasing collection of papers that explore image recognition at larger scales than the standard ImageNet dataset. The use of additional data sources allows to achieve state-of-the-art results on standard benchmarks (Mahajan et al., 2018; Touvron et al., 2019; Xie et al., 2020). Moreover, Sun et al. (2017) study how CNN performance scales with dataset size, and Kolesnikov et al. (2020); Djolonga et al. (2020) perform an empirical exploration of CNN transfer learning from large scale datasets such as ImageNet-21k and JFT-300M. We focus on these two latter datasets as well, but train Transformers instead of ResNet-based models used in prior works.

> 💡 **实验定位**: ImageNet-21k 和 JFT-300M 并非 ViT 独有的数据资源，此前 CNN 已经证明大规模迁移有效。ViT 的关键增量是在相似数据范式下替换主干架构，所以后续与 BiT/ResNet 的计算—性能对照比单独的最高准确率更能支撑论文主张。

### 🔖 Section 总结

#### 核心洞察

1. ViT 不是首个把 Transformer 用于图像的工作；它的新意是用粗粒度 patch 使标准全局注意力可扩展，并系统验证大规模预训练。
2. 局部/稀疏注意力保留高 token 分辨率但需要专用算子；ViT 降低 token 分辨率，换取密集标准算子和更好的硬件复用。
3. 与 CNN-注意力混合模型相比，纯 ViT 更少依赖视觉先验；这使架构对比更干净，也提高了数据需求。
4. iGPT 与 ViT 的 token 粒度、预训练目标和评估路径不同；将它们并列的价值在于梳理研究路线，而非做单变量性能比较。

### 3 METHOD

### 📌 预览
本节回答全文最核心的问题：一张二维图像怎样被转换成 Transformer 能处理的 token 序列，并最终得到分类结果。阅读时沿着 $H\times W\times C \rightarrow N\times(P^2C) \rightarrow (N+1)\times D$ 跟踪张量形状，再理解 patch 大小、class token、位置编码、Pre-LN Encoder 和高分辨率微调分别解决什么问题、付出什么代价。


In model design we follow the original Transformer (Vaswani et al., 2017) as closely as possible. An advantage of this intentionally simple setup is that scalable NLP Transformer architectures – and their efficient implementations – can be used almost out of the box.

> 💡 **设计原则**: ViT 有意不发明新的视觉 attention，而只改造 Transformer 的输入接口：先把图像变成 token，后面的主干尽量照搬标准 Transformer Encoder。这样做既能直接复用成熟的实现和扩展经验，也让论文的研究问题更干净——如果模型表现随数据规模改变，原因更可能来自 patch 粒度和视觉归纳偏置，而不是某个复杂的新算子。

![Figure 1](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784027968709.webp)
*Figure 1: Model overview. We split an image into fixed-size patches, linearly embed each of them, add position embeddings, and feed the resulting sequence of vectors to a standard Transformer encoder. In order to perform classification, we use the standard approach of adding an extra learnable “classification token” to the sequence. The illustration of the Transformer encoder was inspired by Vaswani et al. (2017).*

> 💡 **Figure 1**:
> 1. 左侧把 $H\times W\times C$ 图像切成 $N$ 个 patch，并把每个 patch 投影为 $D$ 维 token。
> 2. 序列头部加入一个 class token，所有 token 再分别加上位置编码。
> 3. 中间的 Transformer 只接收向量序列；它并不知道哪些 patch 相邻，空间关系需要通过位置编码和训练数据学习。
> 4. 右侧只读取最后一层的 class token 完成分类。图中没有直接画出的代价是：全局 attention 的矩阵随 token 数 $N$ 按 $N^2$ 增长。

### 3.1 VISION TRANSFORMER (VIT)

An overview of the model is depicted in Figure 1. The standard Transformer receives as input a 1D sequence of token embeddings. To handle 2D images, we reshape the image $\mathbf{x} \in \mathbb{R}^{H \times W \times C}$ into a sequence of flattened 2D patches $\mathbf{x}_p \in \mathbb{R}^{N \times (P^2 \cdot C)}$, where $(H, W)$ is the resolution of the original image, C is the number of channels, $(P, P)$ is the resolution of each image patch, and $N = HW / P^2$ is the resulting number of patches, which also serves as the effective input sequence length for the Transformer. The Transformer uses constant latent vector size D through all of its layers, so we flatten the patches and map to D dimensions with a trainable linear projection (Eq. 1). We refer to the output of this projection as the patch embeddings.

Similar to BERT’s [class] token, we prepend a learnable embedding to the sequence of embedded patches ($\mathbf{z}_0^0 = \mathbf{x}_{\mathrm{class}}$), whose state at the output of the Transformer encoder ($\mathbf{z}_L^0$) serves as the image representation y (Eq. 4). Both during pre-training and fine-tuning, a classification head is attached to $\mathbf{z}_L^0$. The classification head is implemented by a MLP with one hidden layer at pre-training time and by a single linear layer at fine-tuning time.

Position embeddings are added to the patch embeddings to retain positional information. We use standard learnable 1D position embeddings, since we have not observed significant performance gains from using more advanced 2D-aware position embeddings (Appendix D.4). The resulting sequence of embedding vectors serves as input to the encoder.

The Transformer encoder (Vaswani et al., 2017) consists of alternating layers of multiheaded self-attention (MSA, see Appendix A) and MLP blocks (Eq. 2, 3). Layernorm (LN) is applied before every block, and residual connections after every block (Wang et al., 2019; Baevski & Auli, 2019).

The MLP contains two layers with a GELU non-linearity.

![Equation 1](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028203542.webp)

![Equation 2](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028209278.webp)

![Equation 3](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028214500.webp)

![Equation 4](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028218207.webp)

> 💡 **公式解读（Eq. 1–4）**: 以下按照完整前向流程统一讲解四个公式

#### 第一步：把图像切成 patch

输入图像为 $\mathbf{x}\in\mathbb{R}^{H\times W\times C}$，每个 patch 的空间大小为 $P\times P$。假设 $H$ 和 $W$ 都能被 $P$ 整除，则 patch 数量为

$$
N=\frac{H}{P}\frac{W}{P}=\frac{HW}{P^2}.
$$

每个 patch 含有 $P^2C$ 个像素值，展平全部 patch 后得到

$$
\mathbf{x}_p\in\mathbb{R}^{N\times(P^2C)}.
$$

以 $224\times224$ RGB 图像和 $P=16$ 为例，图像形成 $14\times14=196$ 个 patch；每个 patch 展平后有 $16^2\times3=768$ 个数，因此 $\mathbf{x}_p$ 的形状是 $196\times768$。此时二维图像已经变成由 196 个向量构成的一维序列。

#### 第二步：把 patch 投影成 token

Transformer 内部始终使用隐藏维度 $D$，因此每个展平 patch 要右乘可学习矩阵

$$
\mathbf E\in\mathbb{R}^{(P^2C)\times D},
$$

从原始像素空间映射到特征空间。ViT-B/16 中恰好有 $P^2C=768$ 且 $D=768$，但两个 768 的含义不同：前者是一个 patch 的 RGB 数值个数，后者是模型学习的特征维度。即使输入输出维度相同，$\mathbf E$ 仍会重新组合颜色、边缘和纹理信息。

工程上，patchify 加线性投影可等价实现为 `Conv2d(C, D, kernel_size=P, stride=P)`。卷积核和步长都等于 $P$，所以各 patch 不重叠；这里用卷积只是高效实现同一个线性映射，并不意味着主干重新变成 CNN。

#### 第三步：添加 class token

作者在 196 个 patch token 前面加入一个可学习向量：

$$
\mathbf{x}_{\text{class}}\in\mathbb{R}^D
$$

于是序列长度从 196 变成 197：

$$
[\mathbf{x}_{\text{class}}; \mathbf{x}_p^1\mathbf E; \ldots; \mathbf{x}_p^N\mathbf E]
$$

class token 不对应图像中的任何区域。它的作用类似 BERT 的 `[CLS]`：

- patch token 保存各图像区域的信息；
- class token 通过 self-attention 从所有 patch 收集信息；
- 最终用 class token 进行整张图像分类。

可以把它想成教室中的“汇报人”：

```
patch 1 ─┐
patch 2 ─┤
patch 3 ─┼→ 多层信息交换 → class token → 图像类别
...      ┤
patch N ─┘
```

class token 一开始没有图像内容，但梯度会训练它学会向哪些 patch 索取什么信息。

#### 第四步：加入位置编码

Self-attention 本身不认识 token 的先后和二维位置，因此作者给 class token 与每个 patch token 分别加一个可学习位置向量：

$$
\mathbf E_{\mathrm{pos}}\in\mathbb{R}^{(N+1)\times D}.
$$

公式 1 把以上成分合并起来：

$$
\mathbf z_0=[\mathbf{x}_{\mathrm{class}};\mathbf{x}_p^1\mathbf E;\ldots;\mathbf{x}_p^N\mathbf E]+\mathbf E_{\mathrm{pos}}.
$$

分号表示沿序列维拼接。ViT-B/16 的形状变化是

$$
224\times224\times3\rightarrow196\times768\rightarrow197\times768.
$$

batch size 为 $B$ 时，实际送入 Encoder 的张量为 $B\times197\times768$。默认的一维位置编码只标识 raster order 中的“第几个位置”，没有显式写入上下、左右、同行或相邻关系。二维拓扑要由模型从数据中学习；附录可视化显示，训练后相邻、同行和同列位置确实会形成相似结构。

#### 第五步：经过 Pre-LN Transformer Encoder

公式 2 让不同 token 交换信息：

$$
\mathbf z'_\ell=\operatorname{MSA}(\operatorname{LN}(\mathbf z_{\ell-1}))+\mathbf z_{\ell-1}.
$$

执行顺序是：

```text
输入 z_{l-1}
 ↓
LayerNorm
 ↓
Multi-head Self-Attention
 ↓
与原输入相加，得到 z'_l
```

公式 3 在每个 token 内加工通道特征：

$$
\mathbf z_\ell=\operatorname{MLP}(\operatorname{LN}(\mathbf z'_\ell))+\mathbf z'_\ell.
$$

执行顺序是：

```text
输入 z'_l
 ↓
LayerNorm
 ↓
Linear → GELU → Linear (即FFN)
 ↓
与原输入相加，得到 z_l
```

MSA 是 token 之间交换信息的地方；MLP 对每个 token 分别进行通道变换，不负责 token 之间的信息传递。可以记成：MSA 做“位置间交流”，MLP 做“位置内部加工”。两个模块都先做 LayerNorm、再执行变换、最后加回原输入，因此称为 Pre-LN。残差主路径更直接，通常有利于深层 Transformer 的梯度传播和训练稳定性。

#### 第六步：读取分类表示

经过 $L$ 层 Encoder 后，只读取第 0 个位置的 class token：

$$
\mathbf y=\operatorname{LN}(\mathbf z_L^0).
$$

$\mathbf y\in\mathbb{R}^D$ 再通过分类头映射到 $K$ 个类别 logits。训练损失的梯度会迫使 class token 在多层 attention 中学会聚合与类别有关的 patch 信息。

完整张量流如下：

```text
224×224×3 图像
      ↓ 切成 16×16 patch 并展平
196×768 原始 patch 向量
      ↓ 线性投影到 D=768
196×768 patch tokens
      ↓ 拼接 class token + 加位置编码
197×768 token sequence
      ↓ 12 层 Transformer Encoder
197×768 contextualized tokens
      ↓ 取第 0 个 token
768 维图像表示
      ↓ 分类头
K 个类别 logits
```

Inductive bias. We note that Vision Transformer has much less image-specific inductive bias than CNNs. In CNNs, locality, two-dimensional neighborhood structure, and translation equivariance are baked into each layer throughout the whole model. In ViT, only MLP layers are local and translationally equivariant, while the self-attention layers are global. The two-dimensional neighborhood structure is used very sparingly: in the beginning of the model by cutting the image into patches and at fine-tuning time for adjusting the position embeddings for images of different resolution (as described below). Other than that, the position embeddings at initialization time carry no information about the 2D positions of the patches and all spatial relations between the patches have to be learned from scratch.

> 💡**ViT 保留了哪些视觉先验？**
>
> ViT 不是完全没有先验，而是比 CNN 少：
>
> - CNN 在每一层都强制使用局部连接、二维邻域和共享卷积核，因此天然具有局部性与平移等变性。
> - ViT 只在方形 patch 划分、patch 排列以及高分辨率位置插值中显式使用二维结构；self-attention 从第一层起就允许任意距离的 token 直接交互。
> - 好处是模型不受固定局部窗口约束，可以按图像内容建立全局关系；代价是邻近性和平移结构也要从数据学习。
>
> 这正是“小数据容易过拟合、大规模预训练后反超”的结构原因：CNN 的先验提高样本效率，ViT 的自由度则需要更多数据才能转化成容量优势。
>

Hybrid Architecture. As an alternative to raw image patches, the input sequence can be formed from feature maps of a CNN (LeCun et al., 1989). In this hybrid model, the patch embedding projection E (Eq. 1) is applied to patches extracted from a CNN feature map. As a special case, the patches can have spatial size 1×1, which means that the input sequence is obtained by simply flattening the spatial dimensions of the feature map and projecting to the Transformer dimension. The classification input embedding and position embeddings are added as described above.

> 💡**Hybrid Architecture 在检验什么？**
>
> Hybrid 先用 CNN 把图像变成二维 feature map，再把各空间位置展平为 token 交给 Transformer。当 feature-map patch 为 $1\times1$ 时，一个 token 就对应特征图上的一个位置。CNN 在这里不是最终分类器，而是带有局部性和平移先验的 token 生成器；这个对照用于判断卷积先验能否改善纯 patch tokenization 的数据效率。后续 scaling 实验显示，Hybrid 在小计算预算下略优，但规模增大后优势消失。
>

> 🧭 **3.1 小结**: patch projection 把图像变成 token；position embedding 告诉模型 token 在哪里；self-attention 让不同 patch 交换信息；class token 汇总全图并完成分类。ViT 的简洁性来自把大多数空间规律交给数据学习，代价是更高的样本需求，以及随 token 数二次增长的全局 attention 成本。

### 3.2 FINE-TUNING AND HIGHER RESOLUTION

> 💡 **3.2 阅读路线**: 预训练后要解决两个适配问题：下游类别数改变，所以必须替换分类头；微调分辨率通常更高，所以 patch 数与位置网格都会改变。Transformer 结构上能接收更长序列，但位置编码需要插值，attention 成本也会显著增加。

Typically, we pre-train ViT on large datasets, and fine-tune to (smaller) downstream tasks. For this, we remove the pre-trained prediction head and attach a zero-initialized D × K feedforward layer, where K is the number of downstream classes. It is often beneficial to fine-tune at higher resolution than pre-training (Touvron et al., 2019; Kolesnikov et al., 2020). When feeding images of higher resolution, we keep the patch size the same, which results in a larger effective sequence length. The Vision Transformer can handle arbitrary sequence lengths (up to memory constraints), however, the pre-trained position embeddings may no longer be meaningful. We therefore perform 2D interpolation of the pre-trained position embeddings, according to their location in the original image. Note that this resolution adjustment and patch extraction are the only points at which an inductive bias about the 2D structure of the images is manually injected into the Vision Transformer.

> 💡 **先替换分类头**: 上游和下游任务的类别数不同，所以移除预训练 prediction head，换成零初始化的 $D\times K$ 线性层。零初始化使微调刚开始时 logits 不会由随机权重大幅波动，避免新分类头立刻强烈扰动预训练表示。

> 💡 **再适配更高分辨率**: 作者通常在 $224\times224$ 分辨率预训练、在 $384\times384$ 分辨率微调，并保持 patch 大小不变。以 $P=16$ 为例：
> $$
> 224/16=14\Rightarrow14^2=196\text{ patches},
> $$
> $$
> 384/16=24\Rightarrow24^2=576\text{ patches}.
> $$
> 加上 class token 后，序列长度从 197 变为 577。patch 数取决于图像面积而不是边长，因此分辨率边长扩大 $384/224\approx1.71$ 倍时，patch 数会扩大约 $1.71^2\approx2.94$ 倍。

> 💡 **位置编码为什么需要二维插值**: 预训练的位置编码对应 $14\times14$ patch 网格，新输入却需要 $24\times24$ 网格。作者先把 patch 位置向量恢复成二维布局，再插值到新网格；class token 的位置向量单独保留。这是在不重新学习全部位置编码的情况下，尽量延续原网格的相对空间结构。

> ⚖️ **结构上可变长，不等于计算上便宜**: 序列从 197 增至 577 后，注意力矩阵的元素数约扩大
> $$
> \left(\frac{577}{197}\right)^2\approx8.6
> $$
> 倍。二维插值也只是一种平滑的空间先验，不能保证新分辨率下的位置关系完全等价。因此高分辨率微调以更细的图像信息换取明显更高的计算和显存开销。

### 🔖 Section 总结

本节把 ViT 的核心方法化成了一条清晰的数据流：图像先被切成 patch 并投影为 token，class token 与位置编码补充分类型汇总接口和位置信息，标准 Pre-LN Transformer 再反复执行“位置间交流”和“位置内加工”。ViT 的关键取舍不是简单删除卷积，而是把空间规律从硬编码结构转移给数据学习；这提高了扩展自由度，也增加了样本需求和高分辨率下的二次 attention 成本。

#### 核心洞察

1. 对 ViT-B/16，$224\times224\times3$ 图像会变成 196 个 patch token；加入 class token 后，Encoder 输入为 $197\times768$。
2. patch 大小 $P$ 同时控制空间粒度和计算量：$N=HW/P^2$，而全局 attention 的主要交互规模随 $N^2$ 增长。
3. MSA 负责 token 之间的信息交换，MLP 负责各 token 内部的通道变换，class token 则在多层交互后提供图像级读出。
4. ViT 仍保留 patch 划分和位置适配等视觉先验，但没有像 CNN 那样在每层强制局部性、二维邻域与平移等变性。
5. 高分辨率微调需要二维插值位置编码；从 224 提高到 384、保持 $P=16$ 时，序列长度由 197 增至 577，注意力矩阵约扩大 8.6 倍。

## 4 EXPERIMENTS

### 📌 预览
本节检验 ViT 的数据需求、迁移性能与计算效率。阅读时区分旗舰精度与受控的性能—计算比较；表征可视化和自监督实验只提供机制线索与初步结果。


We evaluate the representation learning capabilities of ResNet, Vision Transformer (ViT), and the hybrid. To understand the data requirements of each model, we pre-train on datasets of varying size and evaluate many benchmark tasks. When considering the computational cost of pre-training the model, ViT performs very favourably, attaining state of the art on most recognition benchmarks at a lower pre-training cost. Lastly, we perform a small experiment using self-supervision, and show that self-supervised ViT holds promise for the future.

### 4.1 SETUP

Datasets. To explore model scalability, we use the ILSVRC-2012 ImageNet dataset with 1k classes and 1.3M images (we refer to it as ImageNet in what follows), its superset ImageNet-21k with 21k classes and 14M images (Deng et al., 2009), and JFT (Sun et al., 2017) with 18k classes and 303M high-resolution images. We de-duplicate the pre-training datasets w.r.t. the test sets of the downstream tasks following Kolesnikov et al. (2020). We transfer the models trained on these dataset to several benchmark tasks: ImageNet on the original validation labels and the cleaned-up ReaL labels (Beyer et al., 2020), CIFAR-10/100 (Krizhevsky, 2009), Oxford-IIIT Pets (Parkhi et al., 2012), and Oxford Flowers-102 (Nilsback & Zisserman, 2008). For these datasets, pre-processing follows Kolesnikov et al. (2020).

> 💡 **实验设计**: 三个预训练集不只大小不同，类别、分布和标注方式也不同，所以跨数据集结果不能把提升严格归因于样本数；4.3 的同源 JFT 子集实验控制得更好。

![Table 1](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028230997.webp)

*Table 1: Details of Vision Transformer model variants.*

> 💡 **Table 1 批读**: Base / Large / Huge 的参数量为 86M / 307M / 632M。模型容量与 patch 大小是两条独立缩放轴；patch 边长减半时 token 数增至 4 倍，注意力矩阵约增至 16 倍。

We also evaluate on the 19-task VTAB classification suite (Zhai et al., 2019b). VTAB evaluates low-data transfer to diverse tasks, using 1 000 training examples per task. The tasks are divided into three groups: Natural – tasks like the above, Pets, CIFAR, etc. Specialized – medical and satellite imagery, and Structured – tasks that require geometric understanding like localization.

Model Variants. We base ViT configurations on those used for BERT (Devlin et al., 2019), as summarized in Table 1. The “Base” and “Large” models are directly adopted from BERT and we add the larger “Huge” model. In what follows we use brief notation to indicate the model size and the input patch size: for instance, ViT-L/16 means the “Large” variant with 16 × 16 input patch size. Note that the Transformer’s sequence length is inversely proportional to the square of the patch size, thus models with smaller patch size are computationally more expensive.

For the baseline CNNs, we use ResNet (He et al., 2016), but replace the Batch Normalization layers (Ioffe & Szegedy, 2015) with Group Normalization (Wu & He, 2018), and used standardized convolutions (Qiao et al., 2019). These modifications improve transfer (Kolesnikov et al., 2020), and we denote the modified model “ResNet (BiT)”. For the hybrids, we feed the intermediate feature maps into ViT with patch size of one “pixel”. To experiment with different sequence lengths, we either (i) take the output of stage 4 of a regular ResNet50 or (ii) remove stage 4, place the same number of layers in stage 3 (keeping the total number of layers), and take the output of this extended stage 3. Option (ii) results in a 4× longer sequence length, and a more expensive ViT model.

> 💡 **基线设计**: CNN 基线采用为迁移学习改良过的 BiT，而非弱化的原版 ResNet。Hybrid 用 CNN 特征图生成 token；长序列版本的计算也更高，不能只比较精度。

Training & Fine-tuning. We train all models, including ResNets, using Adam (Kingma & Ba, 2015) with $\beta_1=0.9, \beta_2=0.999$, a batch size of 4096 and apply a high weight decay of 0.1, which we found to be useful for transfer of all models (Appendix D.1 shows that, in contrast to common practices, Adam works slightly better than SGD for ResNets in our setting). We use a linear learning rate warmup and decay, see Appendix B.1 for details. For fine-tuning we use SGD with momentum, batch size 512, for all models, see Appendix B.1.1. For ImageNet results in Table 2, we fine-tuned at higher resolution: 512 for ViT-L/16 and 518 for ViT-H/14, and also used Polyak & Juditsky (1992) averaging with a factor of 0.9999 (Ramachandran et al., 2019; Wang et al., 2020b).

> 💡 **比较边界**: 预训练优化器、batch 和 weight decay 统一，但 Table 2 的旗舰 ViT 还使用高分辨率微调和参数平均；最终精度不是纯架构消融。

Metrics. We report results on downstream datasets either through few-shot or fine-tuning accuracy. Fine-tuning accuracies capture the performance of each model after fine-tuning it on the respective dataset. Few-shot accuracies are obtained by solving a regularized least-squares regression problem that maps the (frozen) representation of a subset of training images to $\{-1,1\}^K$ target vectors. This formulation allows us to recover the exact solution in closed form. Though we mainly focus on fine-tuning performance, we sometimes use linear few-shot accuracies for fast on-the-fly evaluation where fine-tuning would be too costly.

> 💡 **指标解读**: few-shot 只在冻结特征上拟合线性分类器，适合快速比较表征；fine-tuning 更新整个网络。Figure 4 与 Table 2 的数值不能直接横比。

### 4.2 COMPARISON TO STATE OF THE ART

We first compare our largest models – ViT-H/14 and ViT-L/16 – to state-of-the-art CNNs from the literature. The first comparison point is Big Transfer (BiT) (Kolesnikov et al., 2020), which performs supervised transfer learning with large ResNets. The second is Noisy Student (Xie et al., 2020), which is a large EfficientNet trained using semi-supervised learning on ImageNet and JFT-300M with the labels removed. Currently, Noisy Student is the state of the art on ImageNet and BiT-L on the other datasets reported here. All models were trained on TPUv3 hardware, and we report the number of TPUv3-core-days taken to pre-train each of them, that is, the number of TPU v3 cores (2 per chip) used for training multiplied by the training time in days.

Table 2 shows the results. The smaller ViT-L/16 model pre-trained on JFT-300M outperforms BiT-L (which is pre-trained on the same dataset) on all tasks, while requiring substantially less computational resources to train. The larger model, ViT-H/14, further improves the performance, especially on the more challenging datasets – ImageNet, CIFAR-100, and the VTAB suite. Interestingly, this model still took substantially less compute to pre-train than prior state of the art. However, we note that pre-training efficiency may be affected not only by the architecture choice, but also other parameters, such as training schedule, optimizer, weight decay, etc. We provide a controlled study of performance vs. compute for different architectures in Section 4.4. Finally, the ViT-L/16 model pre-trained on the public ImageNet-21k dataset performs well on most datasets too, while taking fewer resources to pre-train: it could be trained using a standard cloud TPUv3 with 8 cores in approximately 30 days.

> 💡 **比较口径**: TPUv3-core-days 可近似比较同代硬件上的训练成本，但不等于 FLOPs 或能耗。Noisy Student 使用半监督流程，ViT 与 BiT 的训练配方也不完全相同，因此 Table 2 比较的是完整训练方案，不是孤立的架构变量。

![Table 2](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028237945.webp)

*Table 2: Comparison with state of the art on popular image classification benchmarks. We report mean and standard deviation of the accuracies, averaged over three fine-tuning runs. Vision Transformer models pre-trained on the JFT-300M dataset outperform ResNet-based baselines on all datasets, while taking substantially less computational resources to pre-train. ViT pre-trained on the smaller public ImageNet-21k dataset performs well too. <sup>∗</sup>Slightly improved 88.5% result reported in Touvron et al. (2020).*

> 💡 **Table 2 批读**: 同用 JFT-300M 时，ViT-L/16 与 BiT-L 的 ImageNet 为 87.76% vs 87.54%，VTAB 为 76.28 vs 76.29%，预训练成本为 0.68k vs 9.9k core-days；主要优势是计算效率，不是精度大幅领先。ViT-H/14 的 88.55% 与 Noisy Student 的 88.4/88.5% 训练范式不同，应视为相近水平。

![Figure 2](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028243007.webp)

*Figure 2: Breakdown of VTAB performance in Natural, Specialized, and Structured task groups.*

> 💡 **Figure 2 批读**: 各面板纵轴刻度不同，不能只看柱高。ViT-H/14 的优势主要在 Natural 与 Structured；Specialized 与 BiT-L 接近，整体均值掩盖了任务差异。

Figure 2 decomposes the VTAB tasks into their respective groups, and compares to previous SOTA methods on this benchmark: BiT, VIVI – a ResNet co-trained on ImageNet and Youtube (Tschannen et al., 2020), and S4L – supervised plus semi-supervised learning on ImageNet (Zhai et al., 2019a). ViT-H/14 outperforms BiT-R152x4, and other methods, on the Natural and Structured tasks. On the Specialized the performance of the top two models is similar.

### 4.3 PRE-TRAINING DATA REQUIREMENTS

The Vision Transformer performs well when pre-trained on a large JFT-300M dataset. With fewer inductive biases for vision than ResNets, how crucial is the dataset size? We perform two series of experiments.

First, we pre-train ViT models on datasets of increasing size: ImageNet, ImageNet-21k, and JFT-300M. To boost the performance on the smaller datasets, we optimize three basic regularization parameters – weight decay, dropout, and label smoothing. Figure 3 shows the results after fine-tuning to ImageNet (results on other datasets are shown in Table 5).<sup>2</sup> When pre-trained on the smallest dataset, ImageNet, ViT-Large models underperform compared to ViT-Base models, despite (moderate) regularization. With ImageNet-21k pre-training, their performances are similar. Only with JFT-300M, do we see the full benefit of larger models. Figure 3 also shows the performance region spanned by BiT models of different sizes. The BiT CNNs outperform ViT on ImageNet, but with the larger datasets, ViT overtakes.

<sup>2</sup> Note that the ImageNet pre-trained models are also fine-tuned, but again on ImageNet. This is because the resolution increase during fine-tuning improves the performance.

> 💡 **实验解读**: ViT-L 在 ImageNet 上不如 ViT-B，在 ImageNet-21k 上接近，直到 JFT-300M 才体现大容量收益。三套数据的分布和标签空间也在变化，因此这里只能确认“数据规模与容量存在交互”，不能隔离纯样本数效应。

![Figure 3](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028249831.webp)

*Figure 3: Transfer to ImageNet. While large ViT models perform worse than BiT ResNets (shaded area) when pre-trained on small datasets, they shine when pre-trained on larger datasets. Similarly, larger ViT variants overtake smaller ones as the dataset grows.*

> 💡 **Figure 3 批读**: 大型 ViT 随预训练集扩大提升更快，并在大数据区超过 BiT。横轴是不同数据集而非纯样本数，无法区分数量与多样性的贡献。

Second, we train our models on random subsets of 9M, 30M, and 90M as well as the full JFT-300M dataset. We do not perform additional regularization on the smaller subsets and use the same hyper-parameters for all settings. This way, we assess the intrinsic model properties, and not the effect of regularization. We do, however, use early-stopping, and report the best validation accuracy achieved during training. To save compute, we report few-shot linear accuracy instead of full fine-tuning accuracy. Figure 4 contains the results. Vision Transformers overfit more than ResNets with comparable computational cost on smaller datasets. For example, ViT-B/32 is slightly faster than ResNet50; it performs much worse on the 9M subset, but better on 90M+ subsets. The same is true for ResNet152x2 and ViT-L/16. This result reinforces the intuition that the convolutional inductive bias is useful for smaller datasets, but for larger ones, learning the relevant patterns directly from data is sufficient, even beneficial.

> 💡 **对照强度**: 9M、30M、90M 和 300M 均来自 JFT，比跨数据集实验更接近只改变样本量。但小子集未重调正则化，并采用最佳 early-stopping 点和线性 few-shot，可能影响小数据区的相对结果。

![Figure 4](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028257344.webp)

*Figure 4: Linear few-shot evaluation on ImageNet versus pre-training size. ResNets perform better with smaller pre-training datasets but plateau sooner than ViT, which performs better with larger pre-training. ViT-b is ViT-B with all hidden dimensions halved.*

> 💡 **Figure 4 批读**: 相近成本下，ViT-B/32 在 9M 时落后 ResNet50，到 90M 以上反超；ResNet 起点更高但更早变平。这个交叉只在 JFT 预训练和 ImageNet 5-shot 指标上得到验证，90M 不是普适阈值。

Overall, the few-shot results on ImageNet (Figure 4), as well as the low-data results on VTAB (Table 2) seem promising for very low-data transfer. Further analysis of few-shot properties of ViT is an exciting direction of future work.

### 4.4 SCALING STUDY

We perform a controlled scaling study of different models by evaluating transfer performance from JFT-300M. In this setting data size does not bottleneck the models’ performances, and we assess performance versus pre-training cost of each model. The model set includes: 7 ResNets, R50x1, R50x2, R101x1, R152x1, R152x2, pre-trained for 7 epochs, plus R152x2 and R200x3 pre-trained for 14 epochs; 6 Vision Transformers, ViT-B/32, B/16, L/32, L/16, pre-trained for 7 epochs, plus L/16 and H/14 pre-trained for 14 epochs; and 5 hybrids, R50+ViT-B/32, B/16, L/32, L/16 pre-trained for 7 epochs, plus R50+ViT-L/16 pre-trained for 14 epochs (for hybrids, the number at the end of the model name stands not for the patch size, but for the total dowsampling ratio in the ResNet backbone).

> 💡 **实验价值**: 三个模型族统一使用 JFT-300M，并覆盖多个容量和训练预算，因此比旗舰点更能比较性能—计算前沿；exaFLOPs 仍不等于实际延迟或能耗。

Figure 5 contains the transfer performance versus total pre-training compute (see Appendix D.5 for details on computational costs). Detailed results per model are provided in Table 6 in the Appendix. A few patterns can be observed. First, Vision Transformers dominate ResNets on the performance/compute trade-off. ViT uses approximately 2–4× less compute to attain the same performance (average over 5 datasets). Second, hybrids slightly outperform ViT at small computational budgets, but the difference vanishes for larger models. This result is somewhat surprising, since one might expect convolutional local feature processing to assist ViT at any size. Third, Vision Transformers appear not to saturate within the range tried, motivating future scaling efforts.

![Figure 5](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028260690.webp)

*Figure 5: Performance versus pre-training compute for different architectures: Vision Transformers, ResNets, and hybrids. Vision Transformers generally outperform ResNets with the same computational budget. Hybrids improve upon pure Transformers for smaller model sizes, but the gap vanishes for larger models.*

> 💡 **Figure 5 批读**: ViT 整体位于 ResNet 曲线左上方，同精度约少用 2–4× 计算；hybrid 只在低预算略优。曲线末端仍上升仅表示测试范围内未饱和，不能外推为无限扩展都有效。

### 4.5 INSPECTING VISION TRANSFORMER

To begin to understand how the Vision Transformer processes image data, we analyze its internal representations. The first layer of the Vision Transformer linearly projects the flattened patches into a lower-dimensional space (Eq. 1). Figure 7 (left) shows the top principal components of the the learned embedding filters. The components resemble plausible basis functions for a low-dimensional representation of the fine structure within each patch.

After the projection, a learned position embedding is added to the patch representations. Figure 7 (center) shows that the model learns to encode distance within the image in the similarity of position embeddings, i.e. closer patches tend to have more similar position embeddings. Further, the row-column structure appears; patches in the same row/column have similar embeddings. Finally, a sinusoidal structure is sometimes apparent for larger grids (Appendix D). That the position embeddings learn to represent 2D image topology explains why hand-crafted 2D-aware embedding variants do not yield improvements (Appendix D.4).

> 💡 **表征解读**: Patch 投影的主成分类似局部视觉基函数；位置向量的相似度恢复了邻近、同行和同列结构。这说明 ViT 会学习二维关系，但可视化不是因果证据。

![Figure 6](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028817586.webp)
*Figure 6: Representative examples of attention from the output token to the input space. See Appendix D.7 for details.*

> 💡 **Figure 6 批读**: Class token 的注意热点常覆盖物体主体，但“注意力落在主体上”不等于这些区域对预测具有因果作用。

Self-attention allows ViT to integrate information across the entire image even in the lowest layers. We investigate to what degree the network makes use of this capability. Specifically, we compute the average distance in image space across which information is integrated, based on the attention weights (Figure 7, right). This “attention distance” is analogous to receptive field size in CNNs.

We find that some heads attend to most of the image already in the lowest layers, showing that the ability to integrate information globally is indeed used by the model. Other attention heads have consistently small attention distances in the low layers. This highly localized attention is less pronounced in hybrid models that apply a ResNet before the Transformer (Figure 7, right), suggesting that it may serve a similar function as early convolutional layers in CNNs. Further, the attention distance increases with network depth. Globally, we find that the model attends to image regions that are semantically relevant for classification (Figure 6).

> 💡 **Attention distance**: 它是按注意力权重计算的平均空间距离，可类比有效感受野。低层 head 同时有局部与全局分工，深层趋向全局；该统计不包含方向、内容或多跳信息流。

![Figure 7](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028265533.webp)

*Figure 7: Left: Filters of the initial linear embedding of RGB values of ViT-L/32. Center: Similarity of position embeddings of ViT-L/32. Tiles show the cosine similarity between the position embedding of the patch with the indicated row and column and the position embeddings of all other patches. Right: Size of attended area by head and network depth. Each dot shows the mean attention distance across images for one of 16 heads at one layer. See Appendix D.7 for details.*

> 💡 **Figure 7 批读**: 三幅图依次展示局部基函数、位置编码的空间结构和跨层注意距离。它们共同说明视觉结构会从训练中涌现，但未消融这些结构对准确率的贡献。

### 4.6 SELF-SUPERVISION

Transformers show impressive performance on NLP tasks. However, much of their success stems not only from their excellent scalability but also from large scale self-supervised pre-training (Devlin et al., 2019; Radford et al., 2018). We also perform a preliminary exploration on masked patch prediction for self-supervision, mimicking the masked language modeling task used in BERT. With self-supervised pre-training, our smaller ViT-B/16 model achieves 79.9% accuracy on ImageNet, a significant improvement of 2% to training from scratch, but still 4% behind supervised pre-training. Appendix B.1.2 contains further details. We leave exploration of contrastive pre-training (Chen et al., 2020b; He et al., 2020; Bachman et al., 2019; Hénaff et al., 2020) to future work.

> 💡 **结果边界**: 79.9% 比从头训练高 2 个百分点、比监督预训练低 4 个百分点。实验只覆盖 ViT-B/16 和一种 masked-patch 目标，属于可行性验证，不是成熟的自监督结论。

### 🔖 Section 总结

大规模预训练使 ViT 达到强迁移性能，受控 scaling 显示其性能—计算前沿优于 ResNet。结论仍限于论文测试的分类迁移设置：小数据区卷积先验更有效，旗舰结果并非纯架构消融，自监督和可视化证据也较弱。

#### 关键数字

| 证据 | 关键数字 | 应如何解读 |
|---|---:|---|
| 预训练数据规模 | ImageNet 1.3M；ImageNet-21k 14M；JFT 303M | ViT 的容量优势随数据规模扩大而兑现，但跨数据集比较混入分布差异 |
| ViT-H/14（JFT） | ImageNet 88.55 ± 0.04%；VTAB 77.63 ± 0.23；2.5k TPUv3-core-days | 当时的旗舰精度与迁移表现，依赖超大私有监督数据 |
| ViT-L/16（JFT）vs BiT-L（JFT） | 87.76% vs 87.54% ImageNet；0.68k vs 9.9k core-days | 同预训练数据下，主要优势是计算效率与整体任务覆盖 |
| 受控 scaling | 同精度约少用 2–4× 预训练计算 | 架构效率的核心证据，限于论文测试的模型与预算范围 |
| 自监督 ViT-B/16 | 79.9%；比从头训练 +2，距监督预训练 −4 个百分点 | 可行性信号，不是成熟的自监督方案 |

#### 核心洞察

1. ViT 在小数据区更易过拟合，大数据才兑现其容量优势。
2. 最有力的效率证据是 Figure 5 的多预算性能—计算曲线，而非单个 SOTA 点。
3. Hybrid 只在低预算略占优，说明卷积局部先验的边际价值随规模下降。
4. 表征可视化支持“ViT 学会了二维与局部结构”，但不能替代因果消融。

## 5 CONCLUSION

### 📌 预览
本节回收全文的核心结论：图像可以切成 patch token 后直接交给标准 Transformer 编码器，大规模预训练能够弥补较弱的视觉归纳偏置。阅读时要把已经由分类实验支持的结论，与作者提出但尚未验证的检测、分割、自监督和继续扩展方向分开。这样才能看清 ViT 的真正贡献、成立条件与论文边界。


We have explored the direct application of Transformers to image recognition. Unlike prior works using self-attention in computer vision, we do not introduce image-specific inductive biases into the architecture apart from the initial patch extraction step. Instead, we interpret an image as a sequence of patches and process it by a standard Transformer encoder as used in NLP. This simple, yet scalable, strategy works surprisingly well when coupled with pre-training on large datasets. Thus, Vision Transformer matches or exceeds the state of the art on many image classification datasets, whilst being relatively cheap to pre-train.

> 💡 **核心结论解读**:
> - 输入侧只保留 patch extraction，把二维图像转成 token 序列；主体网络则复用 NLP 风格的标准 Transformer encoder。ViT 的关键贡献因此不是新的 attention 算子，而是证明“极少视觉专用设计 + 大规模预训练”可以成为可扩展的视觉方案。
> - 归纳偏置并没有消失，而是从卷积的局部性和平移等变，转移到 patch 划分、位置编码、训练数据与优化流程中。实验支持它在大规模图像分类预训练下有效，不能直接推出所有视觉任务或小数据场景都会同样受益。

While these initial results are encouraging, many challenges remain. One is to apply ViT to other computer vision tasks, such as detection and segmentation. Our results, coupled with those in Carion et al. (2020), indicate the promise of this approach. Another challenge is to continue exploring self-supervised pre-training methods. Our initial experiments show improvement from self-supervised pre-training, but there is still large gap between self-supervised and large-scale supervised pre-training. Finally, further scaling of ViT would likely lead to improved performance.

> 💡 **开放问题与证据边界**:
> - **任务边界**：主实验集中在图像分类与分类迁移，检测和分割需要空间密集输出，不能仅凭分类结果视为已经解决。
> - **监督边界**：masked patch 实验虽达到 79.9% ImageNet，但仍落后监督预训练约 4 个百分点；“继续探索”是由差距提出的研究议程，不是完成态结论。
> - **规模边界**：Figure 5 在已测试预算内未饱和，因此进一步 scaling 是合理假设；它没有证明收益会无限持续，也未计入超大私有数据、能耗和复现门槛。

### 🔖 Section 总结

ViT 证明了一个简洁而影响深远的设计选择：把图像表示成 patch 序列后，标准 Transformer 可以在足够大规模的预训练下成为强视觉骨干。这个结论的必要限定同样重要——小数据区的归纳偏置不足、对 JFT-300M 等大数据的依赖，以及分类之外任务和自监督训练尚未充分验证。

#### 核心洞察

1. 论文的持久贡献是把“通用序列建模器”确立为视觉骨干，而不是某一个 ViT 尺寸或单项 SOTA 数字。
2. 架构简洁不代表没有先验；patch 化、位置编码和大规模训练共同构成了 ViT 的有效条件。
3. 已有证据最强地支持大规模预训练后的图像分类迁移，对检测、分割和小数据从头训练不应过度外推。
4. 自监督与继续扩展在本文中是有初步信号的未来方向，而非已经完成验证的主结论。

### APPENDIX

### 📌 预览
本节把主文中的多头自注意力（MSA）黑盒展开为 Q/K/V 投影、相似度归一化、value 聚合与多头输出投影。阅读时重点跟踪 $N$、$D$、$D_h$ 和 head 数 $k$ 的形状关系，以及注意力为何对 token 数呈二次复杂度。最后还要区分“增加 head 数”和“增加总隐藏维度”：本文通过设置 $D_h=D/k$ 保持总体宽度与计算量大致不变。


### A MULTIHEAD SELF-ATTENTION

> 💡 **Appendix A 预览**: 把主文的 MSA 黑盒展开，注意每个 head 的维度通常取 $D_h=D/k$。

Standard qkv self-attention (SA, Vaswani et al. (2017)) is a popular building block for neural architectures. For each element in an input sequence $\mathbf { z } \in \mathbb { R } ^ { N \times D }$ , we compute a weighted sum over all values v in the sequence. The attention weights $A _ { i j }$ are based on the pairwise similarity between two elements of the sequence and their respective query $\mathbf { q } ^ { i }$ and key $\mathbf { k } ^ { j }$ representations.

> 💡 **批注**: 输入 $z$ 同时投影出 q/k/v；注意力矩阵 $A$ 的形状为 $N×N$，因此 patch 数直接决定二次复杂度。

![Equations 5-6](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028271069.webp)

![Equation 7](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028273937.webp)

> 💡 **公式解读（5–7）**: 输入 $z\in\mathbb{R}^{N\times D}$ 先通过 $U_{qkv}\in\mathbb{R}^{D\times 3D_h}$ 一次性得到 $q,k,v\in\mathbb{R}^{N\times D_h}$。随后计算 $qk^\top/\sqrt{D_h}$，softmax 沿 key 维归一化得到 $A\in\mathbb{R}^{N\times N}$，最后以 $Av$ 汇总每个位置可见的 value。$1/\sqrt{D_h}$ 防止维度增大时点积幅值过大、softmax 过早饱和；真正的内存瓶颈是显式的 $N\times N$ 注意力矩阵。

Multihead self-attention (MSA) is an extension of SA in which we run k self-attention operations, called “heads”, in parallel, and project their concatenated outputs. To keep compute and number of parameters constant when changing k, $D _ { h }$ (Eq. 5) is typically set to $D / k$.

> 💡 **批注**: 增加 head 数时让每头维度降为 $D/k$，拼接后仍回到 D，从而大致保持参数量与计算量。

![Equation 8](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028281847.webp)

> 💡 **公式解读（8）**: $k$ 个 head 各自产生 $N\times D_h$ 的输出，沿通道维拼接为 $N\times(kD_h)$，再乘 $U_{msa}\in\mathbb{R}^{kD_h\times D}$ 回到 $N\times D$。当 $D_h=D/k$ 时，拼接宽度仍为 $D$；多头机制主要增加表示子空间的分工，而不是无条件扩大总通道数。实现上各 head 通常不会真的逐个循环，而是把投影和 batched matrix multiplication 融合执行。

### 🔖 Section 总结

单头注意力先把 token 投影为 Q/K/V，再用缩放点积产生 $N\times N$ 权重矩阵并聚合 value；多头注意力则并行执行多个较窄的注意力子空间，拼接后投影回模型维度。对 ViT 而言，patch 大小通过 $N=HW/P^2$ 直接控制注意力矩阵规模，因此更小 patch 带来的空间细节必须用更高的二次计算与显存成本交换。

#### 核心洞察

1. $A$ 的形状是 $N\times N$，所以自注意力对序列长度的主要成本是 $O(N^2D)$；图像分辨率或 patch 密度上升会迅速放大这一项。
2. 缩放因子 $1/\sqrt{D_h}$ 是数值稳定机制，使不同 head 维度下的 logits 保持可比较范围。
3. 令 $D_h=D/k$ 后，增加 head 数主要改变子空间划分；输出仍是 $N\times D$，便于接入残差路径。

### B EXPERIMENT DETAILS

### 📌 预览
本节记录预训练、微调和掩码 patch 自监督的可复现实验细节，并揭示架构之外的优化配方如何影响最终结论。阅读时应区分三套配置：监督预训练使用 Adam，迁移微调使用 SGD，而初步自监督实验又采用自己的遮盖比例与预测目标。表格中的 batch size、分辨率、训练步数和正则化不是附属信息，它们共同决定比较是否公平、结果能否复现。


### B.1 TRAINING

> 💡 **B.1 要点预览**: 强正则化是从 ImageNet 零开始训练 ViT 的关键条件。

Table 3 summarizes our training setups for our different models. We found strong regularization to be key when training models from scratch on ImageNet. Dropout, when used, is applied after every dense layer except for the qkv-projections and directly after adding positional embeddings to patch embeddings. Hybrid models are trained with the exact setup as their ViT counterparts. Finally, all training is done on resolution 224.

![Table 3](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028286727.webp)

*Table 3: Hyperparameters for training. All models are trained with a batch size of 4096 and learning rate warmup of 10k steps. For ImageNet we found it beneficial to additionally apply gradient clipping at global norm 1. Training resolution is 224.*

> 💡 **Table 3 批读**: 三种数据规模使用不同正则强度：JFT-300M 以 weight decay 0.1、dropout 0.0 为主，ImageNet-21k 使用 weight decay 0.03、dropout 0.1，而从 ImageNet 零开始训练进一步提高到 weight decay 0.3。所有模型统一 batch size 4096、warmup 10k steps 和 224 分辨率，因此表中的数据规模、训练轮数与正则化差异才是解释结果时要控制的主要变量。

> 🧭 **B.1 小结**: “同一架构”并不意味着“同一训练配方”。小数据集需要更强正则，旗舰模型还会增加训练轮数；若忽略这些设置，容易把优化差异误判成架构差异。


### B.1.1 FINE-TUNING

> 💡 **B.1.1 要点预览**: 微调统一采用 SGD、零初始化新分类头，并通过小验证子集选学习率。

We fine-tune all ViT models using SGD with a momentum of 0.9. We run a small grid search over learning rates, see learning rate ranges in Table 4. To do so, we use small sub-splits from the training set (10% for Pets and Flowers, 2% for CIFAR, 1% ImageNet) as development set and train on the remaining data. For final results we train on the entire training set and evaluate on the respective test data. For fine-tuning ResNets and hybrid models we use the exact same setup, with the only exception of ImageNet where we add another value 0.06 to the learning rate sweep. Additionally, for ResNets we also run the setup of Kolesnikov et al. (2020) and select the best results across this run and our sweep. Finally, if not mentioned otherwise, all fine-tuning experiments run at 384 resolution (running fine-tuning at different resolution than training is common practice (Kolesnikov et al., 2020)).

![Table 4](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028294654.webp)

*Table 4: Hyperparameters for fine-tuning. All models are fine-tuned with cosine learning rate decay, a batch size of 512, no weight decay, and grad clipping at global norm 1. If not mentioned otherwise, fine-tuning resolution is 384.*

> 💡 **Table 4 批读**: 微调分辨率通常为 384，且不同数据集的步数跨度很大，反映数据规模与过拟合风险。

When transferring ViT models to another dataset, we remove the whole head (two linear layers) and replace it by a single, zero-initialized linear layer outputting the number of classes required by the target dataset. We found this to be a little more robust than simply re-initializing the very last layer.

> 💡 **实现解读**: 零初始化的新分类层让微调开始时不会用随机 logits 强烈扰动已经学到的表征；同时彻底移除预训练的两层 head，避免隐藏层仍携带上游标签空间的偏置。分辨率从 224 提到 384 时，patch 数增加并需要位置编码插值，因此微调收益也伴随更高的注意力成本。

For VTAB we follow the protocol in Kolesnikov et al. (2020), and use the same hyperparameter setting for all tasks. We use a learning rate of 0.01 and train for 2500 steps (Tab. 4). We chose this setting by running a small sweep over two learning rates and two schedules, and selecting the setting with the highest VTAB score on the 200-example validation sets. We follow the pre-processing used in Kolesnikov et al. (2020), except that we do not use task-specific input resolutions. Instead we find that Vision Transformer benefits most from a high resolution (384 × 384) for all tasks.

> 🧭 **B.1.1 小结**: 微调协议尽量统一模型之间的优化条件，但不同数据集仍使用不同训练步数与学习率搜索范围。VTAB 对全部 19 个任务采用同一组超参数，增强横向可比性；代价是单一配置未必是每个任务的最优点。

### B.1.2 SELF-SUPERVISION

> 💡 **B.1.2 要点预览**: 50% patch 被扰动，80/10/10 策略直接借鉴 BERT，但预测目标是量化后的 patch 颜色。

We employ the masked patch prediction objective for preliminary self-supervision experiments. To do so we corrupt 50% of patch embeddings by either replacing their embeddings with a learnable [mask] embedding (80%), a random other patch embedding (10%) or just keeping them as is (10%). This setup is very similar to the one used for language by Devlin et al. (2019). Finally, we predict the 3-bit, mean color (i.e., 512 colors in total) of every corrupted patch using their respective patch representations.

> 💡 **批注**: 被选中的 patch 并非全部换成 mask，保留或随机替换可减小预训练与下游输入分布差异。

We trained our self-supervised model for 1M steps (ca. 14 epochs) with batch size 4096 on JFT. We use Adam, with a base learning rate of $2 \cdot 10^{-4}$, warmup of 10k steps and cosine learning rate decay. As prediction targets for pre-training we tried the following settings: 1) predicting only the mean, 3-bit color (i.e., 1 prediction of 512 colors), 2) predicting a 4 × 4 downsized version of the $16 \times 16$ patch with 3-bit colors in parallel (i.e., 16 predictions of 512 colors), 3) regression on the full patch using L2 (i.e., 256 regressions on the 3 RGB channels). Surprisingly, we found that all worked quite well, though L2 was slightly worse. We report final results only for option 1) because it has shown best few-shot performance. We also experimented with 15% corruption rate as used by Devlin et al. (2019) but results were also slightly worse on our few-shot metrics.

> 💡 **目标函数权衡**: 三种目标从低信息量的平均颜色分类，逐步增加到 16 个局部颜色分类和逐像素回归。更细的目标提供更多监督，却也迫使模型消耗容量拟合低层像素细节；平均 3-bit 颜色在 few-shot 指标上最好，说明当时的目标更适合作为表征学习代理，而不是追求精确重建。

Lastly, we would like to remark that our instantiation of masked patch prediction doesn’t require such an enormous amount of pretraining nor a large dataset such as JFT in order to lead to similar performance gains on ImageNet classification. That is, we observed diminishing returns on downstream performance after 100k pretraining steps, and see similar gains when pretraining on ImageNet.

> 🧭 **B.1.2 小结**: 50% corruption 优于照搬 BERT 的 15%，但收益在约 100k steps 后递减，并不要求完整的 1M-step JFT 训练。这个结果证明 masked patch prediction 可行，却尚未证明它能替代大规模监督预训练。

### 🔖 Section 总结

附录 B 表明 ViT 的性能来自架构、数据规模与训练协议的共同作用。监督预训练需要随数据规模调整正则化，微调阶段通过统一优化器、分辨率和搜索协议控制比较，而自监督实验则说明遮盖率和预测目标会显著改变表征质量。

#### 关键数字

| 环节 | 关键设置 | 阅读含义 |
|---|---|---|
| 监督预训练 | batch 4096，warmup 10k steps，分辨率 224 | 统一底层训练条件 |
| ImageNet 从零训练 | 300 epochs，weight decay 0.3，dropout 0.1 | 小数据需要更强正则 |
| 常规微调 | batch 512，通常分辨率 384 | 更高分辨率换取更高迁移精度 |
| VTAB | LR 0.01，2500 steps，19 个任务共用配置 | 强调任务间可比性 |
| 自监督 | 50% corruption，80/10/10 替换，1M steps | 约 100k steps 后收益开始递减 |

#### 核心洞察

1. 架构对比必须同时控制优化器、训练时长、正则化和输入分辨率，否则“模型优势”可能是配方优势。
2. 零初始化迁移头和统一微调协议降低了上游标签空间与任务特定调参带来的混杂。
3. 更精细的像素预测目标不一定产生更好的迁移表征；自监督目标的信息量与语义抽象之间存在权衡。
4. 早期 masked patch 实验提供方向性证据，但其 few-shot 收益和递减规律仍不足以支持对大规模监督预训练的替代结论。

### C ADDITIONAL RESULTS

### 📌 预览
本节把主文 Figure 3 和 Figure 5 的曲线还原为逐模型、逐数据集的准确率与预训练计算量。Table 5 用于检验“数据规模能否弥补归纳偏置”，Table 6 则用于比较 ViT、ResNet 和 hybrid 的性能—计算权衡。阅读时不要只看最强单点，还要比较同一模型跨数据规模的变化，以及相近 exaFLOPs 下不同架构的相对位置。


We report detailed results corresponding to the figures presented in the paper. Table 5 corresponds to Figure 3 from the paper and shows transfer performance of different ViT models pre-trained on datasets of increasing size: ImageNet, ImageNet-21k, and JFT-300M. Table 6 corresponds to Figure 5 from the paper and shows the transfer performance of ViT, ResNet, and hybrid models of varying size, as well as the estimated computational cost of their pre-training.

![Table 5](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028302849.webp)

*Table 5: Top1 accuracy (in %) of Vision Transformer on various datasets when pre-trained on ImageNet, ImageNet-21k or JFT300M. These values correspond to Figure 3 in the main text. Models are fine-tuned at 384 resolution. Note that the ImageNet results are computed without additional techniques (Polyak averaging and 512 resolution images) used to achieve results in Table 2.*

> 💡 **Table 5 批读**: ViT-L/16 的 ImageNet 迁移准确率随预训练数据从 ImageNet、ImageNet-21k 到 JFT-300M 依次为 76.53%、85.15% 和 87.12%；数据规模的增益远大于单纯扩大模型。ViT-H/14 只在更大数据设置中报告，JFT 上达到 88.04%，但这里未使用 Table 2 的 Polyak averaging 与 512/518 高分辨率技巧，因此不能把 88.04% 与主表旗舰数字混为同一配置。

![Table 6](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028310080.webp)

*Table 6: Detailed results of model scaling experiments. These correspond to Figure 5 in the main paper. We show transfer accuracy on several datasets, as well as the pre-training compute (in exaFLOPs).*

> 💡 **Table 6 批读**: 该表把 Figure 5 的点还原为准确率与 exaFLOPs。ViT-B/16 用 224 exaFLOPs 达到 84.15% ImageNet，而计算相近的 ResNet50x2 用 199 exaFLOPs 达到 82.12%；R50x1+ViT-B/16 用 274 exaFLOPs 达到 85.58%，说明中小规模时卷积 stem 仍有价值。继续扩大到 ViT-H/14 后，准确率升至 88.08%，但成本达到 4262 exaFLOPs，边际收益明显递减。

> 🧭 **结果串联**: Table 5 回答“更多数据是否释放 ViT 容量”，Table 6 回答“释放这些容量要付出多少计算”。两表共同支持的结论不是 ViT 在任何预算下都占优，而是其大数据扩展斜率更好，同时小预算区仍可能受益于卷积先验。

### 🔖 Section 总结

附录 C 用原始数值支撑主文的两条核心论证：ViT 对预训练数据规模更敏感，并且在相同量级的预训练计算下通常比纯 ResNet 获得更高迁移精度。与此同时，hybrid 在中小模型上仍具竞争力，而旗舰 ViT 的每一点额外精度都需要迅速增加的计算预算。

#### 关键数字

| 对比 | ImageNet 准确率 | 预训练计算 | 含义 |
|---|---:|---:|---|
| ViT-L/16：ImageNet → ImageNet-21k → JFT-300M | 76.53% → 85.15% → 87.12% | — | 数据规模显著释放大模型能力 |
| ViT-B/16 vs. ResNet50x2 | 84.15% vs. 82.12% | 224 vs. 199 exaFLOPs | 相近预算下 ViT 更高 |
| R50x1+ViT-B/16 | 85.58% | 274 exaFLOPs | 中等规模下 hybrid 仍有优势 |
| ViT-H/14 | 88.08% | 4262 exaFLOPs | 旗舰精度伴随明显边际成本 |

#### 核心洞察

1. ViT-L/16 从 ImageNet 到 ImageNet-21k 的提升大于从 ImageNet-21k 到 JFT 的提升，说明数据收益也存在阶段性递减。
2. 性能—计算比较应选取相近预算点，而不是只比较模型名称或参数量；patch 变小会在参数量变化不大的情况下显著增加 exaFLOPs。
3. Hybrid 的优势集中在中小规模，随着模型与数据扩大，纯 ViT 的扩展性逐渐成为主导。
4. Table 5 与主文 Table 2 使用的增强设置不同，报告旗舰结果时必须保留这一配置边界。

### D ADDITIONAL ANALYSES

### 📌 预览
本节集中检验 ViT 主结论可能受到的混杂因素：优化器、模型形状、分类聚合方式、位置编码和硬件效率。随后通过轴向注意力、attention distance、Attention Rollout、ObjectNet 与 VTAB 分解讨论精度、计算和解释性的边界。阅读重点不是记住每个消融点，而是判断哪些设计是必要条件、哪些只是可替换实现，以及论文证据能支持到什么程度。


### D.1 SGD VS. ADAM FOR RESNETS

> 💡 **D.1 要点预览**: 这项对照用于排除“ViT 因优化器不同而占便宜”的混杂因素。

ResNets are typically trained with SGD and our use of Adam as optimizer is quite unconventional. Here we show the experiments that motivated this choice. Namely, we compare the fine-tuning performance of two ResNets – 50x1 and 152x2 – pre-trained on JFT with SGD and Adam. For SGD, we use the hyperparameters recommended by Kolesnikov et al. (2020). Results are presented in Table 7. Adam pre-training outperforms SGD pre-training on most datasets and on average. This justifies the choice of Adam as the optimizer used to pre-train ResNets on JFT. Note that the absolute numbers are lower than those reported by Kolesnikov et al. (2020), since we pre-train only for 7 epochs, not 30.

![Table 7](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028319522.webp)

*Table 7: Fine-tuning ResNet models pre-trained with Adam and SGD.*

> 💡 **Table 7 批读**: Adam 的平均优势并不大：ResNet50 为 89.33 对 88.79（+0.54），ResNet152x2 为 94.01 对 93.72（+0.29）。而且并非每个数据集都领先，例如 ResNet152x2 在 Flowers 上 SGD 更高；因此该表足以说明 Adam 不是给 ViT 对照组“故意选差优化器”，但不能推出 Adam 普遍优于 SGD。

> 🧭 **D.1 小结**: 优化器消融降低了基线不公平这一风险，但实验只覆盖两个 ResNet 尺寸和 7-epoch JFT 预训练。它是针对本文配置的控制实验，而不是一般性的优化器结论。

### D.2 TRANSFORMER SHAPE

> 💡 **D.2 要点预览**: 深度和更小 patch 带来的收益大于单纯加宽，计算量比参数量更能解释性能。

We ran ablations on scaling different dimensions of the Transformer architecture to find out which are best suited for scaling to very large models. Figure 8 shows 5-shot performance on ImageNet for different configurations. All configurations are based on a ViT model with 8 layers, $D = 1024$, $D _ { M L P } = 2048$ and a patch size of 32, the intersection of all lines. We can see that scaling the depth results in the biggest improvements which are clearly visible up until 64 layers. However, diminishing returns are already visible after 16 layers. Interestingly, scaling the width of the network seems to result in the smallest changes. Decreasing the patch size and thus increasing the effective sequence length shows surprisingly robust improvements without introducing parameters. These findings suggest that compute might be a better predictor of performance than the number of parameters, and that scaling should emphasize depth over width if any. Overall, we find that scaling all dimensions proportionally results in robust improvements.

![Figure 8](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028326119.webp)

*Figure 8: Scaling different model dimensions of the Vision Transformer.*

> 💡 **Figure 8 批读**: 在相同基准点上分别改变 depth、width、MLP width 与 patch size，使各扩展轴的收益可比较。加深网络和缩小 patch 的斜率更好，单纯加宽较弱；但缩小 patch 会增加序列长度与注意力成本，所以“无额外参数”不等于“无额外计算”。

> 🧭 **D.2 小结**: 参数量不足以解释 ViT 的扩展行为，token 数和深度同样关键。16 层后深度收益开始递减，最稳妥的策略仍是多维度按比例扩展，而不是只追求更宽的隐藏层。

### D.3 HEAD TYPE AND CLASS TOKEN

> 💡 **D.3 要点预览**: class token 并非不可替代；GAP 早期失败主要是学习率没有重新匹配。

In order to stay as close as possible to the original Transformer model, we made use of an additional [class] token, which is taken as image representation. The output of this token is then transformed into a class prediction via a small multi-layer perceptron (MLP) with tanh as non-linearity in the single hidden layer.

This design is inherited from the Transformer model for text, and we use it throughout the main paper. An initial attempt at using only image-patch embeddings, globally average-pooling (GAP) them, followed by a linear classifier—just like ResNet’s final feature map—performed very poorly. However, we found that this is neither due to the extra token, nor to the GAP operation. Instead, the difference in performance is fully explained by the requirement for a different learning-rate, see Figure 9.

> 💡 **批注**: 分类聚合方式与优化超参数耦合；不能用未调学习率的 GAP 结果证明 class token 必需。

![Figure 9](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028331498.webp)

*Figure 9: Comparison of class-token and global average pooling classifiers. Both work similarly well, but require different learning-rates.*

> 💡 **Figure 9 批读**: 调好学习率后 class token 与 GAP 基本持平，聚合头不是 ViT 成功的必要条件。

> 🧭 **D.3 小结**: class token 是与 NLP Transformer 对齐的方便选择，而不是分类性能的必要条件。这个消融同时提醒：当替换聚合结构时，学习率等优化超参数也必须重新匹配，否则会把优化失败误判为结构失败。

### D.4 POSITIONAL EMBEDDING

> 💡 **D.4 要点预览**: 有位置编码显著优于没有，但 1D、2D 与相对位置方案之间差距很小。

We ran ablations on different ways of encoding spatial information using positional embedding. We tried the following cases:

• Providing no positional information: Considering the inputs as a bag of patches.

• 1-dimensional positional embedding: Considering the inputs as a sequence of patches in the raster order (default across all other experiments in this paper).

• 2-dimensional positional embedding: Considering the inputs as a grid of patches in two dimensions. In this case, two sets of embeddings are learned, each for one of the axes, X-embedding and Y-embedding, each with size $D / 2$. Then, based on the coordinate of the patch in the input, we concatenate the X and Y embeddings to get the final positional embedding for that patch.

• Relative positional embeddings: Considering the relative distance between patches to encode the spatial information instead of their absolute position. To do so, we use 1-dimensional Relative Attention, in which we define the relative distance for all possible pairs of patches. Thus, for every given pair (one as query, and the other as key/value in the attention mechanism), we have an offset $p _ { q } - p _ { k }$, where each offset is associated with an embedding. Then, we simply run extra attention, where we use the original query (the content of query), but use relative positional embeddings as keys. We then use the logits from the relative attention as a bias term and add it to the logits of the main attention (content-based attention) before applying the softmax.

In addition to different ways of encoding spatial information, we also tried different ways of incorporating this information in our model. For the 1-dimensional and 2-dimensional positional embeddings, we tried three different cases: (1) add positional embeddings to the inputs right after the stem of the model and before feeding the inputs to the Transformer encoder (default across all other experiments in this paper); (2) learn and add positional embeddings to the inputs at the beginning of each layer; (3) add a learned positional embedding to the inputs at the beginning of each layer (shared between layers).

> 💡 **设计空间解读**: 这里同时改变“位置是什么”和“位置在哪一层注入”。绝对 1D/2D 编码直接给 token 加坐标，relative attention 则把相对位移变成 attention logits 的偏置；每层独立注入提高自由度，却增加参数并可能重复学习同一空间关系。

![Table 8](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028336801.webp)

*Table 8: Results of the ablation study on positional embeddings with ViT-B/16 model evaluated on ImageNet 5-shot linear.*

> 💡 **Table 8 批读**: 去掉位置编码时 5-shot 指标为 0.61382，默认 1D stem 编码为 0.64206，相差约 2.82 个百分点；而有位置的各种方案集中在约 0.6396–0.6429。决定性因素是“有没有位置”，不是 1D、2D、相对位置或逐层注入中的细微选择。

![Figure 10](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028339405.webp)



*Figure 10: Position embeddings of models trained with different hyperparameters.*

> 💡 **Figure 10 批读**: 不同训练超参数会改变位置向量相似度纹理，但都能恢复明显二维结构。

Table 8 summarizes the results from this ablation study on a ViT-B/16 model. As we can see, while there is a large gap between the performances of the model with no positional embedding and models with positional embedding, there is little to no difference between different ways of encoding positional information. We speculate that since our Transformer encoder operates on patch-level inputs, as opposed to pixel-level, the differences in how to encode spatial information is less important. More precisely, in patch-level inputs, the spatial dimensions are much smaller than the original pixel-level inputs, e.g., 14 × 14 as opposed to $224 \times 224$, and learning to represent the spatial relations in this resolution is equally easy for these different positional encoding strategies. Even so, the specific pattern of position embedding similarity learned by the network depends on the training hyperparameters (Figure 10).

> 💡 **批注**: 真正重要的是提供位置；在 14×14 patch 网格上，模型容易从多种编码形式学到相近空间结构。Figure 10 还说明学到的相似度纹理会随训练超参数变化，因此可视化图案本身不应被解释成唯一的空间编码机制。

> 🧭 **D.4 小结**: patch-level 网格已经把空间问题从 224×224 压缩到 14×14，使多种位置方案都足以表达邻接关系。该消融支持默认 1D 可学习编码的简洁性，但没有证明它在更高分辨率、检测或分割等密集任务上仍与其他方案等价。

### D.5 EMPIRICAL COMPUTATIONAL COSTS

> 💡 **D.5 要点预览**: 理论 FLOPs 不等于硬件速度，因此补充吞吐量和单核最大 batch 的实测。

We are also interested in real-world speed of the architectures on our hardware, which is not always well predicted by theoretical FLOPs due to details like lane widths and cache sizes. For this purpose, we perform timing of inference speed for the main models of interest, on a TPUv3 accelerator; the difference between inference and backprop speed is a constant model-independent factor.

Figure 12 (left) shows how many images one core can handle per second, across various input sizes. Every single point refers to the peak performance measured across a wide range of batch-sizes. As can be seen, the theoretical bi-quadratic scaling of ViT with image size only barely starts happening for the largest models at the largest resolutions.

Another quantity of interest is the largest batch-size each model can fit onto a core, larger being better for scaling to large datasets. Figure 12 (right) shows this quantity for the same set of models. This shows that large ViT models have a clear advantage in terms of memory-efficiency over ResNet models.

> 💡 **批注**: 最大 batch 更大意味着训练大数据时并行效率更好，这是 ViT 计算优势的重要硬件侧证据。

![Figure 12](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028352031.webp)
*Figure 12: Left: Real wall-clock timings of various architectures across input sizes. ViT models have speed comparable to similar ResNets. Right: Largest per-core batch-size fitting on device with various architectures across input sizes. ViT models are clearly more memory-efficient.*

> 💡 **Figure 12 批读**: 实际吞吐并未完全呈理论二次恶化，且大型 ViT 的可容纳 batch 明显优于 ResNet。

> 🧭 **D.5 小结**: FLOPs、吞吐和峰值显存衡量的是不同瓶颈。这里的 TPUv3 实测支持 ViT 的硬件可扩展性，但结果依赖实现、batch sweep 与加速器架构，不能直接外推到任意 GPU 或软件栈。

### D.6 AXIAL ATTENTION

> 💡 **D.6 要点预览**: 轴向注意力缩短单次注意力序列，却因多出一套 attention + MLP 而未必更省总计算。

Axial Attention (Huang et al., 2020; Ho et al., 2019) is a simple, yet effective technique to run self-attention on large inputs that are organized as multidimensional tensors. The general idea of axial attention is to perform multiple attention operations, each along a single axis of the input tensor, instead of applying 1-dimensional attention to the flattened version of the input. In axial attention, each attention mixes information along a particular axis, while keeping information along the other axes independent. Along this line, Wang et al. (2020b) proposed the AxialResNet model in which all the convolutions with kernel size 3 × 3 in a ResNet50 are replaced by axial self-attention, i.e. a row and column attention, augmented by relative positional encoding. We have implemented AxialResNet as a baseline model.<sup>3</sup>.

<sup>3</sup> Our implementation is based on the open-sourced PyTorch implementation in <https://github.com/csrhddlam/axial-deeplab>. In our experiments, we reproduced the scores reported in (Wang et al., 2020b) in terms of accuracy, however, our implementation, similar to the open-source implementation, is very slow on TPUs. Therefore, we were not able to use it for extensive large-scale experiments. These may be unlocked by a carefully optimized implementation.

Moreover, we have modified ViT to process inputs in the 2-dimensional shape, instead of a 1-dimensional sequence of patches, and incorporate Axial Transformer blocks, in which instead of a self-attention followed by an MLP, we have a row-self-attention plus an MLP followed by a column-self-attention plus an MLP.

Figure 13 presents the performance of Axial ResNet, Axial-ViT-B/32 and Axial-ViT-B/16 on ImageNet 5-shot linear, when pre-trained on the JFT dataset, versus the pre-training compute, both in terms of number of FLOPs and inference time (examples per second). As we can see, both Axial-ViT-B/32 and Axial-ViT-B/16 do better than their ViT-B counterpart in terms of performance, but it comes at the cost of more compute. This is because in Axial-ViT models, each Transformer block with global self-attention is replaced by two Axial Transformer blocks, one with row and one with column self-attention, and although the sequence length that self-attention operates on is smaller in the axial case, there is an extra MLP per Axial-ViT block. For the AxialResNet, although it looks reasonable in terms of accuracy/compute trade-off (Figure 13, left), the naive implementation is extremely slow on TPUs (Figure 13, right).

![Figure 13](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028360135.webp)

*Figure 13: Performance of Axial-Attention based models, in terms of top-1 accuracy on ImageNet 5-shot linear, versus their speed in terms of number of FLOPs (left) and inference time (left).*

> 💡 **Figure 13 批读**: Axial-ViT 精度更高但计算更多；把一次全局 block 换成 row 与 column 两个 block 后，较短的注意力序列并未抵消额外 MLP 的成本。AxialResNet 在 FLOPs 轴上看似合理，真实 TPU 吞吐却很差，说明稀疏或分解算子的理论复杂度只有在实现充分优化后才能兑现。原 caption 把第二个面板也写成 “left”，这是论文原文笔误；图中右面板横轴实际是 peak inference speed。

> 🧭 **D.6 小结**: 轴向分解改变了计算路径，却不是自动的效率提升。评估替代注意力时必须同时报告精度、FLOPs、实测延迟和内存，而不能只比较渐近复杂度。

### D.7 ATTENTION DISTANCE

> 💡 **D.7 要点预览**: 低层不同 head 同时覆盖局部与全局，深层则普遍扩大感受范围。

To understand how ViT uses self-attention to integrate information across the image, we analyzed the average distance spanned by attention weights at different layers (Figure 11). This “attention distance” is analogous to receptive field size in CNNs. Average attention distance is highly variable across heads in lower layers, with some heads attending to much of the image, while others attend to small regions at or near the query location. As depth increases, attention distance increases for all heads. In the second half of the network, most heads attend widely across tokens.

![Figure 11](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028365941.webp)

*Figure 11: Size of attended area by head and network depth. Attention distance was computed for 128 example images by averaging the distance between the query pixel and all other pixels, weighted by the attention weight. Each dot shows the mean attention distance across images for one of 16 heads at one layer. Image width is 224 pixels.*

> 💡 **Figure 11 批读**: 每个点对应一个 head 在 128 张图像上的平均注意距离。低层同时存在局部与全局 head，深层大多走向全局；hybrid 的卷积 stem 已承担部分局部建模，因此其早期 attention 更少表现出极短距离。该指标描述信息聚合范围，但不直接等于某个 head 对预测的因果贡献。

> 🧭 **D.7 小结**: ViT 并非从第一层起所有 head 都全局平均，而是自发形成局部—全局分工，并随深度扩大整合范围。这为“模型从数据中学习卷积式局部性”提供了行为证据，但仍不是机制上的唯一解释。

### D.8 ATTENTION MAPS

> 💡 **D.8 要点预览**: Attention Rollout 通过逐层矩阵连乘追踪 class token 对输入 patch 的累计影响。

To compute maps of the attention from the output token to the input space (Figures 6 and 14), we used Attention Rollout (Abnar & Zuidema, 2020). Briefly, we averaged attention weights of ViT-L/16 across all heads and then recursively multiplied the weight matrices of all layers. This accounts for the mixing of attention across tokens through all layers.

> 💡 **批注**: Rollout 比只看最后一层注意力更合理，因为它累计了中间层 token 混合路径；但它仍不是严格因果解释。

![Figure 14](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028370835.webp)

*Figure 14: Further example attention maps as in Figure 6 (random selection).*

> 💡 **Figure 14 批读**: 随机样例继续显示 rollout 高响应区域常与物体主体重合，说明 class token 聚合具有一定空间选择性。图像只提供定性案例，且 head averaging 与矩阵连乘都会抹平路径差异，因此不能把热区直接解释为模型的完整决策依据。

### D.9 OBJECTNET RESULTS

> 💡 **D.9 要点预览**: ObjectNet 用分布外物体图像检验旗舰模型的鲁棒性。

We also evaluate our flagship ViT-H/14 model on the ObjectNet benchmark following the evaluation setup in Kolesnikov et al. (2020), resulting in 82.1% top-5 accuracy and 61.7% top-1 accuracy.

> 💡 **结果解读**: ObjectNet 改变物体姿态、背景和成像方式，用于检验 ImageNet 分布外鲁棒性。61.7% top-1 说明大规模预训练带来一定迁移能力，但缺少同协议 CNN 对照和 in-distribution 差值，单个数字不足以证明 ViT 特别鲁棒。

### D.10 VTAB BREAKDOWN

> 💡 **D.10 要点预览**: 均值会掩盖任务差异，本表展示 ViT 在自然、专用与结构任务上的具体强弱。

Table 9 shows the scores attained on each of the VTAB-1k tasks.

![Table 9](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-07-14-1784028377943.webp)

*Table 9: Breakdown of VTAB-1k performance across tasks.*

> 💡 **Table 9 批读**: ViT-H 的 77.6 均值掩盖了巨大任务差异：Flowers102 为 99.7，而 sNORB-Azim 只有 33.2。自然图像与部分专用任务很强，结构推理和三维几何任务明显更弱；因此“平均领先”不能替代逐任务诊断。

### 🔖 Section 总结

附录 D 说明 ViT 的成功并不依赖某一个不可替代的技巧：Adam 只是公平且略优的基线选择，class token 可由调好学习率的 GAP 替代，多种位置编码在 patch-level 网格上接近。更关键的扩展轴是深度、token 密度与数据规模，而实际效率必须由硬件吞吐和内存验证。注意力距离与 rollout 提供了局部—全局分工的可视化证据，但这些统计和热图都不能单独充当因果解释。

#### 关键数字

| 消融 / 评估 | 结果 | 含义 |
|---|---:|---|
| ResNet50：Adam vs. SGD 平均 | 89.33 vs. 88.79 | Adam 略优，但幅度有限 |
| ResNet152x2：Adam vs. SGD 平均 | 94.01 vs. 93.72 | 支持公平基线，不代表普遍最优 |
| 无位置编码 vs. 默认 1D | 0.61382 vs. 0.64206 | “有无位置”比具体形式更重要 |
| ObjectNet ViT-H/14 | 61.7 top-1 / 82.1 top-5 | 有分布外能力，但缺少本节对照 |
| VTAB-1k ViT-H/14 | 77.6 mean | 任务间差异很大 |

#### 核心洞察

1. 消融必须连同优化超参数一起重调；否则 GAP、优化器或替代 attention 的失败可能只是配置不匹配。
2. 扩展 ViT 时，深度和更小 patch 通常比单纯加宽更有效，但它们分别带来优化难度和二次注意力成本。
3. 在 14×14 token 网格上，多种位置编码表达力相近；这一结论不应无条件外推到更高分辨率或密集预测。
4. FLOPs 不能替代吞吐与显存测量，轴向注意力正是理论复杂度与硬件效率分离的反例。
5. Attention distance 和 rollout 适合描述聚合范围与定性区域，不足以证明特定 token 或区域对预测具有因果作用。
