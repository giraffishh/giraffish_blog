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
date: 2026-01-04 21:06:58
updated: 2026-01-07 10:40:21

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

### Views

> 视图 (View) 是一个**虚拟表**，其内容由查询定义。同真实的表一样，视图包含一系列带有名称的列和行数据。但是，视图**不占用物理存储空间**来存储数据（除非是物化视图），数据库中只存储视图的定义

#### 核心作用

1.  **简化复杂查询**: 将复杂的 JOIN、聚合或子查询封装成一个简单的视图，使用者只需查询视图即可
2.  **安全性 (Security)**: 可以限制用户访问表中的特定列或行。例如，只向 HR 显示员工姓名和部门，而隐藏薪资列
3.  **逻辑数据独立性**: 当底层表结构发生变化时，可以通过修改视图定义来保持对外接口不变，从而不影响上层应用

#### 语法

**创建视图:**

```postgresql
CREATE VIEW view_name AS
SELECT column1, column2, ...
FROM table_name
WHERE condition;
```

**修改/替换视图:**

```postgresql
CREATE OR REPLACE VIEW view_name AS
SELECT ...
```

**删除视图:**

```postgresql
DROP VIEW view_name;
```

#### 示例

假设有一个复杂的查询，用于获取每个部门的平均薪资：

```postgresql
-- 原始查询
SELECT d.name, AVG(e.salary)
FROM employees e
JOIN departments d ON e.department_id = d.id
GROUP BY d.name;
```

**创建视图:**

```postgresql
CREATE VIEW dept_avg_salary AS
SELECT d.name AS department_name, AVG(e.salary) AS avg_sal
FROM employees e
JOIN departments d ON e.department_id = d.id
GROUP BY d.name;
```

**查询视图:**

```postgresql
-- 就像查询普通表一样
SELECT * FROM dept_avg_salary WHERE avg_sal > 50000;
```

#### Materialized Views (物化视图)

> 普通视图是"虚"的，每次查询都会实时执行背后的 SQL。**物化视图 (Materialized View)** 则是将查询结果**物理存储**在磁盘上。

-   **优点**: 查询速度极快（特别是对于复杂的聚合查询），因为不需要每次都重新计算。
-   **缺点**: 数据不是实时的。当底层表数据更新时，物化视图需要刷新 (Refresh)。
-   **适用场景**: 数据仓库、报表系统等对实时性要求不高但对性能要求高的场景。

```postgresql
-- 创建物化视图
CREATE MATERIALIZED VIEW my_summary AS SELECT ...;

-- 刷新数据
REFRESH MATERIALIZED VIEW my_summary;
```

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

> Procedure 最大的优势是处理超长任务。例如清理 100 万条日志，如果用 Function，必须一次性做完，容易锁表或超时；用 Procedure 可以每删 1000 条就 COMMIT 一次

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

### Triggers

> 触发器 (Trigger) 是一种特殊的存储过程，它不能被显式调用，而是由数据库在特定事件（如 `INSERT`, `UPDATE`, `DELETE`）发生时**自动执行**

#### 核心要素

1.  **Event (事件):** 触发执行的操作，如 `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`
2.  **Timing (时机):**
    -   `BEFORE`: 在数据修改**之前**执行（常用于数据校验、自动填充默认值）
    -   `AFTER`: 在数据修改**之后**执行（常用于记录审计日志、级联更新其他表）
    -   `INSTEAD OF`: 代替原始操作执行（通常用于视图）
3.  **Level (级别):**
    -   `FOR EACH ROW`: 对受影响的每一行都执行一次（例如 UPDATE 10 行，就触发 10 次）。可以使用 `NEW` 和 `OLD` 变量引用新旧数据
    -   `FOR EACH STATEMENT`: 无论影响多少行，整个 SQL 语句只触发一次

#### 创建流程 (PostgreSQL)

在 PostgreSQL 中，创建触发器通常分为两步：
1.  创建一个**触发器函数 (Trigger Function)**，返回类型必须是 `TRIGGER`
2.  创建**触发器 (Trigger)** 本身，将其绑定到具体的表和事件上

#### 示例：自动更新 `updated_at` 时间戳

**1. 创建触发器函数:**

