---
index_img: >-
  https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-04-22-1776790942253.webp
banner_img: >-
  https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/25-12-27-1766802296337.webp
title: CS305 Computer Networks
categories:
  - 学习笔记
tags:
  - 计算机网络
comments: true
typora-root-url: ..
abbrlink: 29d037f1
date: 2026-04-22 00:55:53
updated: 2026-06-18 00:47:09

---

## Introduction

**整体结构：**

![](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-04-22-1776830476296.webp)

![](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-04-22-1776832248853.webp)

> **ISP**: Internet Service Provider
>
> **IXP**: Internet exchange point

![](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-04-22-1776833051906.webp)

### Delay & Packet Loss

在分组交换网络中，一个 packet 从源主机到目的主机的过程中，不会立刻到达，而是会经历一系列时延（delay）；当路由器缓存区已满时，新到达的分组还可能被直接丢弃，这就是 packet loss

#### 1. Packet delay 的四个来源

对于某个节点（如路由器）来说，**nodal delay（节点时延）**通常可以分成四部分：

$$
d_{nodal} = d_{proc} + d_{queue} + d_{trans} + d_{prop}
$$

- **$d_{proc}$: processing delay（处理时延）**
  - 路由器检查分组首部、判断目的地址、检查比特错误等所花的时间。
  - 一般比较小，通常是微秒级。

- **$d_{queue}$: queueing delay（排队时延）**
  - 分组到达路由器后，如果输出链路正在忙，就要先在 buffer（缓冲区）里排队等待。
  - 它的大小最不稳定，和当前网络拥塞情况强相关。

- **$d_{trans}$: transmission delay（传输时延）**
  - 指把整个分组“推”到链路上所需要的时间。
  - 若分组长度为 $L$ bits，链路传输速率为 $R$ bps，则：

$$
d_{trans} = \frac{L}{R}
$$

- **$d_{prop}$: propagation delay（传播时延）**
  - 指信号在物理链路中传播所需的时间。
  - 若链路长度为 $d$，信号传播速度为 $s$，则：

$$
d_{prop} = \frac{d}{s}
$$

  - 在光纤或铜缆中，$s$ 通常约为 $2 \times 10^8$ m/s。

#### 2. Transmission delay vs. propagation delay

这两个概念特别容易混淆，但它们本质上完全不同。

- **Transmission delay** 关注的是：**数据有多长、链路发送得有多快**。
  - 分组越大（$L$ 越大），发送越慢。
  - 链路带宽越高（$R$ 越大），发送越快。

- **Propagation delay** 关注的是：**链路有多长、信号传播得有多快**。
  - 距离越远（$d$ 越大），传播越久。
  - 传播速度越快（$s$ 越大），传播越快。

可以这样理解：

- **传输时延** = “把整辆车开上高速入口要多久”
- **传播时延** = “车已经上路后，从这里开到下一个收费站要多久”

前者和**分组大小、带宽**有关，后者和**距离、介质传播速度**有关。

#### 3. Queueing delay

路由器转发分组时，输出链路同一时刻只能逐个发送 packet。如果多个分组在短时间内同时到达，而**到达速率暂时超过了输出链路容量**，后来的分组就只能先进入 buffer 排队等待，这就产生了 **queueing delay**。

所以：

- 链路空闲时，排队时延可能接近 0
- 网络繁忙时，排队时延会明显增大
- 当网络非常拥塞时，排队时延甚至可能成为总时延中最大的一部分

#### 4. Packet loss

路由器前面的 queue（也就是 buffer）容量是**有限**的，不可能无限排队。

当出现下面这种情况时：

- 分组持续到达
- 输出链路来不及发送
- buffer 已经被占满

那么，新到达的 packet 就无法继续进入队列，只能被直接丢弃，这就是 **packet loss**。

也就是说：

- **有空余 buffer** → 分组进入队列，产生排队时延
- **没有空余 buffer** → 分组被丢弃，产生丢包

### TCP/IP五层模型

![](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-04-22-1776828187581.webp)

#### 1. 应用层 (Application Layer)

这一层直接面向用户或应用程序，是网络服务与最终用户之间的接口

- **功能：** 定义了应用程序如何通过网络进行通信
- **主要协议：** **HTTP** (网页浏览)、**FTP** (文件传输)、**SMTP** (邮件)、**DNS** (域名解析)
- **数据单位：** 报文 (Message)

#### 2. 传输层 (Transport Layer)

负责主机中两个**进程**之间的逻辑通信（端到端通信）

- **功能：** 提供可靠（TCP）或不可靠（UDP）的数据传输、错误检测及流量控制
- **主要协议：**
  - **TCP** (面向连接，可靠，如网页下载)
  - **UDP** (无连接，快速，如视频直播)
- **数据单位：** 段 (Segment)

#### 3. 网络层 (Network Layer)

负责将数据包从源主机路由到目的主机（点到点通信）

- **功能：** 选择合适的路由路径，进行逻辑地址（IP地址）的寻址
- **主要协议：** **IP** (IPv4/IPv6)、**ICMP** (如ping命令)、**ARP** (地址解析)
- **核心设备：** 路由器
- **数据单位：** 包 / 数据报 (Packet / Datagram)

#### 4. 数据链路层 (Data Link Layer)

负责在相邻节点（如两台连接在同一交换机上的电脑）之间传输数据

- **功能：** 将网络层的数据组装成帧，处理物理地址（MAC地址），进行差错检测
- **主要技术：** 以太网 (Ethernet)、Wi-Fi
- **核心设备：** 交换机、网桥
- **数据单位：** 帧 (Frame)

#### 5. 物理层 (Physical Layer)

最底层，负责在物理媒体上传输原始的比特流

- **功能：** 定义电压、接口规范、电缆类型及传输速率等物理特性
- **传输媒介：** 光纤、双绞线（网线）、无线电波
- **核心设备：** 集线器 (Hub)、中继器
- **数据单位：** 比特 (Bit)


