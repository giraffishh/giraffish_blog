---
index_img: 'https://origin.picgo.net/2025/10/18/25-10-18-1760720908524d55fa73ad1d982f7.png'
banner_img: 'https://img.picgo.net/2025/03/28/25-03-28-17431514678427b2138c37794ab42.webp'
title: OpenClip_ConvNeXtv2Tiny_GPT2训练日记
categories:
  - 日记
tags:
  - 深度学习
  - 模型训练
  - 模型蒸馏
comments: true
abbrlink: e6729f2a
date: 2025-09-22 00:55:53
updated: 2025-10-18 01:56:51

---

**Github仓库：** https://github.com/giraffishh/open_clip_ConvNeXt_v2

***

**训练框架：** OpenClip（[Github仓库](https://github.com/mlfoundations/open_clip)）
**图像塔：** 预训练 ConvNeXt V2 Tiny（[Paper](https://arxiv.org/pdf/2301.00808)，[Code](https://github.com/facebookresearch/ConvNeXt-V2)）
**文本塔：** 预训练 GPT-2
**数据集：** Coco Caption（0.6M）

### 10.16 Day1

准备数据和模型权重和环境，忘写日记了（

### 10.17 Day2

用双L40试着训了一整天，调教失败，结果非常差！！眼睛都要瞎掉了(T_T)
先有clip官方文本塔（重头训练）收敛很慢，虽然一直在降loss和提高准确率，但最后R@1也只有0.01左右
后面尝试了**先冻结文本/图像塔，再自动逐步解冻**，效果更差，从第四个epoch开始涨loss一直发散，R@1不到0.01

还尝试下载DataComp12M的数据集，结果官方github仓库conda环境一直构建失败（？没招了我投降

* 修复1：batch_size不是越大越好！！不仅仅和显存/训练速度有关，还跟训练步数挂钩，一开始batch_size过大，导致步数本来就少，再加上warmup的步数过大，数据集很小，训完了还在warmup（雾
> chat老师给出了学习率 / warmup步数 / batchsize的经验公式，可供参考设置对应参数（我没仔细看，后面有空补hhh）

* 修复2：修复解冻时优化器直接重置导致学习不稳定，chat老师让加学习率缩放等抑制一下（明天试一下
* 修复3（**重要**）：日志里发现，原来一开始导入本地权重时（包括图像塔和文本塔）有大量权重出现 missing/unexpected keys 的“前缀不匹配”问题，就是导入的和实际用的对不上，导致其实模型大量权重都没正确导入，**关键是我把文本塔和图像塔在训练一开始就冻结了！！**，根本训练不到前面的层，所以才结果这么差，一下就发散。现在通过重映射正确导入权重了，期待重新训练的表现（孩子给你磕一个行了吧球球了）

今晚修复后训一个不冻结的，明天再训一个冻结/自动解冻的，对比实验一下，祝好