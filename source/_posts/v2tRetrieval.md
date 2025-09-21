---
index_img: 'https://origin.picgo.net/2025/09/21/25-09-21-17584556830165f89cdc8dfd4716f.webp'
banner_img: 'https://cdn.giraffish.me/blog/25-05-31-1748684560329.webp'
title: Text-to-Video Retrieval
categories:
  - 学习笔记
tags:
  - 视频文本检索
  - 模型蒸馏
comments: true
abbrlink: 9d7503d7
date: 2025-09-22 00:55:53
updated: 2025-09-22 00:55:53
---

## CLIP

Learning Transferable Visual Models From Natural Language Supervision

* 论文链接：https://arxiv.org/pdf/2103.00020
* 代码仓库：https://github.com/OpenAI/CLIP

![](https://origin.picgo.net/2025/09/22/25-09-22-17584720224735adc63e5fb736e0c.webp)

### 核心架构组件

**图像编码器 (Image Encoder)：**

* **作用**：将输入的图像转换成一个数学向量（特征嵌入），这个向量代表了图像的内容
* **具体模型**：论文中测试了两种主流的架构 ：
  1. **ResNet-50**：一个经过改进的经典卷积神经网络（CNN）
  2. **Vision Transformer (ViT)**：一种更新的、基于 Transformer 的架构

**文本编码器 (Text Encoder)：**

- **作用**：将输入的文本片段转换成一个数学向量（特征嵌入），这个向量代表了文本的语义
- **具体模型**：一个标准的 **Transformer** 模型 。它使用一个大小为 49,152 的词汇表，并将文本序列的最大长度限制在 76 个词元（tokens） 

这两个编码器将图像和文本映射到一个共享的、多模态的嵌入空间中，使得相似概念的图像和文本在空间中的位置彼此靠近

### 训练过程：对比式预训练 (Contrastive Pre-training)

**对比学习**具体步骤如下:

1. **构建批次 (Batch)**：从数据集中随机抽取一批 `N` 个 (图像, 文本) 对 。例如，(图片A, "描述A")，(图片B, "描述B")，...，(图片N, "描述N")

2. **分别编码**：

   - `N`张图像被送入**图像编码器**，生成 `N` 个图像特征向量 (I1,I2,...,IN) 
   - `N` 段文本被送入**文本编码器**，生成 `N` 个文本特征向量 (T1,T2,...,TN) 

3. **计算相似度**：模型会计算这批次中**所有可能**的图像-文本对的相似度。对于 `N` 个图像和 `N` 个文本，总共有 N×N 种可能的配对组合 。相似度是通过计算图像向量和文本向量之间的**余弦相似度**来度量的 

4. **学习目标**：
   - **最大化** `N` 个**正确配对**（对角线上的 I1⋅T1, I2⋅T2 等）的余弦相似度 
   - **最小化** N2−N 个**错误配对**（所有非对角线上的组合，如 I1⋅T2, I2⋅T1 等）的余弦相似度 

### 应用：零样本预测 (Zero-Shot Prediction)

1. 拿来一张新的、需要分类的图片（例如，一张狗的图片）
2. 将这张图片送入**已经训练好的图像编码器**，生成一个图像特征向量 
3. 计算这个**图像向量**与文本经过**文本编码器**得到的**文本向量**（"A photo of a dog.", "A photo of a cat." 等）的**余弦相似度** 
4. 相似度分数最高的那个文本提示所对应的类别，就是模型的最终预测结果

## CLIP4Clip

CLIP4Clip: An Empirical Study of CLIP for End to End Video Clip Retrieval

* 论文链接：https://arxiv.org/pdf/2104.08860
* 代码仓库：https://github.com/ArrowLuo/CLIP4Clip

![](https://origin.picgo.net/2025/09/21/25-09-21-175845721249375a1b7357fd61bb0.webp)
