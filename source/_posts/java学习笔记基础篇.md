---
abbrlink: c33f2c6f
banner_img: https://s1.imagehub.cc/images/2025/03/26/d7e3a5709e3b4aa1d8bf02faee524ad3.webp
index_img: https://s1.imagehub.cc/images/2025/03/26/e6c42bbb20c6388ad46d34792167971e.jpg
title: Java学习笔记基础篇
date: 2025-03-26 20:36:56
updated: 2025-06-22 18:03:11
tags:
  - Java
categories:
  - 学习笔记
comments: true
---
## 注释

`//` `/* … */`

## 8种基础数据类型（primitive data type ）

* Integral types: `byte`, `short`, `int`, `long`
* Floating-point types: `float`, `double`
* The `boolean` data type
* The `char` data type

## 变量类型

* 局部变量
* 成员变量(实例变量) - 默认权限`default`或声明权限`public`、`protected`、`private`
* 静态变量(类变量) - 可以通过类名访问

| 访问修饰符       | 同类访问 | 同包访问 | 位于其他包的子类访问 | 其他包且非子类访问 |
| ---------------- | -------- | -------- | ---------------- | ------------------ |
| `public`         | ✅        | ✅        | ✅                | ✅                  |
| `protected`      | ✅        | ✅        | ✅                | ❌                  |
| `default`（无修饰） | ✅        | ✅        | ❌                | ❌                  |
| `private`        | ✅        | ❌        | ❌                | ❌                  |

> `default`同包访问，`protected`同包+所有子类，`public`都行，`private`都不行

## 运算符