```postgresql
CREATE OR REPLACE FUNCTION update_timestamp_func()
RETURNS TRIGGER AS $$
BEGIN
    -- NEW 代表即将被插入或更新的新行数据
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**2. 创建触发器:**

```postgresql
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON employees  -- 在 employees 表更新之前触发
FOR EACH ROW                -- 对每一行数据生效
EXECUTE FUNCTION update_timestamp_func();
```

#### 示例：审计日志 (Audit Log)

记录谁在什么时候删除了哪位员工

**1. 创建审计表:**

```postgresql
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    operation_type VARCHAR(10),
    employee_id INT,
    deleted_by VARCHAR(50),
    deleted_at TIMESTAMP DEFAULT NOW()
);
```

**2. 创建触发器函数:**

```postgresql
CREATE OR REPLACE FUNCTION log_deletion_func()
RETURNS TRIGGER AS $$
BEGIN
    -- OLD 代表已经被删除的旧行数据
    INSERT INTO audit_log (operation_type, employee_id, deleted_by)
    VALUES ('DELETE', OLD.id, CURRENT_USER);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;
```

**3. 创建触发器:**

```postgresql
CREATE TRIGGER audit_delete_trigger
AFTER DELETE ON employees
FOR EACH ROW
EXECUTE FUNCTION log_deletion_func();
```

#### 特殊变量 (NEW vs OLD)

| 变量 | 描述 | 适用事件 |
| :--- | :--- | :--- |
| `NEW` | 包含新的一行数据 | `INSERT`, `UPDATE` |
| `OLD` | 包含旧的一行数据 | `UPDATE`, `DELETE` |
| `TG_OP` | 触发操作的名称 ('INSERT', 'UPDATE'...) | 所有 |

## Normalization

> 数据库规范化 (Normalization) 是用来组织数据库中的数据，以减少数据冗余和提高数据完整性。通常分为不同的范式 (Normal Forms)，从 1NF 到 BCNF 逐级严格

### Basic Concepts: Keys (键的概念)

在讨论范式之前，必须先理清各种“键”的定义

-   **Super Key (超键):**
    -   **定义:** 一个或多个属性的集合，能够**唯一标识**表中的每一行。
    -   **特点:** 可能包含多余的属性。
    -   **示例:** 在学生表中，`{Student_ID}` 是超键，`{Student_ID, Name}` 也是超键。

-   **Candidate Key (候选键):**
    -   **定义:** **最小的超键**。即没有多余属性的超键。
    -   **特点:** 一个表可以有多个候选键。
    -   **示例:** 如果 `Student_ID` 和 `Email` 都能唯一标识学生，那么它们都是候选键。

-   **Primary Key (主键):**
    -   **定义:** 数据库设计者从候选键中选出的**一个**，作为表的主要标识符。
    -   **特点:** 不能为 NULL，且必须唯一。通常选择短小、数值型的列。

-   **Foreign Key (外键):**
    -   **定义:** 一个表中的属性，它引用另一个表的主键。
    -   **作用:** 建立表与表之间的联系，保证引用完整性。

### 1NF (第一范式)

> **核心要求:** 强调**属性的原子性**，即表中的每一列都是不可分割的基本数据项

- **要求:**
  1.  表中的每一行必须是唯一的（主键）
  2.  表中的每一列必须包含原子的值，不能包含集合、数组或重复的组

**违反 1NF 的示例:**

| ID | Name | Phone_Numbers |
| :--- | :--- | :--- |
| 1 | Alice | 123-4567, 987-6543 |
| 2 | Bob | 555-1234 |

**修正后的 1NF:**

| ID | Name | Phone_Number |
| :--- | :--- | :--- |
| 1 | Alice | 123-4567 |
| 1 | Alice | 987-6543 |
| 2 | Bob | 555-1234 |

### 2NF (第二范式)

> **核心要求:** 在满足 1NF 的基础上，**消除非主属性对主键的部分函数依赖**。即：所有非主属性必须完全依赖于主键

- **适用场景:** 当主键由多个列组成（复合主键）时，才可能违反 2NF。如果主键只有一列，自然满足 2NF
- **问题:** 如果一个非主属性只依赖于复合主键中的某一部分，就会导致数据冗余

**违反 2NF 的示例:**
假设主键是 `(Student_ID, Course_ID)`

| Student_ID | Course_ID | Student_Name | Grade |
| :--- | :--- | :--- | :--- |
| 1 | 101 | Alice | A |
| 1 | 102 | Alice | B |

*   `Student_Name` 依赖于 `Student_ID`，而不依赖于 `Course_ID`。这就是部分依赖

**修正后的 2NF (拆表):**

**Student 表:**

| Student_ID | Student_Name |
| :--- | :--- |
| 1 | Alice |

**Grade 表:**

| Student_ID | Course_ID | Grade |
| :--- | :--- | :--- |
| 1 | 101 | A |
| 1 | 102 | B |

### 3NF (第三范式)

> **核心要求:** 在满足 2NF 的基础上，**消除非主属性对主键的传递函数依赖**。即：非主属性必须直接依赖于主键，而不能通过其他非主属性间接依赖

- **规则:** 任何非主属性都不能依赖于其他非主属性 (Attributes depend only on the Key, the whole Key, and nothing but the Key)

**违反 3NF 的示例:**
主键是 `Employee_ID`

| Employee_ID | Department_Name | Manager_Name |
| :--- | :--- | :--- |
| 1 | Sales | John |
| 2 | Sales | John |

*   `Manager_Name` 依赖于 `Department_Name`，而 `Department_Name` 依赖于 `Employee_ID`
*   存在传递依赖: `Employee_ID` -> `Department_Name` -> `Manager_Name`

**修正后的 3NF (拆表):**

**Employee 表:**

| Employee_ID | Department_Name |
| :--- | :--- |
| 1 | Sales |
| 2 | Sales |

**Department 表:**

| Department_Name | Manager_Name |
| :--- | :--- |
| Sales | John |

### BCNF (Boyce-Codd Normal Form)

> **核心要求:** BCNF 是 3NF 的加强版，通常称为 "3.5NF"。它解决了 3NF 中主属性对非主键的依赖问题。

- **定义:** 对于关系模式中的每一个函数依赖 $X \rightarrow Y$（$Y$ 不是 $X$ 的子集），$X$ 必须是**超键 (Super Key)**。
- **简而言之:** 表中的每一个决定因素 (Determinant) 都必须是候选键。

**违反 BCNF 的示例:**
假设一个仓库管理表，规则是：
1. 一个仓库管理员 (Keeper) 只管理一个仓库 (Warehouse)。
2. 一个仓库可能有多个管理员。
3. 每种物品 (Item) 在每个仓库里只存放一次。

候选键: `(Warehouse, Item)` 或 `(Keeper, Item)`。

| Warehouse | Keeper | Item |
| :--- | :--- | :--- |
| A | John | Table |
| A | Mike | Chair |
| B | Tom | Table |

*   存在函数依赖: `Keeper` -> `Warehouse` (因为每个管理员只在一个仓库)。
*   但是 `Keeper` 不是候选键 (因为 `Keeper` 决定不了 `Item`)。
*   这里 `Keeper` 是决定因素，但不是超键，所以违反 BCNF。

**修正后的 BCNF:**

**Keeper_Assignment 表:**
| Keeper | Warehouse |
| :--- | :--- |
| John | A |
| Mike | A |
| Tom | B |

**Stock 表:**
| Keeper | Item |
| :--- | :--- |
| John | Table |
| Mike | Chair |
| Tom | Table |

### Functional Dependencies & Algorithms

在进行数据库规范化时，我们需要一些算法工具来形式化地分析和分解关系模式

#### 1. 属性集闭包 (Closure of Attribute Sets)

> 属性集闭包用于回答：**“给定一组属性，能推导出哪些其他属性？”**

-   **符号:** $A^+$ 表示属性集 $A$ 的闭包
-   **输入:** 属性集 $A$，函数依赖集 $F$
-   **算法:**
    1.  初始化结果集 $Result = A$
    2.  循环遍历 $F$ 中的每一个依赖 $X \rightarrow Y$：
        -   如果 $X \subseteq Result$，则将 $Y$ 加入 $Result$ ($Result = Result \cup Y$)
    3.  重复步骤 2，直到 $Result$ 不再变化
-   **用途:**
    -   **判断超键 (Super Key):** 如果 $A^+$ 包含了表中的所有属性，则 $A$ 是超键
    -   **验证函数依赖:** 要验证 $X \rightarrow Y$ 是否成立，只需检查 $Y$ 是否在 $X^+$ 中

**示例:**
关系模式 $R(A, B, C, D)$，函数依赖集 $F = \{ A \rightarrow B, B \rightarrow C \}$
求 $A^+$:

1.  初始化: $Result = \{A\}$
2.  使用 $A \rightarrow B$: $A \subseteq \{A\}$，加入 $B$，Result = $\{A, B\}$
3.  使用 $B \rightarrow C$: $B \subseteq \{A, B\}$，加入 $C$，Result = $\{A, B, C\}$
4.  再无变化。
结论: $A^+ = \{A, B, C\}$。因为 $\{A, B, C\} \neq \{A, B, C, D\}$，所以 $A$ 不是超键

#### 2. 正则覆盖 (Canonical Cover)

> 正则覆盖 $F_c$ 是函数依赖集 $F$ 的**最简形式**。它去除了 $F$ 中的冗余依赖，但与 $F$ 逻辑等价（闭包相同）

-   **目标:**
    1.  **右侧单属性:** 所有的依赖右边只有一个属性 (如 $A \rightarrow BC$ 拆解为 $A \rightarrow B, A \rightarrow C$)
    2.  **无冗余依赖:** 去掉某个依赖后，闭包不变。
    3.  **无冗余属性:** 去掉某个依赖左边的属性后，闭包不变 (如 $AB \rightarrow C$，如果 $A \rightarrow C$ 已存在，则 $B$ 冗余)

-   **算法步骤:**
    1.  **单属性化:** 利用合并规则将所有依赖的右边拆解为单个属性
    2.  **消除左侧冗余属性:** 对于 $X \rightarrow Y$，检查 $X$ 中的属性是否多余
        -   如果 $X$ 中有个属性 $A$，且 $(X-\{A\})^+ $ 包含 $Y$，则 $A$ 是多余的
    3.  **消除冗余依赖:** 对于每一个依赖 $X \rightarrow Y$，检查它是否多余
        -   计算 $F' = F - \{X \rightarrow Y\}$
        -   如果在 $F'$ 下，$X^+$ 仍然包含 $Y$，说明该依赖可以被其他依赖推导出来，删除它
    4.  **合并:** 将左侧相同的依赖合并 (如 $A \rightarrow B, A \rightarrow C$ 合并为 $A \rightarrow BC$)

**示例:**
$F = \{ A \rightarrow B, B \rightarrow C, A \rightarrow C \}$
1.  **单属性化:** 已经是单属性
2.  **左侧冗余:** 无复合属性，跳过
3.  **冗余依赖:**
    -   检查 $A \rightarrow C$:
    -   暂时去掉它，剩余 $F' = \{ A \rightarrow B, B \rightarrow C \}$
    -   在 $F'$ 中计算 $A^+$: $A \rightarrow B \rightarrow C$，所以 $A^+ = \{A, B, C\}$
    -   $C$ 在 $A^+$ 中，说明 $A \rightarrow C$ 是冗余的。删除。
4.  **结果:** $F_c = \{ A \rightarrow B, B \rightarrow C \}$。

## E-R Diagram Design

> Chen's Notation (陈氏表示法)

![](https://mirrors.sustech.edu.cn/git/giraffish/image-hosting/-/raw/main/blog/26-01-06-1767701184078.webp)

### 1. 基本组件 (Basic Components) 

| 组件 (Component) | 符号 (Symbol) | 描述 |
| :--- | :--- | :--- |
| **Entity (实体)** | **矩形 (Rectangle)** | 现实世界中可区分的对象。例如：`Student`, `Car` |
| **Attribute (属性)** | **椭圆 (Ellipse)** | 描述实体的特征。实体与属性用直线连接。例如：`Name`, `Age` |
| **Relationship (关系)** | **菱形 (Diamond)** | 实体之间的关联。用直线连接相关的实体。例如：`Enrolls`, `Works_For` |

### 2. 属性类型 (Attribute Types)

- **Key Attribute (主键属性):**
  - **符号:** 椭圆内文字带**下划线**
  - **含义:** 唯一标识实体的属性。例如：`Student_ID`
  
- **Multivalued Attribute (多值属性):**
  - **符号:** **双边椭圆 (Double Ellipse)**
  - **含义:** 一个实体在该属性上可能有多个值。例如：`Phone_Numbers` (一个人可能有多个电话)

- **Derived Attribute (派生属性):**
  - **符号:** **虚线椭圆 (Dashed Ellipse)**
  - **含义:** 该属性的值不是直接存储的，而是从其他属性计算得来的。例如：`Age` (可以从 `Birth_Date` 计算得出)

- **Composite Attribute (复合属性):**
  - **符号:** 属性延伸出其他属性
  - **含义:** 属性可以被细分为更小的部分。例如：`Name` 可以分为 `First_Name` 和 `Last_Name`

### 3. 弱实体与强实体 (Weak & Strong Entities)

- **Weak Entity (弱实体):**
  - **符号:** **双边矩形 (Double Rectangle)**
  - **含义:** 没有自己的主键，必须依赖于强实体 (Owner Entity) 才能被唯一标识的实体。例如：`Dependent` (家属) 依赖于 `Employee`
  - **Partial Key (部分键):** 弱实体的区分符，用**虚下划线**表示

- **Identifying Relationship (识别关系):**
  - **符号:** **双边菱形 (Double Diamond)**
  - **含义:** 连接弱实体及其所有者强实体的关系

### 4. 约束 (Constraints)

**基数比率 (Cardinality Ratios):**

> 描述一个实体通过关系可以关联多少个其他实体，标注在关系连线上

- **1:1 (One-to-One):** 关系两边分别标 `1`。例如：`Manager` --1-- `<Manages>` --1-- `Department`
- **1:N (One-to-Many):** 一边标 `1`，另一边标 `N`，箭头多指向1。例如：`Department` <--1-- `<Has>` --N-- `Employee`
- **M:N (Many-to-Many):** 一边标 `M`，另一边标 `N`。例如：`Student` --M-- `<Enrolls>` --N-- `Course`

**参与约束 (Participation Constraints):**
> 描述实体是否存在依赖于关系

- **Total Participation (全部参与 / 强制参与):**
  - **符号:** **双线 (Double Line)** 连接实体与关系
  - **含义:** 实体集中的**每个**实体都必须参与该关系。例如：每个 `Loan` (贷款) 必须属于某个 `Branch` (支行)
  
- **Partial Participation (部分参与):**
  - **符号:** **单线 (Single Line)** 连接
  - **含义:** 实体集中只有**部分**实体参与该关系。例如：并非每个 `Employee` 都 `Manages` (管理) 一个部门

## Transactions

> 事务 (Transaction) 是数据库管理系统执行过程中的一个逻辑单位，由一个有限的数据库操作序列构成。事务的主要目的是为了保证数据的一致性和完整性。

### 1. ACID 特性

一个标准的数据库事务必须满足 ACID 四大特性：

-   **Atomicity (原子性):**
    -   事务中的所有操作**要么全部完成，要么全部不完成**。
    -   如果事务在执行过程中发生错误，会被回滚 (Rollback) 到事务开始前的状态，就像这个事务从未执行过一样。
-   **Consistency (一致性):**
    -   事务执行前后，数据库必须始终保持一致性状态。
    -   数据必须满足所有定义的规则（如外键约束、CHECK 约束等）。
-   **Isolation (隔离性):**
    -   多个并发事务之间是相互隔离的，一个事务的执行不应影响其他事务。
    -   具体的隔离程度取决于**隔离级别**。
-   **Durability (持久性):**
    -   一旦事务提交 (Commit)，其对数据的修改就是永久的，即使系统崩溃也不会丢失。

### 2. 事务控制语句 (TCL)

-   `BEGIN` 或 `START TRANSACTION`: 显式开启一个事务。
-   `COMMIT`: 提交事务，保存更改。
-   `ROLLBACK`: 回滚事务，撤销未提交的更改。
-   `SAVEPOINT name`: 在事务中创建一个保存点。
-   `ROLLBACK TO name`: 回滚到指定的保存点，而不是回滚整个事务。

**示例:**

```postgresql
BEGIN;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

