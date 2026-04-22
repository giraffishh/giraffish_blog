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
updated: 2026-04-22 18:12:52

---

## Introduction

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

#### Client-Server 模式

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

#### P2P 模式

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

#### Processes communicating

- 同一台主机内的两个进程通信，通常由操作系统提供的 **inter-process communication（IPC）** 完成
- 不同主机上的进程通信，则是通过网络交换 **messages（报文）** 完成

在应用层中通常有两个概念：

- **client process**：主动发起通信的进程
- **server process**：等待被联系的进程

> 即使是在 P2P 应用中，也仍然会出现“主动发起方”和“被联系方”，所以 client process 和 server process 这两个角色依然存在。

#### Addressing processes

如果一个进程想接收消息，它必须要有可识别的地址。

仅有主机的 IP 地址还不够，因为：

- 一台主机上可以同时运行多个进程
- 网络必须知道“这台主机上的哪一个进程”才是目标

所以，一个进程的标识通常由两部分组成：

- **IP address**：标识主机
- **Port number**：标识主机中的具体进程

例如：

- HTTP server 默认端口：80
- SMTP mail server 默认端口：25

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

#### DNS 的层次结构

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

#### Root、TLD、Authoritative 的分工

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

#### Local DNS Server

除了层次结构中的 root / TLD / authoritative server，现实中还有一个非常常见的角色：**local DNS server**（本地域名服务器）

它通常：

- 由 ISP、公司、学校等提供
- 也叫 **default name server**
- 是主机发起 DNS 查询时最先接触的服务器

它有两个重要作用：

- **代理（proxy）**：代替客户端去层次结构中继续查询
- **缓存（cache）**：保存最近查过的域名结果

所以用户设备平时并不是直接去问 root server，而是先问本地 DNS 服务器

#### DNS name resolution

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

#### DNS Cache

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

#### DNS Resource Records

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

#### DNS protocol messages

DNS 查询报文和响应报文使用相同的基本格式。

报文中通常包含：

- **identification**：一个 16-bit 标识，用来匹配查询与响应
- **flags**：标志位，用来表示这是 query 还是 reply、是否希望递归、响应是否权威等
- **questions**：问题部分
- **answers**：回答部分
- **authority**：权威信息部分
- **additional information**：附加信息部分

可以看到，DNS 报文不是只装“一个答案”，它还能把权威信息和额外辅助信息一起带回来，从而减少后续查询步骤。

#### 向 DNS 中插入记录

如果一个新公司想上线自己的域名，大致流程通常是：

1. 到域名注册商注册域名
2. 提供自己的 authoritative name server 信息
3. 注册商把对应的 NS / A 记录插入到上级 TLD 服务器中
4. 自己的权威服务器再维护该域名下具体主机的记录

#### DNS 的安全问题

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

**CDN（Content Distribution Network）** 的作用是：

- 在多个地理位置存放内容副本
- 让用户从更近或更合适的节点获取视频

这样可以：

- 降低时延
- 减少源站压力
- 提升大规模用户访问时的分发能力
