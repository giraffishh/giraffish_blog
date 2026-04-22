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
updated: 2026-04-23 01:19:54

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
>- **当前状态：** 这就是纯粹的**【原始数据】**。
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