-- 如果上述两条都成功，则提交
COMMIT;

-- 如果发生错误，则回滚
-- ROLLBACK;
```

### 3. 并发问题 (Concurrency Issues)

当多个事务并发运行时，可能会出现以下问题：

1.  **Dirty Read (脏读):** 事务 A 读取了事务 B **未提交**的数据。如果事务 B 后来回滚了，事务 A 读到的就是无效数据。
2.  **Non-repeatable Read (不可重复读):** 事务 A 在同一个事务中读取了同一行两次，但得到的结果不同。这是因为在两次读取之间，事务 B **修改或删除**了该行并提交了。
3.  **Phantom Read (幻读):** 事务 A 在同一个事务中按相同条件查询了两次，但第二次查询出的**行数**不同。这是因为在两次查询之间，事务 B **插入**了新行并提交了。

### 4. 隔离级别 (Isolation Levels)

SQL 标准定义了四种隔离级别，用于平衡并发性能和数据安全性（级别由低到高）：

| 隔离级别 (Isolation Level) | 脏读 (Dirty Read) | 不可重复读 (Non-repeatable) | 幻读 (Phantom Read) | 性能 |
| :--- | :---: | :---: | :---: | :--- |
| **Read Uncommitted** (读未提交) | 可能 | 可能 | 可能 | 最高 |
| **Read Committed** (读已提交) | **不可能** | 可能 | 可能 | 高 (PostgreSQL 默认) |
| **Repeatable Read** (可重复读) | **不可能** | **不可能** | 可能 | 中 (MySQL InnoDB 默认) |
| **Serializable** (串行化) | **不可能** | **不可能** | **不可能** | 最低 (最安全) |

-   **Read Committed:** 只能读到其他事务已经提交的数据。解决了脏读。
-   **Repeatable Read:** 保证在同一个事务中多次读取同一数据结果是一致的。解决了脏读和不可重复读。
-   **Serializable:** 强制事务串行执行。解决了所有并发问题，但并发性能极差，容易导致锁竞争。

#### 核心实现机制：MVCC (多版本并发控制)

大多数现代数据库（如 PostgreSQL, MySQL InnoDB）使用 **MVCC (Multi-Version Concurrency Control)** 来实现 `Read Committed` 和 `Repeatable Read`，而不是单纯依赖锁（锁会阻塞读操作）。

-   **基本原理:**
    -   数据库为每一行数据维护多个版本（通过 undo log 或 hidden columns）。
    -   读操作不阻塞写操作，写操作也不阻塞读操作。

-   **Read Committed 的实现:**
    -   **Read View (快照) 生成时机:** 在事务中，**每次执行 SELECT 语句时**都会生成一个新的 Read View。
    -   **效果:** 如果在两次查询之间，有其他事务提交了修改，生成的快照就会不同，因此能读到最新的已提交数据（导致不可重复读）。

-   **Repeatable Read 的实现:**
    -   **Read View (快照) 生成时机:** 在事务中，**第一次执行 SELECT 语句时**生成一个 Read View，并在整个事务期间复用这个快照。
    -   **效果:** 无论其他事务是否提交修改，当前事务看到的始终是第一次查询时的数据状态，从而保证了可重复读。

**设置隔离级别:**

```postgresql
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

