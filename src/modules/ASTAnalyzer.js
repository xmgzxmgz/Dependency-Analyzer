const fs = require("fs-extra");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");
const { parse: parseVue } = require("@vue/compiler-sfc");
const FileScanner = require("./FileScanner");

/**
 * AST分析器
 * 负责解析源代码并提取组件信息、依赖关系和Props使用情况
 */
class ASTAnalyzer {
  /**
   * 构造函数
   * @param {Object} config - 配置对象
   */
  constructor(config) {
    this.config = config;
    this.fileScanner = new FileScanner(config);

    // Babel解析器配置
    this.babelOptions = {
      sourceType: "module",
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins: [
        "jsx",
        "typescript",
        "decorators-legacy",
        "classProperties",
        "objectRestSpread",
        "asyncGenerators",
        "functionBind",
        "exportDefaultFrom",
        "exportNamespaceFrom",
        "dynamicImport",
        "nullishCoalescingOperator",
        "optionalChaining",
      ],
    };
  }

  /**
   * 分析单个文件
   * @param {string} filePath - 文件路径
   * @returns {Object|null} 分析结果
   */
  async analyzeFile(filePath) {
    const ext = path.extname(filePath);

    try {
      if (ext === ".vue") {
        return await this.analyzeVueFile(filePath);
      } else {
        return await this.analyzeJSFile(filePath);
      }
    } catch (error) {
      throw new Error(`解析文件 ${filePath} 失败: ${error.message}`);
    }
  }

  /**
   * 分析Vue单文件组件
   * @param {string} filePath - Vue文件路径
   * @returns {Object|null} 分析结果
   */
  async analyzeVueFile(filePath) {
    const content = await fs.readFile(filePath, "utf-8");
    const { descriptor } = parseVue(content, { filename: filePath });

    const result = {
      filePath,
      componentName: this.extractComponentName(filePath),
      dependencies: new Map(),
      exports: [],
      propsDeclared: new Set(),
      propsUsedInBody: new Set(),
      isComponent: true,
    };

    // 分析script部分
    if (descriptor.script || descriptor.scriptSetup) {
      const scriptContent =
        descriptor.script?.content || descriptor.scriptSetup?.content || "";
      const scriptResult = await this.analyzeScriptContent(
        scriptContent,
        filePath
      );

      if (scriptResult) {
        result.dependencies = scriptResult.dependencies;
        result.exports = scriptResult.exports;
        result.propsDeclared = scriptResult.propsDeclared;
        result.propsUsedInBody = scriptResult.propsUsedInBody;
      }
    }

    // 分析template部分
    if (descriptor.template) {
      const templateDeps = this.analyzeVueTemplate(
        descriptor.template.content,
        result.dependencies
      );
      templateDeps.forEach((dep, key) => {
        result.dependencies.set(key, dep);
      });
    }

    return result;
  }

  /**
   * 分析JavaScript/TypeScript文件
   * @param {string} filePath - JS/TS文件路径
   * @returns {Object|null} 分析结果
   */
  async analyzeJSFile(filePath) {
    const content = await fs.readFile(filePath, "utf-8");
    return await this.analyzeScriptContent(content, filePath);
  }

