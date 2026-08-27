---
title: 卖柠檬雪糕的鱼
layout: about
comments: true
---
> To G.MiaGa,
> who has been, is, and always will be the love of my life
> 

***

欢迎来到Giraffish的博客

## 简介

Giraffish，坐标广东，南方科技大学，大三，计算机科学与工程

<img src="https://cdn.giraffish.top/github-metrics.svg" alt="Metrics" style="float: left;">

## 项目经历

### 基于扩散与流模型的眼动轨迹生成

**2026.8 - 至今**  
*Computational Linguistics and Consciousness Sciences Lab (CLCS), SUSTech*

- 面向基于 DDPM 的 ScanDL 2.0 的高采样开销及长文本建模难，探索生成加速、长序列眼动建模与跨数据集适配。
- 计划将原有 DDPM 采样流程改造为 DDIM，并基于 OneStop 眼动数据集微调预训练模型、扩展长文本建模能力，系统评估采样步数、生成质量与推理效率之间的权衡。
- 后续将进一步探索文本条件 Flow Matching 眼动生成模型，学习从简单先验分布到眼动轨迹分布的条件速度场，并通过 ODE 积分研究少步采样下的高效轨迹生成。

### 道路驾驶场景下的多模态视频文本检索与视频切片

**2026.6 - 2026.8**  
*Research Institute of Trustworthy Autonomous Systems (RITAS), SUSTech*

- 主要负责道路驾驶场景多模态检索与视频切片模型设计、训练与评测，基于 Qwen3-VL-Embedding 构建视频–文本双向检索系统，使用 InfoNCE 与 LoRA 进行微调，并实现 Qwen3-VL-Reranker Top-K 两阶段重排，初步两阶段实验在 168 个验证视频上取得 89.9% 的 Text-to-Video Recall@1 和 85.7% 的 Video-to-Text Recall@1。
- 通过轨迹增强多模态检索能力，设计基于 Transformer 的车辆轨迹编码器，将轨迹信息注入 Qwen 视觉 token hidden states，实现视觉、文本与车辆轨迹的三模态联合表征学习，并与 Qwen LoRA 进行多阶段的联合训练，在单阶段 embedding 检索设置下，将 Text-to-Video 和 Video-to-Text Recall@1 分别从 80.4%/80.4% 提升至 82.1%/81.5%（+1.7/+1.1）。
- 在视频文本检索之外，将模型扩展至 Text-to-Clip 视频切片任务，基于行为标签与时间邻域构造强正例、邻近正例及同类难负例进行 LoRA 微调，并通过相似度筛选与 Gap Filling 将相关帧聚合为连续片段；在固定评测子集上，mean temporal IoU 从 0.333 提升至 0.406（+21.9%），Frame-set Precision 从 42.7% 提升至 48.3%。

### 频域引导的轻量级小目标检测

**共同第一作者 · AAAI 在投 · [arXiv:2606.23825](https://arxiv.org/abs/2606.23825)** | **2025.12 - 2026.3**  
*Research Institute of Trustworthy Autonomous Systems (RITAS), SUSTech*

- 针对小目标在下采样、特征融合与定位回归过程中高频边界信息易衰减的问题，项目构建频域引导的特征表示框架，以 WDG、LGE 与 FDHead 分别在 backbone、neck 与 detection head 中进行频率感知建模。
- 主要负责将源自 CNN 检测器的频域增强模块适配至 RT-DETRv2 的 CNN–Transformer 混合检测流程：在 YOLO11 主干 P2/P3 阶段的 `C3k2_WDC` 块中实现 WDG，在 HybridEncoder 的 P4/S4（stride 16）输入投影后接入轻量化 LGE，并设计面向小目标的面积偏置 Top-K query selection，完成多尺度特征接口适配与跨数据集训练验证。
- 在 RT-DETR-R18/R50 上完成 VisDrone2019、UAVDT、TinyPerson 与 DOTAv1 跨数据集验证；其中 RT-DETR-R18+ 在 UAVDT val 上取得 **+7.5 mAP50**，同时参数量与 GFLOPs 分别降低 **31.3%** 与 **25.8%**，验证频域机制的跨架构泛化与轻量化能力。

### 基于知识蒸馏的视频文本检索

**2025.9 - 2025.11**  
*Research Institute of Trustworthy Autonomous Systems (RITAS), SUSTech*

- 面向视频–文本检索模型推理开销较高的问题，基于 TeachCLIP 搭建以 X-CLIP 等模型为教师、CLIP4Clip 为学生的蒸馏框架，通过帧级、视频级知识蒸馏与注意力帧特征聚合，将教师模型的细粒度跨模态对齐能力迁移至轻量学生模型。
- 主要负责将学生端 ViT 视觉编码器替换为 OpenCLIP 预训练 ConvNeXt，进一步压缩学生模型规模，完成模型接口封装、跨架构权重映射及注意力池化头适配；围绕全量微调、骨干冻结、渐进解冻和池化头优先对齐等策略开展消融实验，研究卷积视觉表征与 CLIP 共享嵌入空间的适配方式。

## 研究兴趣

- VLM、Multimodal Representation Learning、Video Understanding
- Diffusion Models、Flow Matching
- VLA（Action Chunking / Real-Time Inference）、World Models

## 专业技能

**视觉与多模态：** CNN、Transformer、ViT、ConvNeXt、CLIP、Contrastive Learning、Representation Learning  
**生成模型：** DDPM / DDIM、Flow Matching  
**机器学习与建模：** Supervised Learning、Ensembles、Clustering、Dimensionality Reduction、Time-Series Modeling  
**模型训练与优化：** LoRA Fine-tuning、Knowledge Distillation、Distributed Training  
**框架与工具：** PyTorch、Hugging Face、Python、Java、Linux、Slurm、Git、Conda、LaTeX