### 5. Locks (锁)

锁 (Lock) 是数据库系统用来管理并发访问的一种机制，用于确保数据的一致性和完整性

#### 锁的类型 (Types of Locks)

-   **Shared Lock (S-Lock / 共享锁 / 读锁):**
    -   多个事务可以同时获取同一对象的共享锁进行**读取**
    -   如果一个对象有共享锁，其他事务**不能**获取该对象的排他锁（不能修改），但可以获取共享锁（可以读取）
-   **Exclusive Lock (X-Lock / 排他锁 / 写锁):**
    -   事务为了**修改**数据而获取的锁
    -   如果一个事务获取了对象的排他锁，其他事务**不能**获取该对象的任何锁（既不能读也不能写）

## Relational Algebra

> 关系代数 (Relational Algebra) 是一种**过程化**查询语言。它包含一组运算，这些运算以一个或两个关系（表）作为输入，并产生一个新的关系作为输出。它是 SQL 语言的理论基础。

### 1. 基本运算 (Fundamental Operations)

这 6 个运算是关系代数的核心，其他运算都可以由它们组合而成。

#### 1.1 选择 (Select, $\sigma$)

-   **定义:** 选择满足给定谓词 $P$ 的行（元组）。
-   **符号:** $\sigma_P(R)$
-   **SQL 对应:** `WHERE` 子句
-   **示例:**
    -   查询物理系 (Physics) 的所有教师：
    -   $\sigma_{dept\_name = 'Physics'}(Instructor)$
    -   SQL: `SELECT * FROM Instructor WHERE dept_name = 'Physics';`