  /**
   * 分析脚本内容
   * @param {string} content - 脚本内容
   * @param {string} filePath - 文件路径
   * @returns {Object|null} 分析结果
   */
  async analyzeScriptContent(content, filePath) {
    if (!content.trim()) {
      return null;
    }

    let ast;
    try {
      ast = parser.parse(content, this.babelOptions);
    } catch (error) {
      throw new Error(`解析AST失败: ${error.message}`);
    }

    const result = {
      filePath,
      componentName: this.extractComponentName(filePath),
      dependencies: new Map(),
      exports: [],
      propsDeclared: new Set(),
      propsUsedInBody: new Set(),
      isComponent: false,
      usesRestSpread: false, // 新增标记
      cyclomaticComplexity: 0,
      // 新增：增强的代码关联性分析
      functionCalls: new Map(), // 函数调用关系
      variableReferences: new Map(), // 变量引用关系
      dataFlow: new Map(), // 数据流分析
      hookUsage: new Set(), // React Hooks 使用
      eventHandlers: new Set(), // 事件处理器
      stateManagement: new Map(), // 状态管理分析
      componentLifecycle: new Set(), // 组件生命周期
      conditionalRendering: [], // 条件渲染分析
      dynamicImports: new Set(), // 动态导入
      contextUsage: new Set(), // Context 使用
      methodChains: new Map(), // 方法链调用
      asyncOperations: new Set(), // 异步操作
    };

    // 遍历AST
    traverse(ast, {
      // 处理导入声明
      ImportDeclaration: (path) => {
        this.handleImportDeclaration(path, result, filePath);
      },

      // 处理导出声明
      ExportDefaultDeclaration: (path) => {
        this.handleExportDeclaration(path, result);
      },

      ExportNamedDeclaration: (path) => {
        this.handleExportDeclaration(path, result);
      },

      // 处理 export * from '...'
      ExportAllDeclaration: (path) => {
        if (path.node.source && path.node.source.value) {
          const src = path.node.source.value;
          const resolvedPath = this.fileScanner.resolveImportPath(
            src,
            result.filePath
          );
          if (resolvedPath && this.fileScanner.isInProjectScope(resolvedPath)) {
            if (!result.dependencies) result.dependencies = new Map();
            result.dependencies.set(resolvedPath, {
              source: src,
              resolvedPath,
              specifiers: ["*"],
              type: "reexport",
            });
            // 记录通配符重导出到 exports
            result.exports.push({
              type: "named",
              name: "*",
              reexport: true,
              from: src,
            });
          }
        }
      },

      // 处理动态导入与 CommonJS require
      CallExpression: (path) => {
        this.handleCallExpression(path, result, filePath);
        this.analyzeFunctionCalls(path, result); // 新增：分析函数调用
        this.analyzeHookUsage(path, result); // 新增：分析Hook使用
        this.analyzeStateManagement(path, result); // 新增：分析状态管理
        this.analyzeContextUsage(path, result); // 新增：分析Context使用
        this.analyzeMethodChains(path, result); // 新增：分析方法链
        this.analyzeAsyncOperations(path, result); // 新增：分析异步操作
      },

      // 处理JSX元素
      JSXOpeningElement: (path) => {
        this.handleJSXElement(path, result);
        this.analyzeEventHandlers(path, result); // 新增：分析事件处理器
      },

      // 处理函数组件
      FunctionDeclaration: (path) => {
        this.handleFunctionComponent(path, result);
        this.analyzeFunctionDefinition(path, result); // 新增：分析函数定义
      },

      ArrowFunctionExpression: (path) => {
        this.handleArrowFunctionComponent(path, result);
        this.analyzeFunctionDefinition(path, result); // 新增：分析箭头函数定义
      },

      // 处理类组件
      ClassDeclaration: (path) => {
        this.handleClassComponent(path, result);
        this.analyzeLifecycleMethods(path, result); // 新增：分析生命周期方法
      },

      // 处理Props使用
      MemberExpression: (path) => {
        this.handlePropsUsage(path, result);
        this.analyzeVariableReferences(path, result); // 新增：分析变量引用
      },

      // 处理对象解构
      ObjectPattern: (path) => {
        this.handleObjectDestructuring(path, result);
      },
      // 处理 ...rest
      RestElement: (path) => {
        this.handleRestElement(path, result);
      },

      // 新增：处理变量声明
      VariableDeclarator: (path) => {
        this.analyzeDataFlow(path, result);
      },

      // 新增：处理赋值表达式
      AssignmentExpression: (path) => {
        this.analyzeDataFlow(path, result);
      },

      // 新增：处理条件表达式
      ConditionalExpression: (path) => {
        this.analyzeConditionalRendering(path, result);
      },

      // 新增：处理逻辑表达式
      LogicalExpression: (path) => {
        this.analyzeConditionalRendering(path, result);
      },

      // 新增：处理动态导入
      Import: (path) => {
        this.analyzeDynamicImports(path, result);
      },
    });

    // 如果没有导出任何组件，返回null
    if (result.exports.length === 0 && !result.isComponent) {
      return null;
    }

    return result;
  }

  /**
   * 处理导入声明
   * @param {Object} path - AST路径
   * @param {Object} result - 结果对象
   * @param {string} currentFile - 当前文件路径
   */
  handleImportDeclaration(path, result, currentFile) {
    const source = path.node.source.value;
    const resolvedPath = this.fileScanner.resolveImportPath(
      source,
      currentFile
    );

    if (resolvedPath && this.fileScanner.isInProjectScope(resolvedPath)) {
      const specifiers = path.node.specifiers
        .map((spec) => {
          if (t.isImportDefaultSpecifier(spec)) {
            return { type: "default", local: spec.local.name };
          } else if (t.isImportSpecifier(spec)) {
            return {
              type: "named",
              imported: spec.imported.name,
              local: spec.local.name,
            };
          } else if (t.isImportNamespaceSpecifier(spec)) {
            return { type: "namespace", local: spec.local.name };
          }
          return null;
        })
        .filter(Boolean);

      result.dependencies.set(resolvedPath, {
        source,
        resolvedPath,
        specifiers,
      });
    }
  }