与c++同理，详情见[c++笔记基础篇](https://blog.giraffish.me/post/6befaffc/#3-%E8%BF%90%E7%AE%97%E7%AC%A6)

## 常用input与output

**Output:**

```Java
System.out.print("Hello, ");  // 不换行
System.out.println("World!"); // 换行
System.out.printf("My name is %s, and I am %d years old.\n", "Alice", 25); // 格式化输出
```

|  格式符|  说明|
|---|---|
|  %d|  整数（int, long）|
|  %f|  浮点数（float, double）|
|  %s|  字符串（String）|
|  %c|  字符（char）|
|  %b|  布尔值（boolean）|

**Input:**

```Java
Scanner scanner = new Scanner(System.in);

String name = scanner.nextLine();  // 读取一行，以按下Enter结束
int num = scanner.nextInt(); // 读取返回整数，空格或Enter结束
double number = scanner.nextDouble();  // 读取返回浮点数，空格或Enter结束
char ch = scanner.next().charAt(0);  // 读取返回字符串，空格或Enter结束，并取字符串第一个字符

scanner.close()  // 可选，关闭System.in输入流，释放内存
```

## 条件语句

* `if … else if … else … `
* `(a > b) ? a : b`
* `switch … case … default … `   其中`deault`非必须
* `｜｜`和`&&`
> 如果`case`中没有`break`也会出现“贯穿”（fall-through）

## 循环语句

* `while`
* `do … while … `
* `for`

控制关键字:
* `break`
* `continue`

Java5引入遍历数组的增强`for`:
```Java
for(声明语句 : 表达式)
{
   //代码句子
}
```

例子:
```Java
public class Test {
   public static void main(String[] args){
      int [] numbers = {10, 20, 30, 40, 50};
 
      for(int x : numbers ){
         System.out.print( x );
         System.out.print(",");
      }
      System.out.print("\n");
      String [] names ={"James", "Larry", "Tom", "Lacy"};
      for( String name : names ) {
         System.out.print( name );
         System.out.print(",");
      }
   }
}
```

## Java Number & Math 类

`Number`和`Math`类属于`java.lang`包，无需`import`

## Java Number 类

所有的包装类（Integer、Long、Byte、Double、Float、Short）都是抽象类 Number 的子类。

| 包装类    | 基本数据类型 |
|----------|------------|
| Boolean  | boolean    |
| Byte     | byte       |
| Short    | short      |
| Integer  | int        |
| Long     | long       |
| Character| char       |
| Float    | float      |
| Double   | double     |

> 这种由编译器特别支持的包装称为装箱，所以当内置数据类型被当作对象使用的时候，编译器会把内置类型装箱为包装类。相似的，编译器也可以把一个对象拆箱为内置类型。

| 方法 | 返回类型 | 说明 |
|------|----------|------|
| **类型转换方法** | | |
| `byteValue()` | `byte` | 以 `byte` 类型返回数值 |
| `shortValue()` | `short` | 以 `short` 类型返回数值 |
| `intValue()` | `int` | 以 `int` 类型返回数值 |
| `longValue()` | `long` | 以 `long` 类型返回数值 |
| `floatValue()` | `float` | 以 `float` 类型返回数值 |
| `doubleValue()` | `double` | 以 `double` 类型返回数值 |
| **其他方法** | | |
| `toString()` | `String` | 返回数值的字符串形式（继承自 `Object`） |
| `equals(Object obj)` | `boolean` | 判断两个 `Number` 对象是否相等（继承自 `Object`） |
| `hashCode()` | `int` | 返回 `Number` 对象的哈希码（继承自 `Object`） |

**示例：**
```java
public class NumberExample {
    public static void main(String[] args) {
        // 创建不同类型的 Number 对象
        Integer intObj = 100;
        Double doubleObj = 99.99;
        Float floatObj = 12.5f;
        Long longObj = 100000L;

        // 类型转换方法
        System.out.println("Integer 转换为 double: " + intObj.doubleValue());
        System.out.println("Double 转换为 int: " + doubleObj.intValue());
        System.out.println("Float 转换为 long: " + floatObj.longValue());

        // 获取 Number 的哈希值
        System.out.println("Integer 哈希值: " + intObj.hashCode());
        System.out.println("Double 哈希值: " + doubleObj.hashCode());

        // Number 的 equals 方法
        System.out.println("intObj 和 longObj 是否相等: " + intObj.equals(longObj));
        System.out.println("doubleObj 和 new Double(99.99) 是否相等: " + doubleObj.equals(new Double(99.99)));
    }
}
```

### Java Math 类

Java 的 Math 包含了用于执行基本数学运算的属性和方法，如初等指数、对数、平方根和三角函数。
Math 的方法都被定义为 static 形式，通过 Math 类可以在主函数中直接调用。

| 方法 | 说明 |
|------|------|
| **取整操作** | |
| `Math.ceil(double a)` | 返回大于等于 `a` 的最小整数（向上取整） |
| `Math.floor(double a)` | 返回小于等于 `a` 的最大整数（向下取整） |
| `Math.round(float a)` | 四舍五入，返回 `long` 或 `int` |
| `Math.abs(x)` | 取绝对值，`x` 可为 `int、long、float、double` |
| **最大值/最小值** | |
| `Math.max(x, y)` | 返回 `x` 和 `y` 中的较大值 |
| `Math.min(x, y)` | 返回 `x` 和 `y` 中的较小值 |
| **幂运算与根号** | |
| `Math.pow(a, b)` | 计算 `a^b`（a 的 b 次幂） |
| `Math.sqrt(x)` | 计算 `√x`（平方根） |
| `Math.cbrt(x)` | 计算 `³√x`（立方根） |
| **指数与对数** | |
| `Math.exp(x)` | 计算 `e^x`（自然指数函数） |
| `Math.log(x)` | 计算 `ln(x)`（自然对数） |
| `Math.log10(x)` | 计算 `log₁₀(x)`（以 10 为底的对数） |
| **三角函数** | |
| `Math.sin(x)` | 计算 `x` 的正弦（`x` 以弧度为单位） |
| `Math.cos(x)` | 计算 `x` 的余弦 |
| `Math.tan(x)` | 计算 `x` 的正切 |
| `Math.asin(x)` | 计算 `x` 的反正弦 |
| `Math.acos(x)` | 计算 `x` 的反余弦 |
| `Math.atan(x)` | 计算 `x` 的反正切 |
| **角度与弧度转换** | |
| `Math.toRadians(deg)` | 角度转弧度 |
| `Math.toDegrees(rad)` | 弧度转角度 |
| **随机数** | |
| `Math.random()` | 返回 `[0.0, 1.0)` 范围的随机数 |

> `round()`方法的算法为`Math.floor(x+0.5)`，遇到负数如`Math.round(-11.5)`的结果为 -11

**示例：**
```java
public class MathExample {
    public static void main(String[] args) {
        // 1. 基本数学运算
        System.out.println("绝对值: " + Math.abs(-10));
        System.out.println("最大值: " + Math.max(10, 20));
        System.out.println("最小值: " + Math.min(10, 20));

        // 2. 幂运算
        System.out.println("2 的 3 次方: " + Math.pow(2, 3));
        System.out.println("平方根: " + Math.sqrt(16));
        System.out.println("立方根: " + Math.cbrt(27));

        // 3. 取整
        System.out.println("向上取整: " + Math.ceil(4.3));
        System.out.println("向下取整: " + Math.floor(4.9));
        System.out.println("四舍五入: " + Math.round(4.5));

        // 4. 三角函数
        System.out.println("sin(30°): " + Math.sin(Math.toRadians(30)));
        System.out.println("cos(60°): " + Math.cos(Math.toRadians(60)));
        System.out.println("tan(45°): " + Math.tan(Math.toRadians(45)));

        // 5. 随机数
        System.out.println("随机数 (0~1): " + Math.random());
        System.out.println("随机整数 (1~100): " + (int) (Math.random() * 100 + 1));

        // 6. 对数与指数
        System.out.println("自然对数 log(10): " + Math.log(10));
        System.out.println("以 10 为底的对数 log10(1000): " + Math.log10(1000));
        System.out.println("e 的 2 次方: " + Math.exp(2));
    }
}
```

## Java 数组、Arrays类与ArrayList

### 数组

**声明数组变量**

```java
dataType[] arrayRefVar;   // 首选的方法

dataType arrayRefVar[];  // 效果相同，但不是首选方法
```

**创建数组**

Java语言使用new操作符来创建数组

```java
dataType[] arrayRefVar = new dataType[arraySize];

// 或者指定初始化时的值
dataType[] arrayRefVar = {value0, value1, ..., valuek};  
```

### Arrays类

| 方法 | 说明 |
|------|------|
| **数组输出** | |
| `Arrays.toString(array)` | 以字符串形式返回一维数组内容 |
| `Arrays.deepToString(array)` | 以字符串形式返回多维数组内容 |
| **数组排序** | |
| `Arrays.sort(array)` | 对数组进行升序排序 |
| `Arrays.sort(array, Comparator c)` | 使用指定比较器对对象数组排序 |
| `Arrays.parallelSort(array)` | 并行排序，适用于大数组，提升性能 |
| **数组搜索** | |
| `Arrays.binarySearch(array, key)` | 在 **排序后的数组** 中查找 `key`，返回索引（找不到返回负值） |
| **数组填充** | |
| `Arrays.fill(array, value)` | 用 `value` 填充整个数组 |
| `Arrays.fill(array, from, to, value)` | 用 `value` 填充 `[from, to)` 范围的元素 |
| **数组复制** | |
| `Arrays.copyOf(array, newLength)` | 复制数组，并调整长度 |
| `Arrays.copyOfRange(array, from, to)` | 复制数组的 `[from, to)` 子范围 |
| **数组比较** | |
| `Arrays.equals(array1, array2)` | 判断两个 **一维数组** 是否相等 |
| `Arrays.deepEquals(array1, array2)` | 判断两个 **多维数组** 是否相等 |
| **数组转换** | |
| `Arrays.asList(array)` | 将数组转换为 `List`（适用于对象数组） |
| **流操作（Java 8+）** | |
| `Arrays.stream(array)` | 将数组转换为 `Stream` 流，以便使用流操作 |
| `Arrays.parallelPrefix(array, operator)` | 计算并行前缀操作 |

**示例：**
```Java
import java.util.Arrays;
import java.util.List;
import java.util.stream.IntStream;

public class ArraysExample {
    public static void main(String[] args) {
        // 1. 数组输出
        int[] numbers = {5, 3, 8, 1, 2};
        System.out.println("原始数组: " + Arrays.toString(numbers));

        // 2. 数组排序
        Arrays.sort(numbers);
        System.out.println("排序后: " + Arrays.toString(numbers));

        // 3. 二分查找 (必须先排序)
        int index = Arrays.binarySearch(numbers, 3);
        System.out.println("数字 3 的索引: " + index);

        // 4. 数组填充
        int[] filledArray = new int[5];
        Arrays.fill(filledArray, 7);
        System.out.println("填充后: " + Arrays.toString(filledArray));

        // 5. 部分填充
        int[] partialFilled = {1, 2, 3, 4, 5};
        Arrays.fill(partialFilled, 1, 4, 9); // 填充索引 [1, 4) 的元素
        System.out.println("部分填充后: " + Arrays.toString(partialFilled));

        // 6. 数组复制
        int[] copiedArray = Arrays.copyOf(numbers, 7); // 长度变为 7
        System.out.println("复制后: " + Arrays.toString(copiedArray));

        int[] copiedRange = Arrays.copyOfRange(numbers, 1, 4); // 复制索引 [1, 4)
        System.out.println("复制范围: " + Arrays.toString(copiedRange));

        // 7. 数组比较
        int[] array1 = {1, 2, 3};
        int[] array2 = {1, 2, 3};
        int[] array3 = {1, 2, 4};
        System.out.println("数组是否相等 (array1 和 array2): " + Arrays.equals(array1, array2));
        System.out.println("数组是否相等 (array1 和 array3): " + Arrays.equals(array1, array3));

        // 8. 将数组转换为 List
        String[] strArray = {"Alice", "Bob", "Charlie"};
        List<String> strList = Arrays.asList(strArray);
        System.out.println("转换为 List: " + strList);

        // 9. 使用流（Java 8+）
        int sum = Arrays.stream(numbers).sum();
        System.out.println("数组元素总和: " + sum);

        // 10. 并行排序（适用于大数组）
        int[] largeArray = {10, 5, 8, 2, 7};
        Arrays.parallelSort(largeArray);
        System.out.println("并行排序后: " + Arrays.toString(largeArray));

        // 11. 多维数组的深度输出
        int[][] matrix = {
            {1, 2, 3},
            {4, 5, 6}
        };
        System.out.println("二维数组: " + Arrays.deepToString(matrix));

        // 12. 深度比较多维数组
        int[][] matrix2 = {
            {1, 2, 3},
            {4, 5, 6}
        };
        System.out.println("二维数组是否相等: " + Arrays.deepEquals(matrix, matrix2));
    }
}
```

### ArrayList

ArrayList 是 Java 集合框架（Java Collections Framework）中的一个类，实现了 `List` 接口，位于 `java.util` 包下。它提供了动态数组的实现，能够根据需要自动调整大小。ArrayList 是非同步的（不是线程安全的）。

ArrayList 的主要特点：
- 基于动态数组实现，自动扩容
- 实现了 List 接口，拥有 List 的所有功能
- 允许存储任何类型的对象，包括 null
- 提供随机访问（通过索引）功能，访问元素的时间复杂度为 O(1)
- 插入和删除操作可能需要移动元素，时间复杂度为 O(n)

#### ArrayList 与数组比较

| 特性 | ArrayList | 数组 |
|------|-----------|------|
| **大小** | 动态，可以自动增长或缩小 | 固定，创建时必须指定大小且不可改变 |
| **类型安全** | 使用泛型可以确保类型安全 | 只能存储同一类型元素 |
| **存储类型** | 只能存储对象，不能存储基本数据类型 | 可以存储基本数据类型和对象 |
| **API** | 提供丰富的方法（add, remove, contains等） | 仅提供基本操作和length属性 |
| **性能** | 需要额外的方法调用和类型检查，性能略低 | 访问元素更直接，性能较高 |
| **内存使用** | 由于需要存储对象，会有额外的开销 | 更加紧凑，特别是对基本类型 |
| **便利性** | 提供更多便利功能，如动态调整大小 | 需要手动处理扩容、缩容等操作 |
| **线程安全** | 不是线程安全的 | 不是线程安全的 |
| **迭代器** | 提供迭代器和增强for循环支持 | 只能使用索引或增强for循环 |

#### ArrayList 的创建

```java
// 创建不指定类型的ArrayList（不推荐）
ArrayList list1 = new ArrayList();

// 使用泛型创建指定类型的ArrayList
ArrayList<String> list2 = new ArrayList<String>();

// 使用Java 7引入的钻石操作符
ArrayList<String> list3 = new ArrayList<>();

// 创建时指定初始容量
ArrayList<Integer> list4 = new ArrayList<>(20);

// 通过其他集合创建ArrayList
ArrayList<Integer> list5 = new ArrayList<>(Arrays.asList(1, 2, 3, 4, 5));
```

#### 添加元素

```java
ArrayList<String> fruits = new ArrayList<>();

// 在末尾添加元素
fruits.add("苹果");
fruits.add("香蕉");
fruits.add("橙子");

// 在指定位置添加元素
fruits.add(1, "葡萄");  // ["苹果", "葡萄", "香蕉", "橙子"]

// 添加多个元素（集合）
List<String> moreFruits = Arrays.asList("西瓜", "芒果");
fruits.addAll(moreFruits);  // ["苹果", "葡萄", "香蕉", "橙子", "西瓜", "芒果"]

// 在指定位置添加多个元素
fruits.addAll(2, Arrays.asList("梨", "樱桃"));  // ["苹果", "葡萄", "梨", "樱桃", "香蕉", "橙子", "西瓜", "芒果"]
```

#### 访问元素

```java
ArrayList<String> fruits = new ArrayList<>(Arrays.asList("苹果", "香蕉", "橙子"));

// 通过索引访问元素
String firstFruit = fruits.get(0);  // "苹果"

// 获取列表大小
int size = fruits.size();  // 3

// 检查元素是否存在
boolean hasApple = fruits.contains("苹果");  // true
boolean hasGrape = fruits.contains("葡萄");  // false

// 查找元素索引
int index = fruits.indexOf("香蕉");  // 1
int lastIndex = fruits.lastIndexOf("香蕉");  // 查找最后一次出现的索引

// 检查列表是否为空
boolean isEmpty = fruits.isEmpty();  // false
```

#### 修改元素

```java
ArrayList<String> fruits = new ArrayList<>(Arrays.asList("苹果", "香蕉", "橙子"));

// 修改指定索引的元素
fruits.set(1, "葡萄");  // ["苹果", "葡萄", "橙子"]
```

#### 删除元素

```java
ArrayList<String> fruits = new ArrayList<>(Arrays.asList("苹果", "香蕉", "橙子", "香蕉"));

// 删除第一次出现的指定元素
fruits.remove("香蕉");  // ["苹果", "橙子", "香蕉"]

// 删除指定索引的元素
fruits.remove(0);  // ["橙子", "香蕉"]

// 删除满足条件的元素（Java 8+）
fruits.removeIf(fruit -> fruit.equals("香蕉"));  // ["橙子"]

// 清空列表
fruits.clear();  // []
```

#### 遍历元素

```java
ArrayList<String> fruits = new ArrayList<>(Arrays.asList("苹果", "香蕉", "橙子"));

// 使用for循环
for (int i = 0; i < fruits.size(); i++) {
    System.out.println(fruits.get(i));
}

// 使用增强for循环
for (String fruit : fruits) {
    System.out.println(fruit);
}

// 使用Iterator迭代器
Iterator<String> iterator = fruits.iterator();
while (iterator.hasNext()) {
    System.out.println(iterator.next());
}

// 使用Java 8的forEach方法和Lambda表达式
fruits.forEach(fruit -> System.out.println(fruit));

// 更简洁的方法引用形式
fruits.forEach(System.out::println);
```

#### 排序

```java
ArrayList<String> fruits = new ArrayList<>(Arrays.asList("橙子", "苹果", "香蕉"));

// 使用Collections.sort()进行自然排序
Collections.sort(fruits);  // ["苹果", "橙子", "香蕉"]

// 使用自定义比较器
Collections.sort(fruits, Collections.reverseOrder());  // ["香蕉", "橙子", "苹果"]

// Java 8+ 使用ArrayList的sort方法
fruits.sort(Comparator.naturalOrder());  // ["苹果", "橙子", "香蕉"]
fruits.sort(Comparator.reverseOrder());  // ["香蕉", "橙子", "苹果"]

// 使用自定义比较器（按字符串长度排序）
fruits.sort(Comparator.comparingInt(String::length));
```

#### 转换为数组

```java
ArrayList<String> fruits = new ArrayList<>(Arrays.asList("苹果", "香蕉", "橙子"));

// 转换为Object数组
Object[] objectArray = fruits.toArray();

// 转换为指定类型的数组
String[] stringArray1 = fruits.toArray(new String[0]);
String[] stringArray2 = fruits.toArray(new String[fruits.size()]);

// Java 11+更简洁的方式
String[] stringArray3 = fruits.toArray(String[]::new);
```

#### 性能注意事项

1. **随机访问**：ArrayList的随机访问性能很好，时间复杂度为O(1)
2. **添加元素**：在末尾添加元素通常很快O(1)，但可能会触发扩容操作
3. **插入/删除元素**：在中间插入或删除元素需要移动后面的元素，时间复杂度为O(n)
4. **初始容量**：如果预先知道大致元素数量，指定初始容量可以减少扩容操作
5. **迭代**：迭代过程中修改列表（add/remove）会导致`ConcurrentModificationException`

#### 适用场景

ArrayList适合以下场景：
- 需要频繁随机访问元素
- 主要在列表末尾添加/删除元素
- 对存储空间要求不高
- 不需要频繁在列表中间插入/删除元素
- 不需要线程安全

不适合的场景（考虑使用LinkedList）：
- 频繁在列表中间或开头插入/删除元素
- 需要高效的栈、队列或双端队列操作

## Java String类与StringBulider类

### String类

**注意:** String类是不可改变的，所以你一旦创建了String对象，那它的值就无法改变了

String创建的字符串存储在公共池中，而`new`创建的字符串对象在堆上
```java
String s1 = "Runoob";              // String 直接创建
String s2 = "Runoob";              // String 直接创建
String s3 = s1;                    // s1,s2,s3引用相同的"Runoob"
String s4 = new String("Runoob");   // String 对象创建
String s5 = new String("Runoob");   // String 对象创建
```

> 其中 `s1==s2` `s2==s3` `s3!=s4` `s4!=s5`
> 但是他们都`equal`（实际内容相同）

**常用方法**

```java
// 1. 字符串的创建
String s1 = "Hello"; // 直接赋值
String s2 = new String("Hello"); // 使用构造方法
char[] chars = {'H', 'e', 'l', 'l', 'o'};
String s3 = new String(chars); // 通过字符数组创建

// 2. 获取字符串长度
int length = s1.length();

// 3. 字符查找
char ch = s1.charAt(1); // 获取索引 1 处的字符 'e'
int index = s1.indexOf('l'); // 查找 'l' 第一次出现的位置
int lastIndex = s1.lastIndexOf('l'); // 查找 'l' 最后一次出现的位置
boolean contains = s1.contains("He"); // 是否包含 "He"

// 4. 字符串比较
boolean isEqual = s1.equals(s2); // 判断内容是否相等
boolean ignoreCaseEqual = s1.equalsIgnoreCase("hello"); // 忽略大小写比较
int compare = s1.compareTo("Hello"); // 字典序比较，相等返回 0

// 5. 字符串截取
String sub1 = s1.substring(1); // 从索引 1 开始截取 "ello"
String sub2 = s1.substring(1, 4); // 截取索引 [1,4) 的部分 "ell"

// 6. 字符串替换
String replaced = s1.replace('l', 'x'); // "Hexxo"
String replacedAll = s1.replaceAll("l+", "X"); // 使用正则替换 "HeXo"
String replacedFirst = s1.replaceFirst("l", "X"); // 只替换第一个 "Helxo"

// 7. 字符串拆分
String[] parts = "a,b,c".split(","); // {"a", "b", "c"}
String[] parts2 = "a b  c".split("\\s+"); // 按空白符拆分 {"a", "b", "c"}

// 8. 字符串拼接
String joined = String.join("-", "Java", "String"); // "Java-String"
String concatStr = s1.concat(" World"); // "Hello World"

// 9. 大小写转换
String upper = s1.toUpperCase(); // "HELLO"
String lower = s1.toLowerCase(); // "hello"

// 10. 去除空格
String trimmed = "  Hello  ".trim(); // "Hello"
String stripped = "  Hello  ".strip(); // Java 11+ 推荐，去除所有 Unicode 空白字符

// 11. 字符串是否为空
boolean isEmpty = s1.isEmpty(); // 是否为空字符串 ""
boolean isBlank = s1.isBlank(); // Java 11+ 是否为空白字符串（含空格）

// 12. 格式化字符串
String formatted = String.format("Name: %s, Age: %d", "Alice", 25);
// "Name: Alice, Age: 25"
```

### StringBulider类

StringBulider的字符串可以修改，但是不是线程安全的
> 要求线程安全就用StringBuffer

```java
// Java StringBuilder 类常用方法总结

// 1. 创建 StringBuilder 对象
StringBuilder sb1 = new StringBuilder(); // 默认容量 16
StringBuilder sb2 = new StringBuilder("Hello"); // 通过字符串初始化
StringBuilder sb3 = new StringBuilder(50); // 指定初始容量

// 2. 追加字符串
sb1.append("Hello"); // 追加字符串
sb1.append(123); // 追加整数
sb1.append(true); // 追加布尔值
sb1.append(3.14); // 追加浮点数

// 3. 插入字符串
sb1.insert(5, " World"); // 在索引 5 处插入 " World"

// 4. 删除字符
sb1.delete(5, 11); // 删除索引 [5,11) 的字符
sb1.deleteCharAt(5); // 删除索引 5 处的字符

// 5. 替换字符串
sb1.replace(0, 5, "Hi"); // 将索引 [0,5) 的部分替换为 "Hi"

// 6. 反转字符串
sb1.reverse(); // 反转字符串

// 7. 获取字符串长度
int length = sb1.length(); // 获取当前字符个数

// 8. 获取容量
int capacity = sb1.capacity(); // 获取当前容量

// 9. 设置长度
sb1.setLength(10); // 设置长度，过长则截断，过短则填充 '\0'

// 10. 获取字符
char ch = sb1.charAt(2); // 获取索引 2 处的字符

// 11. 设置字符
sb1.setCharAt(2, 'X'); // 将索引 2 处的字符改为 'X'

// 12. 转换为 String
String result = sb1.toString(); // 转换为普通字符串
```

## Java 异常处理

```java
try{
  // 可能抛出异常的代码
}catch(异常类型1 异常的变量名1){
  // 异常处理代码1
}catch(异常类型2 异常的变量名2){
  // (可选)异常处理代码2
}finally{
  // (可选)无论是否异常都运行的代码
}
```

或者

```java
public void readFile() throws IOException {
    // 可能会抛出IOException的代码
}
```

## Java 方法

### 方法的定义
```java
修饰符 返回值类型 方法名(参数类型 参数名){
    ...
    方法体
    ...
    return 返回值;
}
```
> 方法命名应使用小驼峰如`addTest`

* **修饰符**：修饰符，这是可选的，告诉编译器如何调用该方法。定义了 该方法的访问类型。
* **返回值类型** ：方法可能会返回值。returnValueType 是方法返回值的数据类型。有些方法执行所需的操作，但没有返回值。在这种情况下，returnValueType 是关键字void。
* **方法名**：是方法的实际名称。方法名和参数表共同构成方法签名。
* **参数类型**：参数像是一个占位符。当方法被调用时，传递值给参数。这个值被称为实参或变量。参数列表是指方法的参数类型、顺序和参数的个数。参数是可选的，方法可以不包含任何参数。
* **方法体**：方法体包含具体的语句，定义该方法的功能。

### 方法重载
重载的方法必须拥有**不同的参数列表**。你不能仅仅依据修饰符或者返回类型的不同来重载方法。

### 构造方法
构造方法（Constructor）是用于创建类的对象的特殊方法。当使用 new 关键字创建对象时，构造方法会自动调用，用来初始化对象的属性。

构造方法特点：
* **方法名与类名相同**：构造方法的名字必须和类名一致。
* **没有返回类型**：构造方法没有返回类型，连 void 也不能写。
* **在创建对象时自动调用**：每次使用 new 创建对象时，都会自动调用构造方法。
* **可以重载**：可以为同一个类定义多个构造方法，但这些构造方法的参数列表必须不同（即构成重载）。
不管你是否自定义构造方法，所有的类都有构造方法，因为 Java 自动提供了一个默认构造方法，默认构造方法的访问修饰符和类的访问修饰符相同(类为 public，构造函数也为 public；类改为 protected，构造函数也改为 protected)，一旦你定义了自己的构造方法，默认构造方法就会失效。

**示例:**
```Java
// 一个简单的构造函数
class MyClass {
  int x;
 
  // 以下是构造函数
  MyClass(int i ) {
    x = i;
  }
}
```

构造方法中的`this`关键字:

1. 引用当前对象的属性或方法
2. 调用另一个构造方法

**示例:**
```Java
public Person(String name) {
    this(name, 0); // 调用另一个双参数的构造方法
}

public Person(String name, int age) {
    this.name = name;
    this.age = age;
}
```

### 静态变量与静态方法

静态变量与静态方法是属于类而不是类的实例（对象），使用关键字`static`来声明。因为静态方法属于类本身，所以无需创建该类的实例就可以直接调用

**静态方法特点:**

* 不需要创建对象即可调用：通过类名直接调用
* 不能访问或修改实例变量：只能访问静态变量（类变量）
* 不能使用this或super关键字：因为静态方法与实例无关
* 不能被重写：静态方法可以被子类隐藏（覆盖），但不能被重写
* 不能直接调用非静态方法：在静态方法中只能直接调用其他静态方法

**声明:**

```java
public class ClassName {
    // 静态变量声明
    private static dataType variableName = initialValue;
    
    // 常量（静态不可变变量）通常声明为 final
    public static final dataType CONSTANT_NAME = value;
    
    // 静态方法声明
    public static returnType methodName(parameters) {
        // 方法体
    }
}
```

**调用:**
```java
// 访问静态变量
ClassName.variableName;

// 访问静态方法
ClassName.methodName(arguments);
```

### 可变参数

可变参数允许程序员定义一个方法，该方法可以接受零个或多个相同类型的参数。

**声明:**
```java
returnType methodName(dataType... parameterName) {
    // 方法体
}
```
* 可变参数必须是方法的最后一个参数
* 一个方法中只能有一个可变参数

**示例:**

```Java
public class VarargsWithArrayExample {
    // 声明一个带有可变参数的方法
    public static int sum(int... numbers) {
        int total = 0;
        for (int num : numbers) {
            total += num;
        }
        return total;
    }
    
    public static void main(String[] args) {
         // 直接传递多个值给可变参数方法
        int result1 = sum(1, 2, 3, 4, 5);
        System.out.println("Sum of individual elements: " + result1);  // 15
        
        // 将整个数组直接传递给可变参数方法
        int[] myArray = {1, 2, 3, 4, 5};
        int result = sum(myArray);
        System.out.println("Sum of array elements: " + result);  // 15
    }
}
```

### 参数默认值

Java方法的参数**没有默认值**，但可以通过其他方法来实现类似的功能

1. 方法重载
```java
public class DefaultValueExample {
    public void display(String name, int age, String city) {
        System.out.println("Name: " + name);
        System.out.println("Age: " + age);
        System.out.println("City: " + city);
    }
    
    // 带有"默认"city参数的重载方法
    public void display(String name, int age) {
        display(name, age, "Beijing"); // 使用"北京"作为city的默认值
    }
    
    // 带有"默认"age和city参数的重载方法
    public void display(String name) {
        display(name, 18, "Beijing"); // 使用18作为age的默认值，"北京"作为city的默认值
    }
    
    public static void main(String[] args) {
        DefaultValueExample example = new DefaultValueExample();
        example.display("Zhang San", 25, "Shanghai"); // 全部指定参数
        example.display("Li Si", 30);                // city使用默认值
        example.display("Wang Wu");                  // age和city使用默认值
    }
}
```

2. 可变参数
```java
public class OptionalParamExample {
    public void process(String name, Object... options) {
        int age = (options.length > 0 && options[0] != null) ? (int) options[0] : 18;
        String city = (options.length > 1 && options[1] != null) ? (String) options[1] : "Beijing";
        
        System.out.println("Name: " + name);
        System.out.println("Age: " + age);
        System.out.println("City: " + city);
    }
    
    public static void main(String[] args) {
        OptionalParamExample example = new OptionalParamExample();
        example.process("Zhang San", 25, "Shanghai"); // 全部指定参数
        example.process("Li Si", 30);                // city使用默认值
        example.process("Wang Wu");                  // age和city使用默认值
    }
}
```

3. Java8中的Option类
```java
public class OptionalExample {
    public void greet(String name, Optional<Integer> age, Optional<String> city) {
        System.out.println("Name: " + name);
        System.out.println("Age: " + age.orElse(18)); // 如果age存在则使用它，否则使用默认值18
        System.out.println("City: " + city.orElse("Beijing")); // 如果city存在则使用它，否则使用默认值"北京"
    }
    
    public static void main(String[] args) {
        OptionalExample example = new OptionalExample();
        example.greet("Zhang San", Optional.of(25), Optional.of("Shanghai")); // 全部指定参数
        example.greet("Li Si", Optional.of(30), Optional.empty());           // city使用默认值
        example.greet("Wang Wu", Optional.empty(), Optional.empty());        // age和city使用默认值
    }
}
```

## Java 面向对象

Java 作为一种面向对象的编程语言，支持以下基本概念：

* 类（Class）
* 对象（Object）
* 封装（Encapsulation）
* 继承（Inheritance）
* 多态（Polymorphism）
* 抽象（Abstraction）
* 接口（Interface）
* 方法（Method）
* 方法重载（Method Overloading）

### Java 类与对象

**类**是定义对象的蓝图，包括属性和方法
**对象**是类的实例，具有状态和行为

**示例:**
```Java
public class Dog {
    String name;
    int size;
    String colour;
    int age;
 
    void eat() {
    }
 
    void run() {
    }
 
    void sleep(){
    }
 
    void name(){
    }
}
```

访问实例变量和方法:
```Java
// 创建对象
Object referenceVariable = new Constructor();

// 访问类中的变量
referenceVariable.variableName;

// 访问类中的方法
referenceVariable.methodName();
```

### 封装

将对象的状态（字段）私有化，通过公共方法访问

**示例:**
```java
public class Puppy {
    private int age;
    private String name;
 
    // 构造器
    public Puppy(String name) {
        this.name = name;
        System.out.println("小狗的名字是 : " + name);
    }
 
    // 设置 age 的值
    public void setAge(int age) {
        this.age = age;
    }
 
    // 获取 age 的值
    public int getAge() {
        return age;
    }
 
    // 获取 name 的值
    public String getName() {
        return name;
    }
 
    // 主方法
    public static void main(String[] args) {
        // 创建对象
        Puppy myPuppy = new Puppy("Tommy");
 
        // 通过方法来设定 age
        myPuppy.setAge(2);
 
        // 调用另一个方法获取 age
        int age = myPuppy.getAge();
        System.out.println("小狗的年龄为 : " + age);
 
        // 也可以直接访问成员变量（通过 getter 方法）
        System.out.println("变量值 : " + myPuppy.getAge());
    }
}
```

### 继承

继承就是子类继承父类的特征和行为，使得子类对象实例**具有父类的实例域或方法**

```java
class 父类 {
}

class 子类 extends 父类{
}
```

> 注意Java不支持多继承，即一个子类继承自多个父类
> 但支持多重继承，即多个子类继承一个父类

能够继承的东西:

* 实例成员变量
* 实例方法
* 静态成员变量
* 静态方法

> `private`属性的和构造方法均不能被继承
> 如果子类没有同名的静态方法，可以直接通过子类调用父类的静态方法，在多态中由引用类型决定调用谁的静态方法

继承主要通过两种方式实现：

类继承（extends）：子类继承父类
接口实现（implements）：类实现接口

> 接口可以extends继承接口，并支持多继承

#### 类继承`extends`

用于类与类之间的继承

```Java
class Animal {
    void eat() {
        System.out.println("This animal eats food.");
    }
}

class Dog extends Animal {
    void bark() {
        System.out.println("The dog barks.");
    }
}

public class Main {
    public static void main(String[] args) {
        Dog dog = new Dog();
        dog.eat(); // 继承自Animal类
        dog.bark(); // Dog类自己的方法
    }
}
```

#### 接口实现`implements`

* 用于类与接口之间的继承，从而使类实现一个接口
* 实现类必须实现接口中声明的所有方法，除非接口有默认方法，或该类为抽象类（将重写任务交给子类）
* 一个类可以继承自多个接口

```java
interface Animal {
    void eat();
    void sleep();
    default void run() {
        System.out.println("Run");
    }
}

class Dog implements Animal {
    @Override
    public void eat() {
        System.out.println("The dog eats.");
    }

    @Override
    public void sleep() {
        System.out.println("The dog sleeps.");
    }

    void bark() {
        System.out.println("The dog barks.");
    }
}

public class Main {
    public static void main(String[] args) {
        Dog dog = new Dog();
        dog.eat(); // 实现自Animal接口
        dog.sleep(); // 实现自Animal接口
        dog.bark(); // Dog类自己的方法
    }
}
```

#### `super`与`this`关键字
`super`关键字：我们可以通过`super`关键字来实现对父类成员的访问，用来引用当前对象的父类
`this`关键字：指向自己的引用，引用当前对象，即它所在的方法或构造函数所属的对象实例

```java
class Animal {
    void eat() {
        System.out.println("animal : eat");
    }
}
 
class Dog extends Animal {
    void eat() {
        System.out.println("dog : eat");
    }
    void eatTest() {
        this.eat();   // this 调用自己的方法
        super.eat();  // super 调用父类方法
    }
}
 
public class Test {
    public static void main(String[] args) {
        Animal a = new Animal();
        a.eat();
        Dog d = new Dog();
        d.eatTest();
    }
}
```
#### `final`关键字

`final`可以用来修饰变量（包括类属性、对象属性、局部变量和形参）、方法（包括类方法和对象方法）和类
使用`final`关键字声明类，就是把类定义定义为最终类，不能被继承，或者用于修饰方法，该方法不能被子类重写，修饰变量时，该变量只能被赋值一次

**声明类:**
```java
final class 类名 {
    //类体
}
```

**声明方法:**
```java
修饰符 final 返回值类型 方法名(){
    //方法体
}
```

> `final`定义的类，其中的属性、方法不是`final`的

#### 继承中的构造器

子类是不继承父类的构造器（构造方法或者构造函数）的，它只是调用（隐式或显式）
* 如果父类的构造器带有参数，则必须在子类的构造器中显式地通过`super`关键字调用父类的构造器并配以适当的参数列表
* 如果父类构造器没有参数，则在子类的构造器中不需要使用`super`关键字调用父类构造器，系统会自动调用父类的无参构造器

```java
class SuperClass {
    private int n;
 
    // 无参数构造器
    public SuperClass() {
        System.out.println("SuperClass()");
    }
 
    // 带参数构造器
    public SuperClass(int n) {
        System.out.println("SuperClass(int n)");
        this.n = n;
    }
}
 
// SubClass 类继承
class SubClass extends SuperClass {
    private int n;
 
    // 自动调用父类的无参数构造器
    public SubClass() {
        System.out.println("SubClass()");
    }
 
    // 调用父类中带有参数的构造器
    public SubClass(int n) {
        super(300);
        System.out.println("SubClass(int n): " + n);
        this.n = n;
    }
}
```

### 多态

多态是指同一个操作或方法可以在不同的对象上有不同的行为表现
在Java中，多态允许一个对象在不同情况下表现出不同的形态，主要通过方法的重写（Override）和重载（Overload）来实现

多态主要有两种形式：
* 编译时多态（静态多态）：通过方法重载实现
* 运行时多态（动态多态）：通过方法重写实现

#### 重载(Overload) - 静态多态

重载是在一个类里面，方法名字相同，而**参数不同**。返回类型可以相同也可以不同
每个重载的方法（或者构造函数）都必须有一个独一无二的参数类型列表
方法能够在同一个类中或者在一个子类中被重载

> 最常用的如构造器重载

**示例:**
```Java
public class Overloading {
    public int test(){
        System.out.println("test1");
        return 1;
    }
 
    public void test(int a){
        System.out.println("test2");
    }   
 
    //以下两个参数类型顺序不同
    public String test(int a,String s){
        System.out.println("test3");
        return "returntest3";
    }   
 
    public String test(String s,int a){
        System.out.println("test4");
        return "returntest4";
    }   
}
```

#### 重写(Override)

重写（Override）是指子类定义了一个与其父类中具有相同名称、参数列表和返回类型的方法，并且子类方法的实现覆盖了父类方法的实现
运行时多态是使用继承和接口实现的，也是最常见的多态形式

**示例:**

```java
class Animal{
   public void move(){
      System.out.println("动物可以移动");
   }
}
 
class Dog extends Animal{
   @Override
   public void move(){
      System.out.println("狗可以跑和走");
   }
}
 
public class TestDog{
   public static void main(String args[]){
      Animal a = new Animal(); // Animal 对象
      Animal b = new Dog(); // Dog 对象
 
      a.move();// 执行 Animal 类的方法
 
      b.move();//执行 Dog 类的方法
   }
}
```

> 一般会在重写方法上面加上`@Override`注解

**注意:**
* **参数列表**与被重写方法的参数列表必须完全相同
* 返回类型与被重写方法的**返回类型**可以不相同，但是必须是父类返回值的**派生类**
* **访问权限**不能比父类中被重写的方法的访问权限更低。例如：如果父类的一个方法被声明为 public，那么在子类中重写该方法就不能声明为 protected
* 声明为`final`的方法不能被重写
* 声明为`static`的方法不能被重写，但是能够被再次声明
* 子类和父类在同一个包中，那么子类可以重写父类所有方法，除了声明为 private 和 final 的方法
* 子类和父类不在同一个包中，那么子类只能够重写父类的声明为 public 和 protected 的非 final 方法
* 重写的方法能够抛出任何**非强制异常**，无论被重写的方法是否抛出异常。但是，重写的方法不能抛出新的强制性异常，或者比被重写方法声明的更广泛的强制性异常，反之则可以
* 构造方法不能被重写

#### 动态多态

**动态多态**存在的三个必要条件：

* 继承
* 重写
* 父类引用指向子类对象：`Parent p = new Child();`即**向上转型**（Upcasting）

`Parent p = new Child();`可以分为三个部分：

* `Parent p` 声明一个父类类型的引用变量
* `new Child()` 创建一个子类的对象实例（堆内存中分配空间给Child对象）
* `=` 将子类对象的引用赋给父类类型的变量

> 引用变量p的静态类型（编译时类型）是Parent
> 引用变量p指向的对象的动态类型（运行时类型）是Child

**可以做什么:**
1. 调用被子类重写的方法
    * 当通过父类引用调用被子类重写的方法时，会执行子类版本的方法实现（动态方法调度）
2. 调用父类中定义的所有方法，即使这些方法没有被子类重写
3. 访问父类中定义的所有变量

**不能做什么:**
1. 不能直接调用子类特有的方法
2. 不能直接调用子类特有的属性

**示例:**

```java
class Vehicle {
    public void start() {
        System.out.println("车辆启动");
    }
}

class Car extends Vehicle {
    @Override
    public void start() {
        System.out.println("汽车启动");
    }
    
    public void openTrunk() {
        System.out.println("打开后备箱");
    }
}

public class Test {
    public static void main(String[] args) {
        Vehicle vehicle = new Car();  // 向上转型
        
        vehicle.start();      // ✅ 可以调用，输出：汽车启动（多态）
        // vehicle.openTrunk();  // ❌ 编译错误，父类引用看不到子类方法
        
        // 如果需要调用子类方法，需要向下转型
        if (vehicle instanceof Car) {
            Car car = (Car) vehicle;  // 向下转型
            car.openTrunk();          // ✅ 现在可以调用了
        }
    }
}
```

**向下转型（Downcasting）**

要访问子类特有的成员，需要进行向下转型

> 向下转型需要谨慎使用，应该先用`instanceof`操作符检查对象的实际类型，以避免`ClassCastException`异常。

```java
Parent p = new Child();

if (p instanceof Child) {
    Child c = (Child) p; // 向下转型
    c.childOnly(); // 现在可以调用子类特有的方法
}
        
// 使用模式匹配（Java 14+）
if (p instanceof Child c) {
    // 直接使用，不需要额外的转型
   c.childOnly();
}
```

**应用场景示例:**

1. 集合类中的使用

```java
List<Animal> animals = new ArrayList<>();
animals.add(new Dog());
animals.add(new Cat());
animals.add(new Bird());

// 统一处理所有动物
for (Animal animal : animals) {
    animal.makeSound(); // 多态调用，每种动物发出不同的声音
}
```

2. 方法参数中的使用

```java
public void feedAnimal(Animal animal) {
    // 任何Animal子类都可以传入
    animal.eat(); // 多态调用，不同动物有不同的进食方式
}

// 调用
feedAnimal(new Dog());
feedAnimal(new Cat());
```

3. 工厂模式中的使用

```java
public Shape createShape(String type) {
    // 返回Shape的不同子类对象
    if (type.equals("circle")) {
        return new Circle();
    } else if (type.equals("rectangle")) {
        return new Rectangle();
    }
    return null;
}

// 使用
Shape shape = createShape("circle");
shape.draw(); // 多态调用，不同形状绘制不同
```

### 抽象类

在面向对象的概念中，所有的对象都是通过类来描绘的，但是反过来，并不是所有的类都是用来描绘对象的，如果一个类中没有包含足够的信息来描绘一个具体的对象，这样的类就是抽象类

抽象类除了不能实例化对象之外，类的其它功能依然存在，成员变量、成员方法和构造方法的访问方式和普通类一样

由于抽象类**不能实例化对象**，所以抽象类**必须被继承**，才能被使用。也是因为这个原因，通常在设计阶段决定要不要设计抽象类

**示例：**
```java
// 抽象类
abstract class Animal {
    // 抽象方法（没有方法体，不给出具体如何实现）
    public abstract void makeSound();

    // 普通方法
    public void sleep() {
        System.out.println("Zzz...");
    }
}

// 具体子类：狗
class Dog extends Animal {
    // 实现抽象方法
    public void makeSound() {
        System.out.println("汪汪！");
    }
}

// 具体子类：猫
class Cat extends Animal {
    // 实现抽象方法
    public void makeSound() {
        System.out.println("喵喵！");
    }
}

// 测试类
public class Main {
    public static void main(String[] args) {
        Animal dog = new Dog();
        Animal cat = new Cat();

        dog.makeSound();  // 输出：汪汪！
        dog.sleep();      // 输出：Zzz...

        cat.makeSound();  // 输出：喵喵！
        cat.sleep();      // 输出：Zzz...
    }
}

```

**注意：**

*  抽象类不能被实例化，只有抽象类的非抽象子类可以创建对象
*  抽象类中不一定包含抽象方法，但是有抽象方法的类必定是抽象类
*  构造方法，静态的类方法（用 static 修饰的方法）不能声明为抽象方法
* 抽象类的子类必须给出抽象类中的抽象方法的具体实现，除非该子类也是抽象类

### 接口

在 Java 中，接口是一种特殊的抽象类型，它定义了一组方法，但不提供实现。接口用于规定一个类必须实现哪些行为（方法），起到一种“规范”或“契约”作用

```java
interface Animal {
    void makeSound(); // 接口方法（没有实现，默认是 public abstract 的）
}

```

通过`implements`关键字来实现接口，并且必须实现接口中定义的所有方法

```java
class Dog implements Animal {
    public void makeSound() {
        System.out.println("汪汪！");
    }
}
```

Java 8 以后的接口增强：

* 默认方法（default）：接口可以提供默认实现
* 静态方法（static）：可以直接通过接口调用
* 私有方法（Java 9 起）：接口中也可以写私有方法来给默认方法做辅助

```java
interface Animal {
    // 默认方法：可以使用私有方法
    default void eat() {
        logAction("正在吃东西");
    }


    // 静态方法
    static void showInfo() {
        logStatic("这是一个动物接口");
    }

    // 普通抽象方法
    void makeSound();

    // 私有方法：只能在接口内部被默认方法或静态方法调用
    private void logAction(String action) {
        System.out.println("动物：" + action);
    }
}
```

抽象类与接口的区别[^1]：

1. 语法层面上的区别
	1) 抽象类可以提供成员方法的实现细节，而接口中只能存在public abstract 方法
	2) 抽象类中的成员变量可以是各种类型的，而接口中的成员变量只能是public static final类型的
	3) 接口中不能含有静态代码块以及静态方法，而抽象类可以有静态代码块和静态方法
	4) 一个类只能继承一个抽象类，而一个类却可以实现多个接口

