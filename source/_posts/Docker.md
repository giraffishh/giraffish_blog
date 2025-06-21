---
title: win11安装Docker并使用阿里云镜像
comments: true
index_img: 'https://s1.imagehub.cc/images/2024/11/11/180e0a10f532121ae32a86b7c5ab0820.jpeg'
abbrlink: 806475f8
date: 2024-11-11 09:29:40
updated: 2025-03-28 17:20:56
---

## 📌 安装 Docker

下载安装[docker-for-windows](https://mirrors.aliyun.com/docker-toolbox/windows/docker-for-windows/?spm=a2c6h.25603864.0.0.62142767RbeKkn)（`Docker Desktop Installer.exe`和`InstallDocker.msi`都需要安装）

> 如果遇到 `Docker.ApiServices.WSL2.WslKernelUpdateNotInstalledException: 引发类型为“Docker.ApiServices.WSL2.WslKernelUpdateNotInstalledException”的异常。` 参考[旧版 WSL 的手动安装步骤](https://learn.microsoft.com/zh-cn/windows/wsl/install-manual#step-4---download-the-linux-kernel-update-package)中的步骤4，5进行更新

开通阿里云的[容器镜像服务 ACR](https://www.aliyun.com/product/acr?spm=5176.28508143.nav-dropdown-menu-0.18.2e24154aJ5PVwH&scm=20140722.X_data-fc74d748373cbc5db058._.V_1)

将阿里云 容器镜像服务 > 镜像工具 > 镜像加速器 中的加速器地址添加至Docker客户端的`Docker Engine`中

![2e16918057dd6c6624198dfe7b3e7fbe.jpeg](https://s1.imagehub.cc/images/2024/07/05/2e16918057dd6c6624198dfe7b3e7fbe.jpeg)

## 🛠️ 拉取Docker Hub上的镜像并推送至阿里云 ACR

1. 在阿里云个人实例中创建一个命名空间，并在访问凭证中设置密码
2. 登录阿里云ACR
```bash
docker login --username=<阿里云账号> registry.cn-<REGION>.aliyuncs.com
```
3. 拉取Docker Hub上的镜像
```bash
docker pull rustdesk/rustdesk-server
```
4. 重标记镜像
```bash
docker tag rustdesk/rustdesk-server registry-<REGION>.aliyuncs.com/<命名空间>/rustdesk-server:latest
```

> 为了将镜像推送到阿里云ACR，你需要给镜像打上ACR的标签

5. 推送镜像到阿里云ACR
```bash
docker push registry-<REGION>.aliyuncs.com/<命名空间>/rustdesk-server:latest
```
6. 在阿里云ACR中检查命名空间中是否有`rustdesk-server`镜像