  /**
   * 处理导出声明
   * @param {Object} path - AST路径
   * @param {Object} result - 结果对象
   */
  handleExportDeclaration(path, result) {
    if (t.isExportDefaultDeclaration(path.node)) {
      result.exports.push({
        type: "default",
        name: this.extractExportName(path.node.declaration),
      });
      result.isComponent = this.isComponentDeclaration(path.node.declaration);
    } else if (t.isExportNamedDeclaration(path.node)) {
      if (path.node.declaration) {
        const name = this.extractExportName(path.node.declaration);
        if (name) {
          result.exports.push({
            type: "named",
            name,
          });
          result.isComponent = this.isComponentDeclaration(
            path.node.declaration
          );
        }
      }
      // 支持 re-export: export { X } from './X'
      if (path.node.source && path.node.source.value) {
        const src = path.node.source.value;
        const resolvedPath = this.fileScanner.resolveImportPath(
          src,
          result.filePath
        );
        if (resolvedPath && this.fileScanner.isInProjectScope(resolvedPath)) {
          if (!result.dependencies) result.dependencies = new Map();
          result.dependencies.set(resolvedPath, {
            source: src,
            resolvedPath,
            specifiers: [],
          });
          // 将重导出视为导出的一部分，以便该文件参与图谱
          const exportedNames = (path.node.specifiers || [])
            .map((s) =>
              t.isExportSpecifier(s) && s.exported ? s.exported.name : null
            )
            .filter(Boolean);
          if (exportedNames.length > 0) {
            exportedNames.forEach((name) => {
              result.exports.push({
                type: "named",
                name,
                reexport: true,
                from: src,
              });
            });
          } else {
            // 无显式名称时，记录通配符
            result.exports.push({
              type: "named",
              name: "*",
              reexport: true,
              from: src,
            });
          }
        }
      }
    }
  }

  /**
   * 处理JSX元素
   * @param {Object} path - AST路径
   * @param {Object} result - 结果对象
   */
  handleJSXElement(path, result) {
    const elementName = path.node.name.name;

    // 只处理自定义组件（首字母大写）
    if (elementName && /^[A-Z]/.test(elementName)) {
      // 查找对应的导入
      for (const [depPath, dep] of result.dependencies) {
        const matchingSpecifier = dep.specifiers.find(
          (spec) => spec.local === elementName || spec.imported === elementName
        );

        if (matchingSpecifier) {
          // 记录组件使用
          if (!result.componentUsages) {
            result.componentUsages = new Map();
          }

          const usage = result.componentUsages.get(depPath) || {
            count: 0,
            props: new Set(),
          };
          usage.count++;

          // 记录传递的props
          path.node.attributes.forEach((attr) => {
            if (t.isJSXAttribute(attr) && attr.name) {
              usage.props.add(attr.name.name);
            }
          });

          result.componentUsages.set(depPath, usage);
          break;
        }
      }
    }
  }

  /**
   * 处理函数组件
   * @param {Object} path - AST路径
   * @param {Object} result - 结果对象
   */
  handleFunctionComponent(path, result) {
    if (this.isFunctionComponent(path.node)) {
      result.isComponent = true;
      this.extractPropsFromFunction(path, result);
      // 圈复杂度计算（函数体）
      try {
        const bodyNode =
          path.node.body &&
          (t.isBlockStatement(path.node.body) ? path.node.body : null);
        const computed = this.computeCyclomaticComplexity(
          bodyNode || path.node.body || path.node
        );
        result.cyclomaticComplexity = Math.max(
          result.cyclomaticComplexity || 0,
          computed || 0
        );
      } catch (_) {}
    }
  }

  /**
   * 处理箭头函数组件
   * @param {Object} path - AST路径
   * @param {Object} result - 结果对象
   */
  handleArrowFunctionComponent(path, result) {
    if (this.isArrowFunctionComponent(path)) {
      result.isComponent = true;
      this.extractPropsFromFunction(path, result);
      // 圈复杂度计算（箭头函数体）
      try {
        const bodyNode =
          path.node.body &&
          (t.isBlockStatement(path.node.body) ? path.node.body : null);
        const computed = this.computeCyclomaticComplexity(
          bodyNode || path.node.body || path.node
        );
        result.cyclomaticComplexity = Math.max(
          result.cyclomaticComplexity || 0,
          computed || 0
        );
      } catch (_) {}
    }
  }

  /**
   * 处理类组件
   * @param {Object} path - AST路径
   * @param {Object} result - 结果对象
   */
  handleClassComponent(path, result) {
    if (this.isClassComponent(path.node)) {
      result.isComponent = true;
      this.extractPropsFromClass(path, result);
      // 圈复杂度计算（render方法）
      try {
        const renderMethod = path.node.body?.body?.find(
          (member) =>
            t.isClassMethod(member) &&
            t.isIdentifier(member.key, { name: "render" })
        );
        const bodyNode = renderMethod?.body || null;
        const computed = this.computeCyclomaticComplexity(
          bodyNode || path.node.body || path.node
        );
        result.cyclomaticComplexity = Math.max(
          result.cyclomaticComplexity || 0,
          computed || 0
        );
      } catch (_) {}
    }
  }

  /**
   * 处理Props使用
   * @param {Object} path - AST路径
   * @param {Object} result - 结果对象
   */
  handlePropsUsage(path, result) {
    const node = path.node;

    // 检查 props.xxx 模式
    if (
      t.isIdentifier(node.object, { name: "props" }) &&
      t.isIdentifier(node.property)
    ) {
      result.propsUsedInBody.add(node.property.name);
    }
  }

