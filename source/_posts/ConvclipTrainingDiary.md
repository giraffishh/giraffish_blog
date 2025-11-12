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
date: 2025-10-18 01:56:57
updated: 2025-10-19 01:54:18

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

### 10.18 Day3

非冻结版本如下，感觉还没完全收敛，可以再训多几个epoch

参数：

```sh
torchrun --nproc_per_node=${NPROC} -m open_clip_train.main \
  --dataset-type csv \
  --train-data /lab/haoq_lab/cse12310520/open_clip_ConvNeXt_v2/data/coco/tsv/train2017.tsv \
  --val-data /lab/haoq_lab/cse12310520/open_clip_ConvNeXt_v2/data/coco/tsv/val2017.tsv \
  --csv-separator $'\t' \
  --csv-img-key filepath \
  --csv-caption-key title \
  --model convnextv2_tiny_gpt2-512 \
  --cache-dir /lab/haoq_lab/cse12310520/open_clip_ConvNeXt_v2/data/cache \
  --pretrained-image \
  --pretrained-image-path /lab/haoq_lab/cse12310520/open_clip_ConvNeXt_v2/data/weights/convnextv2_tiny/model.safetensors \
  --pretrained-text-path /lab/haoq_lab/cse12310520/open_clip_ConvNeXt_v2/data/weights/gpt2/model.safetensors \
  --batch-size 192 \
  --workers 14 \
  --epochs 26 \
  --lr 7.0e-4 --wd 0.2 \
  --precision amp \
  --grad-clip-norm 1.0 \
  --lr-scheduler cosine \
  --warmup 2200 \
  --name coco2017_convnextv2_tiny_gpt2_amp_cosine_bs192x2_nofreeze_lr7.0e-4_wu2.2k \
  --report-to tensorboard
```

结果：

```json
{"image_to_text_mean_rank": 142.5712, "image_to_text_median_rank": 17.0, "image_to_text_R@1": 0.08124, "image_to_text_R@5": 0.28268, "image_to_text_R@10": 0.405, "text_to_image_mean_rank": 149.28516, "text_to_image_median_rank": 17.0, "text_to_image_R@1": 0.05928, "text_to_image_R@5": 0.29392, "text_to_image_R@10": 0.41568, "clip_val_loss": 3.66436767578125, "epoch": 26, "num_samples": 25000}
```

然后发现解冻代码有问题，解冻后可训练参数没有增加，已经完成了修复

冻结/自动解冻版本如下

参数：

```sh
torchrun --nproc_per_node=${NPROC} -m open_clip_train.main \
  --dataset-type csv \
  --train-data /lab/haoq_lab/cse12310520/open_clip_ConvNeXt_v2/data/coco/tsv/train2017.tsv \
  --val-data /lab/haoq_lab/cse12310520/open_clip_ConvNeXt_v2/data/coco/tsv/val2017.tsv \
  --csv-separator $'\t' \
  --csv-img-key filepath \
  --csv-caption-key title \
  --model convnextv2_tiny_gpt2-512 \
  --pretrained '' \
  --pretrained-image \
  --pretrained-image-path /lab/haoq_lab/cse12310520/open_clip_ConvNeXt_v2/data/weights/convnextv2_tiny/model.safetensors \
  --pretrained-text-path /lab/haoq_lab/cse12310520/open_clip_ConvNeXt_v2/data/weights/gpt2/model.safetensors \
  --cache-dir /lab/haoq_lab/cse12310520/open_clip_ConvNeXt_v2/data/cache \
  --batch-size 192 \
  --workers 16 \
  --epochs 26 \
  --lr 7.0e-4 --wd 0.2 \
  --precision amp \
  --lock-text \
  --lock-image \
  --lock-image-freeze-bn-stats \
  --unfreeze-text-at-epoch 3 \
  --unlocked-text-layers 6 \
  --unfreeze-image-at-epoch 5 \
  --unlocked-image-groups 4 \
  --unfreeze-new-lr-scale 0.1 \
  --grad-clip-norm 1.0 \
  --lr-scheduler cosine \
  --warmup 2400 \
  --name coco2017_convnextv2_tiny_gpt2_amp_cosine_bs192x2_unf35_lr7e-4_wu2.4k \
  --report-to tensorboard
```

结果

```json
{"image_to_text_mean_rank": 60.8074, "image_to_text_median_rank": 12.0, "image_to_text_R@1": 0.09552, "image_to_text_R@5": 0.3426, "image_to_text_R@10": 0.47524, "text_to_image_mean_rank": 80.3688, "text_to_image_median_rank": 12.0, "text_to_image_R@1": 0.06896, "text_to_image_R@5": 0.34524, "text_to_image_R@10": 0.4762, "clip_val_loss": 2.912994623184204, "epoch": 26, "num_samples": 25000}
```

有一定提升（text2video R@1提升17.6%，video2text R@1提升16.3%），说明策略还是正确的

下一步将加入 ImageNet-1k 的 val 集合做 zero-shot 评估 并与其他基准进行对比

训练优化方向有继续调参（调整解冻策略，warmup步数，总epoch数），蒸馏，换大数据集（DataComp12M)