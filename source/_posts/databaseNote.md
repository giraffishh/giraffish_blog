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
updated: 2026-01-02 17:25:29

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

- **聚合函数 (Aggregate Functions) 和 `GROUP BY` - 分组统计:**

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

- **`JOIN` - 连接多个表:** 假设我们有另一个 `departments` 表：

  ```postgresql
  CREATE TABLE departments (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL
  );
  -- 假设 employees 表有一个 department_id 列作为外键
  ```

  - **`INNER JOIN` (内连接):** 返回两个表中匹配的行

    ```postgresql
    SELECT e.first_name, d.name AS department_name
    FROM employees e
    INNER JOIN departments d ON e.department_id = d.id;
    ```

  - **`LEFT JOIN` (左连接):** 返回左表的所有行，以及右表中匹配的行（右表不匹配的行用 NULL 填充）

    ```postgresql
    SELECT e.first_name, d.name AS department_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id;
    ```

  - **`AS` - 别名:** 为表或列提供一个临时的名称，使查询更易读。上面的 `e` 和 `d` 就是表的别名

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

## Normalization

## E-R Diagram Design