2. 设计层面上的区别
	1) 抽象类是对一种事物的抽象，即对类抽象，而接口是对行为的抽象。抽象类是对整个类整体进行抽象，包括属性、行为，但是接口却是对类局部（行为）进行抽象。举个简单的例子，飞机和鸟是不同类的事物，但是它们都有一个共性，就是都会飞。那么在设计的时候，可以将飞机设计为一个类 Airplane，将鸟设计为一个类 Bird，但是不能将 飞行 这个特性也设计为类，因此它只是一个行为特性，并不是对一类事物的抽象描述。此时可以将 飞行 设计为一个接口 Fly ，包含方法`fly()`，然后 Airplane 和 Bird 分别根据自己的需要实现 Fly 这个接口。然后至于有不同种类的飞机，比如战斗机、民用飞机等直接继承 Airplane 即可，对于鸟也是类似的，不同种类的鸟直接继承 Bird 类即可。从这里可以看出，继承是一个 "是不是"的关系，而 接口 实现则是 "有没有"的关系。如果一个类继承了某个抽象类，则子类必定是抽象类的种类，而接口实现则是有没有、具备不具备的关系，比如鸟是否能飞（或者是否具备飞行这个特点），能飞行则可以实现这个接口，不能飞行就不实现这个接口

	2) 设计层面不同，抽象类作为很多子类的父类，它是一种模板式设计。而接口是一种行为规范，它是一种辐射式设计。什么是模板式设计？最简单例子，大家都用过 ppt 里面的模板，如果用模板 A 设计了 ppt B 和 ppt C，ppt B 和 ppt C 公共的部分就是模板 A 了，如果它们的公共部分需要改动，则只需要改动模板 A 就可以了，不需要重新对 ppt B 和 ppt C 进行改动。而辐射式设计，比如某个电梯都装了某种报警器，一旦要更新报警器，就必须全部更新。也就是说对于抽象类，如果需要添加新的方法，可以直接在抽象类中添加具体的实现，子类可以不进行变更；而对于接口则不行，如果接口进行了变更，则所有实现这个接口的类都必须进行相应的改动

