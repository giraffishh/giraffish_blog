---
index_img: >-
  https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-01-02-1767336738658.webp
banner_img: >-
  https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/25-12-27-1766802296337.webp
title: CS307 Principles of Database Systems
categories:
  - 学习笔记
tags:
  - 数据库
comments: true
typora-root-url: ..
abbrlink: 9edd5bb
date: 2026-01-02 15:02:57
updated: 2026-01-03 15:51:06

---

![](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-01-02-1767339056414.webp)

## SQL

### DDL 数据定义语言

> DDL 用于构建和管理数据库的结构

#### `CREATE DATABASE`

用于创建一个新的数据库

**语法:**

```postgresql
CREATE DATABASE database_name;
```

#### `DROP DATABASE`

用于删除一个已存在的数据库。这是一个不可逆的操作

**语法:**

```postgresql
DROP DATABASE database_name;
```

`CREATE TABLE`

用于在当前数据库中创建一个新表。这是最核心的 DDL 语句之一

**语法:**

```postgresql
CREATE TABLE table_name (
    column1 datatype constraints,
    column2 datatype constraints,
    ...
    table_constraints
);
```

- **常用数据类型 (datatype):**
  - `INTEGER` 或 `INT`: 整数
  - `BIGINT`: 大整数
  - `SERIAL`: 自增整数，常用于主键
  - `NUMERIC(precision, scale)`: 精确的十进制数
  - `VARCHAR(n)`: 可变长度的字符串
  - `TEXT`: 无长度限制的文本
  - `BOOLEAN`: 布尔值 (`true` 或 `false`)
  - `DATE`: 日期
  - `TIME`: 时间
  - `TIMESTAMP` 或 `TIMESTAMPTZ`: 时间戳（带或不带时区）
  - `JSONB`: 二进制格式的 JSON 数据，效率更高
- **常用约束 (constraints):**
  - `NOT NULL`: 该列不允许为 NULL
  - `UNIQUE`: 该列的值必须唯一
  - `PRIMARY KEY`: 主键，唯一标识表中的每一行（自带 `NOT NULL` 和 `UNIQUE` 属性）
  - `FOREIGN KEY`: 外键，用于关联另一张表
  - `CHECK`: 检查列中的值是否满足特定条件
  - `DEFAULT`: 为列设置默认值

**示例:**

```postgresql
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    hire_date DATE DEFAULT CURRENT_DATE,
    salary NUMERIC(10, 2) CHECK (salary > 0)
);
```

#### `ALTER TABLE`

用于修改现有表的结构

**语法和示例:**

- **添加列:**

  ```postgresql
  ALTER TABLE employees ADD COLUMN department VARCHAR(50);
  ```

- **删除列:**

  ```postgresql
  ALTER TABLE employees DROP COLUMN department;
  ```

- **修改列的数据类型:**

  ```postgresql
  ALTER TABLE employees ALTER COLUMN first_name TYPE TEXT;
  ```

- **添加约束:**

  ```postgresql
  ALTER TABLE employees ADD CONSTRAINT email_unique UNIQUE (email);
  ```

- **删除约束:**

  ```postgresql
  ALTER TABLE employees DROP CONSTRAINT email_unique;
  ```

#### `DROP TABLE`

删除一个表及其所有数据

**语法:**

```postgresql
DROP TABLE tableName;
```

#### `TRUNCATE TABLE`

快速删除一个表中的所有行，但保留表结构。比 `DELETE` 语句更快，且不会触发 `DELETE` 触发器

**语法:**

```postgresql
TRUNCATE TABLE tableName;
```

### DML 数据操作语言

DML 用于管理表中的数据

#### `INSERT INTO`

向表中插入新的行（记录）

**语法:**

```postgresql
-- 插入单行
INSERT INTO table_name (column1, column2, ...)
VALUES (value1, value2, ...);

-- 插入多行
INSERT INTO table_name (column1, column2, ...)
VALUES
    (value1a, value2a, ...),
    (value1b, value2b, ...);
```

**示例:**

