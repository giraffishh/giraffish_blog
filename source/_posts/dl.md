---
title: dl
date: 2026-11-12 12:01:00
updated: 2026-11-29 00:46:48
comments: true
---
## 4. Optimisation and regularisation*

### Batch gradient descent

### Stochastic gradient descent

### Mini-batch gradient descent

### Momentum

### Nesterov momentum

### Delta-bar-delta

### AdaGrad

### RMSProp

### adam

### L1 Regularisation

### L2 Regularisation

### Dataset Augmentation & Early Stopping & Dropout

### Weight Initialisation

#### Weight Asymmetricity：

权重初始化相同，输入相同，则梯度也相同，导致权重的值一直保持相同，相当于只有一个神经元在发挥作用

#### 随机初始化：

直接随机初始化，容易导致梯度消失 / 梯度爆炸

因此可以尽可能维持每一层输入和输出的方差一致

$$
\operatorname{Var}(h^{(l+1)})
\approx
\operatorname{Var}(h^{(l)})
$$

假设一个神经元有 \(m\) 个输入：
\[
z=w_1x_1+w_2x_2+\cdots+w_mx_m
\]

也就是：
\[
z=\sum_{i=1}^{m}w_ix_i
\]

假设权重与输入相互独立、均值为 0，各项之间也不相关，那么：
\[
\operatorname{Var}(z)
=m\operatorname{Var}(w)\operatorname{Var}(x)
\]

我们希望输出和输入的方差保持一致：
\[
\operatorname{Var}(z)=\operatorname{Var}(x)
\]

代入：

$$
m\operatorname{Var}(w)\operatorname{Var}(x)
=
\operatorname{Var}(x)
$$

消去相同的项：
\[
\operatorname{Var}(w)=\frac{1}{m}
\]

因此，权重的标准差应该为：
\[
\operatorname{Std}(w)=\sqrt{\frac{1}{m}}
\]