下面看一个网上流传最广泛的例子：门和警报的例子：门都有 `open()` 和 `close()` 两个动作，此时我们可以定义通过抽象类和接口来定义这个抽象概念：

```java
abstract class Door {
    public abstract void open();
    public abstract void close();
}
```
或者：
```java
interface Door {
    public abstract void open();
    public abstract void close();
}
```
但是现在如果我们需要门具有报警 的功能，那么该如何实现？下面提供两种思路：

1. 将这三个功能都放在抽象类里面，但是这样一来所有继承于这个抽象类的子类都具备了报警功能，但是有的门并不一定具备报警功能

2. 将这三个功能都放在接口里面，需要用到报警功能的类就需要实现这个接口中的 `open()` 和 `close()`，也许这个类根本就不具备 `open()` 和 `close()` 这两个功能，比如火灾报警器

从这里可以看出， Door 的 `open()` 、`close()` 和 `alarm()` 根本就属于两个不同范畴内的行为，`open()` 和 `close()` 属于门本身固有的行为特性，而 `alarm()` 属于延伸的附加行为。因此最好的解决办法是单独将报警设计为一个接口，包含 `alarm()` 行为，Door 设计为单独的一个抽象类，包含 open 和 close 两种行为。再设计一个报警门继承 Door 类和实现 Alarm 接口