```postgresql
INSERT INTO employees (first_name, last_name, email, salary)
VALUES ('John', 'Doe', 'john.doe@example.com', 60000.00);
```

#### `UPDATE`

修改表中的现有记录。**强烈建议始终与 `WHERE` 子句一起使用，否则将更新表中的所有行！**

**语法:**

```postgresql
UPDATE table_name
SET column1 = value1, column2 = value2, ...
WHERE condition;
```

**示例:**

```postgresql
UPDATE employees
SET salary = 65000.00, department = 'Sales'
WHERE id = 1;
```

#### `DELETE FROM`

从表中删除记录。**强烈建议始终与 `WHERE` 子句一起使用，否则将删除表中的所有行！**

**语法:**

```postgresql
DELETE FROM table_name WHERE condition;
```

**示例:**

```postgresql
DELETE FROM employees WHERE id = 1;
```

### DQL 数据查询语言

DQL 用于从数据库中检索信息，是使用最频繁的部分

#### `SELECT`

从表中查询数据

**基本语法:**

```postgresql
SELECT column1, column2, ...
FROM table_name
WHERE condition;
```

**常用子句和示例:**

- **查询所有列:**

  ```postgresql
  SELECT * FROM employees;
  ```

- **`DISTINCT` - 去重查询:**

  ```postgresql
  -- 返回所有不重复的部门名称
  SELECT DISTINCT department FROM employees;
  ```

- **`WHERE` - 条件过滤:**

  ```postgresql
  -- 使用比较运算符 (=, >, <, !=, >=, <=)
  SELECT first_name, salary FROM employees WHERE salary > 50000;
  
  -- 使用 AND, OR, NOT 组合条件
  SELECT * FROM employees WHERE department = 'Sales' AND salary > 60000;
  
  -- 使用 IN 匹配多个值
  SELECT * FROM employees WHERE department IN ('Sales', 'Marketing');
  
  -- 使用 BETWEEN 指定范围
  SELECT * FROM employees WHERE hire_date BETWEEN '2023-01-01' AND '2023-12-31';
  
  -- 使用 LIKE 进行模糊匹配 (% 代表任意多个字符, _ 代表单个字符)
  SELECT * FROM employees WHERE email LIKE '%@example.com';
  ```

- **`ORDER BY` - 排序:**

  ```postgresql
  -- ASC: 升序 (默认), DESC: 降序
  SELECT first_name, salary FROM employees ORDER BY salary DESC;
  ```

- **`LIMIT` 和 `OFFSET` - 分页:**

  ```postgresql
  -- 获取前10条记录
  SELECT * FROM employees LIMIT 10;
  
  -- 跳过前10条，获取接下来的5条
  SELECT * FROM employees LIMIT 5 OFFSET 10;
  ```

#### 聚合函数 (Aggregate Functions) 

`GROUP BY` 分组统计：

  - 常用函数: `COUNT()`, `SUM()`, `AVG()`, `MAX()`, `MIN()`

  ```postgresql
  -- 计算每个部门的员工人数和平均工资
  SELECT
      department,
      COUNT(id) AS number_of_employees,
      AVG(salary) AS average_salary
  FROM employees
  GROUP BY department;
  ```

- **`HAVING` - 对分组后的结果进行过滤:**

  ```postgresql
  -- 找出平均工资超过 70000 的部门
  SELECT
      department,
      AVG(salary) AS average_salary
  FROM employees
  GROUP BY department
  HAVING AVG(salary) > 70000;
  ```

#### 窗口函数 (Window Functions) 

> 窗口函数也用来完成分组统计，与聚合函数不同，窗口函数**不会折叠行**。它在**保留原始行的同时加 Columns**，计算基于特定“窗口”（一组相关行）的值。常用于排名、累计求和、移动平均等

**核心语法:** `函数名() OVER (PARTITION BY 分组列 ORDER BY 排序列)`

**常用函数:**