  /**
   * 处理对象解构
   * @param {Object} path - AST路径
   * @param {Object} result - 结果对象
   */
  handleObjectDestructuring(path, result) {
    // 检查是否是从props解构
    const parent = path.parent;
    if (
      t.isVariableDeclarator(parent) &&
      t.isIdentifier(parent.init, { name: "props" })
    ) {
      path.node.properties.forEach((prop) => {
        if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
          result.propsUsedInBody.add(prop.key.name);
        }
      });
    }
  }

  /**
   * 处理 ...rest 语法
   * @param {Object} path - AST路径
   * @param {Object} result - 结果对象
   */
  handleRestElement(path, result) {
    // 检查是否是从props解构
    const parent = path.parent;
    if (
      t.isObjectPattern(parent) &&
      t.isVariableDeclarator(parent.parent) &&
      t.isIdentifier(parent.parent.init, { name: "props" })
    ) {
      result.usesRestSpread = true;
    }
  }

  /**
   * 分析Vue模板
   * @param {string} template - 模板内容
   * @param {Map} existingDeps - 已存在的依赖
   * @returns {Map} 模板中发现的依赖
   */
  analyzeVueTemplate(template, existingDeps) {
    const templateDeps = new Map();

    // 简单的正则匹配自定义组件
    const componentRegex = /<([A-Z][a-zA-Z0-9]*)/g;
    let match;

    while ((match = componentRegex.exec(template)) !== null) {
      const componentName = match[1];

      // 查找对应的导入
      for (const [depPath, dep] of existingDeps) {
        const matchingSpecifier = dep.specifiers.find(
          (spec) =>
            spec.local === componentName || spec.imported === componentName
        );

        if (matchingSpecifier) {
          templateDeps.set(depPath, dep);
          break;
        }
      }
    }

    return templateDeps;
  }

  /**
   * 提取组件名称
   * @param {string} filePath - 文件路径
   * @returns {string} 组件名称
   */
  extractComponentName(filePath) {
    const basename = path.basename(filePath, path.extname(filePath));
    return basename === "index"
      ? path.basename(path.dirname(filePath))
      : basename;
  }

  /**
   * 处理动态导入 import() 和 CommonJS require()
   */
  handleCallExpression(path, result, currentFile) {
    const callee = path.node.callee;
    // import('...')
    if (t.isImport(callee) && path.node.arguments?.length === 1) {
      const arg = path.node.arguments[0];
      if (t.isStringLiteral(arg)) {
        const src = arg.value;
        const resolved = this.fileScanner.resolveImportPath(src, currentFile);
        if (resolved && this.fileScanner.isInProjectScope(resolved)) {
          result.dependencies.set(resolved, {
            source: src,
            resolvedPath: resolved,
            specifiers: [],
            dynamic: true,
          });
        }
      }
    }
    // require('...')
    if (
      t.isIdentifier(callee, { name: "require" }) &&
      path.node.arguments?.length >= 1
    ) {
      const arg = path.node.arguments[0];
      if (t.isStringLiteral(arg)) {
        const src = arg.value;
        const resolved = this.fileScanner.resolveImportPath(src, currentFile);
        if (resolved && this.fileScanner.isInProjectScope(resolved)) {
          result.dependencies.set(resolved, {
            source: src,
            resolvedPath: resolved,
            specifiers: [],
            require: true,
          });
        }
      }
    }
  }

  /**
   * 提取导出名称
   * @param {Object} declaration - 声明节点
   * @returns {string|null} 导出名称
   */
  extractExportName(declaration) {
    if (t.isIdentifier(declaration)) {
      return declaration.name;
    } else if (
      t.isFunctionDeclaration(declaration) ||
      t.isClassDeclaration(declaration)
    ) {
      return declaration.id ? declaration.id.name : null;
    } else if (t.isVariableDeclaration(declaration)) {
      const declarator = declaration.declarations[0];
      if (declarator && t.isIdentifier(declarator.id)) {
        return declarator.id.name;
      }
    }
    return null;
  }

  /**
   * 判断是否为组件声明
   * @param {Object} declaration - 声明节点
   * @returns {boolean} 是否为组件
   */
  isComponentDeclaration(declaration) {
    if (t.isFunctionDeclaration(declaration)) {
      return this.isFunctionComponent(declaration);
    } else if (t.isClassDeclaration(declaration)) {
      return this.isClassComponent(declaration);
    } else if (t.isArrowFunctionExpression(declaration)) {
      return this.hasJSXReturn(declaration);
    } else if (t.isIdentifier(declaration)) {
      // 对于标识符导出（如 export default App），检查是否已经标记为组件
      return declaration.name && /^[A-Z]/.test(declaration.name);
    }
    return false;
  }

  /**
   * 判断是否为函数组件
   * @param {Object} node - 函数节点
   * @returns {boolean} 是否为函数组件
   */
  isFunctionComponent(node) {
    // 检查函数名首字母大写
    if (!node.id || !/^[A-Z]/.test(node.id.name)) {
      return false;
    }

    // 检查是否有JSX返回
    return this.hasJSXReturn(node);
  }

  /**
   * 判断是否为箭头函数组件
   * @param {Object} path - AST路径
   * @returns {boolean} 是否为箭头函数组件
   */
  isArrowFunctionComponent(path) {
    // 检查是否在变量声明中且变量名首字母大写
    const parent = path.parent;
    if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
      if (!/^[A-Z]/.test(parent.id.name)) {
        return false;
      }
      // 检查是否有JSX返回
      return this.hasJSXReturn(path.node);
    }
    return false;
  }

  /**
   * 判断是否为类组件
   * @param {Object} node - 类节点
   * @returns {boolean} 是否为类组件
   */
  isClassComponent(node) {
    // 检查是否继承自React.Component或Component
    if (node.superClass) {
      if (t.isIdentifier(node.superClass, { name: "Component" })) {
        return true;
      }
      if (
        t.isMemberExpression(node.superClass) &&
        t.isIdentifier(node.superClass.object, { name: "React" }) &&
        t.isIdentifier(node.superClass.property, { name: "Component" })
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * 检查函数是否返回JSX
   * @param {Object} node - 函数节点
   * @returns {boolean} 是否返回JSX
   */
  hasJSXReturn(node) {
    // 对于箭头函数的表达式体
    if (
      t.isArrowFunctionExpression(node) &&
      (t.isJSXElement(node.body) || t.isJSXFragment(node.body))
    ) {
      return true;
    }

    // 简单检查函数体是否包含JSX
    if (node.body && node.body.body) {
      for (const statement of node.body.body) {
        if (t.isReturnStatement(statement) && statement.argument) {
          if (
            t.isJSXElement(statement.argument) ||
            t.isJSXFragment(statement.argument)
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * 计算圈复杂度（Cyclomatic Complexity）
   * @param {Object} bodyNode - 函数或方法的主体节点
   * @returns {number} 圈复杂度
   */
  computeCyclomaticComplexity(bodyNode) {
    if (!bodyNode) return 0;
    let complexity = 1; // 基础复杂度
    try {
      traverse(bodyNode, {
        enter(p) {
          const n = p.node;
          if (t.isIfStatement(n)) complexity += 1;
          else if (t.isSwitchCase(n) && n.test) complexity += 1;
          else if (
            t.isForStatement(n) ||
            t.isForInStatement(n) ||
            t.isForOfStatement(n)
          )
            complexity += 1;
          else if (t.isWhileStatement(n) || t.isDoWhileStatement(n))
            complexity += 1;
          else if (t.isConditionalExpression(n)) complexity += 1;
          else if (
            t.isLogicalExpression(n) &&
            (n.operator === "&&" || n.operator === "||")
          )
            complexity += 1;
          else if (t.isCatchClause(n)) complexity += 1;
        },
      });
    } catch (e) {
      // 兜底，确保不抛错
      complexity = Math.max(complexity, 1);
    }
    return complexity;
  }

  /**
   * 从函数中提取Props信息
   * @param {Object} path - AST路径
   * @param {Object} result - 结果对象
   */
  extractPropsFromFunction(path, result) {
    const params = path.node.params;
    if (params.length > 0) {
      const propsParam = params[0];

      if (t.isObjectPattern(propsParam)) {
        // 解构参数：记录声明的 prop，但不立即标记为使用
        const declared = new Set();
        propsParam.properties.forEach((prop) => {
          if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
            declared.add(prop.key.name);
            result.propsDeclared.add(prop.key.name);
          } else if (t.isRestElement(prop)) {
            // 如果在props解构中使用了 ...rest，标记以便跳过未使用判断
            result.usesRestSpread = true;
          }
        });

        // 遍历函数体，标记被实际引用的解构标识符为已使用
        // 仅遍历函数体，避免将形参本身计为使用
        const bodyPath = path.get("body");
        if (bodyPath && typeof bodyPath.traverse === "function") {
          const used = new Set();
          bodyPath.traverse({
            Identifier(p) {
              const name = p.node.name;
              if (declared.has(name)) {
                used.add(name);
              }
            },
          });
          for (const name of used) {
            result.propsUsedInBody.add(name);
          }
        }
      } else if (t.isIdentifier(propsParam)) {
        // props参数，需要在函数体中查找使用
        // 这部分在handlePropsUsage中处理
      }
    }
  }

  /**
   * 从类中提取Props信息
   * @param {Object} path - AST路径
   * @param {Object} result - 结果对象
   */
  extractPropsFromClass(path, result) {
    // 查找propTypes静态属性
    const propTypesProperty = path.node.body.body.find(
      (member) =>
        t.isClassProperty(member) &&
        t.isIdentifier(member.key, { name: "propTypes" }) &&
        member.static
    );

    if (propTypesProperty && t.isObjectExpression(propTypesProperty.value)) {
      propTypesProperty.value.properties.forEach((prop) => {
        if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
          result.propsDeclared.add(prop.key.name);
        }
      });
    }
  }

  /**
   * 新增：分析函数调用关系
   * @param {Object} path - AST路径
   * @param {Object} result - 分析结果
   */
  analyzeFunctionCalls(path, result) {
    const callee = path.node.callee;
    let callName = '';
    let context = '';

    if (t.isIdentifier(callee)) {
      callName = callee.name;
    } else if (t.isMemberExpression(callee)) {
      if (t.isIdentifier(callee.object) && t.isIdentifier(callee.property)) {
        context = callee.object.name;
        callName = `${callee.object.name}.${callee.property.name}`;
      }
    }

    if (callName) {
      // 获取调用位置信息
      const location = path.node.loc?.start.line || 0;
      const args = path.node.arguments.map(arg => this.getExpressionType(arg));
      
      if (!result.functionCalls.has(callName)) {
        result.functionCalls.set(callName, []);
      }
      
      result.functionCalls.get(callName).push({
        location,
        context,
        arguments: args,
        argumentCount: path.node.arguments.length
      });
    }
  }

  /**
   * 新增：分析函数定义
   * @param {Object} path - AST路径
   * @param {Object} result - 分析结果
   */
  analyzeFunctionDefinition(path, result) {
    const functionName = path.node.id?.name || 'anonymous';
    const calls = new Set();
    const variables = new Set();

    // 遍历函数体，收集内部调用和变量使用
    path.traverse({
      CallExpression(callPath) {
        const callee = callPath.node.callee;
        if (t.isIdentifier(callee)) {
          calls.add(callee.name);
        } else if (t.isMemberExpression(callee)) {
          if (t.isIdentifier(callee.object) && t.isIdentifier(callee.property)) {
            calls.add(`${callee.object.name}.${callee.property.name}`);
          }
        }
      },
      Identifier(idPath) {
        if (idPath.isReferencedIdentifier()) {
          variables.add(idPath.node.name);
        }
      }
    });

    if (!result.functionCalls.has(functionName)) {
      result.functionCalls.set(functionName, []);
    }
    
    result.functionCalls.set(functionName + '_definition', {
      internalCalls: Array.from(calls),
      referencedVariables: Array.from(variables),
      parameters: path.node.params.map(param => {
        if (t.isIdentifier(param)) return param.name;
        if (t.isObjectPattern(param)) return 'destructured';
        return 'complex';
      })
    });
  }

  /**
   * 新增：分析React Hooks使用
   * @param {Object} path - AST路径
   * @param {Object} result - 分析结果
   */
  analyzeHookUsage(path, result) {
    const callee = path.node.callee;
    
    if (t.isIdentifier(callee) && callee.name.startsWith('use')) {
      const hookName = callee.name;
      const location = path.node.loc?.start.line || 0;
      const args = path.node.arguments.map(arg => this.getExpressionType(arg));
      
      result.hookUsage.add({
        name: hookName,
        location,
        arguments: args,
        argumentCount: path.node.arguments.length
      });
    }
  }

  /**
   * 新增：分析生命周期方法
   * @param {Object} path - AST路径
   * @param {Object} result - 分析结果
   */
  analyzeLifecycleMethods(path, result) {
    const lifecycleMethods = [
      'componentDidMount', 'componentDidUpdate', 'componentWillUnmount',
      'shouldComponentUpdate', 'getSnapshotBeforeUpdate', 'componentDidCatch',
      'getDerivedStateFromProps', 'getDerivedStateFromError', 'constructor',
      'render'
    ];

    path.traverse({
      ClassMethod(methodPath) {
        const methodName = methodPath.node.key.name;
        if (lifecycleMethods.includes(methodName)) {
          const location = methodPath.node.loc?.start.line || 0;
          result.componentLifecycle.add({
            name: methodName,
            location,
            isAsync: methodPath.node.async || false
          });
        }
      }
    });
  }

  /**
   * 新增：分析变量引用关系
   * @param {Object} path - AST路径
   * @param {Object} result - 分析结果
   */
  analyzeVariableReferences(path, result) {
    const node = path.node;
    
    if (t.isMemberExpression(node) && t.isIdentifier(node.object)) {
      const objectName = node.object.name;
      const propertyName = t.isIdentifier(node.property) ? node.property.name : 'computed';
      const location = node.loc?.start.line || 0;
      
      if (!result.variableReferences.has(objectName)) {
        result.variableReferences.set(objectName, []);
      }
      
      result.variableReferences.get(objectName).push({
        property: propertyName,
        location,
        isComputed: !t.isIdentifier(node.property)
      });
    }
  }

  /**
   * 新增：分析数据流
   * @param {Object} path - AST路径
   * @param {Object} result - 分析结果
   */
  analyzeDataFlow(path, result) {
    const node = path.node;
    
    if (t.isVariableDeclarator(node) && t.isIdentifier(node.id)) {
      const varName = node.id.name;
      const initType = this.getExpressionType(node.init);
      const location = node.loc?.start.line || 0;
      
      result.dataFlow.set(varName, {
        type: initType,
        dependencies: this.extractDependencies(node.init),
        location,
        isDeclaration: true
      });
    } else if (t.isAssignmentExpression(node) && t.isIdentifier(node.left)) {
      const varName = node.left.name;
      const valueType = this.getExpressionType(node.right);
      const location = node.loc?.start.line || 0;
      
      result.dataFlow.set(varName + '_reassign_' + location, {
        variable: varName,
        type: valueType,
        dependencies: this.extractDependencies(node.right),
        location,
        isReassignment: true
      });
    }
  }

  /**
   * 新增：分析状态管理
   * @param {Object} path - AST路径
   * @param {Object} result - 分析结果
   */
  analyzeStateManagement(path, result) {
    const callee = path.node.callee;
    const location = path.node.loc?.start.line || 0;
    
    // React state management
    if (t.isIdentifier(callee)) {
      if (callee.name === 'useState') {
        const stateInfo = {
          type: 'useState',
          location,
          initialValue: this.getExpressionType(path.node.arguments[0])
        };
        result.stateManagement.set('useState_' + location, stateInfo);
      } else if (callee.name === 'useReducer') {
        const stateInfo = {
          type: 'useReducer',
          location,
          hasInitialState: path.node.arguments.length > 1
        };
        result.stateManagement.set('useReducer_' + location, stateInfo);
      } else if (callee.name === 'useContext') {
        const stateInfo = {
          type: 'useContext',
          location,
          contextName: this.getExpressionType(path.node.arguments[0])
        };
        result.stateManagement.set('useContext_' + location, stateInfo);
      }
    }
    
    // Redux/Zustand patterns
    if (t.isMemberExpression(callee)) {
      const objectName = callee.object.name;
      const methodName = callee.property.name;
      
      if (objectName === 'dispatch' || methodName === 'dispatch') {
        const stateInfo = {
          type: 'redux-dispatch',
          location,
          actionType: this.extractActionType(path.node.arguments[0])
        };
        result.stateManagement.set('dispatch_' + location, stateInfo);
      }
    }
  }

  /**
   * 新增：分析Context使用
   * @param {Object} path - AST路径
   * @param {Object} result - 分析结果
   */
  analyzeContextUsage(path, result) {
    const callee = path.node.callee;
    const location = path.node.loc?.start.line || 0;
    
    if (t.isIdentifier(callee) && callee.name === 'useContext') {
      const arg = path.node.arguments[0];
      if (t.isIdentifier(arg)) {
        result.contextUsage.add({
          type: 'useContext',
          contextName: arg.name,
          location
        });
      }
    }
    
    if (t.isMemberExpression(callee) && 
        t.isIdentifier(callee.property) && 
        callee.property.name === 'createContext') {
      result.contextUsage.add({
        type: 'createContext',
        location
      });
    }
  }

  /**
   * 新增：分析条件渲染
   * @param {Object} path - AST路径
   * @param {Object} result - 分析结果
   */
  analyzeConditionalRendering(path, result) {
    const node = path.node;
    const location = node.loc?.start.line || 0;
    
    if (t.isConditionalExpression(node) || t.isLogicalExpression(node)) {
      const condition = this.extractConditionInfo(node);
      if (condition) {
        result.conditionalRendering.push({
          type: node.type,
          condition: condition,
          location,
          operator: node.operator || '?:'
        });
      }
    }
  }

  /**
   * 新增：分析事件处理器
   * @param {Object} path - AST路径
   * @param {Object} result - 分析结果
   */
  analyzeEventHandlers(path, result) {
    const attributes = path.node.attributes || [];
    const location = path.node.loc?.start.line || 0;
    
    attributes.forEach(attr => {
      if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
        const attrName = attr.name.name;
        if (attrName.startsWith('on') && attrName.length > 2) {
          const eventType = attrName.slice(2).toLowerCase();
          const handlerType = this.getExpressionType(attr.value?.expression);
          
          result.eventHandlers.add({
            eventType,
            handlerType,
            location,
            attributeName: attrName
          });
        }
      }
    });
  }

  /**
   * 新增：分析方法链调用
   * @param {Object} path - AST路径
   * @param {Object} result - 分析结果
   */
  analyzeMethodChains(path, result) {
    const callee = path.node.callee;
    
    if (t.isMemberExpression(callee)) {
      const chain = this.extractMethodChain(callee);
      if (chain.length > 1) {
        const location = path.node.loc?.start.line || 0;
        const chainKey = chain.join('.');
        
        if (!result.methodChains.has(chainKey)) {
          result.methodChains.set(chainKey, []);
        }
        
        result.methodChains.get(chainKey).push({
          chain,
          location,
          argumentCount: path.node.arguments.length
        });
      }
    }
  }

  /**
   * 新增：分析异步操作
   * @param {Object} path - AST路径
   * @param {Object} result - 分析结果
   */
  analyzeAsyncOperations(path, result) {
    const callee = path.node.callee;
    const location = path.node.loc?.start.line || 0;
    
    // Promise相关
    if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
      const methodName = callee.property.name;
      if (['then', 'catch', 'finally', 'all', 'race', 'resolve', 'reject'].includes(methodName)) {
        result.asyncOperations.add({
          type: 'promise',
          method: methodName,
          location
        });
      }
    }
    
    // async/await 在函数声明中处理
    if (t.isIdentifier(callee)) {
      // setTimeout, setInterval等
      if (['setTimeout', 'setInterval', 'requestAnimationFrame'].includes(callee.name)) {
        result.asyncOperations.add({
          type: 'timer',
          method: callee.name,
          location
        });
      }
    }
  }

  /**
   * 新增：分析动态导入
   * @param {Object} path - AST路径
   * @param {Object} result - 分析结果
   */
  analyzeDynamicImports(path, result) {
    const parent = path.parent;
    if (t.isCallExpression(parent) && t.isImport(parent.callee)) {
      const arg = parent.arguments[0];
      if (t.isStringLiteral(arg)) {
        const location = parent.loc?.start.line || 0;
        result.dynamicImports.add({
          module: arg.value,
          location
        });
      }
    }
  }

  /**
   * 新增：获取表达式类型
   * @param {Object} node - AST节点
   * @returns {string} 表达式类型
   */
  getExpressionType(node) {
    if (!node) return 'undefined';
    if (t.isStringLiteral(node)) return 'string';
    if (t.isNumericLiteral(node)) return 'number';
    if (t.isBooleanLiteral(node)) return 'boolean';
    if (t.isArrayExpression(node)) return 'array';
    if (t.isObjectExpression(node)) return 'object';
    if (t.isFunctionExpression(node) || t.isArrowFunctionExpression(node)) return 'function';
    if (t.isCallExpression(node)) return 'call-result';
    if (t.isIdentifier(node)) return 'variable';
    if (t.isJSXElement(node)) return 'jsx';
    return 'unknown';
  }

  /**
   * 新增：提取依赖关系
   * @param {Object} node - AST节点
   * @returns {Array} 依赖列表
   */
  extractDependencies(node) {
    const dependencies = [];
    
    if (!node) return dependencies;
    
    if (t.isIdentifier(node)) {
      dependencies.push(node.name);
    } else if (t.isMemberExpression(node)) {
      if (t.isIdentifier(node.object)) {
        dependencies.push(node.object.name);
      }
    } else if (t.isCallExpression(node)) {
      if (t.isIdentifier(node.callee)) {
        dependencies.push(node.callee.name);
      }
      // 递归分析参数
      node.arguments.forEach(arg => {
        dependencies.push(...this.extractDependencies(arg));
      });
    } else if (t.isArrayExpression(node)) {
      node.elements.forEach(element => {
        if (element) {
          dependencies.push(...this.extractDependencies(element));
        }
      });
    } else if (t.isObjectExpression(node)) {
      node.properties.forEach(prop => {
        if (t.isObjectProperty(prop)) {
          dependencies.push(...this.extractDependencies(prop.value));
        }
      });
    }
    
    return dependencies;
  }

  /**
   * 新增：提取条件信息
   * @param {Object} node - AST节点
   * @returns {string|null} 条件信息
   */
  extractConditionInfo(node) {
    if (t.isIdentifier(node)) {
      return node.name;
    } else if (t.isMemberExpression(node)) {
      if (t.isIdentifier(node.object) && t.isIdentifier(node.property)) {
        return `${node.object.name}.${node.property.name}`;
      }
    } else if (t.isBinaryExpression(node)) {
      const left = this.extractConditionInfo(node.left);
      const right = this.extractConditionInfo(node.right);
      return `${left} ${node.operator} ${right}`;
    } else if (t.isLogicalExpression(node)) {
      const left = this.extractConditionInfo(node.left);
      const right = this.extractConditionInfo(node.right);
      return `${left} ${node.operator} ${right}`;
    }
    return null;
  }

  /**
   * 新增：提取方法链
   * @param {Object} node - MemberExpression节点
   * @returns {Array} 方法链数组
   */
  extractMethodChain(node) {
    const chain = [];
    let current = node;
    
    while (t.isMemberExpression(current)) {
      if (t.isIdentifier(current.property)) {
        chain.unshift(current.property.name);
      }
      current = current.object;
    }
    
    if (t.isIdentifier(current)) {
      chain.unshift(current.name);
    }
    
    return chain;
  }

  /**
   * 新增：提取Action类型
   * @param {Object} node - AST节点
   * @returns {string} Action类型
   */
  extractActionType(node) {
    if (t.isObjectExpression(node)) {
      const typeProp = node.properties.find(prop => 
        t.isObjectProperty(prop) && 
        t.isIdentifier(prop.key, { name: 'type' })
      );
      if (typeProp && t.isStringLiteral(typeProp.value)) {
        return typeProp.value.value;
      }
    } else if (t.isStringLiteral(node)) {
      return node.value;
    }
    return 'unknown';
  }
}

module.exports = ASTAnalyzer;
