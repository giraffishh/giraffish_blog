---
title: 在 Linux 服务器中设置 v2ray 代理
comments: true
index_img: 'https://s1.imagehub.cc/images/2024/11/11/3fe7f27999a9761146e8719ad5639b5e.png'
abbrlink: 35f1330a
date: 2024-11-11 09:29:40
updated: 2025-03-28 17:20:56
---

> [v2ray 的手册 ](https://www.atzlinux.com/doc/v/v2ray/)

## 1. 安装 v2ray
```sh
sudo apt-get install v2ray
```

## 2. 设置`config.json`配置文件

### 2.1 提取配置文件

在电脑中安装 [v2rayN](https://github.com/2dust/v2rayN)

在`v2rayN`的`服务器`中导入订阅链接

选择一个节点 > 右键 > 导出所选服务器完整配置 然后就得到`config.json`配置文件

删除配置文件中`"dns"`一项，仅保留`"inbounds"`，`"inbounds"`两厢

### 2.2 导入配置文件

配置文件一般在目录`/etc/v2ray/config.json`中，删除里面的内容，并粘贴提取到的进去

> vim 中输入`gg`，`shift+v`，`shift+g`删除所有内容

### 2.3 测试配置文件

```sh
v2ray -test -config config.json
```

## 3. 启动 v2ray

```sh
# 启动V2ray
sudo systemctl start v2ray

# 检查V2ray状态
sudo systemctl status v2ray

# 设置V2ray开机自启动
sudo systemctl enable v2ray

# 取消设置V2ray开机自启动
sudo systemctl disable v2ray
```

### 设置代理

临时设置：

```sh
export http_proxy=http://127.0.0.1:10809
export https_proxy=http://127.0.0.1:10809
```

> 其中`10809`为v2ray监听端口

持续化设置则修改文件`/etc/profile`，在文件结束位置增加如下内容：

```sh
export http_proxy=http://127.0.0.1:10809
export https_proxy=http://127.0.0.1:10809
```

然后重启或执行命令`source /etc/profile`

检查端口连通性

```sh
nc -zv 127.0.0.1 10809
```

检查端口监听状态

```sh
lsof -i :10809
```

检查环境变量

```sh
echo $http_proxy
echo $https_proxy
```

检查代理

```sh
curl -v --proxy http://127.0.0.1:10809 https://www.google.com
```