- **聚合类:** `SUM()`, `AVG()`, `MAX()`, `MIN()` (作为窗口函数使用时，计算的是窗口内的统计值)
- **排名类:**
- `ROW_NUMBER()`: 连续排名，唯一 (1, 2, 3, 4)
- `RANK()`: 跳跃排名，并列 (1, 2, 2, 4)
- `DENSE_RANK()`: 连续排名，并列 (1, 2, 2, 3)
- **偏移类:**
- `LAG(col, n)`: 当前行往前第 n 行的值 (常用于计算环比)
- `LEAD(col, n)`: 当前行往后第 n 行的值

**示例:**

```postgresql
SELECT 
  name,
  department,
  salary,
  -- 计算该员工在部门内的排名
  RANK() OVER (PARTITION BY department ORDER BY salary DESC) as rank_in_dept,
  -- 计算该员工所在部门的最高薪资 (附加在每一行后)
  MAX(salary) OVER (PARTITION BY department) as dept_max_salary
FROM employees;
```

#### `JOIN`

`JOIN`用来连接多个表，假设我们有另一个 `departments` 表：

```postgresql
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL
);
-- 假设 employees 表有一个 department_id 列作为外键
```

- **`INNER JOIN` (内连接):** 返回两个表中匹配的行（交集）

```postgresql
SELECT e.first_name, d.name AS department_name
FROM employees e
INNER JOIN departments d ON e.department_id = d.id;
```

> 普通 JOIN 是 INNER JOIN

- **`LEFT JOIN` (左连接):** 返回左表的所有行，以及右表中匹配的行（右表不匹配的行用 NULL 填充）

```postgresql
SELECT e.first_name, d.name AS department_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id;
```

- **`Right JOIN` (右连接):** 与左连接同理，返回右表的所有行，以及左表中匹配的行（右表不匹配的行用 NULL 填充）

- **`FULL OUTER JOIN` (全外连接)**：它会返回左表和右表中的**所有行**。当某一行在另一个表中没有匹配时，另一个表的列将显示为 `NULL`（并集）

```postgresql
SELECT e.name, d.dept_name
FROM employees AS e
FULL OUTER JOIN departments AS d ON e.department_id = d.id;
```

- **`AS` - 别名:** 为表或列提供一个临时的名称，使查询更易读。上面的 `e` 和 `d` 就是表的别名

#### `UNION`

> 用于将两个或多个 `SELECT` 语句的结果集合并为一个结果集

- **`UNION`**: 合并结果集并**去重**（会有排序/哈希开销，速度较慢）
- **`UNION ALL`**: 直接拼接结果集，**不去重**（性能更高，推荐默认使用）

**语法:**

```postgresql
SELECT column1, column2 FROM table1
UNION [ALL]
SELECT column1, column2 FROM table2;
```

#### `WITH`

> 用于定义一个临时的结果集，可以在主查询中多次引用。主要用于简化复杂的子查询并提高可读性

- **通用 CTE**: 扁平化逻辑，将嵌套子查询拆分为线性的临时表
- **`WITH RECURSIVE`**: PostgreSQL 特色，用于处理层级数据（如组织架构、树形菜单）

**语法:**

```postgresql
WITH cte_name AS (
    -- 这里是子查询逻辑
    SELECT column1, column2 FROM table_name
)
-- 主查询
SELECT * FROM cte_name;
```

**示例:**

```postgresql
-- 结合 UNION ALL 的 CTE 示例
WITH all_users AS (
    SELECT name, 'US' AS region FROM us_users
    UNION ALL
    SELECT name, 'CN' AS region FROM cn_users
)
SELECT * FROM all_users WHERE name ILIKE 'John%';
```

### DCL 数据控制语言

DCL 用于授予或撤销用户对数据库对象的访问权限

#### `GRANT`

授予用户或角色权限

**语法:**

```postgresql
GRANT privilege ON object_name TO user_or_role;
```

**示例:**

```postgresql
-- 授予用户 'readonly_user' 对 employees 表的 SELECT 权限
GRANT SELECT ON employees TO readonly_user;

-- 授予所有权限
GRANT ALL PRIVILEGES ON DATABASE my_company TO admin_user;
```

#### `REVOKE`

撤销已授予的权限

**语法:**

```postgresql
REVOKE privilege ON object_name FROM user_or_role;
```