```java
interface Alram {
    void alarm();
}
 
abstract class Door {
    void open();
    void close();
}
 
class AlarmDoor extends Door implements Alarm {
    void oepn() {
      //....
    }
    void close() {
      //....
    }
    void alarm() {
      //....
    }
}
```

### Java包

**源文件声明规则:**
当在一个源文件中定义多个类，并且还有 import 语句和 package 语句时，要特别注意这些规则。

* 一个源文件中只能有一个`public`类
* 一个源文件可以有多个非`public`类
* 源文件的名称应该和`public`类的类名保持一致
* 如果一个类定义在某个包中，那么`package`语句应该在源文件的首行。
* 如果源文件包含`import`语句，那么应该放在`package`语句和类定义之间。如果没有`package`语句，那么`import`语句应该在源文件中最前面
* `import`语句和`package`语句对源文件中定义的所有类都有效。在同一源文件中，不能给不同的类不同的包声明


**package关键字:**
```java
package pkg1[．pkg2[．pkg3…]];
```

**示例:**
```Java
package net.java.util;

public class Something{
   ...
}
```
那么它的路径应该是`net/java/util/Something.java`这样保存的。 包的作用是把不同的 java 程序分类保存，更方便的被其他 java 程序调用

**import关键字:**

```java
import package1[.package2…].(classname|*);
```