#### 1.2 投影 (Project, $\pi$)

-   **定义:** 选择指定的列（属性），并自动去重。
-   **符号:** $\pi_{A_1, A_2, ..., A_k}(R)$
-   **SQL 对应:** `SELECT DISTINCT col1, col2` (注意：关系代数默认去重，SQL 默认不去重)
-   **示例:**
    -   查询所有教师的 ID 和姓名：
    -   $\pi_{ID, name}(Instructor)$
    -   SQL: `SELECT DISTINCT ID, name FROM Instructor;`

#### 1.3 并运算 (Union, $\cup$)

-   **定义:** 返回包含在关系 $R$ 或 $S$ 或两者中的所有元组。要求 $R$ 和 $S$ 具有相同的属性数量和兼容的属性域。
-   **符号:** $R \cup S$
-   **SQL 对应:** `UNION`
-   **示例:**
    -   $\pi_{course\_id}(\sigma_{semester='Fall'}(Section)) \cup \pi_{course\_id}(\sigma_{semester='Spring'}(Section))$
    -   SQL: 选出 Fall 或 Spring 学期开设的所有课程 ID。

#### 1.4 集合差 (Set Difference, $-$)

-   **定义:** 返回属于关系 $R$ 但不属于关系 $S$ 的元组。
-   **符号:** $R - S$
-   **SQL 对应:** `EXCEPT` (在 Oracle 中是 `MINUS`)
-   **示例:**
    -   $\pi_{course\_id}(\sigma_{semester='Fall'}(Section)) - \pi_{course\_id}(\sigma_{semester='Spring'}(Section))$
    -   SQL: 选出在 Fall 学期开设但不在 Spring 学期开设的课程。