**示例:**

```postgresql
REVOKE SELECT ON employees FROM readonly_user;
```

## Advanced SQL

### Functions

> 在 PostgreSQL 中，Function (函数) 是存储在数据库服务器上的代码块。它类似于编程语言中的函数，可以封装复杂的业务逻辑（如循环、条件判断、多次查询），并减少网络交互

#### 核心作用

1.  **封装逻辑**: 将复杂的 SQL 操作（如转账：扣款+入账+记日志）原子化封装
2.  **减少网络开销**: 应用层只需发送函数名和参数，无需发送大量 SQL 语句
3.  **高性能**: 数据库可预编译执行计划，且逻辑就在数据旁边执行，节省传输时间

#### 语法结构

```postgresql
CREATE [OR REPLACE] FUNCTION function_name(param1 type, param2 type)
RETURNS return_type AS $$
DECLARE
    -- 变量声明区
    variable_name type;
BEGIN
    -- 逻辑代码区 (支持 IF/ELSE, LOOP 等)
    -- SELECT ... INTO variable_name ...
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
```

#### 示例

**1. 简单逻辑封装 (计算会员等级):**

```postgresql
CREATE OR REPLACE FUNCTION get_vip_level(total_spent DECIMAL) 
RETURNS TEXT AS $$
BEGIN
    IF total_spent < 1000 THEN
        RETURN '普通会员';
    ELSIF total_spent < 5000 THEN
        RETURN '白银会员';
    ELSE
        RETURN '黄金会员';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 调用
SELECT name, get_vip_level(total_spent) FROM users;
```

**2. 事务性操作 (用户注册送积分):**

```postgresql
CREATE OR REPLACE FUNCTION register_user(u_name TEXT) 
RETURNS VOID AS $$
DECLARE
    new_id INT;
BEGIN
    -- 插入用户并获取 ID
    INSERT INTO users (name) VALUES (u_name) RETURNING id INTO new_id;
    -- 自动赠送积分 (保证原子性)
    INSERT INTO points (user_id, amount) VALUES (new_id, 100);
END;
$$ LANGUAGE plpgsql;
```

### Procedures

#### Function vs. Procedure

| 特性 | Function (函数) | Procedure (存储过程) |
| :--- | :--- | :--- |
| **调用方式** | `SELECT func_name()` (作为表达式) | **只能**通过 `CALL proc_name()` |
| **返回值** | **必须**有返回值 (可以是 VOID) | **无**返回值 (可通过 INOUT 参数传出) |
| **事务控制** | **不支持** (不能在内部 COMMIT/ROLLBACK) | **支持** (可以在内部进行分段提交 COMMIT) |

#### 语法

```postgresql
CREATE [OR REPLACE] PROCEDURE procedure_name(param1 type, param2 type)
LANGUAGE plpgsql
AS $$
DECLARE
    -- 变量声明
BEGIN
    -- 逻辑代码
    -- 可以包含 COMMIT; 或 ROLLBACK;
END;
$$;

-- 调用方式
CALL procedure_name(val1, val2);
```

#### 示例

> Procedure 最大的优势是处理超长任务。例如清理 100 万条日志，如果用 Function，必须一次性做完，容易锁表或超时；用 Procedure 可以每删 1000 条就 COMMIT 一次。

```postgresql
CREATE OR REPLACE PROCEDURE archive_logs()
LANGUAGE plpgsql
AS $$
BEGIN
    LOOP
        -- 删除一小批数据
        DELETE FROM logs WHERE created_at < NOW() - INTERVAL '1 year'
        AND id IN (SELECT id FROM logs LIMIT 1000);
        
        -- 如果没有数据被删除，说明删完了，退出循环
        EXIT WHEN NOT FOUND;
        
        -- 关键点: 支持在循环中提交事务！释放锁资源
        COMMIT;
        -- 可选：短暂停顿释放 IO 压力
        -- PERFORM pg_sleep(0.1);
    END LOOP;
END;
$$;

-- 调用
CALL archive_logs();
```

## Normalization

### 1NF

## E-R Diagram Design