`import`语句应位于`package`语句之后

**示例:**
```Java
package com.example;

import java.util.ArrayList; // 引入 java.util 包中的 ArrayList 类
import java.util.*; // 引入 java.util 包中的所有类

```

## 杂鱼 ❤~

### 单词术语速记

| 单词术语            | 释义     | 单词术语             | 释义       |
| :------------------ | -------- | -------------------- | ---------- |
| explicitly declared | 显示声明 | Assignment operator  | 赋值运算符 |
| Overload            | 重载     | Override             | 重写       |
| invoke              | 调用     | instantiate          | 实例化     |
| Upcasting           | 向上转型 | Downcasting          | 向下转型   |
| static polymorphism | 静态多态 | dynamic polymorphism | 动态多态   |
| interface           | 接口     | implement            | 实现       |
| complier            | 编译器   | termination          | 终止       |



### 值传递

Java 中所有参数传递都是值传递（pass-by-value），这是 Java 的一项语言特性

**示例:**

* 基本类型（primitive types）：

```java
void change(int x) {
    x = 5;
}

int a = 10;
change(a);
System.out.println(a);  // 输出还是 10
```

* 引用类型（reference types）：

```java
void changeName(Person p) {
    p.name = "Alice";  // p 仍然指向0x1234，与 person 指向的是同一个对象
}

Person person = new Person();   // 假设地址是0x1234
person.name = "Bob";
changeName(person);  // // 传进去的是 0x1234 的一个副本
System.out.println(person.name);  // 输出 Alice
```