>**封装与解封装示例**
>
>假设你要向服务器发送一条最简单的指令：“给我看你的首页”。我们来看看这条指令是如何被**包装（封装）**，然后在服务器端被**拆包（解封装）**的。
>
>第一阶段：你的手机（发送端）开始“包装”
>
>**1. 应用层 (Application Layer)**
>
>- **动作：** 浏览器生成了一段 HTTP 请求报文，内容大意是：`GET / HTTP/1.1`（意思是：我要获取首页内容）。
>- **当前状态：** 这就是纯粹的 **【原始数据】**。
>
>**2. 传输层 (Transport Layer)**
>
>- **动作：** 传输层的 TCP 协议接手，给这段数据前面加上了一个 **TCP头部 (TCP Header)**。这个头部里写明了：
>  - 源端口：54321（你手机浏览器临时开的门）
>  - 目的端口：80 或 443（网页服务器专门接客的门）
>- **当前状态：** `[TCP头部] + [原始数据]` = **【TCP 段 (Segment)】**。
>
>**3. 网络层 (Network Layer)**
>
>- **动作：** 数据交给了网络层的 IP 协议。IP 协议在前面又加了一个 **IP头部 (IP Header)**。这里面写明了最关键的导航信息：
>  - 源 IP：192.168.1.5（你手机的IP）
>  - 目的 IP：93.184.216.34（[https://www.google.com/search?q=example.com](https://www.google.com/search?q=example.com&authuser=1) 服务器的IP）
>- **当前状态：** `[IP头部] + [TCP头部] + [原始数据]` = **【IP 包 (Packet)】**。
>
>**4. 数据链路层 (Data Link Layer)**
>
>- **动作：** 数据要通过家里的 Wi-Fi 发给路由器，所以加上了 **MAC头部 (MAC Header)** 和一个用于校验的尾部。头部写明了：
>  - 源 MAC：你手机网卡的物理地址
>  - 目的 MAC：家里路由器的物理地址（注意：这里不是直接填服务器的MAC，而是填下一个中转站的MAC）
>- **当前状态：** `[MAC头部] + [IP头部] + [TCP头部] + [原始数据] + [校验尾部]` = **【数据帧 (Frame)】**。
>
>**5. 物理层 (Physical Layer)**
>
>- **动作：** 手机的天线将上面这一长串由 0 和 1 组成的【数据帧】，转换成无线电波（Wi-Fi信号），发射给路由器。光猫再将其转为光信号，顺着海底光缆一路狂奔，最终到达服务器所在的机房。
>
>------
>
>第二阶段：服务器（接收端）开始“拆包”
>
>现在，这段包含着层层包装的电信号到达了 [https://www.google.com/search?q=example.com](https://www.google.com/search?q=example.com&authuser=1) 的服务器。
>
>**1. 物理层**
>
>- **动作：** 服务器的网卡接收到光电信号，将其还原成 0 和 1 的数字序列（就是发送端打包好的那个【数据帧】）。
>
>**2. 数据链路层**
>
>- **动作：** 服务器检查 **MAC头部**，发现目的 MAC 地址确实是自己的网卡。于是它把 MAC头部 和 校验尾部 撕掉（拆掉最外层纸箱）。
>- **结果：** 露出了里面的 **【IP 包】**，交给上一层。
>
>**3. 网络层**
>
>- **动作：** 服务器检查 **IP头部**，看到目的 IP 确实是自己的地址（93.184.216.34）。它确认这包裹没送错，于是把 IP头部 撕掉（拆掉快递大单）。
>- **结果：** 露出了里面的 **【TCP 段】**，交给上一层。
>
>**4. 传输层**
>
>- **动作：** 服务器检查 **TCP头部**，看到目的端口是 80/443。它心想：“哦，这是找 Web 网站程序的，不是找邮件程序的。” 于是它把 TCP头部 撕掉（拆掉内包装），将剩下的东西从 80/443 端口递进去。
>- **结果：** 终于露出了最核心的 **【原始数据】**。
>
>**5. 应用层**
>
>- **动作：** Web 服务器软件（比如 Nginx 或 Apache）接到了 `GET / HTTP/1.1` 这条指令。它读懂了，立刻把自己的网页文件打包，按同样的流程**反向封装**，一层层套上外壳，最终发回给你的手机。

## Application Layer 应用层

应用层（Application Layer）直接面向网络应用，为运行在不同主机上的进程提供通信规则。

这一层最核心的问题有两个：

- 应用程序之间如何组织通信
- 应用需要底层传输层提供什么样的服务

### Principles of Network Applications

#### 1. Client-Server 模式

在 **Client-Server（客户机-服务器）** 架构中，通信双方角色比较明确：

- **Server**
  - 长时间在线（always-on）
  - 通常具有固定 IP 地址
  - 常部署在数据中心中，便于扩展和统一管理
- **Client**
  - 主动向 server 发起请求
  - 可能间歇性联网
  - IP 地址可能是动态分配的
  - 客户端之间通常不直接通信

典型例子：

- Web（HTTP）
- 文件传输（FTP）
- 邮件访问（IMAP）

比如我们访问一个网页时，本质上就是浏览器作为 client 向 Web server 请求资源。

如果从 **file distribution** 的角度看，假设：

- 文件大小为 $F$
- 需要分发给 $N$ 个客户端
- server 上传速率为 $u_s$
- 最慢客户端的下载速率为 $d_{min}$

那么在 **client-server** 模型中，分发时间下界为：

$$
D_{c-s} \ge \max\left\{\frac{NF}{u_s},\frac{F}{d_{min}}\right\}
$$

它的直觉是：

- server 必须总共上传 $N$ 份文件，所以至少需要 $\frac{NF}{u_s}$
- 每个 client 都要完整下载一份文件，而最慢的那个至少需要 $\frac{F}{d_{min}}$

因此 client-server 的分发时间通常会随着 $N$ 线性增长。

#### 2. P2P 模式

在 **P2P（Peer-to-Peer）** 架构中，没有一个始终在线的中心服务器，任意端系统都可以直接相互通信。

和 Client-Server 不同，P2P 中的每个 **peer（对等方）** 不只是“请求者”，也可能同时是“提供者”。也就是说，一个节点一边从别人那里获取资源，一边也把自己拥有的资源分享给别人。

P2P 的特点是：

- 没有 always-on server
- 每个 peer 既可能请求服务，也可能提供服务
- 新节点加入时，不仅会带来新的需求，也会带来新的服务能力
- 节点经常上下线，IP 地址也可能变化
- 管理更复杂

典型例子：

- P2P 文件共享
- BitTorrent
- 某些 VoIP / 流媒体系统

P2P 的一个关键优势是 **self-scalability（自扩展性）**：参与者越多，系统整体可提供的资源也可能越多。

如果仍然从 **file distribution** 的角度看，假设：

- 文件大小为 $F$
- 需要分发给 $N$ 个 peers
- server 上传速率为 $u_s$
- 最慢 peer 的下载速率为 $d_{min}$
- 第 $i$ 个 peer 的上传速率为 $u_i$

那么在 **P2P** 模型中，分发时间下界为：

$$
D_{P2P} \ge \max\left\{\frac{F}{u_s},\frac{F}{d_{min}},\frac{NF}{u_s + \sum u_i}\right\}
$$

这三个下界分别对应：

- server 至少要先上传出一份完整文件：$\frac{F}{u_s}$
- 最慢的 peer 至少要花 $\frac{F}{d_{min}}$ 才能下完
- 整个系统总共要向所有 peers 分发 $NF$ 的数据量，而总上传能力是 $u_s + \sum u_i$

这也解释了为什么 P2P 在用户增多时不一定更慢：

- $N$ 增大时，总需求确实变大
- 但每个新加入的 peer 也会带来新的上传能力

所以相比 client-server，P2P 的扩展性通常更好。

> **BitTorrent** 是最典型的 P2P 文件分发系统之一。
>
> 它的基本思路是：
>
> - 一个文件会被切成很多 **chunks（块）**
> - 一个 **torrent** 就是一组正在交换同一文件块的 peers
> - 新加入的 peer 会先从 **tracker** 获得当前可连接的 peers 列表
> - 然后与其中一部分 neighbors 建立连接，开始交换文件块
>
> BitTorrent 的特点是：
>
> - peer 刚加入时手里没有 chunk，但会逐渐从别人那里下载到一些块
> - 在下载的同时，它也会把已经拿到的块上传给别人
> - peer 之间连接关系可以动态变化
> - 系统中存在 **churn**，也就是节点不断加入和离开
>
> 因此，BitTorrent 很好地体现了 P2P 的核心思想：
>
> - 没有一个中心服务器负责全部传输
> - 资源分发能力来自整个 peer 群体
> - 用户越多，系统整体分发能力不一定越差，反而可能更强
>

#### 3. Processes communicating

- 同一台主机内的两个进程通信，通常由操作系统提供的 **inter-process communication（IPC）** 完成
- 不同主机上的进程通信，则是通过网络交换 **messages（报文）** 完成

在应用层中通常有两个概念：

- **client process**：主动发起通信的进程
- **server process**：等待被联系的进程

> 即使是在 P2P 应用中，也仍然会出现“主动发起方”和“被联系方”，所以 client process 和 server process 这两个角色依然存在。

#### 4. Addressing Processes

如果一个进程想接收消息，它必须要有可识别的地址。

仅有主机的 IP 地址还不够，因为：

- 一台主机上可以同时运行多个进程
- 网络必须知道“这台主机上的哪一个进程”才是目标

所以，一个进程的标识通常由两部分组成：

- **IP address**：标识主机
- **Port number**：标识主机中的具体进程

例如，几个常考的默认端口号包括：

- **FTP**：21
- **DNS**：53
- **HTTP**：80
- **HTTPS**：443
- **SMTP**：25

也就是说，发送 HTTP 请求时，真正的目标不是“某台机器”，而是“某台机器上的 80 号端口对应的进程”

### Web 和 HTTP

#### 1. Web 基础

Web page（网页）通常不是由单个文件组成的，而是由多个 **objects（对象）** 组成，例如：

- 一个基础 HTML 文件
- 多张图片
- CSS 文件
- JavaScript 文件
- 音频、视频等资源

其中，基础 HTML 文件里会引用其他对象，浏览器拿到 HTML 后，会继续请求这些被引用的资源，最终拼成我们看到的完整网页。

每个对象都可以通过 **URL（Uniform Resource Locator，统一资源定位符）** 来定位。

一个典型 URL 可以写成：

```text
www.someschool.edu/someDept/pic.gif
```

它通常可以理解为：

- `www.someschool.edu`：主机名（host name）
- `/someDept/pic.gif`：路径名（path name）

#### 2. HTTP 协议概述

**HTTP（HyperText Transfer Protocol）** 是 Web 的应用层协议

它采用 **client/server** 模式：

- **client**：通常是浏览器，负责请求、接收并显示 Web 对象
- **server**：通常是 Web 服务器，负责响应请求并返回对象

HTTP 的几个核心特点：

- **基于 TCP**
  - 客户端先与服务器建立 TCP 连接
  - 然后通过这个连接交换 HTTP 报文
- **无状态（stateless）**
  - 服务器默认不会记录之前客户端发过什么请求
  - 每次请求都被视作相对独立的一次交互

无状态设计的好处是简单、易扩展，但缺点是如果应用需要“记住用户”，就必须额外引入机制，例如 cookies

#### 3. HTTP 连接类型

HTTP 连接主要有两种形式。

**非持久连接（Non-persistent HTTP, HTTP/1.0）**

特点：

1. 建立一个 TCP 连接
2. 最多传输一个对象
3. 传完后立即关闭连接

如果一个网页里有很多对象，那浏览器就需要建立很多次 TCP 连接,每获取一个对象，响应时间大致为：

$$
2 \text{RTT} + \text{文件传输时间}
$$

其中：

- 第一个 RTT 用来建立 TCP 连接
- 第二个 RTT 用来发送 HTTP 请求并收到响应的前几个字节

所以非持久连接的缺点很明显：

- 每个对象都要额外付出连接建立成本
- 对操作系统和服务器的开销较大
- 对包含很多小对象的网页效率较低

**持久连接（Persistent HTTP, HTTP/1.1）**

特点：

- TCP 连接建立后不会立刻关闭
- 同一个 client 和 server 之间可以通过一个连接传输多个对象

优点：

- 减少重复建连带来的 RTT 开销
- 减少服务器和操作系统的连接管理开销
- 页面中多个对象可以更快完成传输

所以，HTTP/1.1 相比 HTTP/1.0 的一个重要改进就是默认支持**持久连接**

#### 4. HTTP 请求报文（Request Message）

HTTP 有两类基本报文：

- **request message**
- **response message**

HTTP 请求报文通常是 **ASCII 可读文本格式**，由三部分构成：

- 请求行（request line）
- 首部行（header lines）
- 可选的消息体（body）

一个简化示例如下：

```http
GET /index.html HTTP/1.1
Host: www-net.cs.umass.edu
User-Agent: Firefox
Accept: text/html
Connection: keep-alive
```

其中请求行包含三部分：

- **方法（method）**
- **URL**
- **HTTP 版本**

常见方法包括：

- **GET**：请求获取资源
- **POST**：向服务器提交数据，数据通常放在 body 中
- **HEAD**：只请求响应头，不要响应体
- **PUT**：上传资源，并替换指定 URL 对应的内容

补充一点：

- GET 也可以把数据附在 URL 后面，例如查询参数
- POST 更常用于提交表单、上传数据等场景

#### 5. HTTP 响应报文（Response Message）

HTTP 响应报文通常由三部分组成：

- 状态行（status line）
- 首部行（header lines）
- 响应体（body）

例如：

```http
HTTP/1.1 200 OK
Date: Sun, 26 Sep 2010 20:09:20 GMT
Server: Apache/2.0.52
Content-Length: 2652
Content-Type: text/html

<data>
```

状态行中最重要的是 **status code（状态码）**。

常见状态码包括：

- **200 OK**：请求成功
- **204 No Content**：请求成功，但响应体中没有内容
- **301 Moved Permanently**：资源已永久移动，新位置通常写在 `Location` 字段里
- **302 Found**：资源临时被转移到其他位置
- **304 Not Modified**：资源未修改，客户端可以继续使用缓存版本
- **400 Bad Request**：请求格式错误，服务器无法理解
- **401 Unauthorized**：请求需要身份认证，常见于未登录或 token 失效
- **403 Forbidden**：服务器理解了请求，但拒绝提供访问权限
- **404 Not Found**：请求的资源不存在
- **429 Too Many Requests**：客户端在短时间内发出了过多请求，触发了限流
- **500 Internal Server Error**：服务器内部发生错误
- **502 Bad Gateway**：网关或代理从上游服务器收到了无效响应
- **503 Service Unavailable**：服务器暂时无法处理请求，常见于过载或维护中
- **505 HTTP Version Not Supported**：服务器不支持该 HTTP 版本

#### 6. Cookies

HTTP 本身是无状态的，但很多网站又需要记住一些东西，这时就需要 **cookies**

Cookies 机制通常包含四个部分：

1. HTTP 响应报文中的 cookie 首部
2. 后续 HTTP 请求报文中的 cookie 首部
3. 浏览器保存在本地的 cookie 文件
4. 网站后端数据库中与 cookie 对应的状态记录

一个典型过程是：

- 用户第一次访问网站
- 网站生成一个唯一标识 ID
- 服务器把这个 ID 通过 `Set-Cookie` 发给浏览器
- 浏览器保存下来
- 之后再次访问该网站时，浏览器会自动带上该 cookie
- 网站据此识别用户并查出对应状态

也就是说，**cookie 本质上是在“无状态协议”之上附加状态信息的一种机制**。

不过 cookie 也带来了隐私问题，尤其是第三方追踪 cookie 可能会跨多个网站追踪用户行为

#### 7. Web Cache（代理缓存）

**Web cache（Web 缓存，也叫 proxy server）** 的目标是：

> 在不联系源服务器（origin server）的情况下，尽量直接满足客户端请求

工作过程通常如下：

- 浏览器先把请求发给 cache
- 如果 cache 里已经有该对象，就直接返回给客户端
- 如果没有，cache 再向 origin server 请求
- 收到对象后，一边转发给客户端，一边把对象缓存下来

Web cache 的好处：

- **降低用户响应时间**
  - 因为缓存通常离用户更近
- **减少机构出口链路上的流量**
  - 尤其在学校、公司、ISP 场景中很常见
- **减轻源服务器压力**
- **帮助内容分发**
  - 即使源站能力一般，也能通过缓存提升服务效果

而且 cache 在角色上很有意思：

- 对客户端来说，它是 server
- 对源服务器来说，它又是 client

#### 8. Conditional GET

有时候 cache 中其实已经有某个对象，但不确定它是不是最新版本。这时可以使用 **Conditional GET（条件 GET）**。

其目标是：

- 如果缓存副本还是最新的，就不要重复传输对象本体
- 从而减少流量和延迟

典型做法是客户端或缓存发送：

```http
If-Modified-Since: <date>
```

然后服务器判断：

- 如果资源在这个时间之后**没有变化**，返回：

```http
304 Not Modified
```

  此时不发送对象内容

- 如果资源已经更新，就返回正常的：

```http
200 OK
```

  并附带最新对象内容

这是一种非常经典的“避免不必要传输”的优化手段。

#### 9. HTTP/2 与 HTTP/3

HTTP/1.1 已经通过持久连接减少了不少开销，但仍然存在问题，特别是在一个页面要加载很多对象时。

**HTTP/1.1 的问题**


HTTP/1.1 虽然支持在一个 TCP 连接中传多个对象，但服务器常常仍按顺序响应请求。这会带来一个经典问题：

- **HOL blocking（Head-of-Line Blocking，队头阻塞）**

也就是说：

- 如果前面一个大对象传得很慢
- 后面的小对象即使很小，也得在后面排队等

**HTTP/2 的改进**


HTTP/2 的核心目标是：**减少多对象请求时的延迟**

它保留了很多 HTTP/1.1 的语义（如方法、状态码、许多首部字段），但在传输方式上做了改进：

- 可以按客户端指定的优先级安排对象发送顺序
- 支持 server push（向客户端主动推送部分资源）
- 把对象拆成更小的 **frame（帧）**
- 允许不同对象的 frame 交错发送

这样做的好处是：

- 小对象不必一直卡在大对象后面
- 可以缓解 HOL blocking
- 页面整体加载延迟更低

**HTTP/3 的进一步发展**


HTTP/2 仍然跑在单条 TCP 连接之上，所以如果底层出现丢包，TCP 的重传机制依然可能拖慢整条连接上的所有对象传输。

因此 HTTP/3 进一步向前发展：

- 基于 UDP 之上的新机制来传输
- 增强安全性
- 改进多对象并发传输时的表现
- 进一步减少由丢包带来的整体阻塞问题

可以简单理解为：

- **HTTP/1.1**：解决“重复建连太慢”的问题
- **HTTP/2**：解决“多对象顺序传输效率低”的问题
- **HTTP/3**：继续解决“底层传输阻塞影响整条连接”的问题

### E-mail, SMTP, IMAP

电子邮件系统（E-mail）也是一个典型的应用层应用。它看起来只是“发信、收信”，但背后其实由多个组件共同完成。

一个典型的电子邮件系统主要包含三部分：

- **User Agent（用户代理）**
- **Mail Server（邮件服务器）**
- **SMTP（Simple Mail Transfer Protocol）**

#### 1. User Agent（用户代理）

User Agent 也常被叫做 **mail reader（邮件客户端）**，它是用户直接接触的那一层

它通常负责：

- 编写邮件（compose）
- 编辑邮件（edit）
- 阅读邮件（read）
- 管理收件箱中的邮件

对用户来说，邮件像是“存在本地应用里”；但从系统角度看，邮件通常是保存在邮件服务器上的，客户端只是负责展示、发送和同步。

#### 2. Mail Server（邮件服务器）

邮件服务器在整个邮件系统中起的是“中转站 + 存储中心”的作用。

它通常包含两个关键部分：

- **mailbox（邮箱）**：保存用户收到的邮件
- **message queue（消息队列）**：保存准备发出的邮件

也就是说：

- 收到的邮件先进入对应用户的 mailbox
- 要发出去的邮件会先进入 outgoing message queue，等待发送

邮件服务器之间并不是直接“共享邮箱”，而是通过协议把邮件从一个服务器传到另一个服务器。

#### 3. 邮件发送的基本过程

以 “Alice 给 Bob 发邮件” 为例，整个过程可以理解为：

1. Alice 在自己的 User Agent 中编写邮件
2. Alice 的 User Agent 把邮件提交给 Alice 所在的 mail server（SMTP）
3. 该邮件先进入发送方服务器的 **message queue**
4. Alice 的 mail server 作为 **SMTP client**，与 Bob 的 mail server 建立 TCP 连接
5. 发送方服务器通过 SMTP 把邮件传给接收方服务器
6. Bob 的 mail server 收到后，把邮件放入 Bob 的 **mailbox**
7. Bob 再通过自己的邮件客户端读取这封邮件

![](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-04-22-1776845515414.webp)

#### 4. SMTP 协议

**SMTP（Simple Mail Transfer Protocol）** 是电子邮件发送时最核心的应用层协议，主要用于：

- 把邮件从发送方用户代理提交到发送方邮件服务器
- 把邮件从一个邮件服务器传送到另一个邮件服务器

SMTP 的特点包括：

- **基于 TCP**，使用可靠传输
- 默认服务器端口是 **25**
- 通常采用 **push（推送）** 方式发送邮件
- 采用 **command / response（命令 / 响应）** 的交互形式

SMTP 传输大致分为三个阶段：

1. **handshaking**：双方打招呼，建立会话
2. **message transfer**：发送邮件内容
3. **closure**：关闭连接

一个典型的 SMTP 交互示意如下：

```text
S: 220 hamburger.edu
C: HELO crepes.fr
S: 250 Hello crepes.fr
C: MAIL FROM: <alice@crepes.fr>
S: 250 Sender ok
C: RCPT TO: <bob@hamburger.edu>
S: 250 Recipient ok
C: DATA
S: 354 Enter mail, end with "." on a line by itself
C: Do you like ketchup?
C: How about pickles?
C: .
S: 250 Message accepted for delivery
C: QUIT
S: 221 closing connection
```

从中可以看出：

- 命令通常是 ASCII 文本
- 响应通常包含 **状态码 + 描述语句**
- 行为风格和 HTTP 有点像，但用途不同

#### 5. IMAP 协议

**IMAP（Internet Mail Access Protocol）** 是常见的邮件访问协议之一。

它的核心思想是：**邮件保存在服务器上，客户端按需访问和管理这些邮件**。

IMAP 通常支持：

- 从服务器读取邮件
- 删除邮件
- 在服务器上组织文件夹
- 多设备之间同步邮件状态

这意味着：

- 你在电脑上把一封邮件标为已读
- 手机上通常也会同步看到它已经是已读状态

因为真正的状态保存在服务器端，而不是只保存在某一台本地设备上。

### DNS

DNS（Domain Name System，域名系统），可以理解为互联网中的“电话簿”或“名字到地址的翻译系统”

人更容易记住像 `www.amazon.com` 这样的名字，但网络层真正用来转发数据报的是 IP 地址。所以 DNS 的核心任务就是：

- 把 **hostname** 翻译成 **IP address**

- host aliasing（主机别名）
  - 一个主机可能有更易读的别名
  - 真实名字叫做 canonical name（规范名称）
- mail server aliasing（邮件服务器别名）
- load distribution**（**负载分配**）**
  - 一个域名可以对应多个 IP 地址
  - DNS 可以返回不同地址，把流量分摊到多台服务器上

#### 1. DNS 的层次结构

> 请求使用 both UDP 和 TCP

DNS 本质上是一个分布式数据库，由很多 name server 共同组成，整体上呈树状层次结构

典型层次可以理解为：

- **Root DNS servers（根域名服务器）**
- **TLD servers（顶级域服务器）**
  - 例如 `.com`、`.org`、`.cn`
- **Authoritative DNS servers（权威域名服务器）**
  - 负责某个具体组织或域名下的记录

例如客户端想查询 `www.amazon.com` 的 IP 地址，可以粗略理解为这样几步：

1. 先问 root server：`.com` 应该去找谁
2. 再问 `.com` TLD server：`amazon.com` 应该去找谁
3. 再问 `amazon.com` 的 authoritative server：`www.amazon.com` 对应哪个 IP

也就是说，DNS 查询通常而是沿着层次结构一步步找答案

#### 2. Root、TLD、Authoritative 的分工

**Root name servers**

根服务器是整个 DNS 体系最顶层的入口。它们未必直接知道某个主机名的最终 IP，但知道“下一步该去问谁”。

特点：

- 当其他 name server 无法继续解析时，root server 是最终的指引入口
- 由 ICANN 统一管理根域体系
- 全球有 13 个逻辑根服务器标识，但每个都在全球多地做了复制部署

**TLD servers**

TLD（Top-Level Domain）服务器负责顶级域，例如：

- `.com`
- `.org`
- `.net`
- `.edu`
- 国家和地区顶级域，如 `.cn`、`.uk`、`.jp`

它们负责告诉查询方：某个具体域名的权威服务器在哪里。

**Authoritative DNS servers**

权威服务器保存某个组织真正拥有和维护的 DNS 记录，例如：

- `www.example.com` 对应哪个 IP
- 该域名的邮件服务器是谁

它给出的结果才是对该域名最权威的答案。

#### 3. Local DNS Server

除了层次结构中的 root / TLD / authoritative server，现实中还有一个非常常见的角色：**local DNS server**（本地域名服务器）

它通常：

- 由 ISP、公司、学校等提供
- 也叫 **default name server**
- 是主机发起 DNS 查询时最先接触的服务器

它有两个重要作用：

- **代理（proxy）**：代替客户端去层次结构中继续查询
- **缓存（cache）**：保存最近查过的域名结果

所以用户设备平时并不是直接去问 root server，而是先问本地 DNS 服务器

#### 4. DNS name resolution

DNS 解析（name resolution）就是把域名一步步转换成 IP 地址的过程

两种典型方式：

- **iterative query（迭代查询）**
- **recursive query（递归查询）**

**迭代查询（Iterated Query）**

在迭代查询中，被询问的服务器如果不知道最终答案，就返回“你下一步该问谁”

也就是类似这样：

- root server：我不知道最终 IP，但你去问 `.edu` / `.com` 那边
- TLD server：我不知道最终 IP，但你去问这个域的 authoritative server
- authoritative server：我知道，答案在这里

**递归查询（Recursive Query）**

在递归查询中，被询问的服务器要替请求方继续把问题问下去，直到拿到最终结果再返回

从负载角度看，递归查询会把更多解析压力放在被联系的 DNS 服务器上，因此在高层服务器上使用过多递归并不理想

#### 5. DNS Cache

DNS 之所以能高效运行，一个重要原因就是 **caching（缓存）**

缓存的好处：

- 减少重复查询
- 降低解析延迟
- 减轻上层服务器（尤其 root / TLD）的压力

但缓存不是永久有效的，每条缓存记录都有 **TTL（Time To Live）**

TTL 到期后，缓存项会失效，需要重新查询。

这也带来一个问题：

- 如果某台主机的 IP 地址变了
- 互联网中各处缓存不一定立刻更新
- 要等旧记录的 TTL 到期后，新结果才会逐渐传播开

#### 6. DNS Resource Records

DNS 这个分布式数据库中存的核心内容叫做 **resource records（资源记录，RR）**

课件给出的基本格式是：

```text
(name, value, type, ttl)
```

其中：

- `name`：名字
- `value`：值
- `type`：记录类型
- `ttl`：缓存有效时间

几种最常见的记录类型如下。

**A record**

- `type = A`
- 含义：把主机名映射到 IPv4 地址

例如：

- `www.example.com → 93.184.216.34`

**NS record**

- `type = NS`
- 含义：说明某个域由哪个 authoritative name server 负责

也就是说，它告诉查询方“这个域的权威服务器是谁”

**CNAME record**

- `type = CNAME`
- 含义：把一个别名映射到 canonical name（规范名称）

例如：

- `www.ibm.com` 可能只是某个真实主机名的别名

**MX record**

- `type = MX`
- 含义：指出与该域名关联的邮件服务器

这类记录在电子邮件系统里尤其重要，因为发邮件时需要先通过 DNS 找到目标域的 mail server

#### 7. DNS protocol messages

DNS 查询报文和响应报文使用相同的基本格式。

报文中通常包含：

- **identification**：一个 16-bit 标识，用来匹配查询与响应
- **flags**：标志位，用来表示这是 query 还是 reply、是否希望递归、响应是否权威等
- **questions**：问题部分
- **answers**：回答部分
- **authority**：权威信息部分
- **additional information**：附加信息部分

可以看到，DNS 报文不是只装“一个答案”，它还能把权威信息和额外辅助信息一起带回来，从而减少后续查询步骤。

#### 8. 向 DNS 中插入记录

如果一个新公司想上线自己的域名，大致流程通常是：

1. 到域名注册商注册域名
2. 提供自己的 authoritative name server 信息
3. 注册商把对应的 NS / A 记录插入到上级 TLD 服务器中
4. 自己的权威服务器再维护该域名下具体主机的记录

#### 9. DNS 的安全问题

DNS 很重要，因此也经常成为攻击目标：

- **DDoS 攻击**
  - 例如对 root server 或 TLD server 发起海量流量攻击
- **Redirect attacks（重定向攻击）**
  - 例如中间人攻击、DNS poisoning（DNS 投毒）
  - 向 DNS 服务器注入伪造响应，让它缓存错误映射
- **利用 DNS 进行放大攻击**
  - 通过伪造源地址触发放大响应，打向受害者

为了解决 DNS 的真实性和完整性问题，引入了 **DNSSEC**

可以把 DNSSEC 理解为：

- 为 DNS 提供更强的认证能力
- 防止解析结果被伪造或篡改

### Video Streaming and CDNs

Video Streaming 的核心目标是：**让视频在网络条件变化时仍尽量连续播放**

它面临的主要问题有：

- 带宽会波动
- 网络可能出现 delay、jitter 和 packet loss
- 用户希望边下载边播放，而不是等全部下载完

因此客户端通常会先做 **playout buffering（播放缓冲）**，先缓存一小段数据，再开始播放，以减少卡顿。

**DASH（Dynamic, Adaptive Streaming over HTTP）**：

- 服务器把视频切成多个 chunk
- 每个 chunk 提供不同码率版本
- 客户端根据当前带宽动态选择请求哪一种版本

也就是说，带宽好时可以看更高清，带宽差时就降低码率，优先保证不断播。

这里还有一个常见概念是 **manifest**。

它可以理解为播放器拿到的一份“视频说明书”或“播放清单”，通常包含：

- 这个视频被切成了哪些 chunk
- 每个 chunk 有哪些不同码率版本
- 客户端接下来可以去哪里请求这些内容

客户端通常会先拿到 manifest，再根据当前网络状况决定请求哪一档码率。

**CDN（Content Distribution Network）** 的作用是：

- 在多个地理位置存放内容副本
- 让用户从更近或更合适的节点获取视频

这样可以：

- 降低时延
- 减少源站压力
- 提升大规模用户访问时的分发能力

补充两个常见概念：

- **OTT（Over-The-Top）**：指内容提供商通过 Internet 直接把视频内容送到用户设备上，而不依赖传统有线电视或运营商专用分发网络，比如 Netflix、YouTube、Bilibili 这类流媒体服务。
- **Enter Deep**：指 CDN 把服务器尽量部署到更靠近接入网、甚至更靠近用户的位置，这样可以减少中间链路长度，降低时延并缓解骨干网压力，但部署和管理成本更高。

所以视频分发系统不仅要解决“怎么传”，还要解决：

- 从哪里传
- 传什么版本
- 在拥塞时如何尽量保证用户体验

## Transport layer 传输层

传输层（Transport Layer）的核心任务，是为运行在不同主机上的**应用进程（process）**提供逻辑通信

这一层最核心的几个主题包括：

- transport-layer services
- multiplexing / demultiplexing
- reliable data transfer
- flow control
- congestion control

互联网中最主要的两个传输层协议是：

- **UDP**：无连接、尽力而为、开销小
- **TCP**：面向连接、可靠、按序，并带有流量控制和拥塞控制

### Transport-layer services and principles

#### 1. 传输层提供什么服务

传输层的目标，是让**一台主机上的某个进程**，能够把数据交给**另一台主机上的某个进程**。

所以它提供的是：

- **process-to-process logical communication**
- 对应用报文进行分段（segment）并交给网络层
- 在接收端把 segment 重新交付给正确的应用进程

发送方和接收方的典型动作可以理解为：

**发送方（sender）**

- 从应用层拿到 message
- 根据协议补上 transport header
- 形成 segment
- 把 segment 交给 network layer

**接收方（receiver）**

- 从 network layer 收到 segment
- 检查首部字段
- 把 segment 中的数据交给正确的 socket / process
- 必要时把多个 segment 还原成完整 message

#### 2. 传输层和网络层的区别

- **network layer**：提供 **host-to-host** 的逻辑通信
- **transport layer**：提供 **process-to-process** 的逻辑通信

所以传输层是**依赖并增强**网络层服务。

#### 3. Internet 中的两大传输协议

互联网应用通常使用两种传输层协议：TCP 和 UDP

**TCP（Transmission Control Protocol）** 提供：

- 可靠传输（reliable delivery）
- 按序交付（in-order delivery）
- 流量控制（flow control）
- 拥塞控制（congestion control）
- 连接建立（connection setup）

**UDP（User Datagram Protocol）** 的特点则更简单：

- 无连接（connectionless）
- 尽力而为（best effort）
- 不保证可靠
- 不保证按序
- 首部小、开销低、处理简单

> 注意，传输层并**不会**天然提供这些服务中的全部。比如 Internet 上：
>
> - TCP 提供很多增强服务
> - UDP 基本上只是对 IP 的一个轻量扩展
>
> 而以下这些服务，Internet 传输层通常也**不直接保证**：
>
> - 固定时延保证（delay guarantees）
> - 固定带宽保证（bandwidth guarantees）
>

### Multiplexing and demultiplexing

传输层中一个非常基础但非常重要的问题是：

> 一台主机上有很多应用进程同时通信，传输层怎么知道“这段数据该交给谁”？

这就涉及 **multiplexing（多路复用）** 和 **demultiplexing（多路分解）**。

#### 1. Multiplexing

**Multiplexing** 发生在发送方。

它的含义是：

- 传输层从多个 socket / 多个应用进程接收数据
- 给每份数据加上首部信息（尤其是端口号）
- 然后把它们交给网络层发送

也就是说，发送方传输层要负责把“多个应用的数据流”汇聚到下面统一发出去。

#### 2. Demultiplexing

**Demultiplexing** 发生在接收方。

它的含义是：

- 主机从网络层收到 IP datagram
- 每个 datagram 内部带着一个 transport-layer segment
- segment 首部里有端口号等信息
- 接收方根据这些字段，把数据交给正确的 socket

所以 demultiplexing 的本质就是：

- **根据 header 中的信息，把收到的数据分发到正确的应用进程**

#### 3. Port Number

IP 地址只能定位到一台主机，却不能定位到这台主机中的哪一个进程

因此，传输层必须借助 **port number（端口号）**

一个 segment 通常至少会包含：

- **source port number**
- **destination port number**

这样接收主机就能知道：

- 这个 segment 来自哪个进程
- 这个 segment 应该交给本机哪个进程

#### 4. UDP 的 demultiplexing

对于 **UDP** 来说，demultiplexing 相对简单

当接收主机收到一个 UDP segment 时，通常主要检查的是：

- **destination port number**

然后把它交给绑定这个端口的 UDP socket。

因此：

- 如果多个 UDP datagram 的目的端口相同
- 即使它们来自不同的源 IP、不同的源端口
- 在接收端也可能被交给**同一个 socket**

这说明 UDP 是一种比较“松”的 demultiplexing 方式。

#### 5. TCP 的 demultiplexing

对于 **TCP** 来说，情况更复杂，因为 TCP 是面向连接的。

一个 TCP socket 通常由一个 **4-tuple（四元组）** 标识：

- source IP address
- source port number
- destination IP address
- destination port number

也就是说，TCP 接收端在分发 segment 时，不只是看目标端口，还要看通信双方的 IP 和端口组合。

因此：

- 一个 Web server 虽然都监听 `80` 端口
- 但它可以同时和很多 client 建立 TCP 连接
- 每条连接都由不同的四元组区分开

所以 TCP 的 demultiplexing 更精细，也正是这种机制让服务器能够同时服务多个客户端。

### Principles of Reliable Data Transfer

网络层的服务通常只是 **best effort**，它并不承诺：

- 分组一定到达
- 分组一定按序到达
- 分组在传输中不会出错

但很多应用又希望得到“可靠传输”的效果，所以传输层必须在不可靠信道之上，构造出一个**看起来可靠**的服务。

#### 1. Reliable data transfer 的目标

从应用的角度看，理想中的可靠信道应该像这样：

- 发送方交出什么数据
- 接收方就完整、正确、按序地收到什么数据
- 不重复、不丢失、不出错

也就是说，应用希望看到的是一种 **reliable service abstraction**

但实际情况是：

- 底层信道可能会 **bit corruption（比特出错）**
- 可能会 **packet loss（分组丢失）**
- 可能会 **reordering（乱序）**

因此，可靠数据传输协议（rdt）的复杂程度，很大程度上取决于底层不可靠信道到底有多“不可靠”。

#### 2. rdt 的基本接口

课件里把可靠数据传输抽象成几个基本操作：

- **`rdt_send(data)`**：上层把数据交给可靠传输协议发送
- **`udt_send(packet)`**：rdt 把封装后的 packet 交给下层不可靠信道
- **`rdt_rcv(packet)`**：某个 packet 从下层到达接收方
- **`deliver_data(data)`**：rdt 把正确数据交付给上层应用

这里一个关键思想是：

- 发送方和接收方看不到彼此内部状态
- 它们只能通过“发消息”来知道对方发生了什么

所以协议设计的本质，就是规定双方在各种事件下应该如何响应。

#### 3. rdt1.0：底层完全可靠

最简单的情况是假设底层信道完全可靠：

- 不会出错
- 不会丢包

这时事情非常简单：

- sender 收到数据就直接发
- receiver 收到 packet 就直接交付给应用

但这只是一个起点，现实网络远没有这么理想。

#### 4. rdt2.0：信道可能出错

如果底层信道会发生 bit errors，那么仅仅发送数据就不够了。

此时通常需要：

- **checksum**：检测 packet 是否损坏
- **ACK**：告诉发送方“我正确收到了”
- **NAK**：告诉发送方“我收到的内容损坏了，请重传”

这就形成了最基本的 **ARQ（Automatic Repeat reQuest）** 思想：

- 发送方发一个 packet
- 接收方检查
- 正确就回 ACK
- 出错就回 NAK
- 发送方据此决定是否重传

这类协议通常采用 **stop-and-wait**：

- 一次只发送一个 packet
- 必须等这个 packet 的结果明确后，才能继续发下一个

#### 5. Sequence Number

rdt2.0 还有一个问题：

- 如果 ACK / NAK 自己在返回途中损坏了怎么办？

发送方这时不知道接收方到底有没有正确收到原始 packet。如果贸然重传，就可能让接收方收到**重复数据**。

为了解决这个问题，需要给 packet 加上 **sequence number（序号）**。

在 stop-and-wait 协议中，只需要很小的序号空间就够了，通常用：

- `0`
- `1`

因为同一时刻最多只会有一个未确认 packet 在路上，所以发送方和接收方只需要区分“当前这个包”和“上一个重复包”。

于是：

- 发送方给每个 packet 编号
- 接收方识别是否是重复 packet
- 如果是重复的，就不重复交付给应用，只重复发 ACK

这就对应课件中的 **rdt2.1 / rdt2.2**。

其中 rdt2.2 进一步说明：

- 不一定非要用 NAK
- 只用 ACK 也可以
- 如果发送方收到重复 ACK 或异常 ACK，也能推断出应该重传

这也是 TCP 后面采用的重要思想之一：**NAK-free**。

#### 6. rdt3.0：信道还可能丢包

如果信道不仅会出错，还可能直接丢 packet，那么只有 ACK / checksum / sequence number 仍然不够。

因为发送方可能一直等不到任何反馈，它无法判断：

- 是数据包丢了
- 还是 ACK 丢了
- 还是只是对方回复得太慢

这时就要引入 **timer（定时器）**。

基本做法是：

- 发送方发出 packet 后启动计时器
- 如果在“合理时间”内收到 ACK，就说明这次发送成功
- 如果超时还没收到 ACK，就重传该 packet

这样，可靠传输协议就具备了对抗 **packet loss** 的能力。

当然，这也会引入一个现象：

- 有时其实不是丢了，只是延迟比较大
- 发送方超时后重传，会产生 duplicate packet

但因为前面已经引入了 sequence number，接收方可以识别并丢弃重复数据。

#### 7. Stop-and-wait 的问题

rdt3.0 虽然已经能应对出错和丢失，但它效率不高。

原因在于 stop-and-wait 的工作方式是：

- 发送一个 packet
- 等一个 RTT 左右
- 收到 ACK 后再发下一个

如果链路很快、传播时延很大，那么发送方大部分时间都在“等”，而不是“发”。

课件里给出的利用率可以写成：

$$
U_{sender} = \frac{L/R}{RTT + L/R}
$$

其中：

- $L/R$ 是发送一个 packet 的传输时间
- $RTT$ 是往返时延

如果 RTT 远大于发送时间，那么利用率会非常低。

#### 8. Pipelining

为了提高效率，需要引入 **pipelining（流水线传输）**。

核心思想是：

- 不必等前一个 packet 的 ACK 回来后再发下一个
- 可以允许多个尚未确认的 packet 同时在网络中飞行（in-flight）

这样做的好处是：

- 更充分利用链路带宽
- 减少发送方空等时间
- 提升整体吞吐率

不过代价是协议也会变复杂，需要：

- 更大的 sequence number 空间
- 发送方缓冲区
- 可能还需要接收方缓冲区
- 更复杂的 ACK 和重传策略

#### 9. 两种经典流水线协议

**Go-Back-N（GBN）**

GBN 的发送方可以在窗口内连续发送多个 packet，但接收方通常只按序接收

![](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-04-22-1776862180536.webp)

特点：

- 使用**累计确认（cumulative ACK）**
- 如果某个 packet 超时，发送方会把它以及后面还没确认的 packet 一起重传
- 接收方对失序 packet 通常直接丢弃

优点是实现相对简单；缺点是：

- 如果只丢了一个 packet，后面很多本来已经到达的 packet 也可能被迫重传

**Selective Repeat（SR）**

![](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-04-22-1776862259576.webp)

特点：

- 接收方会分别确认每个正确收到的 packet
- 可以缓存失序到达的 packet
- 发送方只重传真正丢失或超时的那个 packet

优点是链路利用率更高；缺点是：

- sender / receiver 都需要更复杂的缓存和窗口管理

#### 10. 小结

可靠数据传输协议的设计，其实是在不断回答三个问题：

- 如何发现错误？—— 用 **checksum**
- 如何确认对方是否收到？—— 用 **ACK / sequence number**
- 如果包或确认丢了怎么办？—— 用 **timer + retransmission**

而当链路变得更长、更快时，仅靠 stop-and-wait 已经不够，就需要使用：

- **pipelining**
- **Go-Back-N**
- **Selective Repeat**

这些思想后面都会继续体现在 TCP 的设计中。

### UDP

UDP（User Datagram Protocol）是 Internet 中最简单的传输层协议之一，也就是“几乎不带额外功能的最简协议”。

> **Protocol Number = 17**

它在 IP 之上只补充了很少的传输层能力，因此常被理解为：

- 一个轻量级的 transport protocol
- 一个对 IP 的最小扩展
- 把复杂性尽量留给应用层自己处理

#### 1. UDP 的核心特点

UDP 是一种 **connectionless（无连接）** 协议

这意味着：

- 发送方和接收方之间**不需要先握手**
- 不需要像 TCP 一样先建立连接再传数据
- 每个 UDP segment 都是**独立处理**的

因此 UDP 的几个典型特征是：

- **best effort service**
- segment 可能**丢失**
- segment 可能**乱序到达**
- 不保证可靠传输
- 不保证按序交付
- 不提供拥塞控制
- 协议简单、状态少、开销小

#### 2. 为什么还需要 UDP

因为有些场景并不需要 TCP 那样完整而沉重的机制，反而更看重：

- **低开销**
- **低时延**
- **快速开始传输**
- **由应用自己控制传输策略**

UDP 的几个实际优势包括：

- **没有连接建立过程**
  - 不需要 handshaking
  - 不会像 TCP 那样先消耗额外 RTT
- **没有连接状态**
  - sender 和 receiver 都不需要维护复杂状态
  - 实现简单，资源占用低
- **首部很小**
  - UDP header **固定只有 8 bytes**
- **没有拥塞控制限速**
  - 应用可以按自己希望的速度发送数据
- **在某些场景下更灵活**
  - 应用可以自己决定是否需要重传、纠错、排序或限速

#### 3. UDP 适合哪些应用

课件里列出的典型 UDP 应用包括：

- **streaming multimedia apps**
- **DNS**
- **SNMP**
- **HTTP/3**

可以大致分成几类理解。

**（1）对时延敏感、对少量丢包容忍的应用**

比如音视频流、实时通话、直播等场景，更在意“快”而不是“绝对零错误”。

原因是：

- 少量丢包可能只导致某一帧模糊一下
- 但如果为了等重传而卡住，用户体验反而更差

所以这类应用通常：

- 能容忍一定 loss
- 更关心实时性（rate sensitive）

**（2）本身报文很小、交互简单的应用**

例如 DNS 查询：

- 请求通常很小
- 响应通常也比较小
- 一问一答完成得很快
- 如果丢了，上层可以简单重试

这时使用 UDP 往往比 TCP 更直接。

**（3）需要自己在应用层实现高级功能的协议**

比如 HTTP/3 运行在 QUIC 之上，而 QUIC 又建立在 UDP 之上。

#### 4. UDP 的发送与接收过程

从传输层动作上看，UDP 的 sender / receiver 可以理解为下面这样

**UDP sender actions**

- 从应用层拿到 message
- 确定 UDP header 中各字段的值
- 构造 UDP segment
- 把该 segment 交给 IP

**UDP receiver actions**

- 从 IP 收到 UDP segment
- 提取应用层 message
- 检查 UDP checksum
- 根据端口号 demultiplex 到正确 socket
- 把数据交给应用层

可以看到，UDP 在传输层做的事情并不多：

- 加首部
- 做校验
- 交给正确进程

除此之外，它几乎不再额外提供复杂控制功能。

#### 5. UDP segment header

UDP 的首部非常简单，固定长度只有 **8 bytes**。

它主要包括四个字段（各 **16 bit**，一共 **64 bit**，即 **8 bytes**）：

- **source port number**
- **destination port number**
- **length**
- **checksum**

其中：

**source port number**

- 表示发送进程所使用的端口号
- 在某些场景中，接收方可以据此知道应该把响应发回哪个端口

**destination port number**

- 表示目标进程所在的端口号
- 接收方会据此完成 demultiplexing

**length**

- 表示整个 UDP segment 的长度
- 包括 UDP header 和 payload

**checksum**

- 用来做差错检测
- 检查传输过程中是否发生了 bit error

#### 6. UDP checksum

UDP 使用的 checksum，通常采用 **Internet checksum** 这种计算方式。

真实的 UDP checksum 计算内容，会把下面几部分一起纳入校验：

- **IP pseudo header（伪首部）**
  - 通常包括 source IP address、destination IP address、protocol number 以及 UDP length
  - 它不属于真正的 UDP 报文内容，但会参与 checksum 计算
- **UDP header**
  - 包括 source port、destination port、length、checksum
  - 发送方在计算时，checksum 字段先看作 `0`
- **UDP payload**
  - 也就是应用层交下来的数据

也就是说，发送方会把以上这些内容按顺序看成一串二进制数据，再按 **16-bit** 分组来计算 checksum。

具体计算步骤可以概括为：

1. 把需要校验的全部内容看作一串 **16-bit 整数**
2. 依次对这些 16-bit 整数做加法
3. 如果最高位产生进位，就把这个进位“回卷”加到最低位
4. 对最终结果按位取反，得到 checksum
5. 把这个 checksum 写回 UDP header

这里“按 16-bit 分组”并没有组数限制：

- 有多少组，就全部加起来
- 如果总字节数是偶数，就刚好两字节一组
- 如果总字节数是奇数，就在最后**补一个 0 字节**，凑成 16 bit 再计算

接收方在验证时，一样把：

- pseudo header
- UDP header
- UDP payload
- checksum

全部一起做一补加法后，如果没有检测到错误，最终结果就应该是全 1：

```text
1111111111111111
```

> 发送计算时加进去的checksum是0，接收时正常加进去，就不用额外加checksum

如果接收方计算后得不到全 1，就说明传输过程中可能发生了 bit error。

下面给一个简单的二进制示例。

假设现在有两组 16-bit 数据：

```text
1110011001100110
1101010101010101
```

第一步，先把它们相加：

```text
  1110011001100110
+ 1101010101010101
-----------------
1 1011101110111011
```

可以看到这里产生了一个最高位进位 `1`，所以要做 **wraparound（回卷）**，把这个进位加回低位：

```text
  1011101110111011
+ 0000000000000001
-----------------
  1011101110111100
```

第二步，对结果按位取反：

```text
0100010001000011
```

这个值就是发送方写入 UDP header 的 **checksum**。

接收方收到 segment 后，会再一起做同样的一补加法。如果一切正常，最终应该得到全 1：

```text
1111111111111111
```

这种方式的优点是：

- 简单
- 快
- 实现成本低

但它也有局限，只能检测一部分错误模式，并不是很强的保护机制

### TCP

TCP（Transmission Control Protocol）是 Internet 上最重要的传输层协议之一。和 UDP 相比，TCP 提供的是一种更完整的服务：它希望在底层不可靠的 IP 网络之上，为应用提供**可靠、按序、面向连接**的字节流传输。

> **Protocol Number = 6**

#### 1. TCP 的核心特点

TCP 特性主要包括：

- **point-to-point**
  - 一条 TCP 连接只对应一个 sender 和一个 receiver
- **reliable, in-order byte stream**
  - 提供可靠、按序的字节流传输
- **full duplex**
  - 同一条连接上，双方都可以同时发送和接收数据
- **connection-oriented**
  - 数据交换前要先建立连接
- **flow controlled**
  - 发送方不能把接收方的缓冲区撑爆
- **congestion controlled**
  - 发送速率会根据网络拥塞状况动态调整
- **pipelining**
  - 允许多个 segment 同时在路上
- **cumulative ACKs**
  - 采用累计确认机制

其中一个特别重要的点是：

- TCP 提供的是 **byte stream（字节流）**
- 它并不保留应用层 message 的边界

也就是说，TCP 是**面向字节流**，而不是面向消息。

#### 2. TCP segment structure

TCP 首部比 UDP 复杂得多，因为它要承担可靠传输、流量控制、连接管理和拥塞控制等多种职责

一个 TCP segment 中常见的重要字段包括：

- **source port number**
- **destination port number**
- **sequence number**
- **acknowledgement number**
- **header length**
- **receive window（rwnd）**
- **checksum**
- **flags**
  - 如 **ACK、SYN、FIN、RST** 等
- **options**
- **application data**

这些字段里，最核心的几类作用分别是：

**（1）端口号**

- 用于 multiplexing / demultiplexing
- 标识通信两端的应用进程

**（2）sequence number / acknowledgement number**

- 用于可靠传输
- 用于确认哪些数据已经收到、哪些还没收到

**（3）rwnd（receive window）**

- 用于流量控制
- 告诉发送方“我现在还能接收多少字节”

**（4）SYN / FIN / RST 等标志位**

- 用于连接建立、关闭和异常处理

**（5）checksum**

- 用于差错检测

#### 3. MSS 和 MTU

TCP 传输数据时，并不是无限大一块一块地发，而是要把字节流切成若干 segment。

其中一个重要概念是 **MSS（Maximum Segment Size）**。

它表示：

- **一个 TCP segment 中能够承载的最大应用层数据量**
- 单位通常是 bytes

另一个相关概念是 **MTU（Maximum Transmission Unit）**，它表示：

- 某条链路层帧所能承载的最大数据量

例如在常见的 Ethernet 中：

- **MTU = 1500 bytes**

如果不考虑 IP / TCP options，常见情况下：

- IP header = 20 bytes
- TCP header = 20 bytes

那么典型的：

- **MSS = 1460 bytes**

```
|<--------------------- MTU = 1500 --------------------->|
| IP Header (20) | TCP Header (20) | TCP Data (MSS = 1460) |
```



#### 4. TCP sequence number

TCP 的 sequence number 不是“第几个报文段”的编号，而是：

- **该 segment 中第一个数据字节在整个字节流中的编号**

这点非常重要，因为 TCP 管理的是 **byte stream**，不是 message 或 segment 序列。

例如：

- 如果某个 segment 的 `Seq = 100`
- 且它携带了 20 bytes 数据

那么它表示这个 segment 承载的是：

- 第 `100` 到第 `119` 号字节

下一个按序 segment 的 sequence number 就会从 `120` 开始。

#### 5. TCP ACK 的含义

TCP 的 acknowledgement number 表示的是：

- **接收方下一步期望收到的字节序号**

也就是说：

- `ACK = 120`
- 并不是说“我收到了第 120 个字节”
- 而是说“到 119 为止我都已经按序收到了，现在我在等 120”

这正体现了 TCP 的 **cumulative ACK（累计确认）** 机制。

例如：

- 如果接收方已经按序收到了 `100` 到 `119`
- 那么它会回 `ACK = 120`

#### 6. TCP 如何处理乱序

- 对于 out-of-order segments，**TCP 标准本身并没有完全强制规定唯一处理方式**
- 具体实现可以由操作系统决定

但总体思路通常是：

- 接收方始终通过 ACK 告诉发送方“我当前按序收到哪里了”
- 如果中间出现缺口（gap），ACK 仍会停留在缺口起点

这也是后面 duplicate ACK 和 fast retransmit 的基础。

#### 7. 一个简单的 TCP 字节流例子

课件中的 telnet 例子很好地说明了 sequence number 和 ACK 的含义。

假设：

- Host A 给 Host B 发了一个字符 `C`
- 该字符占 1 byte

如果：

- A 发出 `Seq = 42, ACK = 79, data = 'C'`

那么可以理解为：

- A 当前发送的是自己字节流中的第 42 号字节
- 同时它告诉 B：我已经按序收到了你发来的 78 号字节，目前期待你的 79 号字节

如果 B 回：

- `Seq = 79, ACK = 43, data = 'C'`

则表示：

- B 也发送了一个自己的 1-byte 数据
- 同时确认已经收到了 A 的第 42 号字节，所以现在期待 A 的第 43 号字节

这体现了 TCP **full duplex** 的特点：

- 双方都可以在一个 segment 里同时带数据和 ACK，即**两条Seq主线**

#### 8. SampleRTT 与 EstimatedRTT

TCP 需要重传丢失的 segment，

如果 timeout 设置得太短：

- ACK 只是稍微慢一点就会误判为丢包
- 导致不必要的 retransmission

如果 timeout 设置得太长：

- 真正丢包后又要等很久才能恢复
- 会让 TCP 对丢包反应太慢

所以超时值必须和 **RTT（Round Trip Time）** 有关

TCP 不会只看一次 RTT 测量值，而是会持续估计一个更平滑的 RTT。

其中：

- **SampleRTT**：某个 segment 从发送到收到对应 ACK 的实际测量时间
- 计算时通常**忽略重传过的 segment**，以免测量失真

因为 SampleRTT 会波动，所以 TCP 引入：

- **EstimatedRTT**

课件给出的经典估计公式是：

$$
EstimatedRTT_t = (1-\alpha)EstimatedRTT_{t-1} + \alpha \cdot SampleRTT
$$

这是一种 **EWMA（Exponential Weighted Moving Average，指数加权移动平均）**。

常见取值是：

$$
\alpha = 0.125
$$

#### 9. DevRTT 与 TimeoutInterval

仅仅知道平均 RTT 还不够，因为 RTT 的波动程度也很重要。

于是 TCP 又定义了：

- **DevRTT**：SampleRTT 相对 EstimatedRTT 的偏差估计

典型公式是：

$$
DevRTT = (1-\beta)DevRTT + \beta |SampleRTT - EstimatedRTT|
$$

常见取值：

$$
\beta = 0.25
$$

于是最终的超时区间通常设为：

$$
TimeoutInterval = EstimatedRTT + 4 \cdot DevRTT
$$

也就是说，timeout 不仅和平均 RTT 有关，也和 RTT 抖动程度有关

#### 10. TCP sender

TCP sender 的逻辑可以概括成三件事：

- **收到应用数据**：封装成带 sequence number 的 segment；如果 timer 没开，就启动它
- **发生 timeout**：重传最老的未确认 segment，并重启 timer
- **收到 ACK**：更新已确认范围；如果还有未确认数据，就继续计时

也就是说，sender 的核心机制就是：**发送、计时、确认、超时重传**

#### 11. TCP receiver

TCP receiver 生成 ACK 的规则可以简化为：

- **按序到达**：回 ACK；有时会采用 **delayed ACK**，短暂等待是否还能一起确认更多数据
- **连续按序到达多个 segment**：回一个 **cumulative ACK**
- **失序到达**：立即发送 **duplicate ACK**，指出当前仍然缺失的最小字节序号
- **缺口被补上**：立即发送新的 ACK

所以 ACK 的本质就是告诉发送方：**我目前按序收到了哪里**

#### 12. TCP 的重传场景

TCP 重传不一定意味着“数据真的丢了”，常见情况有：

- **ACK 丢失**：数据已到达，但 ACK 丢了，发送方 timeout 后重传
- **timeout 过早**：数据和 ACK 都没丢，只是 ACK 回来太慢，导致一次多余重传
- **累计 ACK 覆盖前序 ACK**：较早 ACK 丢失，但后续更大的 ACK 仍能确认前面的数据

所以 TCP 的重传机制本质上是在对抗：**真实丢包 + 延迟不确定性**。

#### 13. Fast retransmit

**Fast retransmit（快速重传）** 是对超时重传的优化。

如果发送方连续收到 **3 个 duplicate ACKs**，通常说明：

- 接收方已经收到了后面的数据
- 但前面某个 segment 还缺失

因此发送方会推断：

- 当前最小的未确认 segment 很可能已经丢失

于是它会：

- **不等待 timeout**
- **直接重传该 segment**

这样可以更快恢复丢包，提高传输效率。

#### 14. TCP 三次握手

TCP 是 **connection-oriented** 协议，所以在正式交换数据前，双方要先建立连接

![](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-04-22-1776873418697.webp)

TCP 使用 **3-way handshake（三次握手）** 来建立连接

过程如下：

**第一步：Client → Server，发送 SYN**

- `SYN = 1`
- `Seq = x`

含义是：

- 我想建立连接
- 我的初始序列号是 `x`

**第二步：Server → Client，发送 SYN + ACK**

- `SYN = 1`
- `ACK = 1`
- `Seq = y`
- `ACKnum = x + 1`

含义是：

- 我收到了你的建连请求
- 我也愿意建立连接
- 我的初始序列号是 `y`
- 我期待你下一个字节从 `x + 1` 开始

**第三步：Client → Server，发送 ACK**

- `ACK = 1`
- `ACKnum = y + 1`

这之后双方进入 `ESTAB` 状态

三次握手的意义在于：

- 双方都确认对方在线
- 双方都确认彼此的初始序列号
- 双方都确认连接建立请求不是一个陈旧的残留报文

#### 15. TCP 连接关闭

TCP 关闭连接时，通常使用 **4-way handshake（四次挥手）**

原因是：

- TCP 是 full duplex
- 双方的发送方向是彼此独立关闭的

一个典型过程是：

1. 一方发送 `FIN = 1`
2. 对方回 ACK
3. 当对方自己的数据也发送完后，再发送自己的 FIN
4. 原发起方再回 ACK

因此关闭连接强调的是：

- 双方分别关闭各自的发送通道
- 而不是像建连一样一次性同时完成

### Flow Control

#### 1. 为什么需要 flow control

TCP 是可靠传输协议，但“可靠”不等于“可以无限快地发”。

一个很现实的问题是：

- 网络层可能不断把数据交给接收端 TCP
- 但接收端应用程序读取 socket buffer 的速度可能比较慢

如果发送方完全不管接收方的处理能力，就可能出现：

- 接收端 buffer 被塞满
- 后续到达的数据无处可放
- 接收方被“压垮”

所以 **flow control（流量控制）** 的核心目标是：

- **防止发送方发送得太快，导致接收方缓冲区溢出**

#### 2. flow control 和 congestion control 的区别

- flow control 关注的是 **receiver 的承受能力**
- congestion control 关注的是 **network 的承受能力**

#### 3. TCP 如何实现 Flow Control

TCP 使用接收窗口 **rwnd（receive window）** 来做流量控制。

接收方会在 TCP header 中“通告”自己当前还有多少空闲 buffer，也就是：

- **receiver advertises free buffer space in rwnd field**

发送方据此限制自己未确认数据的数量

可以理解为：

- 接收方说：“我现在还能再接收这么多字节”
- 发送方就不能让在途、未确认的数据量超过这个范围

因此：

- `rwnd` 越大，发送方允许在途的数据就越多
- `rwnd` 越小，发送方就必须放慢甚至暂停发送

#### 4. 接收缓冲区和 rwnd

接收端通常会有一个 **RcvBuffer**

这个缓冲区里一部分已经被收到但还没被应用读取，另一部分是空闲空间

所以：

- **已占用部分**：已经到达但还没被 application process 取走的数据
- **空闲部分**：还能继续接收的新数据

TCP 中的 `rwnd` 本质上就是：

- **receiver 当前愿意接收的字节数**
- 也就是接收缓冲区中的可用空间

#### 5. flow control 的效果

flow control 生效后，发送方不会无限制地推数据，而是会遵守接收方通告的窗口大小。

因此它保证：

- **receive buffer will not overflow**

这就是 TCP flow control 最核心的一句话

### Congestion Control

#### 1. 什么是 congestion

- 太多发送方
- 发送了太多数据
- 速度又太快
- 超出了网络所能承受的能力

拥塞最典型的表现包括：

- **long delays**
  - router buffer 中排队时间变长
- **packet loss**
  - router buffer 溢出，分组被丢弃

#### 2. 拥塞的代价

拥塞不只是“变慢”这么简单，它会带来一连串代价。

**（1）delay 增大**

当到达速率逐渐逼近链路容量时：

- queueing delay 会快速上升
- 分组即使没丢，也会等待更久

**（2）loss 导致 retransmission**

当 buffer 满了以后：

- packet 会被丢弃
- 发送方只能重传

这意味着：

- 网络不但在传原始数据
- 还要花额外带宽去传重复数据

**（3）unneeded duplicates 会浪费带宽**

在真实网络中，发送方可能因为 timeout 设得不准而过早重传。

于是会出现：

- 原 packet 没丢
- ACK 只是回来慢了
- 发送方却又额外发了一份

这类 **un-needed duplicates** 会进一步降低有效吞吐率。

**（4）下游丢包会浪费上游资源**

尤其在多跳路径中，如果一个 packet 已经经过了前面很多链路，最后却在下游 router 被丢弃，那么：

- 前面已经消耗掉的链路带宽
- 已经占用过的 buffer

都等于白白浪费了。

#### 3. congestion control 的两种思路

课件把拥塞控制大致分成两种思路。

**End-end congestion control**

特点是：

- 网络内部不给显式反馈
- 发送方只能根据 **loss、delay** 等现象去推断是否拥塞

这正是经典 TCP 采用的思路。

**Network-assisted congestion control**

特点是：

- router 会直接向端系统提供拥塞信息
- 可能告诉主机“已经拥塞了”
- 甚至可能明确要求降低发送速率

例如课件提到的：

- ECN
- ATM
- DECbit

### TCP Congestion Control

#### 1. 基本思想：AIMD

经典 TCP 拥塞控制的核心思想是 **AIMD**：

- **Additive Increase（加性增）**
- **Multiplicative Decrease（乘性减）**

它的直觉是：

- 平时逐步增加发送速率，试探还能不能多用一点带宽
- 一旦检测到丢包，就说明很可能已经拥塞，于是明显降低发送速率

所以 TCP 的发送速率常呈现一种 **sawtooth（锯齿形）** 变化。

#### 2. cwnd：拥塞窗口

TCP 通过 **cwnd（congestion window）** 控制发送量。

可以把它理解成：

- 发送方根据当前网络拥塞状况，给自己设置的一个“最多能发多少”的上限

因此发送方实际可发送的数据量，受窗口约束：

- 已发送但未确认的数据不能无限增长
- 发送速率会随 `cwnd` 变化而变化

一个常见近似关系是：

$$
TCP\ rate \approx \frac{cwnd}{RTT}
$$

#### 3. slow start

当连接刚开始时，TCP 并不知道网络能承受多快的发送速度，所以会采用 **slow start（慢启动）**。

它的做法是：

- 初始时 `cwnd = 1 MSS`
- 每收到一个 ACK，就增长一点窗口
- 结果是窗口大致每个 RTT **翻倍**

所以虽然名字叫“慢启动”，但它的增长其实是：

- **指数增长**

慢启动会持续到：

- 发生 loss event
- 或者达到阈值 `ssthresh`

#### 4. congestion avoidance

当 `cwnd` 增长到一定程度后，TCP 会从 slow start 切换到 **congestion avoidance（拥塞避免）**。

这时增长方式不再是指数的，而变成：

- **线性增长**

也就是每个 RTT 大约增加 1 MSS。

#### 5. loss event 与 ssthresh

TCP 用 **loss event** 作为拥塞信号。

课件里提到，loss event 主要包括两类：

- **timeout**
- **收到 3 个 duplicate ACKs**

一旦发生 loss event，TCP 会更新：

- **ssthresh（slow start threshold）**

通常做法是：

- 把 `ssthresh` 设为丢包前 `cwnd` 的一半

#### 6. TCP Reno 和 TCP Tahoe

课件特别比较了 **TCP Reno** 和 **TCP Tahoe**。

两者都包含：

- Slow Start
- Congestion Avoidance
- Fast Retransmit

区别主要在于丢包后的处理：

**收到 3 个 duplicate ACKs 时：**

- **TCP Reno**：把窗口大致减半，然后进入 **fast recovery**
- **TCP Tahoe**：直接把 `cwnd` 降到 `1 MSS`

**发生 timeout 时：**

- Reno 和 Tahoe 都会把 `cwnd` 降到 `1 MSS`

所以可以简单记成：

- **Tahoe 更保守**
- **Reno 在 duplicate ACK 场景下恢复更快**

#### 7. TCP CUBIC

除了经典 AIMD，课件还介绍了 **TCP CUBIC**。

它的直觉是：

- 如果上次在某个发送窗口 `Wmax` 处发生了丢包
- 那么当前网络瓶颈的状态大概率和当时差不多

于是 CUBIC 的做法是：

- 刚从丢包恢复后，先比较快地回到接近 `Wmax`
- 接近 `Wmax` 时再放慢增长速度
- 超过 `Wmax` 后再更积极地继续探测

因此它比经典 TCP：

- 在高带宽、高时延环境中通常能获得更高吞吐率
- 也是 Linux 中非常常见的默认 TCP 算法之一

#### 8. bottleneck link 与 RTT

理解拥塞控制时，一个很重要的视角是关注 **bottleneck link（瓶颈链路）**。

因为真正限制吞吐率的，往往不是整条路径中所有链路，而是其中最先拥塞的那一条。

一个关键 insight 是：

- 当 bottleneck 已经满负荷时，再继续提高发送速率，并不会提高端到端吞吐率
- 反而只会让 queue 更长、RTT 更大、丢包更多

所以拥塞控制真正追求的是：

> **keep the pipe just full, but not fuller**

#### 9. Delay-based congestion control 与 ECN

除了基于 loss 的方法，还有另外两类思路。

**Delay-based congestion control**

它会根据 RTT 变化判断是否正在接近拥塞。

直觉是：

- 如果 RTT 明显变大，通常说明 queue 在增长
- 这时候即使还没发生丢包，也可能已经应该放慢发送速度

课件提到：

- 一些现代算法采取 delay-based 思路
- **BBR** 就属于这一类代表

**ECN（Explicit Congestion Notification）**

ECN 属于 network-assisted congestion control。

基本思路是：

- router 不一定非要等到丢包才发出信号
- 可以直接在 IP header 中做标记，表示“这里已经拥塞了”
- 接收方再通过 TCP ACK 中的相关标志，把这个拥塞信息反馈给发送方

#### 10. fairness

拥塞控制里还有一个常见目标：**fairness（公平性）**。

理想情况下，如果：

- 有 `K` 条 TCP 连接共享同一个瓶颈链路
- 链路总带宽为 `R`

那么每条连接平均应接近：

$$
\frac{R}{K}
$$

在理想条件下，AIMD 具有较好的公平性。

但现实中仍然会有一些问题：

- 不同连接 RTT 不同
- 有些应用根本不用 TCP，而直接用 UDP
- 某些应用会故意开很多条并行 TCP 连接来“抢”更多带宽

所以公平性是目标，但并不总能完美实现。

### QUIC

#### 1. 为什么会有 QUIC

课件最后提到，Internet 传输层已经发展了很多年：

- TCP 和 UDP 已经是几十年的核心协议
- 但新的应用场景不断提出新的要求

例如：

- Long, fat pipes：大带宽、长时延链路
- Wireless networks：无线网络中丢包不一定意味着拥塞
- Long-delay links：RTT 很长
- Data center networks：对时延很敏感
- Background traffic：希望低优先级后台流量别影响前台体验

这推动了一种趋势：

- 把一些传统上属于 transport layer 的功能，逐渐上移到应用层，在 UDP 之上实现

而 **QUIC** 就是这个方向的代表。

#### 2. QUIC 是什么

**QUIC（Quick UDP Internet Connections）** 可以理解为：

- 一个运行在 **UDP 之上** 的应用层协议
- 但它又实现了很多原本常由 TCP 提供的能力

课件提到，QUIC 采用了本章里学过的许多思想：

- connection establishment
- error control
- congestion control

它的典型特点包括：

- 在单个 QUIC connection 上支持多个 application-level streams
- 每个 stream 可以有各自的可靠传输逻辑
- 多个 stream 共享同一个 congestion control
- 把安全机制和传输控制结合得更紧密

#### 3. QUIC 与 TCP + TLS 的区别

传统的 HTTPS 方式通常是：

- 先做 **TCP handshake**
- 再做 **TLS handshake**

也就是说：

- 可靠传输 / 拥塞控制状态
- 安全认证 / 加密状态

往往要通过**两个串行的握手过程**来建立。

而 QUIC 的一个重要改进是：

- 把可靠性、拥塞控制、认证、加密等状态建立过程更紧密地整合起来
- 使得连接建立可以更快完成

课件里强调的一个点是：

- QUIC 能在 **one RTT** 内建立这些关键状态

#### 4. QUIC streams 与 no HOL blocking

QUIC 最重要的一个优势之一，是它支持多个独立的 **streams**。

这带来的好处是：

- 多个应用请求可以并行进行
- 某一个 stream 上出现丢包或重传，不一定会像 TCP 那样阻塞其他 stream 的数据交付

因此课件特别强调：

- **QUIC streams: parallelism, no HOL blocking**

可以简单理解为：

- 在 TCP 上，如果底层一个地方卡住，整条字节流都可能一起受影响
- 在 QUIC 上，不同 stream 的独立性更强
- 因而更适合现代 Web 中大量并发对象传输的场景

#### 5. 小结

可以把 QUIC 理解为传输层演化方向的一个代表：

- 底层仍然使用 UDP
- 但在其上重新实现可靠传输、拥塞控制和更快的建连机制
- 同时支持多 stream，并减少 HOL blocking 问题

所以从功能角度看：

- **TCP + TLS** 更像传统方案
- **QUIC over UDP** 更像为现代 Web 优化的新方案

## Network Layer: Data Plane 网络层数据平面

网络层（Network Layer）负责把传输层交下来的 segment 从源主机送到目的主机。

在发送端：

- 网络层把 transport-layer segment 封装成 **datagram（数据报）**
- 然后把 datagram 交给链路层继续传输

在接收端：

- 网络层从收到的 datagram 中取出 transport-layer segment
- 再交给对应的传输层协议，例如 TCP 或 UDP

网络层协议不仅存在于主机中，也存在于路由器中。路由器会检查经过自己的 IP datagram 的首部字段，并把 datagram 从输入端口移动到合适的输出端口，使其沿着端到端路径继续前进。

### Network Layer Overview

#### 1. Forwarding 和 Routing

网络层有两个特别核心的功能：

- **Forwarding（转发）**
  - 是单个路由器内部的本地动作
  - 作用是把 packet 从输入链路移动到合适的输出链路
  - 可以理解为：在一个路口，根据当前路标决定该从哪个出口出去

- **Routing（路由选择）**
  - 是全网范围的路径选择问题
  - 作用是决定 packet 从源到目的地整体应该走哪条路
  - 通常由 routing algorithms 或 SDN controller 完成

所以：

- forwarding 关注 **当前 router 怎么转发**
- routing 关注 **端到端路径怎么决定**

#### 2. Data plane 和 Control plane

网络层可以分成两个平面：

- **data plane：数据平面**

  数据平面关心的是：

  > 一个数据包已经到达某个路由器了，这个路由器应该怎么处理它？

  常见操作包括：

  ```
  收到包
    ↓
  查看 IP 头部中的目的地址
    ↓
  查转发表 forwarding table
    ↓
  决定从哪个端口发出去
    ↓
  排队、转发
  ```

- **control plane：控制平面**

  控制平面关心的是：

  > 路由器的转发表是怎么来的？

  它处理的是更全局的问题，例如：

  ```
  网络拓扑是什么？
  哪条路径最短？
  链路坏了怎么办？
  不同自治系统之间怎么选路？
  ```

  控制平面通过路由协议计算路径，然后生成数据平面使用的转发表。

可以简单记成：

- **data plane 数据平面**：负责“每个路由器收到一个包后，具体怎么处理、怎么转发出去”
- **control plane 控制平面**：负责“路由表/转发表是怎么被算出来的”，比如路由算法、OSPF、BGP 等

#### 3. Network-layer service model

网络层可以理论上提供很多服务，例如：

- 对单个 datagram 保证一定送达
- 保证 datagram 在某个 delay bound 内送达
- 对一个 flow 保证按序交付
- 对一个 flow 保证最小带宽
- 限制 packet 间隔变化，也就是 jitter

不同网络体系结构的服务模型可以粗略比较为：

| Network architecture | Service model | Bandwidth guarantee | Loss guarantee | Order guarantee | Timing guarantee |
|---|---|---|---|---|---|
| Internet | Best effort | No | No | No | No |
| ATM | Constant Bit Rate | Constant rate | Yes | Yes | Yes |
| ATM | Available Bit Rate | Guaranteed minimum | No | Yes | No |
| Internet Intserv | Guaranteed service | Yes | Yes | Yes | Yes |
| Internet Diffserv | Differentiated service | Possible | Possible | Possible | No strict guarantee |

但 Internet 的网络层采用的是 **best-effort service model（尽力而为服务模型）**。

这意味着 Internet 不保证：

- datagram 一定成功到达目的地
- datagram 一定按顺序到达
- datagram 一定在某个时间内到达
- 某个端到端 flow 一定有固定带宽

它听起来很弱，但之所以成功，是因为：

- 机制足够简单，容易大规模部署
- 带宽增加后，很多实时应用已经“足够好用”
- CDN、数据中心等应用层分布式系统可以把内容放得离用户更近
- TCP 等端系统协议会在拥塞时自我调节

所以 Internet 的核心设计不是在网络层提供强保证，而是让网络层尽量简单，把很多复杂性放到端系统和应用层。

### Router Architecture 路由器结构

#### 1. 路由器的基本组成

一个典型 router 可以分成四部分：

- **Input ports（输入端口）**
- **Switching fabric（交换结构）**
- **Output ports（输出端口）**
- **Routing processor（路由处理器）**

其中：

- input/output ports 和 switching fabric 主要属于 **data plane**
- routing processor 主要属于 **control plane**

#### 2. Input port functions

输入端口通常要完成三层工作：

1. **Line termination**
   - 完成物理层的 bit-level 接收

2. **Link-layer protocol receive logic**
   - 处理链路层协议，例如 Ethernet

3. **Lookup, forwarding and queueing**
   - 根据 packet header 查 forwarding table
   - 决定输出端口
   - 如果来得太快，可能在 input port 排队

现代路由器通常采用 **decentralized switching（分布式交换）**：

- 每个 input port 自己完成查表
- forwarding table entry 存在 input port 的内存中
- 目标是在 line speed 下完成输入端口处理

#### 3. Destination-based forwarding

传统 IP forwarding 是 **destination-based forwarding**：只根据目的 IP 地址决定输出端口

路由器维护 forwarding table，把目的地址范围或前缀映射到输出接口。

但是 IP 地址范围不一定总能整齐分割，因此实际转发中需要使用：**Longest Prefix Matching（最长前缀匹配）**

#### 4. Longest Prefix Matching

最长前缀匹配的规则是：

> 当多个 forwarding table entries 都能匹配目的地址时，选择匹配前缀最长的那个。

例如：

| Destination Address Prefix | Interface |
|---|---:|
| `11001000 00010111 00010*** ********` | 0 |
| `11001000 00010111 00011000 ********` | 1 |
| `11001000 00010111 00011*** ********` | 2 |
| Otherwise | 3 |

如果目的地址是：

```text
11001000 00010111 00011000 10101010
```

它既可能落入较宽的范围，也可能匹配更具体的前缀。此时要选择最长匹配：

```text
11001000 00010111 00011000
```

所以输出接口是 `1`。

最长前缀匹配和 IP 的层次化地址结构密切相关，它也是路由聚合能够工作的基础。

实现上，路由器常使用 **TCAM（Ternary Content Addressable Memory）**：

- 可以在一个 clock cycle 中完成匹配
- 查找时间基本不依赖表大小
- ternary 指每一位可以是 `0`、`1` 或 `*`

#### 5. Switching fabric

**Switching fabric（交换结构）** 的作用是：

- 把 packet 从 input link 转移到合适的 output link

交换速率通常用相对于 line rate 的倍数衡量。

如果有 `N` 个输入端口，理想情况下 switching fabric 的速率至少应该达到：

$$
N \times \text{line rate}
$$

这样才不容易成为瓶颈。

常见的 switching fabric 有三类：

**（1）Switching via memory**

- 早期 router 像传统计算机
- packet 先被复制到系统内存，再从内存复制到输出端口
- 每个 datagram 要穿过系统总线两次
- 性能受内存带宽限制

**（2）Switching via bus**

- input port 把 datagram 通过共享 bus 传到 output port
- bus contention 会限制整体交换速度
- 性能受 bus bandwidth 限制

**（3）Switching via interconnection network**

- 使用 crossbar、Clos network 等互连网络
- 可以支持更高并行度
- 有些实现会把 datagram 切成固定长度 cells，进入交换结构后并行转发，出口再重组

高端路由器还可能使用多个 switching planes 并行工作，进一步提高吞吐量。

#### 6. Input port queueing 和 HOL blocking

如果 switching fabric 的处理速度小于所有输入端口的到达总速率，packet 就会在 input port 排队。

这会带来：

- queueing delay
- input buffer overflow 导致 packet loss

输入排队中特别重要的问题是 **Head-of-the-Line blocking（HOL blocking，队首阻塞）**。

它的意思是：

- 队首 packet 因为目标输出端口繁忙而无法前进
- 它后面的 packet 即使目标输出端口空闲，也会被挡住

所以 HOL blocking 会让输入队列的吞吐率下降。

#### 7. Output port queueing

如果 switching fabric 把 datagram 送到某个 output port 的速度超过了该输出链路的传输速率，就会发生 output port queueing。

输出端口排队时有两个关键问题：

- **Drop policy**
  - buffer 满了以后丢哪个 packet

- **Scheduling discipline**
  - 下一步应该发送哪个 queued packet

所以输出端口不仅影响 packet loss，也影响不同类型流量获得的服务质量。

#### 8. Buffer management

Buffer management 决定两类事情：

**Dropping**

- buffer 满时如何丢包
- **Tail drop**：直接丢弃新到达的 packet
- **Priority-based drop**：根据优先级丢弃或移除 packet

**Marking**

- 不一定立刻丢包，也可以给 packet 做拥塞标记
- 例如 ECN 或 random early drop

关于 buffer 大小，经典经验公式是：

$$
Buffer \approx RTT \times C
$$

其中 `C` 是链路容量。

如果有 `N` 条 flow，更现代的经验公式是：

$$
Buffer \approx \frac{RTT \times C}{\sqrt{N}}
$$

需要注意的是，buffer 不是越大越好。过大的 buffer 会带来很长的排队时延，也就是常说的 **bufferbloat**。

#### 9. Packet scheduling

**Packet scheduling** 决定输出链路下一步发送哪个 packet。

常见调度策略包括：

**FCFS / FIFO**

- First Come, First Served
- 按到达顺序发送
- 最简单，但无法区分流量优先级

**Priority scheduling**

- 根据 header fields 把 packet 分到不同优先级队列
- 总是优先发送最高优先级的非空队列
- 同一优先级内部通常使用 FCFS
- 缺点是低优先级流量可能长期等待

**Round Robin (RR)**

- 把流量分成多个 class queue
- 调度器轮流扫描各个队列
- 每个非空队列一次发送一个 packet

**Weighted Fair Queuing (WFQ)**

- 是 generalized round robin
- 每个 class `i` 有权重 $w_i$
- class `i` 获得的服务比例约为：

$$
\frac{w_i}{\sum_j w_j}
$$

WFQ 可以为不同流量类别提供带宽比例上的保证。

### IP: The Internet Protocol

#### 1. Internet 网络层的组成

Internet 网络层主要包括：

- **IP protocol**
  - datagram format
  - addressing
  - packet handling conventions

- **ICMP**
  - error reporting
  - router signaling

- **Path-selection algorithms**
  - 由 OSPF、BGP 等 routing protocols 实现
  - 或由 SDN controller 统一计算

#### 2. IPv4 datagram format

IPv4 datagram header 中常见字段如下：

| Field | Meaning |
|---|---|
| Version | IP 协议版本，IPv4 中为 4 |
| Header length | IP header 长度 |
| Type of service | Diffserv 和 ECN 相关字段 |
| Length | 整个 IP datagram 的长度 |
| 16-bit identifier | 分片和重组时用于识别同一个原始 datagram |
| Flags | 分片控制 |
| Fragment offset | 分片在原始 datagram 中的位置 |
| Time to live (TTL) | 剩余最大跳数，每经过一个 router 减 1 |
| Upper layer | 上层协议，例如 TCP 或 UDP |
| Header checksum | 只检查 IP header 的差错 |
| Source IP address | 源 IP 地址 |
| Destination IP address | 目的 IP 地址 |
| Options | 可选字段，例如 timestamp、record route |
| Payload data | 通常是 TCP 或 UDP segment |

补充几点：

- IPv4 地址长度是 32 bits
- IP datagram 最大长度是 64 KB
- 常见 Ethernet MTU 是 1500 bytes
- 不考虑 options 时，IP header 通常是 20 bytes
- TCP header 通常也是 20 bytes

所以一个常见 TCP/IP packet 的基础首部开销是：

$$
20 + 20 = 40 \text{ bytes}
$$

#### 3. IP address 和 interface

IP address 是和 **interface（接口）** 绑定的，而不是简单地和“设备”绑定。

Interface 指的是：

- host/router 和物理链路之间的连接点

通常：

- router 有多个 interfaces
- host 可能有一个或多个 interfaces，例如有线网卡和 Wi-Fi 网卡

IPv4 地址是 32-bit identifier，通常写成 dotted-decimal notation：

```text
223.1.1.1
= 11011111 00000001 00000001 00000001
```

#### 4. Subnet 子网

**Subnet（子网）** 可以理解为：

- 一组不经过 router 就能彼此物理到达的 device interfaces

IP 地址具有结构：

- 高位部分是 **subnet part**
- 低位部分是 **host part**

例如：

```text
223.1.1.0/24
```

表示：

- 前 24 bits 是 subnet part
- 剩下 8 bits 是 host part

定义子网的一种方法是：

1. 把每个 interface 从 host 或 router 上“拆开”
2. 剩下每一个互相连通的 isolated network 就是一个 subnet

#### 5. CIDR

**CIDR（Classless InterDomain Routing，无类别域间路由）** 允许 subnet part 具有任意长度。

格式是：

```text
a.b.c.d/x
```

其中：

- `x` 表示 subnet part 的 bit 数

例如：

```text
200.23.16.0/23
```

表示前 23 bits 是网络前缀，剩余 9 bits 是 host part。

#### 6. Subnet mask

Subnet mask 用来从 IP address 中取出 subnet part。

例如：

```text
192.168.10.3/23
= 11000000.10101000.00001010.00000011

/23 mask
= 11111111.11111111.11111110.00000000
= 255.255.254.0
```

所以该地址对应的子网是：

```text
192.168.10.0/23
```

host 地址范围大致覆盖：

```text
192.168.10.0 ~ 192.168.11.255
```

一共有：

$$
2^{32-23} = 2^9 = 512
$$

个地址。

> 实际可用 host 地址通常还要扣除 network address 和 broadcast address，但课件这里重点是理解 bit 数量关系。

#### 7. DHCP

主机获得 IP 地址有两种方式：

- 管理员手动配置
- 通过 **DHCP（Dynamic Host Configuration Protocol）** 动态获取

DHCP 的目标是：

- host 加入网络时，从 network server 动态获得 IP 地址

DHCP 的典型四步过程是：

1. **DHCP Discover**
   - client 广播：“有没有 DHCP server？”

2. **DHCP Offer**
   - server 回复：“我可以给你这个 IP”

3. **DHCP Request**
   - client 请求使用这个 IP

4. **DHCP ACK**
   - server 确认分配

典型端口号：

- DHCP server：UDP 67
- DHCP client：UDP 68

在 client 还没有 IP 地址时，源地址可能是：

```text
0.0.0.0
```

广播目的地址可能是：

```text
255.255.255.255
```

DHCP 不只分配 IP 地址，还可以告诉 client：

- first-hop router / gateway
- DNS server 的名称和 IP 地址
- subnet mask

虽然 DHCP 是应用层协议，但因为它直接服务于 IP 地址分配，所以经常在网络层章节中讨论。

#### 8. 地址分配和层次化路由

一个网络如何获得自己的 subnet prefix？

通常是：

- 从 provider ISP 的地址空间中分配一块

例如 ISP 拥有：

```text
200.23.16.0/20
```

它可以继续切成多个更小的 block 分配给组织：

| Organization | CIDR block |
|---:|---|
| 0 | `200.23.16.0/23` |
| 1 | `200.23.18.0/23` |
| 2 | `200.23.20.0/23` |
| ... | ... |
| 7 | `200.23.30.0/23` |

这种层次化地址结构允许 **route aggregation（路由聚合）**。

例如 ISP 可以对外只宣布：

```text
Send me anything beginning with 200.23.16.0/20
```

这样一个聚合前缀就覆盖了多个组织的更小前缀，减少 routing table 规模。

如果某个组织迁移到了另一个 ISP，新的 ISP 可以宣布更具体的 route，例如：

```text
200.23.18.0/23
```

由于路由器使用 longest prefix matching，更具体的 `/23` 会优先于更宽泛的 `/20`。

#### 9. ICANN 和 IPv4 地址耗尽

IP 地址块的全球分配由 **ICANN（Internet Corporation for Assigned Names and Numbers）** 负责协调。

ICANN 的职责包括：

- 通过区域注册机构分配 IP 地址
- 管理 DNS root zone
- 委派 `.com`、`.edu` 等顶级域名的管理

IPv4 地址只有 32 bits，地址空间有限。2011 年，ICANN 已经把最后一批 IPv4 地址分配给区域注册机构。

应对 IPv4 地址耗尽的两个重要方向是：

- NAT
- IPv6

### NAT and IPv6

#### 1. NAT 的基本思想

**NAT（Network Address Translation，网络地址转换）** 的核心思想是：

- 局域网内部设备使用 private IP address
- 对外通信时，共享一个或少数几个 public IP address
- NAT router 通过端口号区分不同内部连接

常见 private IP address ranges 包括：

- `10.0.0.0/8`
- `172.16.0.0/12`
- `192.168.0.0/16`

例如局域网内部是：

```text
10.0.0.0/24
```

NAT router 对外 public IP 是：

```text
138.76.29.7
```

那么外部网络看到的不是每台内网主机，而是同一个 NAT public IP 加不同端口号。

#### 2. NAT 的实现

对 outgoing datagram：

- NAT router 把源地址和源端口：

```text
(source IP, source port)
```

替换成：

```text
(NAT IP, new port)
```

同时在 NAT translation table 中记录映射：

```text
(source IP, source port) <-> (NAT IP, new port)
```

对 incoming datagram：

- 外部服务器把回复发给 `(NAT IP, new port)`
- NAT router 查表
- 把目的地址和目的端口改回内部主机的 `(source IP, source port)`

例子：

| Step | Address |
|---|---|
| 内部主机发出 | `10.0.0.1:3345 -> 128.119.40.186:80` |
| NAT 改写后 | `138.76.29.7:5001 -> 128.119.40.186:80` |
| 外部回复 | `128.119.40.186:80 -> 138.76.29.7:5001` |
| NAT 改回后 | `128.119.40.186:80 -> 10.0.0.1:3345` |

#### 3. NAT 的优点和争议

NAT 的优点：

- 整个局域网只需要一个 public IP
- 内部主机地址改变时，不需要通知外部网络
- 更换 ISP 时，内部地址可以不变
- 外部主机通常不能直接访问内部设备，有一定隐藏效果

NAT 的争议：

- router 理想上只应该处理到网络层，但 NAT 需要修改 transport-layer port number
- 它破坏了 end-to-end argument
- 内网主机作为 server 时，外部连接进来会比较麻烦
- NAT traversal 需要额外机制

尽管有争议，NAT 仍然被广泛使用在：

- 家庭网络
- 企业和校园网络
- 4G/5G cellular networks
- Carrier-grade NAT

#### 4. NAT traversal 和 STUN

如果主机在 NAT 后面，它可能不知道外部世界看到的自己是什么地址和端口。

一种思路是使用外部服务器帮助发现映射，例如 STUN 风格的过程：

1. 内网主机向公网 STUN server 发送请求：“外面看到我是谁？”
2. STUN server 根据收到的 packet 源地址和端口回复
3. 内网主机得知自己的 public-facing address/port

这类机制常用于需要点对点通信的应用。

#### 5. Carrier-grade NAT

NAT 可以嵌套。

家庭网络中：

- 设备使用 `192.168.0.x`
- 家庭路由器对 ISP 侧可能使用 `2.2.2.x`

ISP 网络中：

- 运营商再使用 Carrier-grade NAT
- 把大量客户网络映射到更少的真正 public IPv4 address，例如 `5.5.5.5`

这进一步缓解 IPv4 地址紧张，但也让端到端连接、追踪和 NAT traversal 更复杂。

#### 6. IPv6 的动机

IPv6 最初的核心动机是：

- IPv4 的 32-bit 地址空间不够用

此外 IPv6 还希望：

- 使用固定 40-byte header 加快处理和转发
- 支持对 flow 的不同网络层处理

IPv6 地址长度是：

$$
128 \text{ bits}
$$

远大于 IPv4 的 32 bits。

#### 7. IPv6 datagram format

IPv6 header 中主要字段包括：

| Field | Meaning |
|---|---|
| Version | IPv6 版本 |
| Priority | 标识同一 flow 中 datagram 的优先级 |
| Flow label | 标识属于同一个 flow 的 datagrams |
| Payload length | payload 长度 |
| Next header | 下一个上层协议或扩展头 |
| Hop limit | 类似 IPv4 TTL |
| Source address | 128-bit 源地址 |
| Destination address | 128-bit 目的地址 |
| Payload | 数据载荷 |

和 IPv4 相比，IPv6 base header 中去掉了：

- **checksum**
  - router 不需要每跳重新计算 header checksum
  - 有助于加快处理

- **fragmentation/reassembly by routers**
  - router 不再负责分片和重组

- **options**
  - options 不在 base header 中，而是通过 extension headers 处理

#### 8. IPv4 到 IPv6 的过渡：Tunneling

IPv6 不可能让全网 router 在同一天同时升级。

所以过渡阶段会存在：

- IPv6 routers
- IPv4 routers
- 混合路径

一种常用方法是 **tunneling（隧道）**：

- IPv6 datagram 被作为 payload 封装进 IPv4 datagram
- 穿过 IPv4-only network
- 到达 tunnel endpoint 后再解封装成 IPv6 datagram

可以写成：

```text
IPv6 datagram
  -> encapsulated inside IPv4 datagram
      -> carried across IPv4 network
  -> decapsulated back to IPv6 datagram
```

注意：

- outer IPv4 header 的 source/destination 是隧道两端的 IPv4 router
- inner IPv6 header 的 source/destination 才是真正 IPv6 通信两端

### Generalized Forwarding and SDN

#### 1. Match plus action

传统 destination-based forwarding 只根据目的 IP 地址转发。

**Generalized forwarding（通用转发）** 更一般：

- 匹配 arriving packet header 中的某些字段
- 然后执行某个 action

这就是 **match plus action** 抽象。

可以匹配的字段可以来自：

- link layer
- network layer
- transport layer

可执行的 action 包括：

- forward
- drop
- modify
- copy
- log
- send to controller

在 SDN / OpenFlow 语境下，forwarding table 也常被称为 **flow table**。

#### 2. Flow table

一个 generalized forwarding rule 通常包含：

| Component | Meaning |
|---|---|
| Match | 要匹配的 header fields |
| Action | 对匹配 packet 执行的操作 |
| Priority | 多条规则同时匹配时决定优先级 |
| Counters / Stats | 统计 packet 数和 byte 数 |

例如：

| Priority | Match | Action |
|---:|---|---|
| 1 | `src=10.1.2.3, dest=*.*.*.*` | Send to controller |
| 2 | `src=1.2.*.*, dest=*.*.*.*` | Drop |
| 3 | `src=*.*.*.*, dest=3.4.*.*` | Forward to port 2 |

其中 `*` 表示 wildcard。

#### 3. OpenFlow examples

OpenFlow 的 flow table entry 可以匹配多层字段：

| Layer | Fields |
|---|---|
| Link layer | ingress port、source MAC、destination MAC、Ethernet type、VLAN ID |
| Network layer | IP ToS、IP protocol、IP source、IP destination |
| Transport layer | TCP/UDP source port、TCP/UDP destination port |

几个典型规则：

**Destination-based forwarding**

```text
Match:  IP Dst = 51.6.0.8
Action: forward(port 6)
```

**Firewall blocking SSH**

```text
Match:  TCP destination port = 22
Action: drop
```

**Blocking a source host**

```text
Match:  IP Src = 128.119.1.1
Action: drop
```

**Layer 2 forwarding**

```text
Match:  MAC Dst = 22:A7:23:11:E1:02
Action: forward(port 3)
```

#### 4. Match plus action 的统一视角

match plus action 可以统一解释很多网络设备：

| Device | Match | Action |
|---|---|---|
| Router | Longest destination IP prefix | Forward out a link |
| Switch | Destination MAC address | Forward or flood |
| Firewall | IP addresses and TCP/UDP port numbers | Permit or deny |
| NAT | IP address and port | Rewrite address and port |

也就是说，不同设备的区别往往在于：

- 匹配哪些字段
- 执行什么动作

SDN 的关键在于：

- flow rules 可以由 controller 统一下发
- 多台 switch/router 的规则组合起来，就能形成 network-wide behavior

#### 5. Network programmability

Generalized forwarding 是一种简单的网络可编程性：

- 对 packet header 做匹配
- 对匹配 packet 执行预设动作

更进一步的网络可编程技术包括：

- OpenFlow
- P4

本章重点是 data plane，所以 flow table 怎么计算、怎么下发，属于后续 control plane 章节。

### IP Fragmentation and Reassembly

#### 1. 为什么需要 IP fragmentation

不同链路有不同的 **MTU（Maximum Transmission Unit）**。

MTU 表示：

- 链路层 frame 能承载的最大数据量

如果一个 IP datagram 太大，超过了下一跳链路的 MTU，就可能需要被拆成多个更小的 datagrams，这就是 **IP fragmentation（IP 分片）**。

IPv4 中：

- 一个大 datagram 可以在网络中被分成多个 fragments
- fragments 只在最终目的主机处 reassemble
- 中间 router 不负责重组

用于分片和重组的关键 header 字段包括：

- identification
- flags
- fragment offset

#### 2. Fragmentation example

假设：

- 原始 IP datagram 长度是 4000 bytes
- MTU 是 1500 bytes
- IP header 是 20 bytes

那么每个 full-size fragment 最多携带：

$$
1500 - 20 = 1480 \text{ bytes}
$$

原始 datagram 分片如下：

| Fragment | ID | Offset | Fragment flag | Length | Data bytes |
|---:|---|---:|---:|---:|---:|
| 1 | x | 0 | 1 | 1500 | 1480 |
| 2 | x | 185 | 1 | 1500 | 1480 |
| 3 | x | 370 | 0 | 1040 | 1020 |

这里 offset 的单位不是 byte，而是 8 bytes。

所以：

$$
\frac{1480}{8} = 185
$$

因此：

- 第一个 fragment 的 offset 是 `0`
- 第二个 fragment 的 offset 是 `185`
- 第三个 fragment 的 offset 是 `370`

Fragment flag 的含义：

- `1` 表示后面还有 fragment
- `0` 表示这是最后一个 fragment

所以前两个 fragments 的 flag 为 `1`，最后一个 fragment 的 flag 为 `0`。

#### 3. 分片的影响

IP fragmentation 会带来额外复杂性：

- 每个 fragment 都需要自己的 IP header
- 任何一个 fragment 丢失，原始 datagram 都无法完整重组
- 分片会增加端系统重组负担

因此现代网络通常倾向于通过路径 MTU 发现等方式避免中间路由器频繁分片。

### Conclusion

#### 1. 本章核心链条

可以把本章串成一条线：

```text
Network layer service
  -> router architecture
  -> IP datagram and addressing
  -> NAT / IPv6
  -> generalized forwarding and SDN
```

其中最重要的是理解：

- network layer 提供 host-to-host 的 datagram delivery
- router 的 data plane 负责实际 forwarding
- control plane 负责计算 forwarding table 或 flow table
- IP addressing 的层次结构让 longest-prefix matching 和 route aggregation 成为可能
- NAT 通过 address + port translation 让多个内网设备共享公网 IPv4 地址
- SDN 把 forwarding 抽象成 match plus action，并通过 controller 编排全网行为

#### 2. 容易混淆的概念

| Concept A | Concept B | 区别 |
|---|---|---|
| Forwarding | Routing | forwarding 是单个 router 的本地转发动作；routing 是端到端路径选择 |
| Data plane | Control plane | data plane 处理经过 router 的 packet；control plane 计算路由和表项 |
| IP address | Interface | IP 地址绑定在 interface 上，不是简单绑定在整台设备上 |
| Subnet | LAN | subnet 是 IP 层概念，强调不经过 router 可达的一组 interfaces |
| Longest prefix matching | Exact matching | IP 转发通常不是精确匹配完整地址，而是选最长匹配前缀 |
| Flow control | Congestion control | flow control 保护接收方；congestion control 保护网络 |
| NAT | IPv6 | NAT 缓解 IPv4 地址不足；IPv6 从根本上扩大地址空间 |
| Fragment offset | Byte offset | IPv4 fragment offset 的单位是 8 bytes，不是 1 byte |

## Network Layer: Control Plane 网络层控制平面

上一章的数据平面关注的是：

- router 收到 packet 后，根据 forwarding table / flow table 把它转到哪个 output port

这一章的控制平面关注的是：

- forwarding table / flow table 是怎么被计算出来的
- 路由器之间如何交换信息
- Internet 为什么要分成 AS，并分别使用 OSPF 和 BGP
- SDN controller 如何集中计算和下发表项

本章主线：

1. 控制平面的两种组织方式：per-router control 和 SDN control
2. 两类传统 routing algorithms：link-state 和 distance-vector
3. Internet 中的 scalable routing：AS、intra-AS、inter-AS
4. Intra-AS routing 的代表：OSPF
5. Inter-AS routing 的代表：BGP
6. SDN control plane 和 OpenFlow
7. ICMP 与 traceroute

### Control Plane Overview

#### 1. Forwarding 和 Routing

在网络层中：

- **Forwarding**
  - 把 packet 从 router input 移动到合适的 router output
  - 属于 **data plane**
  - 是局部动作

- **Routing**
  - 决定 packet 从 source 到 destination 应该走哪条 path
  - 属于 **control plane**
  - 是全网范围的路径计算问题

可以简单记成：

- forwarding 是“按表转发”
- routing 是“算出这张表”

#### 2. Per-router control plane

传统 Internet routing 通常采用 **per-router control plane**。

特点是：

- 每台 router 内部都有自己的 routing algorithm component
- routers 之间交换 routing information
- 每台 router 根据收到的信息，自己计算 forwarding table

也就是说：

- control logic 分布在每台 router 中
- 没有一个单独的中心控制器替所有 router 做决定

#### 3. SDN control plane

**SDN（Software-Defined Networking）** 采用 logically centralized control。

基本思想是：

- data-plane switches / routers 只负责高速转发
- remote controller 维护全网状态
- controller 计算 forwarding table / flow table
- controller 把表项安装到各个交换机或路由器中

注意这里说的是 **logically centralized**，不一定是物理上只有一台机器。实际 SDN controller 往往是分布式系统，只是在逻辑上表现为一个统一控制平面。

### Routing Protocols

#### 1. Routing protocol 的目标

Routing protocol 的目标是：

> 在一组 routers 构成的网络中，为 source 到 destination 找到一条 good path。

其中：

- **Path**：packet 从源到目的地经过的 router sequence
- **Good**：可能表示 least cost、fastest、least congested

网络可以抽象为一个图：

$$
G = (N, E)
$$

其中：

- $N$ 是 routers 的集合
- $E$ 是 links 的集合
- $c_{x,y}$ 是 node `x` 到 node `y` 的 link cost
- 如果 `x` 和 `y` 不是直接邻居，则 $c_{x,y} = \infty$

Link cost 可以由网络管理员定义，例如：

- 所有 link cost 都设为 1
- 与 bandwidth 相关
- 与 congestion / delay 相关

#### 2. Routing algorithm 分类

Routing algorithm 可以按两组维度分类。

**按信息是否全局可见：**

| Category | Meaning | Typical algorithm |
|---|---|---|
| Global | 所有 router 都知道完整 topology 和 link cost | Link-state |
| Decentralized | router 只和邻居交换信息，通过迭代逐渐收敛 | Distance-vector |

**按路由变化速度：**

| Category | Meaning |
|---|---|
| Static routing | routes 变化很慢，通常手动配置 |
| Dynamic routing | routes 根据 link cost 或 topology 变化自动更新 |

### Link-State Routing

**Link-state（LS）routing** 的基本思路是：

- 每台 router 通过 link-state broadcast 得到全网 topology 和 link cost
- 所有 router 拥有相同的网络图
- 每台 router 以自己为 source，运行 Dijkstra algorithm
- 算出从自己到所有 destinations 的 least-cost paths
- 再由 least-cost path tree 生成 forwarding table

Link-state routing 一般可以分成下面几步：

1. 发现邻居
2. 测量或配置链路代价
3. 生成链路状态信息
4. 向全网 flooding
5. 每台路由器建立完整拓扑图
6. 每台路由器运行 Dijkstra 算法
7. 生成路由表 RIB
8. 生成转发表 FIB

#### 1. 发现邻居

每台路由器会先发现自己直接连接的邻居。

比如 A 周围有 B 和 D：

```text
B
|
A —— D
```

A 只需要知道：

```text
我旁边有 B
我旁边有 D
```

在 OSPF 中，路由器会通过 **Hello packet** 发现邻居。

大概意思是：

```text
A 发 Hello：
我是 A，我在这里。

B 收到：
我发现 A 是我的邻居。
```

如果一段时间收不到邻居的 Hello，就认为链路可能断了。

#### 2. 确定链路 cost

发现邻居以后，还需要知道到邻居的代价。

例如：

```text
A-B cost = 1
A-D cost = 4
```

cost 不是“跳数”那么简单。

它可以表示：

- 链路带宽
- 链路延迟
- 链路拥塞程度
- 管理员手动设置的权重

不过在很多课程例子里，cost 就直接给定。

#### 3. 生成 LSA

每台路由器把自己的邻居信息打包成一个通告，叫：

```text
LSA = Link-State Advertisement
链路状态通告
```

例如 A 的 LSA 可以理解成：

```text
我是 A
我连接了：
B，cost = 1
D，cost = 4
```

B 的 LSA：

```text
我是 B
我连接了：
A，cost = 1
C，cost = 2
```

C 的 LSA：

```text
我是 C
我连接了：
B，cost = 2
D，cost = 1
```

D 的 LSA：

```text
我是 D
我连接了：
A，cost = 4
C，cost = 1
```

每台路由器都会产生自己的 LSA。

#### 4. Flooding 泛洪

Link-state 的关键操作是 **flooding**。

也就是：

> 每台路由器把自己知道的 LSA 发给所有邻居，邻居再继续转发给它的邻居，直到整个网络都知道。

例如 A 产生 LSA 后：

```text
A 把 LSA 发给 B 和 D
B 再转发给 C
D 也转发给 C
最终 A 的信息全网都知道
```

所以最后每台路由器都会收到所有路由器的 LSA。

Flooding 不会无限转发，因为 LSA 里面通常带有：

```text
router ID
sequence number 序列号
age 生存时间
checksum
```

比如 A 发出一条新的 LSA：

```text
A, sequence = 100
```

如果 B 后来又收到一条旧的：

```text
A, sequence = 99
```

B 就知道这是旧消息，可以丢弃。

这样可以避免旧信息覆盖新信息，也可以避免泛洪无限循环。

#### 5. 建立 Link-State Database

每台路由器收到所有 LSA 后，会建立一份数据库：

```text
LSDB = Link-State Database
链路状态数据库
```

LSDB 里面保存的是全网拓扑信息。

比如所有路由器最后都有同样的 LSDB：

```text
A-B cost 1
A-D cost 4
B-C cost 2
C-D cost 1
```

于是每台路由器都知道完整拓扑：

```text
A ——1—— B
|        |
4        2
|        |
D ——1—— C
```

这就是 link-state 的核心：

> 每台路由器都拥有一张完整的网络地图。

#### 6. 运行 Dijkstra 算法

有了完整拓扑图以后，每台路由器以自己为起点，运行 **Dijkstra 最短路径算法**。

例如 A 要计算到所有节点的最短路径。

拓扑是：

```text
A ——1—— B
|        |
4        2
|        |
D ——1—— C
```

从 A 出发：

```text
A 到 B：cost 1
A 到 D：cost 4
A 到 C：
  路径 1：A-B-C，cost = 1 + 2 = 3
  路径 2：A-D-C，cost = 4 + 1 = 5
所以选 A-B-C
```

所以 A 算出来：

```text
目的地    最短路径      cost
B         A-B           1
C         A-B-C         3
D         A-D           4
```

但是注意，路由器真正转发包的时候不需要存完整路径。

它只需要知道：

```text
去某个目的地，下一跳是谁？
```

所以 A 的结果会变成：

```text
目的地    下一跳
B         B
C         B
D         D
```

#### 7. 生成 RIB

Dijkstra 算完以后，控制平面生成路由表，也就是 RIB。

例如 A 的 RIB 可能是：

```text
Destination     Next Hop     Cost
B network       B            1
C network       B            3
D network       D            4
```

如果是实际 IP 网络，目的地通常不是单个路由器，而是网络前缀，比如：

```text
10.1.0.0/16
10.2.0.0/16
192.168.3.0/24
```

所以实际 RIB 更像：

```text
Destination Prefix     Next Hop     Interface     Cost
10.1.0.0/16            B            eth0          1
10.2.0.0/16            B            eth0          3
10.3.0.0/16            D            eth1          4
```

#### 8. 生成 FIB

然后路由器会从 RIB 生成 FIB，也就是 forwarding table。

FIB 是数据平面真正查表用的。

例如：

```text
Destination Prefix     Interface
10.1.0.0/16            eth0
10.2.0.0/16            eth0
10.3.0.0/16            eth1
```

数据包来了以后：

```text
看目的 IP
↓
最长前缀匹配
↓
找到输出接口
↓
转发
```

所以 link-state 最后影响的是：

```text
路由表怎么生成
转发表怎么生成
数据包下一跳怎么选择
```

#### 9. Dijkstra 的复杂度和问题

如果有 `n` 个 nodes：

- 基础实现中，每轮要扫描未确定 nodes
- 比较次数大约是：

$$
\frac{n(n+1)}{2}
$$

所以复杂度是：

$$
O(n^2)
$$

更高效的数据结构可以做到：

$$
O(n \log n)
$$

Message complexity 方面：

- 每台 router 都要把自己的 link-state information 广播给其他 routers
- 整体 message complexity 也可能达到 $O(n^2)$

如果 link cost 会随 traffic volume 改变，LS routing 还可能产生 **route oscillation（路由振荡）**：

1. 当前 route 造成某些 links 拥塞
2. link cost 因拥塞上升
3. Dijkstra 重新计算后把 traffic 移到别的 links
4. 新 links 又变拥塞
5. route 又发生变化

### Distance-Vector Routing

#### 1. Distance-vector 的核心思想

在 Link-state 里，每台路由器知道完整网络拓扑，然后自己跑 Dijkstra。

但在 Distance Vector 里，每台路由器并不知道完整拓扑。

它只知道两类信息：

```
1. 自己到直接邻居的距离
2. 邻居告诉自己的：邻居到其他目的地的距离
```

然后它根据邻居的信息推算：

```
我到某个目的地的距离
=
我到某个邻居的距离
+
这个邻居到目的地的距离
```

所以 DV 的核心是：

```
我不知道全网地图
但我可以问邻居：你到目的地有多远？
```

**Distance-vector（DV）routing** 基于 Bellman-Ford equation。

令：

- $D_x(y)$ 表示 node `x` 到 destination `y` 的 least-cost estimate
- $c_{x,v}$ 表示 `x` 到邻居 `v` 的直接 link cost
- $D_v(y)$ 表示邻居 `v` 认为自己到 `y` 的 least-cost estimate

则：

$$
D_x(y) = \min_v \{c_{x,v} + D_v(y)\}
$$

其中 `v` 遍历 `x` 的所有 neighbors。

直觉是：

- `x` 想去 `y`
- 可以先走到某个邻居 `v`
- 总 cost = 到邻居的 cost + 邻居到目的地的 cost
- 选择最小的那个邻居作为 next hop

#### 2. Bellman-Ford example

假设 `u` 的邻居 `v`、`w`、`x` 到 destination `z` 的估计如下：

| Neighbor | Estimated cost to `z` |
|---|---:|
| `v` | $D_v(z)=5$ |
| `w` | $D_w(z)=3$ |
| `x` | $D_x(z)=3$ |

已知：

- $c_{u,v}=2$
- $c_{u,x}=1$
- $c_{u,w}=5$

则：

$$
D_u(z) = \min\{2+5,\ 1+3,\ 5+3\} = 4
$$

最小值来自 neighbor `x`，所以 `u` 到 `z` 的 next hop 是 `x`。

#### 3. DV 的迭代模型

每个 node 会反复做：

```text
wait for local link-cost change or message from neighbor
recompute DV estimates using received DVs
if DV to any destination changes:
  notify neighbors
```

DV 的特点：

- **iterative**
  - 路由估计通过多轮更新逐渐收敛

- **asynchronous**
  - 不要求所有 routers 同步更新

- **distributed**
  - 每台 router 只和邻居交换 distance vector

- **self-stopping**
  - 如果没有新的变化，就不会继续发送更新

#### 4. Good news travels fast

当某条 link cost 下降时，DV 通常能较快传播好消息。

例如：

```text
x --4-- y --1-- z
x --50--------- z
```

如果 `y` 发现到 `x` 的路径变好了，它通知 `z`，`z` 很快就能通过 `y` 找到更短路径。

#### 5. Count-to-infinity

当 link cost 上升或某条路径失效时，DV 可能出现 **count-to-infinity** 问题。

典型原因是：

- 邻居之间互相误以为对方还有一条好路径
- 每次更新时 cost 只增加一点
- 错误信息在局部循环中慢慢变大

课件中的直觉过程是：

1. `y` 到 `x` 的直接 cost 变大
2. `y` 以为 `z` 还有到 `x` 的好路径，于是选择经 `z`
3. `z` 又以为 `y` 有路径，于是选择经 `y`
4. 两者互相依赖，cost 逐步从 6、7、8、9 继续增加

这说明 distributed routing algorithm 很容易出现局部信息不一致带来的问题。

#### 6. Link-state 和 Distance-vector 对比

| Dimension | Link-state (LS) | Distance-vector (DV) |
|---|---|---|
| 信息范围 | 每台 router 获取全网 topology 和 link cost | 每台 router 只和 neighbors 交换 |
| 典型算法 | Dijkstra | Bellman-Ford |
| 典型协议 | OSPF、IS-IS | RIP |
| Message complexity | 需要 link-state broadcast，可能 $O(n^2)$ | 只在邻居间交换，但收敛时间不稳定 |
| Convergence | 通常较快，但可能 route oscillation | 可能 routing loop 和 count-to-infinity |
| Robustness | 错误 link cost 主要影响本 router 计算 | 错误 DV 可能被其他 routers 继续传播 |

### Scalable Routing and AS

#### 1. 为什么需要层次化 routing

前面讨论的 routing algorithms 假设网络是 flat 的，但真实 Internet 不是这样。

问题主要有两个：

**Scale**

- Internet 有海量 destination prefixes
- 不可能让每台 router 维护所有细节
- routing-table exchange 也会占用大量链路资源

**Administrative autonomy**

- Internet 是 network of networks
- 每个网络由不同组织管理
- 每个组织希望控制自己网络内部的 routing policy

因此 Internet 使用 **AS（Autonomous System，自治系统）** 进行层次化组织。

#### 2. Intra-AS 和 Inter-AS

Routers 被聚合成不同 AS，也叫 domains。

**Intra-AS routing / intra-domain routing**

- 在同一个 AS 内部做 routing
- 一个 AS 内部通常运行同一种 intra-domain protocol
- 不同 AS 可以使用不同 intra-domain protocol

**Inter-AS routing / inter-domain routing**

- 在不同 AS 之间做 routing
- gateway routers 负责连接其他 AS
- gateway routers 同时参与 intra-AS 和 inter-AS routing

典型关系：

- Intra-AS routing 决定 AS 内部 destinations 怎么走
- Inter-AS routing 学习外部 destinations 从哪些 gateway 可达
- 对 AS 外目的地，forwarding table 通常由 inter-AS 和 intra-AS routing 共同决定

### OSPF: Intra-AS Routing

#### 1. 常见 intra-AS routing protocols

| Protocol | Full name | Notes |
|---|---|---|
| RIP | Routing Information Protocol | 经典 DV 协议，周期性交换 DVs，今天不常用 |
| EIGRP | Enhanced Interior Gateway Routing Protocol | DV-based，曾长期是 Cisco 私有协议 |
| OSPF | Open Shortest Path First | 经典 LS 协议，Internet 中非常常见 |

#### 2. OSPF 的基本特点

**OSPF（Open Shortest Path First）** 是 link-state routing protocol。

特点：

- Open：协议公开可用
- 每台 router flood OSPF link-state advertisements
- 每台 router 获得 AS 内完整 topology
- 每台 router 使用 Dijkstra algorithm 计算 forwarding table
- OSPF message 直接承载在 IP 上，不使用 TCP 或 UDP
- 支持多种 link-cost metrics，例如 bandwidth、delay
- OSPF messages 可以认证，防止恶意注入 routing information

#### 3. Hierarchical OSPF

为了扩展性，OSPF 可以使用两级层次结构：

- local area
- backbone

关键思想：

- link-state advertisements 只在 area 内或 backbone 内 flood
- router 只掌握自己 area 的详细 topology
- 对其他 area，只知道大致方向或 summarized distance

常见 router roles：

| Router type | Role |
|---|---|
| Local routers | 只在本 area 内 flood link-state information，并计算 area 内 routes |
| Area border routers | 连接 local area 和 backbone，向 backbone 汇总 area 内距离信息 |
| Backbone routers | 在 backbone 中运行 OSPF |
| Boundary routers | 连接其他 AS |
| Internal routers | area 内部普通 routers |

Hierarchical OSPF 的核心目的：

- 降低 LS flooding 范围
- 缩小每台 router 需要维护的 topology detail
- 提高大规模网络中的 routing scalability

### BGP: Inter-AS Routing

#### 1. BGP 是什么

**BGP（Border Gateway Protocol）** 是 Internet 的 de facto inter-domain routing protocol。

它的作用是把 Internet 的各个 AS 粘在一起，因此常被称为：

> the glue that holds the Internet together

BGP 允许一个 AS 对外宣布：

- 我在这里
- 我能到达哪些 prefixes
- 可以通过哪些 AS path 到达

BGP 给每个 AS 提供能力：

- 使用 **eBGP** 从 neighboring AS 获取 subnet reachability information
- 使用 **iBGP** 在 AS 内传播这些 reachability information
- 根据 reachability 和 policy 选择 route
- 向其他 AS advertised destination reachability information

#### 2. eBGP 和 iBGP

**eBGP（external BGP）**

- 运行在不同 AS 的 gateway routers 之间
- 用来交换跨 AS 的 reachability information

**iBGP（internal BGP）**

- 运行在同一个 AS 内部的 BGP routers 之间
- 用来把从外部学到的 reachability information 传播给 AS 内其他 routers

Gateway routers 通常同时运行：

- eBGP
- iBGP
- AS 内部的 intra-AS routing protocol，例如 OSPF

#### 3. BGP session 和 path-vector

BGP routers 之间通过 **BGP session** 交换 BGP messages。

BGP session 是：

- 半永久 TCP connection
- 两端 routers 称为 BGP peers

BGP 是 **path-vector protocol**。

一个 BGP advertisement 可以写成：

```text
AS3, X
```

含义是：

- AS3 宣布自己可以到达 prefix `X`
- 如果别的 AS 把 traffic 发给 AS3，AS3 承诺继续把 datagrams 转向 `X`

如果 AS2 从 AS3 学到：

```text
AS3, X
```

并且 AS2 愿意把这个路径继续告诉 AS1，则 AS2 会 advertised：

```text
AS2, AS3, X
```

#### 4. BGP route attributes

BGP advertised route 由两部分组成：

```text
prefix + attributes
```

其中：

- **prefix**
  - 被 advertised 的 destination network

- **AS-PATH**
  - 该 prefix advertisement 经过的 AS sequence
  - 可用于 loop detection 和 path selection

- **NEXT-HOP**
  - 指向下一跳 AS 的具体 router interface
  - AS 内部 router 需要通过 intra-AS routing 找到这个 NEXT-HOP

#### 5. Policy-based routing

BGP 和 OSPF 最大的区别之一是：

- OSPF 更关注 performance / shortest path
- BGP 更关注 policy

一个 AS 可以使用 import policy 决定：

- 接受哪些 route advertisements
- 拒绝哪些 routes
- 例如永远不走某个 AS

也可以使用 export policy 决定：

- 把哪些 routes advertised 给 neighbor AS
- 哪些 routes 不对外宣布

典型商业 policy：

- ISP 通常愿意转发自己 customer 的 traffic
- 不愿意免费帮两个非客户 ISP 做 transit

例如：

- `B` 不想帮 `C` 经由 `B` 到达 `A` 的 customer
- 那么 `B` 可以选择不向 `C` advertised 某些 path

所以 BGP route 不一定是最短的，它首先要符合 policy。

#### 6. Hot potato routing

**Hot potato routing** 的思想是：

> 尽快把 packet 从本 AS 扔出去。

如果 AS 内某个 router 学到了多个出口都能到达 destination `X`，它可能选择：

- intra-AS cost 最小的 gateway

而不一定选择：

- AS-PATH 最短
- 全局端到端 cost 最小

也就是说，hot potato routing 优先考虑本 AS 内部成本，把外部路径代价交给其他 AS。

#### 7. BGP route selection

当 BGP router 学到多个到同一 destination 的 routes 时，常见选择顺序是：

1. **Local preference**
   - 本地策略，通常最优先

2. **Shortest AS-PATH**
   - AS sequence 更短的路径优先

3. **Closest NEXT-HOP**
   - 使用 hot potato routing，选择 AS 内部代价最低的出口

4. **Additional criteria**
   - 其他 tie-break rules

#### 8. 为什么 intra-AS 和 inter-AS routing 不一样

| Dimension | Intra-AS | Inter-AS |
|---|---|---|
| Policy | 单一管理者内部，policy 不是主要问题 | 不同组织之间，policy 非常重要 |
| Performance | 可以主要优化 performance | policy 往往压过 performance |
| Scale | 在一个 AS 内扩展 | 需要支撑整个 Internet 的层次化扩展 |
| Typical protocol | OSPF | BGP |

### SDN Control Plane

#### 1. 为什么需要 SDN

传统 per-router control plane 中：

- 每个 router 都运行自己的 routing protocols
- 控制逻辑分散在所有 routers 中
- traffic engineering 主要靠调整 link weights

这会带来限制：

- 想让 `u -> z` traffic 走指定路径，只能尝试改 link weights
- 想把 traffic 分摊到多条路径，传统 destination-based routing 很难表达
- 想让不同 traffic classes 走不同路径，LS/DV 也很难直接做到

SDN 的目标是让网络控制更可编程、更集中、更灵活。

#### 2. SDN 的四个特征

SDN 的核心特征包括：

1. **Generalized flow-based forwarding**
   - 使用 match plus action
   - 例如 OpenFlow

2. **Control/data plane separation**
   - switch 负责 data plane forwarding
   - controller 负责 control logic

3. **Control-plane functions external to switches**
   - 控制逻辑不再绑定在每台 switch 内

4. **Programmable control applications**
   - routing、access control、load balancing 等都可以作为控制应用实现

#### 3. SDN architecture

SDN 通常包含三类角色：

**Data-plane switches**

- 快速、简单、便宜
- 在硬件中执行 generalized forwarding
- flow tables 由 controller 计算和安装

**SDN controller / network OS**

- 维护 network-wide state
- 通过 southbound API 控制 switches
- 通过 northbound API 向 network-control applications 提供抽象
- 实际实现通常是分布式系统，以提升 performance、scalability、fault tolerance

**Network-control applications**

- 是控制逻辑的大脑
- 例如 routing、access control、load balancing
- 使用 controller 提供的 API 和全网状态来做决策

#### 4. Northbound API 和 Southbound API

| Interface | Between | Role |
|---|---|---|
| Northbound API | network-control apps 和 controller | 给应用提供网络抽象，例如 topology、intent、REST API |
| Southbound API | controller 和 switches | 下发表项、查询状态、接收事件，例如 OpenFlow |

SDN controller 内部通常包括：

| Component | Role |
|---|---|
| Communication layer | 和 controlled devices 通信，例如 OpenFlow、SNMP |
| Network-wide state management | 维护 links、switches、hosts、statistics、flow tables 等状态 |
| Interface to control apps | 给控制应用提供抽象和 API |

#### 5. OpenFlow protocol

OpenFlow 工作在 controller 和 switch 之间。

特点：

- 使用 TCP 交换 messages
- encryption 是 optional
- messages 分为三类：
  - controller-to-switch
  - asynchronous，switch-to-controller
  - symmetric，例如 request/response

常见 controller-to-switch messages：

| Message | Meaning |
|---|---|
| `features` | controller 查询 switch features |
| `configure` | 查询或设置 switch configuration |
| `modify-state` | 添加、删除、修改 flow table entries |
| `packet-out` | controller 指示某个 packet 从指定 switch port 发出 |

常见 switch-to-controller messages：

| Message | Meaning |
|---|---|
| `packet-in` | 把 packet 或其控制权交给 controller |
| `flow-removed` | 通知 controller 某个 flow-table entry 被删除 |
| `port status` | 通知 port 状态变化 |

实际网络管理员通常不会直接手写 OpenFlow messages，而是通过 controller 上层抽象进行网络配置。

#### 6. SDN control/data plane interaction example

一个 link failure 的 SDN 处理过程：

1. `s1` 发现某条 link failure
2. `s1` 用 OpenFlow `port status` message 通知 controller
3. controller 更新自己的 link-status information
4. routing application 被触发，例如运行 Dijkstra
5. routing application 使用 controller 中的 network graph 和 link-state information 计算新 routes
6. controller 计算新的 flow tables
7. controller 通过 OpenFlow 把新表项安装到需要更新的 switches

这个例子体现了 SDN 的关键：

- switches 报告事件
- controller 维护全局状态
- control application 计算策略
- controller 下发表项
- data plane 继续按表转发

### ICMP

#### 1. ICMP 是什么

**ICMP（Internet Control Message Protocol）** 用于 hosts 和 routers 之间传递 network-level information。

常见用途：

- error reporting
  - destination network unreachable
  - destination host unreachable
  - destination port unreachable
  - destination protocol unreachable

- echo request / echo reply
  - `ping` 使用

ICMP 是网络层协议，但它的 messages 被封装在 IP datagrams 中。

一个 ICMP message 通常包含：

- type
- code
- 引发错误的 IP datagram 的前若干字节

常见 ICMP messages：

| Type | Code | Description |
|---:|---:|---|
| 0 | 0 | echo reply |
| 3 | 0 | destination network unreachable |
| 3 | 1 | destination host unreachable |
| 3 | 2 | destination protocol unreachable |
| 3 | 3 | destination port unreachable |
| 8 | 0 | echo request |
| 11 | 0 | TTL expired |
| 12 | 0 | bad IP header |

#### 2. Traceroute 如何使用 ICMP

`traceroute` 的核心思路是利用 TTL 逐跳探测。

Source 的行为：

1. 发送一组 UDP segments，TTL = 1
2. 再发送一组 UDP segments，TTL = 2
3. 继续增加 TTL
4. 通常每个 TTL 发 3 个 probes

Router 的行为：

- 当 packet 到达第 `n` 跳 router 且 TTL 减为 0
- router 丢弃 packet
- router 返回 ICMP message：

```text
type = 11, code = 0
```

也就是 TTL expired。

Source 收到 ICMP 后：

- 记录返回 ICMP 的 router 地址
- 计算 RTT

什么时候停止？

- 当 UDP segment 最终到达 destination host
- destination host 发现目标 UDP port 不可达
- 返回 ICMP port unreachable：

```text
type = 3, code = 3
```

source 收到这个消息后就知道 traceroute 已经到达目的主机。

### Conclusion

**易混概念**

| Concept A | Concept B | 区别 |
|---|---|---|
| Forwarding | Routing | forwarding 按表转发；routing 计算路径和表项 |
| Per-router control plane | SDN control plane | Per-router 是每台 router 各自运行控制逻辑并互相交换信息；SDN 是 controller 逻辑集中计算并下发表项 |
| Link-state | Distance-vector | LS 有全局 topology；DV 只和邻居交换估计 |
| Dijkstra | Bellman-Ford | Dijkstra 用于 LS；Bellman-Ford 用于 DV |
| OSPF | BGP | OSPF 是 intra-AS；BGP 是 inter-AS |
| eBGP | iBGP | eBGP 跨 AS；iBGP 在 AS 内传播 BGP 信息 |
| AS-PATH | NEXT-HOP | AS-PATH 是经过的 AS 序列；NEXT-HOP 是下一跳 AS 的具体入口 |
| Policy | Performance | BGP 中 policy 往往比最短路径更重要 |
| SDN controller | Data-plane switch | controller 算规则；switch 按规则转发 |
| ICMP TTL expired | ICMP port unreachable | traceroute 中前者表示中间跳，后者表示到达目的主机 |

## Link Layer and LANs 链路层与局域网

链路层（Link Layer）的任务是：

- 把 network-layer datagram 从一个 node 传到同一条 link 上的相邻 node

这里的 **node** 可以是：

- host
- router
- switch

这里的 **link** 可以是：

- 有线链路
- 无线链路
- LAN

链路层传输的数据单位是：

- **frame（帧）**

可以理解为：

```text
IP datagram
  -> encapsulated into link-layer frame
  -> transmitted over one physical link
```

注意：一个端到端 IP datagram 在路径上经过多条 links 时，每一跳可能使用不同的 link-layer protocol。例如第一跳 Wi-Fi，下一跳 Ethernet，再下一跳光纤链路。

### Link Layer Overview

#### 1. Link layer 的位置

链路层通常实现在：

- host 的 NIC（Network Interface Card）
- router / switch 的接口硬件
- 一部分软件、硬件和 firmware 的组合

发送端：

- network layer 把 datagram 交给 link layer
- link layer 把 datagram 封装成 frame
- 加上 header、trailer、error checking bits 等

接收端：

- link layer 检查 frame 是否出错
- 如果通过检查，就取出 datagram
- 交给上层 network layer

#### 2. Link layer services

链路层可能提供以下服务：

**Framing**

- 把 network-layer datagram 封装进 frame
- 添加 link-layer header 和 trailer

**Link access**

- 如果链路是 shared medium，需要决定谁可以发送
- 这就是 MAC protocol 要解决的问题

**Reliable delivery between adjacent nodes**

- 在相邻节点之间提供可靠传输
- 对低误码率有线链路通常不常用
- 对无线链路更有意义，因为无线误码率更高

**Flow control**

- 控制相邻发送方和接收方之间的发送节奏

**Error detection**

- 检测 bit errors
- 发现错误后可以丢弃 frame 或触发重传

**Error correction**

- 接收方不仅检测错误，还能直接纠正某些 bit errors

**Half-duplex / full-duplex**

- half-duplex：两端都能发，但不能同时发
- full-duplex：两端可以同时发送

#### 3. IP hourglass

Internet 可以理解为一个 hourglass：

- 上层有很多应用和传输协议：HTTP、SMTP、QUIC、TCP、UDP 等
- 下层有很多链路层和物理层技术：Ethernet、Wi-Fi、Bluetooth、fiber、radio 等
- 中间“细腰”是 IP

IP 的作用是：

- 给各种上层协议提供统一的网络层接口
- 屏蔽底层多种 link-layer technologies 的差异

### Error Detection and Correction

#### 1. EDC 的基本思想

链路层会在 data bits 后面加上一些冗余位：

- **EDC（Error Detection and Correction bits）**

发送方发送：

```text
D + EDC
```

接收方收到：

```text
D' + EDC'
```

然后检查是否满足编码规则。

需要注意：

- error detection 不是 100% 可靠
- 冗余位越多，检测和纠错能力通常越强

#### 2. Parity checking

**Single-bit parity**

- 用 1 个 parity bit 检测 single-bit error
- even parity 的规则是：让总的 `1` 的个数为偶数

例如：

```text
data bits 中 1 的个数是奇数 -> parity bit = 1
data bits 中 1 的个数是偶数 -> parity bit = 0
```

它可以检测单个 bit 翻转，但不能可靠处理多个 bit 同时出错。

**Two-dimensional parity**

- 把 data bits 排成二维矩阵
- 对每一行和每一列都计算 parity
- 如果只有一个 bit 出错，可以通过“出错行”和“出错列”的交点定位并纠正

所以：

- one-dimensional parity 主要用于 detection
- two-dimensional parity 可以 detect and correct single-bit error

#### 3. Internet checksum

Internet checksum 在传输层已经见过。

发送方：

- 把内容看成一串 16-bit integers
- 做 one's complement sum
- 把结果放进 checksum field

接收方：

- 重新计算 checksum
- 如果结果和 checksum field 不一致，说明 detected error
- 如果一致，只能说“没有检测到错误”，不能保证一定没错

#### 4. CRC

**CRC（Cyclic Redundancy Check，循环冗余检测）** 是链路层中非常常见的强 error-detection 方法。

它使用 modulo-2 arithmetic，也就是 XOR：

| a | b | a XOR b |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |

在 modulo-2 中：

- 加法和减法都是 XOR
- 没有进位
- 没有借位

#### 5. CRC 的计算

设：

- $r$ 是CRC检验位的长度
- $D$ 是 data bits
- $G$ 是 generator，长度为 $r+1$ bits
- $R$ 是要计算出的 $r$ 个 CRC bits

目标是选择 $R$，使得：

$$
\langle D,R \rangle = D \cdot 2^r \oplus R
$$

能够被 $G$ 整除，也就是 modulo-2 division 的 remainder 为 0。

等价地：

$$
R = \operatorname{remainder}\left(\frac{D \cdot 2^r}{G}\right)
$$

接收方：

- 用相同的 generator $G$ 去除收到的 bit pattern
- 如果 remainder 非 0，则 detected error
- 如果 remainder 为 0，则认为通过检查

课件例子中：

- $G = 1001$（选定的generator）
- $D \cdot 2^r = 101110000$（在数据D后面补`r`个0）
- 计算出的 remainder 是：

```text
R = 011
```

**实际计算时可以按这几步做：**

1. 看 generator $G$ 的长度。若 $G$ 有 $r+1$ bits，则 CRC 长度是 $r$ bits
2. 在原始 data $D$ 后面补 $r$ 个 0，得到 $D \cdot 2^r$
3. 用 $G$ 对 $D \cdot 2^r$ 做 modulo-2 division，也就是每一步都用 XOR 消去最高位
4. 除法最后剩下的 $r$ bits remainder 就是 CRC bits $R$
5. 发送方真正发送的是 $D$ 后面接 $R$，也就是 $\langle D,R\rangle$
6. 接收方再次用 $G$ 去除 $\langle D,R\rangle$，如果余数不是 0，就说明检测到 bit error

CRC 的核心直觉是：发送方故意补上一段 $R$，让整个 bit string 刚好能被 $G$ 整除；传输中如果某些 bit 被翻转，整除关系大概率会被破坏。

#### 6. CRC 的检测能力

CRC 的常见性质：

- 如果 $G(x)$ 中 $x^r$ 和 $x^0$ 的系数都是 1，可以检测所有 single-bit errors
- 如果 $G(x)$ 有至少三项的 factor，可以检测所有 double-bit errors
- 可以检测所有长度小于 $r+1$ bits 的 burst errors

CRC 广泛用于：

- Ethernet
- 802.11 Wi-Fi

### Multiple Access Protocols

> 从这部分开始还不如直接看课件，太繁杂琐碎了

#### 1. 两类 links

链路可以分成两类：

**Point-to-point link**

- 两端直接相连
- 例如 host 到 Ethernet switch 的链路
- 也包括早期 PPP dial-up

**Broadcast link / shared medium**

- 多个 nodes 共享同一个通信介质
- 例如早期 bus Ethernet、Wi-Fi、cable access upstream

在 shared medium 中，如果两个或多个 nodes 同时发送，就会发生：

- interference
- collision

所以需要 **multiple access protocol** 决定每个 node 什么时候可以发送。

#### 2. 理想的 multiple access protocol

假设 shared channel rate 是 $R$ bps。

理想协议希望满足：

1. 只有一个 node 要发送时，它可以以 rate $R$ 发送
2. 有 $M$ 个 nodes 要发送时，每个平均能获得 $R/M$
3. fully decentralized
   - 没有特殊协调节点
   - 不依赖全局时钟同步
4. simple

现实协议通常只能在这些目标之间折中。

#### 3. MAC protocol 分类

| Category | Idea | Examples |
|---|---|---|
| Channel partitioning | 把 channel 切成 time / frequency / code 等小块 | TDMA、FDMA、CDMA |
| Random access | 不预先分配 channel，允许 collision，再从 collision 中恢复 | ALOHA、CSMA、CSMA/CD、CSMA/CA |
| Taking turns | nodes 轮流发送，有数据多的 node 可以占用更久 | Polling、Token passing |

#### 4. TDMA 和 FDMA

**TDMA（Time Division Multiple Access）**

- 时间被划分成 rounds
- 每个 station 在每轮中获得固定长度 slot
- slot 长度通常等于传一个 packet 的时间
- 没有数据要发时，该 station 的 slot 会 idle

优点：

- 高负载下公平、无 collision

缺点：

- 低负载下效率低，因为没有数据的 slot 被浪费

**FDMA（Frequency Division Multiple Access）**

- channel spectrum 被分成多个 frequency bands
- 每个 station 分配固定 frequency band
- station 没数据时，对应 frequency band idle

#### 5. Random access protocols

Random access 的基本思想：

- node 有 frame 要发时，以 full channel rate $R$ 发送
- 不提前协调
- 如果发生 collision，再用某种机制恢复

协议需要定义：

- 如何检测 collision
- collision 后如何重传，例如随机延迟后重传

#### 6. Slotted ALOHA

Slotted ALOHA 的假设：

- 所有 frames 大小相同
- 时间被分成等长 slots
- 一个 slot 正好可以传一个 frame
- nodes 只能在 slot 开始时发送
- nodes 之间 slot 同步
- 如果两个或多个 nodes 在同一个 slot 发送，则 collision

操作：

- node 有新 frame，就在下一个 slot 发送
- 如果成功，下个 slot 可以继续发新 frame
- 如果 collision，则之后每个 slot 以概率 $p$ 重传，直到成功

优点：

- 单个 active node 可以占满 channel
- decentralized
- simple

缺点：

- collision slots 被浪费
- idle slots 被浪费
- 需要 clock synchronization

#### 7. Slotted ALOHA efficiency

假设：

- 有 $N$ 个 nodes
- 每个 node 在某个 slot 以概率 $p$ 发送

给定某个 node 成功的概率是：

$$
p(1-p)^{N-1}
$$

某个 slot 中有任意一个 node 成功的概率是：

$$
Np(1-p)^{N-1}
$$

当 nodes 很多时，最大 efficiency 趋近于：

$$
\frac{1}{e} \approx 0.37
$$

也就是说，Slotted ALOHA 最理想情况下也只有约 37% 的 slots 用于成功传输。

#### 8. Pure ALOHA

Pure ALOHA 更简单：

- 没有 slot
- frame 一到就立刻发送
- 不需要同步

但 collision window 更大。

如果一个 frame 在 $t_0$ 开始发送，那么任何在：

$$
[t_0 - 1, t_0 + 1]
$$

这个范围内开始发送的其他 frame 都可能与它重叠。

Pure ALOHA efficiency 约为：

$$
18\%
$$

低于 Slotted ALOHA。

#### 9. CSMA 和 CSMA/CD

**CSMA（Carrier Sense Multiple Access）**

核心思想：

> listen before transmit

规则：

- 如果 channel idle，就发送整个 frame
- 如果 channel busy，就 defer transmission

但 CSMA 仍可能 collision，因为 propagation delay 存在：

- A 开始发时，B 可能还没听到 A 的信号
- B 也以为 channel idle，于是发送
- 两个 frame 仍然 collision

**CSMA/CD（Collision Detection）**

- 一边发送，一边检测 collision
- 一旦检测到 collision，就 abort transmission
- 发送 jam signal
- 然后 binary exponential backoff

CSMA/CD 在 wired Ethernet 中容易实现，但在 wireless 中很难，因为无线节点发送时通常很难同时可靠监听 collision。

#### 10. Ethernet CSMA/CD algorithm

Ethernet CSMA/CD 的过程：

1. NIC 从 network layer 收到 datagram，创建 frame
2. NIC 监听 channel
   - idle：开始发送
   - busy：等待到 idle 后发送
3. 如果整个 frame 发完都没有 collision，则完成
4. 如果发送过程中检测到其他 transmission：
   - abort
   - 发送 jam signal
5. 进入 binary exponential backoff
   - 第 $m$ 次 collision 后，随机选择：

$$
K \in \{0,1,2,\dots,2^m-1\}
$$

   - 等待：

$$
K \cdot 512 \text{ bit times}
$$

   - 再回到监听 channel

collision 越多，backoff interval 越长。

#### 11. CSMA/CD efficiency

设：

- $t_{prop}$ 是 LAN 中两个 nodes 之间最大 propagation delay
- $t_{trans}$ 是发送最大 frame 的 transmission time

CSMA/CD efficiency 近似为：

$$
\text{efficiency} = \frac{1}{1 + 5t_{prop}/t_{trans}}
$$

当：

- $t_{prop} \to 0$
- 或 $t_{trans} \to \infty$

efficiency 趋近于 1。

#### 12. Taking turns protocols

Channel partitioning：

- 高负载下公平高效
- 低负载时浪费 slot / frequency band

Random access：

- 低负载下效率高
- 高负载下 collision overhead 大

Taking turns protocols 试图结合两者优点。

**Polling**

- master node 轮流邀请其他 nodes 发送
- 常用于 dumb devices

问题：

- polling overhead
- latency
- master 是 single point of failure

**Token passing**

- 一个 token 在 nodes 间顺序传递
- 只有拿到 token 的 node 可以发送

问题：

- token overhead
- latency
- token 丢失或故障会影响系统

### LAN Addressing and ARP

#### 1. IP address 和 MAC address

**IP address**

- 32-bit network-layer address
- 用于 layer 3 forwarding
- 和 subnet / routing 相关

**MAC address**

- link-layer address
- 多数 LAN 中是 48 bits
- 常写成 hexadecimal notation，例如：

```text
1A-2F-BB-76-09-AD
```

作用：

- 在同一个 LAN / subnet 内，把 frame 从一个 interface 送到另一个 physically connected interface

关键区别：

- IP address 用于跨网络的端到端寻址和路由
- MAC address 用于本地链路上的下一跳 frame delivery

#### 2. ARP 的作用

**ARP（Address Resolution Protocol）** 解决的问题是：

> 已知同一 LAN 内某个 interface 的 IP address，如何得到它的 MAC address？

每个 host / router 在 LAN 上维护一个 ARP table。

ARP table entry 通常包含：

| Field | Meaning |
|---|---|
| IP address | 某个 LAN node/interface 的 IP |
| MAC address | 对应的 link-layer address |
| TTL | 该映射还能保留多久，常见约 20 min |

#### 3. ARP protocol in action

假设 host A 想发送 datagram 给同一 LAN 内的 host B，但 A 不知道 B 的 MAC address。

过程：

1. A 查询自己的 ARP table
2. 如果没有 B 的 entry，A 广播 ARP query
3. ARP query 的 destination MAC 是广播地址：

```text
FF-FF-FF-FF-FF-FF
```

4. LAN 上所有 nodes 都收到这个 ARP query
5. 只有目标 IP 对应的 B 回 ARP reply
6. B 的 ARP reply 直接发回 A，告诉 A 自己的 MAC address
7. A 把 `(B IP, B MAC, TTL)` 写入 ARP table

课件例子：

ARP query：

| Field | Value |
|---|---|
| Destination MAC | `FF-FF-FF-FF-FF-FF` |
| Source MAC | `71-65-F7-2B-08-53` |
| Source IP | `137.196.7.23` |
| Target IP | `137.196.7.14` |

ARP reply：

| Field | Value |
|---|---|
| Destination MAC | `71-65-F7-2B-08-53` |
| Source IP | `137.196.7.14` |
| Source MAC | `58-23-D7-FA-20-B0` |

#### 4. Routing to another subnet

如果 A 要发送 datagram 给不同 subnet 的 B：

- IP destination 仍然是 B 的 IP
- 但 link-layer frame 的 destination MAC 不是 B 的 MAC
- 而是 first-hop router 的 MAC

原因：

- B 不在本 LAN 内
- A 不能直接用 Ethernet frame 找到 B
- A 只能先把 frame 交给默认网关 router

过程：

1. A 创建 IP datagram：

```text
IP src  = A's IP
IP dest = B's IP
```

2. A 创建 Ethernet frame：

```text
MAC src  = A's MAC
MAC dest = first-hop router's MAC
```

3. Router 收到 frame，取出 IP datagram
4. Router 根据 IP destination 查 forwarding table
5. Router 在下一条 link 上重新封装 frame：

```text
IP src  = A's IP
IP dest = B's IP
MAC src  = router outgoing interface MAC
MAC dest = B's MAC 或下一跳 router MAC
```

关键点：

- IP source/destination 在端到端路径上通常保持不变
- MAC source/destination 每一跳都会变化

### Ethernet

#### 1. Ethernet 的特点

Ethernet 是 dominant wired LAN technology。

原因：

- 最早广泛使用的 LAN 技术之一
- simple
- cheap
- speed 持续提高，从 Mbps 到 Gbps / hundreds of Gbps

#### 2. Ethernet topology

早期 Ethernet：

- bus topology
- 所有 nodes 在同一个 collision domain
- 多个 nodes 可能互相 collision

现代 Ethernet：

- switched topology
- 中心是 active layer-2 switch
- 每个 host 与 switch 之间是独立 link
- 通常 full-duplex
- 不同 links 之间不会互相 collision

#### 3. Ethernet frame structure

Ethernet frame 主要字段：

| Field | Purpose |
|---|---|
| Preamble | 同步 sender 和 receiver clock |
| Destination address | destination MAC address |
| Source address | source MAC address |
| Type | 指示上层协议，例如 IP、ARP |
| Data / payload | 封装的 network-layer packet |
| CRC | error detection |

Preamble：

- 7 bytes 的 `10101010`
- 后接 1 byte 的 `10101011`
- 用于让接收方同步时钟

MAC addresses：

- source / destination MAC 都是 6 bytes
- 如果 destination MAC 匹配本机，或是 broadcast address，adapter 会把 payload 交给上层
- 否则丢弃 frame

Type field：

- 用于 demultiplexing
- 告诉接收端 payload 应该交给 IP、ARP 或其他协议

CRC：

- 接收端发现 error 就 drop frame

#### 4. Ethernet 是 connectionless 和 unreliable

Ethernet 是：

- **connectionless**
  - 发送 NIC 和接收 NIC 之间没有 handshaking

- **unreliable**
  - 接收 NIC 不发送 ACK / NAK
  - 出错 frame 被 drop
  - 是否恢复由上层协议决定，例如 TCP

### LAN Switches

#### 1. Ethernet switch 是什么

Ethernet switch 是 link-layer device。

它会：

- store and forward Ethernet frames
- 检查 incoming frame 的 destination MAC
- 决定把 frame 转发到哪个 output link

Switch 的特点：

- transparent：hosts 不需要知道 switch 存在
- plug-and-play
- self-learning
- 不需要人工配置每个 MAC entry

#### 2. Switch 和 collision domain

在 switched Ethernet 中：

- hosts 通常和 switch 有 dedicated direct connection
- switch 会 buffer frames
- 每条 link 是独立 collision domain
- full-duplex link 中基本没有 collision
- 多组通信可以同时发生

例如：

- A 到 A' 可以传
- B 到 B' 也可以同时传
- 只要它们不竞争同一个输出端口

#### 3. Switch forwarding table

Switch table entry 通常是：

| Field | Meaning |
|---|---|
| MAC address | host 的 MAC |
| Interface | 通过哪个 switch port 可到达 |
| Timestamp / TTL | entry 的时间信息 |

看起来像 routing table，但区别是：

- router table 通常由 routing algorithms 计算
- switch table 通过 self-learning 建立

#### 4. Self-learning

Switch 的 self-learning 规则：

> 当 switch 收到 frame 时，记录 source MAC 是从哪个 interface 进来的。

例如：

- frame 从 interface 1 到达
- source MAC 是 `A`
- switch 记录：

```text
A -> interface 1
```

#### 5. Forwarding / flooding

当 switch 收到 frame 后：

1. 学习 source MAC 对应的 incoming interface
2. 查 destination MAC

如果 destination MAC 在 table 中：

- selective forwarding
- 只发到对应 interface

如果 destination MAC 不在 table 中：

- flood
- 发到除 incoming interface 以外的所有 interfaces

如果 destination interface 就是 incoming interface：

- filter
- 不需要转发

#### 6. Interconnecting switches

多个 self-learning switches 可以互联。

它们仍然使用同样规则：

- 从 incoming frame 学 source MAC location
- 对 unknown destination flood
- 对 known destination selectively forward

所以不需要复杂配置，也能逐渐学会跨多台 switches 的路径。

#### 7. Switches vs Routers

| Dimension | Switch | Router |
|---|---|---|
| Layer | Link layer | Network layer |
| Data unit | Frame | Datagram / packet |
| Header examined | MAC address | IP address |
| Forwarding table | self-learning + flooding | routing algorithms / manual config |
| Addressing | MAC address | IP address |
| Scope | LAN 内部 | 跨网络 |

共同点：

- 都是 store-and-forward
- 都有 forwarding tables

### VLANs

#### 1. 为什么需要 VLAN

如果一个大型 LAN 是 single broadcast domain，会有问题：

- ARP、DHCP、unknown MAC flooding 等广播流量会扩散到整个 LAN
- 效率下降
- 安全和隐私问题增加
- 用户移动物理位置时，逻辑部门划分不灵活

例如：

- CS 系用户搬到 EE 楼
- 物理上接入 EE switch
- 但逻辑上仍希望属于 CS network

#### 2. Port-based VLAN

**VLAN（Virtual LAN）** 可以把一套物理 LAN infrastructure 划分成多个 virtual LANs。

Port-based VLAN 的做法是：

- switch ports 被划分到不同 VLAN
- 同一个 VLAN 内的 ports 像一个独立 LAN
- 不同 VLAN 之间二层隔离

例如：

- ports 1-8 属于 EE VLAN
- ports 9-15 属于 CS VLAN

效果：

- frames from/to ports 1-8 只能到 ports 1-8
- frames from/to ports 9-15 只能到 ports 9-15

VLAN membership 也可以基于：

- switch port
- endpoint MAC address

不同 VLAN 之间通信需要 routing，就像两个独立 subnet 之间通信一样。

#### 3. VLAN trunk

如果 VLAN 跨越多台 switches，就需要 trunk port。

**Trunk port**：

- 在 switches 之间传输多个 VLAN 的 frames
- frame 必须携带 VLAN ID

普通 Ethernet frame 没有 VLAN ID，所以需要：

- **802.1Q**

#### 4. 802.1Q VLAN frame

802.1Q 会在 standard Ethernet frame 中插入 VLAN tag，位置在 source address 后面。

VLAN tag 包含：

| Field | Meaning |
|---|---|
| Tag Protocol Identifier | 2 bytes，值为 `81-00` |
| Tag Control Information | 包含 12-bit VLAN ID 和 3-bit priority |
| CRC | 因 frame 改变，需要重新计算 |

所以 802.1Q 的作用是：

- 让 trunk link 上的 frame 带有 VLAN identity
- 接收 switch 根据 VLAN ID 判断 frame 属于哪个 VLAN

### Data Center Networking

#### 1. 数据中心网络的特点

Datacenter 通常包含：

- tens to hundreds of thousands of hosts
- 大量 servers 近距离互联
- 服务 e-business、content serving、search、data mining 等应用

主要挑战：

- 多个 applications 同时服务海量 clients
- reliability
- load balancing
- 避免 processing、networking、data bottlenecks

#### 2. Fat-tree 结构

数据中心常用多层 switch architecture，例如 fat-tree。

典型元素：

- **Top-of-Rack (ToR) switch**
  - 每个 rack 一个
  - 连接 rack 内 servers

- **Tier-2 switches**
  - 连接多个 ToR switches

- **Tier-1 switches**
  - 更高层 aggregation

- **Border routers**
  - 连接数据中心外部网络

Fat-tree 的好处：

- racks 之间有多条 paths
- 提高 aggregate throughput
- 提供 redundancy，提高 reliability

#### 3. Load balancer

数据中心中的 load balancer 做 application-layer routing：

- 接收外部 client requests
- 把 workload 分配给数据中心内部 servers
- 对外隐藏数据中心内部结构
- 将结果返回给 client

#### 4. 数据中心中的协议创新

课件提到的方向包括：

- Link layer
  - RoCE：RDMA over Converged Ethernet

- Transport layer
  - ECN 用于数据中心拥塞控制
  - DCTCP、DCQCN
  - hop-by-hop backpressure congestion control

- Routing / management
  - SDN 在数据中心广泛使用
  - 尽量把相关服务和数据放近，例如同 rack 或 nearby rack，减少跨高层交换的通信

### A Day in the Life of a Web Request

这一部分把前面所有层串起来，看一个用户请求网页时发生了什么。

场景：

- laptop 接入校园网络
- 用户访问 `www.baidu.com`

#### 1. DHCP：先获得网络配置

刚接入网络时，laptop 需要知道：

- 自己的 IP address
- first-hop router / default gateway
- DNS server address

它使用 DHCP。

DHCP message 封装过程：

```text
DHCP
  -> UDP
    -> IP
      -> Ethernet
        -> Physical
```

DHCP request 通过 Ethernet broadcast 发送：

```text
Destination MAC = FF-FF-FF-FF-FF-FF
```

DHCP server 回复 DHCP ACK，其中包含：

- client IP address
- first-hop router IP
- DNS server name / IP

#### 2. ARP：获得 first-hop router 的 MAC

在发送 DNS query 之前，client 已经知道 DNS server 的 IP，但 DNS server 通常不在本 LAN。

所以 client 需要先把 frame 发给 first-hop router。

此时 client 需要知道：

- first-hop router interface 的 MAC address

于是 client 发送 ARP query：

- 广播询问 default gateway 的 MAC
- router 返回 ARP reply
- client 把 gateway IP/MAC 写入 ARP table

#### 3. DNS：解析域名

client 构造 DNS query：

```text
DNS
  -> UDP
    -> IP
      -> Ethernet
```

Ethernet frame：

- destination MAC 是 first-hop router 的 MAC

IP datagram：

- destination IP 是 DNS server 的 IP

DNS query 经过 LAN switch、first-hop router、ISP 网络，被路由到 DNS server。

DNS server 返回：

- `www.baidu.com` 对应的 IP address

#### 4. TCP：建立连接

client 要发送 HTTP request 前，需要先和 web server 建立 TCP connection。

过程：

1. client 发送 TCP SYN
2. web server 回复 TCP SYNACK
3. client 再发送 ACK

这就是 TCP 3-way handshake。

这些 TCP segments 被封装在 IP datagrams 中，并通过链路层 frames 一跳一跳传输。

#### 5. HTTP：请求和响应网页

TCP connection 建立后：

1. browser 把 HTTP request 写入 TCP socket
2. HTTP request 被封装成 TCP segment
3. TCP segment 被封装成 IP datagram
4. 每一跳再封装成对应 link-layer frame
5. web server 收到 HTTP request
6. web server 返回 HTTP reply，包含网页内容
7. browser 最终显示网页

这个例子串起了：

- DHCP
- ARP
- DNS
- TCP
- HTTP
- IP routing
- Ethernet frame forwarding

### Conclusion

**易混概念**

| Concept A | Concept B | 区别 |
|---|---|---|
| IP address | MAC address | IP 用于网络层路由；MAC 用于本地链路 frame delivery |
| Datagram | Frame | datagram 是网络层单位；frame 是链路层单位 |
| Error detection | Error correction | detection 只发现错误；correction 能定位并修正某些错误 |
| Parity | CRC | parity 简单但能力弱；CRC 更强，广泛用于 Ethernet/Wi-Fi |
| TDMA/FDMA | Random access | 前者预先分配资源；后者允许竞争和 collision |
| Slotted ALOHA | Pure ALOHA | Slotted 需要同步，效率最高约 37%；Pure 不同步，效率约 18% |
| CSMA | CSMA/CD | CSMA 先听再发；CSMA/CD 还能检测 collision 并中止发送 |
| ARP query | ARP reply | query 广播；reply 单播返回 |
| Switch | Router | switch 看 MAC，工作在 link layer；router 看 IP，工作在 network layer |
| VLAN | Subnet | VLAN 是二层逻辑隔离；不同 VLAN 间通信通常需要三层 routing |