#### 1.5 笛卡尔积 (Cartesian Product, $\times$)

-   **定义:** 将关系 $R$ 中的每一行与关系 $S$ 中的每一行进行拼接。
-   **符号:** $R \times S$
-   **SQL 对应:** `CROSS JOIN` 或 `FROM table1, table2`
-   **示例:**
    -   $Instructor \times Teaches$
    -   结果包含所有可能的 (教师, 授课) 组合。通常本身没有意义，需要配合选择运算使用。

#### 1.6 更名运算 (Rename, $\rho$)

-   **定义:** 为关系或属性重新命名。
-   **符号:** $\rho_X(E)$ (将表达式 E 的结果重命名为 X)
-   **SQL 对应:** `AS`
-   **示例:**
    -   $\rho_{Emp}(Employee)$
    -   SQL: `SELECT * FROM Employee AS Emp;`

### 2. 扩展运算 (Additional Operations)

为了方便使用，基于基本运算定义了一些常用的扩展运算。

#### 2.1 集合交 (Set Intersection, $\cap$)

-   **定义:** 返回同时属于关系 $R$ 和 $S$ 的元组。
-   **推导:** $R \cap S = R - (R - S)$
-   **SQL 对应:** `INTERSECT`

#### 2.2 自然连接 (Natural Join, $\bowtie$)

