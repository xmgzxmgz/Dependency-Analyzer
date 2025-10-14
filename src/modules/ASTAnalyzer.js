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
          const resolvedPath = this.fileScanner.resolveImportPath(src, result.filePath);
          if (resolvedPath && this.fileScanner.isInProjectScope(resolvedPath)) {
            if (!result.dependencies) result.dependencies = new Map();
            result.dependencies.set(resolvedPath, {
              source: src,
              resolvedPath,
              specifiers: ['*'],
              type: 'reexport'
            });
            // 记录通配符重导出到 exports
            result.exports.push({ type: 'named', name: '*', reexport: true, from: src });
          }
        }
      },

      // 处理动态导入与 CommonJS require
      CallExpression: (path) => {
        this.handleCallExpression(path, result, filePath);
      },

      // 处理JSX元素
      JSXOpeningElement: (path) => {
        this.handleJSXElement(path, result);
      },

      // 处理函数组件
      FunctionDeclaration: (path) => {
        this.handleFunctionComponent(path, result);
      },

      ArrowFunctionExpression: (path) => {
        this.handleArrowFunctionComponent(path, result);
      },

      // 处理类组件
      ClassDeclaration: (path) => {
        this.handleClassComponent(path, result);
      },

      // 处理Props使用
      MemberExpression: (path) => {
        this.handlePropsUsage(path, result);
      },

      // 处理对象解构
      ObjectPattern: (path) => {
        this.handleObjectDestructuring(path, result);
      },
      // 处理 ...rest
      RestElement: (path) => {
        this.handleRestElement(path, result);
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
        const resolvedPath = this.fileScanner.resolveImportPath(src, result.filePath);
        if (resolvedPath && this.fileScanner.isInProjectScope(resolvedPath)) {
          if (!result.dependencies) result.dependencies = new Map();
          result.dependencies.set(resolvedPath, {
            source: src,
            resolvedPath,
            specifiers: [],
          });
          // 将重导出视为导出的一部分，以便该文件参与图谱
          const exportedNames = (path.node.specifiers || [])
            .map(s => (t.isExportSpecifier(s) && s.exported ? s.exported.name : null))
            .filter(Boolean);
          if (exportedNames.length > 0) {
            exportedNames.forEach(name => {
              result.exports.push({ type: 'named', name, reexport: true, from: src });
            });
          } else {
            // 无显式名称时，记录通配符
            result.exports.push({ type: 'named', name: '*', reexport: true, from: src });
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
    if (t.isIdentifier(callee, { name: 'require' }) && path.node.arguments?.length >= 1) {
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
        const bodyPath = path.get('body');
        if (bodyPath && typeof bodyPath.traverse === 'function') {
          const used = new Set();
          bodyPath.traverse({
            Identifier(p) {
              const name = p.node.name;
              if (declared.has(name)) {
                used.add(name);
              }
            }
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
}

module.exports = ASTAnalyzer;