```java
void changeName(Person p) {
    p = new Person();  // 修改了 p 指向的地址，因此不会影响外部的 person
    p.name = "Charlie";
}

Person person = new Person();
person.name = "Bob";
changeName(person);
System.out.println(person.name);  // 仍然是 Bob！
```

### `==`和`equals()`

1. `==` 的作用

对于基本数据类型（如int、char、boolean等），`==`比较的是它们的实际数值是否相等。

对于引用类型（即对象），`==`比较的是两个对象的内存地址（引用）是否相同，也就是说是否指向同一个对象实例。

**示例:**

```java
String a = "hello";
String b = "hello";
String c = new String("hello");

System.out.println(a == b); // true，a和b指向字符串常量池中的同一个对象
System.out.println(a == c); // false，c是new出来的新对象，地址不同
```

2. `equals() `的作用

`equals()`是`Object类`中的一个方法，用于比较两个对象的内容是否相等。

默认情况下（即没有重写`equals()`方法时），`equals()`的实现就是调用`==`，比较的是对象的引用地址。

许多类（如String、Integer等）重写了`equals()`方法，使其比较对象的**实际内容**，而不是引用地址

**示例:**

```java
String a = new String("hello");
String b = new String("hello");

System.out.println(a.equals(b)); // true，String重写了equals，比较字符串内容
```

如果自定义类没有重写`equals()`，则比较的是引用地址：

```java
class Cat {
    String name;
    Cat(String name) { this.name = name; }
}

Cat c1 = new Cat("Tom");
Cat c2 = new Cat("Tom");

System.out.println(c1.equals(c2)); // false，默认equals比较地址
```

[^1]: https://www.cnblogs.com/dolphin0520/p/3811437.html