-   **定义:** 基于两个关系中**名称相同**的所有属性进行的等值连接，并去除重复列。
-   **符号:** $R \bowtie S$
-   **推导:** $A \bowtie B = \pi_{去除重复列}(\sigma_{A.ID = B.ID}(A \times B))$
-   **SQL 对应:** `NATURAL JOIN`
-   **示例:**
    -   $Instructor \bowtie Teaches$
    -   自动匹配两个表中的 `ID` 列相等的情况。

#### 2.3 $\theta$ 连接 (Theta Join, $\bowtie_\theta$)

-   **定义:** 笛卡尔积后进行选择运算。
-   **符号:** $R \bowtie_\theta S = \sigma_\theta(R \times S)$
-   **SQL 对应:** `JOIN ON` 或 `WHERE`
-   **示例:**
    -   $Instructor \bowtie_{Instructor.salary > Teaches.budget} Teaches$

#### 2.4 赋值 (Assignment, $\leftarrow$)

-   **定义:** 将右侧表达式的结果赋给左侧的临时关系变量。
-   **符号:** $Temp \leftarrow R \times S$
-   **用途:** 将复杂的查询拆分为多个步骤。

## Indexing

> 索引 (Index) 是数据库中用于提高数据检索速度的数据结构。它类似于书籍的目录，允许数据库快速找到特定的行，而无需扫描整个表。

### 1. 基础知识

-   **优点:**
    -   极大地加快查询速度（SELECT, WHERE, JOIN）。
    -   可以强制实施唯一性约束 (UNIQUE Index)。
-   **缺点:**
    -   占用额外的存储空间。
    -   降低写操作的速度 (INSERT, UPDATE, DELETE)，因为每次修改数据时，索引也需要更新。

### 2. 语法

```postgresql
-- 创建索引
CREATE INDEX index_name ON table_name (column_name);

-- 创建唯一索引
CREATE UNIQUE INDEX index_name ON table_name (column_name);

-- 删除索引
DROP INDEX index_name;
```

### 3. 常见索引类型

-   **B-Tree 索引 (默认):** 最常用的索引，支持全键值、键值范围和键前缀查找。
-   **Hash 索引:** 基于哈希表实现，只有精确匹配索引所有列的查询才有效（仅支持 `=` 和 `IN`）。不支持范围查询。
-   **Bitmap 索引 (位图索引):** 适用于列的基数 (Cardinality) 很低的情况（如性别、省份）。在数据仓库中常用。
-   **Clustered Index (聚簇索引):**
    -   数据的物理存储顺序与索引顺序一致。
    -   一张表只能有一个聚簇索引（通常是主键）
-   **Non-Clustered Index (非聚簇索引 / 二级索引):**
    -   索引中存储的是索引列的值和指向数据行的指针（或主键）
    -   一张表可以有多个非聚簇索引。

### 4. B-Tree (Balanced Tree) 实现详解

> B-Tree 是一种自平衡的树，设计初衷是为磁盘等直接存取辅助存储设备提供一种高效的索引结构

**核心概念：阶 (Order)**

B-Tree 通常被描述为 **$m$ 阶 (m-order)** 树，这意味着：
1.  每个节点**最多**有 $m$ 个子节点。
2.  每个节点**最多**有 $m-1$ 个 Key。
3.  除根节点外，每个节点**至少**有 $\lceil m/2 \rceil$ 个子节点（即半满状态）。

**示例:** 一个 **3阶 B-Tree (Order = 3)**：
-   每个节点最多存 **2** 个 Key。
-   每个节点最多有 **3** 个子节点 (3路)。

**3阶 B-Tree 结构示意图 (ASCII):**

```text
       [ 30 ]                  <-- Root Node (1 Key, 2 Children)
      /      \
  [ 10 ]    [ 50 | 70 ]        <-- Internal/Leaf Nodes
 /   \      /   |    \
...  ...  [40] [60]  [80]      <-- Leaf Nodes
```

**查找 (Search) 示例:**

假设要在上面的树中查找 **25**：
1.  **比较根节点 [30]:** 25 < 30，向左子树走。
2.  **比较节点 [10]:** 25 > 10，向右子树走（假设 10 右边的指针指向包含 20-29 的范围）。
3.  **到达叶子节点:** 遍历节点内的 Key，找到 25，返回 Data。

**插入 (Insert) 示例：分裂与上浮**

**场景:** 基于上图的 3阶 B-Tree，我们尝试连续插入 **65** 和 **66**，演示从叶子节点到根节点的级联分裂过程。

**Step 1: 插入 65 (节点变满)**
-   查找发现应插入叶子节点 `[60]`。
-   插入后该节点变为 `[ 60 | 65 ]`。
-   Key 数量 (2) 达到上限 (Max Keys)，但未溢出，插入成功。

```text
       [ 30 ]
      /      \
  [ 10 ]    [ 50 | 70 ]
 /   \      /   |    \
...  ...  [40] [60|65] [80]  <-- Leaf node filled
```

**Step 2: 插入 66 (叶子节点分裂 -> 父节点溢出)**
-   插入后叶子节点临时变为 `[ 60 | 65 | 66 ]` (溢出)。
-   **分裂:** 中间值 **65** 上浮。原节点分裂为 `[60]` 和 `[66]`。
-   **65** 进入父节点 `[ 50 | 70 ]`，父节点临时变为 `[ 50 | 65 | 70 ]` (溢出)。

```text
       [ 30 ]
      /      \
  [ 10 ]    [ 50 | 65 | 70 ] <-- Parent Overflow! (Temp state)
 /   \      /   |    |    \
...  ...  [40] [60] [66] [80]
```

**Step 3: 父节点分裂 (级联分裂 -> 根节点更新)**
-   父节点溢出，中间值 **65** 继续上浮。
-   原父节点分裂为 `[50]` 和 `[70]`。
-   **65** 进入根节点 `[ 30 ]`，根节点变为 `[ 30 | 65 ]` (未溢出)。

```text
       [ 30 | 65 ]             <-- Root Updated
      /     |     \
  [ 10 ]  [ 50 ]  [ 70 ]       <-- Parent Split
 /   \    /   \   /   \
... ... [40] [60] [66] [80]
```

**搜索效率:**

-   **时间复杂度:** $O(\log N)$。
-   **特点:** 搜索可能在非叶子节点提前结束（如果正好匹配到当前节点的 Key），而 B+ Tree 必须搜索到叶子节点。

**为什么数据库更倾向于 B+ Tree (补充背景):**
虽然 B-Tree 很优秀，但 B+ Tree 在内部节点不存 Data，因此相同大小的磁盘页可以存储更多 Key，扇出 (Fan-out) 更大，树更矮；且 B+ Tree 叶子节点有链表连接，更适合范围扫描

