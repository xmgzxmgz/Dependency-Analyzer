/**
 * 依赖分析工具 - Web服务器
 * 提供前端界面和API接口
 */

const express = require("express");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs").promises;
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json());

// 优先提供构建后的前端（web/dist），否则回退到开发版（web/）
const distDir = path.join(__dirname, "dist");
const hasDist = (() => {
  try {
    return require("fs").existsSync(path.join(distDir, "index.html"));
  } catch {
    return false;
  }
})();
const staticRoot = hasDist ? distDir : __dirname;
app.use(express.static(staticRoot));

// 静态文件服务
app.use("/test-output", express.static(path.join(__dirname, "../test-output")));

/**
 * 主页路由
 */
app.get("/", (req, res) => {
  res.sendFile(path.join(staticRoot, "index.html"));
});

/**
 * 获取项目文件列表
 */
app.get("/api/projects", async (req, res) => {
  try {
    const examplesPath = path.join(__dirname, "../examples");
    const projects = [];

    try {
      const dirs = await fs.readdir(examplesPath);
      for (const dir of dirs) {
        const projectPath = path.join(examplesPath, dir);
        const stat = await fs.stat(projectPath);
        if (stat.isDirectory()) {
          const srcPath = path.join(projectPath, "src");
          try {
            await fs.access(srcPath);
            projects.push({
              name: dir,
              path: `examples/${dir}/src`,
              fullPath: srcPath,
            });
          } catch (e) {
            // src目录不存在，跳过
          }
        }
      }
    } catch (e) {
      console.log("Examples目录不存在");
    }

    res.json({ projects });
  } catch (error) {
    console.error("获取项目列表失败:", error);
    res.status(500).json({ error: "获取项目列表失败" });
  }
});

/**
 * 执行项目分析
 */
app.post("/api/analyze", async (req, res) => {
  try {
    const { projectPath, config } = req.body;

    if (!projectPath) {
      return res.status(400).json({ error: "项目路径不能为空" });
    }

    // 框架处理：不支持 angular，auto 则检测
    let framework = config && config.framework ? config.framework : "auto";
    if (framework === "angular") {
      return res
        .status(400)
        .json({ success: false, error: "目前暂不支持 Angular 项目分析" });
    }

    const detectFramework = async (projPath) => {
      try {
        // 若选择 src 目录，向上寻找 package.json
        let current = path.isAbsolute(projPath)
          ? projPath
          : path.join(__dirname, "..", projPath);
        // 向上最多两层查找
        for (let i = 0; i < 3; i++) {
          const pkgPath = path.join(current, "package.json");
          try {
            const pkgRaw = await fs.readFile(pkgPath, "utf8");
            const pkg = JSON.parse(pkgRaw);
            const deps = Object.assign(
              {},
              pkg.dependencies || {},
              pkg.devDependencies || {}
            );
            if (deps.react) return "react";
            if (deps.vue) return "vue";
          } catch (_) {}
          const parent = path.dirname(current);
          if (parent === current) break;
          current = parent;
        }
      } catch (_) {}
      return "react"; // 默认回退
    };

    // 规范化输入路径：支持传入文件路径，自动取其父目录
    let effectivePath = path.isAbsolute(projectPath)
      ? projectPath
      : path.join(__dirname, "..", projectPath);
    try {
      const st = await fs.stat(effectivePath);
      if (st && !st.isDirectory()) {
        effectivePath = path.dirname(effectivePath);
      }
    } catch (_) {
      // 无法 stat，保留原值，由 CLI 决定失败
    }

    if (framework === "auto") {
      framework = await detectFramework(effectivePath);
    }

    // 输出路径与 JSON 路径（可配置）
    const htmlOut =
      config && config.outputPath
        ? config.outputPath
        : "test-output/dependency-graph.html";
    const jsonOut =
      config && config.jsonPath
        ? config.jsonPath
        : "test-output/graph-data.json";
    // CLI当前不支持 --config 选项，保留仅供前端使用但不传递给CLI

    // 构建分析命令（直接调用 CLI）
    const args = [
      "bin/cli.js",
      "analyze",
      effectivePath,
      "-f",
      framework,
      "-o",
      htmlOut,
      "-j",
      jsonOut,
    ];

    // 注意：不传递 --config 到 CLI，避免未知参数导致失败

    if (
      config &&
      Array.isArray(config.excludePatterns) &&
      config.excludePatterns.length > 0
    ) {
      args.push("--exclude", ...config.excludePatterns);
    }

    console.log("执行分析命令:", "node", args.join(" "));

    // 执行分析
    const child = spawn("node", args, {
      cwd: path.join(__dirname, ".."),
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", async (code) => {
      if (code === 0) {
        try {
          // 读取分析结果
          const jsonPath = path.join(__dirname, "..", jsonOut);
          const jsonData = await fs.readFile(jsonPath, "utf8");
          const result = JSON.parse(jsonData);
          // 适配当前 JSON 结构
          const componentsCount = result.nodes
            ? Object.keys(result.nodes).length
            : 0;
          const dependenciesCount = Array.isArray(result.edges)
            ? result.edges.length
            : 0;
          const orphanCount =
            result.analysis && Array.isArray(result.analysis.orphanComponents)
              ? result.analysis.orphanComponents.length
              : 0;
          const unusedPropsTotal =
            result.analysis && Array.isArray(result.analysis.unusedProps)
              ? result.analysis.unusedProps.reduce(
                  (sum, c) =>
                    sum +
                    (Array.isArray(c.unusedProps) ? c.unusedProps.length : 0),
                  0
                )
              : 0;

          res.json({
            success: true,
            result: {
              totalComponents: componentsCount,
              totalDependencies: dependenciesCount,
              orphanComponents: orphanCount,
              unusedProps: unusedPropsTotal,
              reportPath: htmlOut,
              jsonPath: jsonOut,
              stdout,
              stderr,
            },
          });
        } catch (error) {
          console.error("读取分析结果失败:", error);
          res.json({
            success: true,
            result: {
              totalComponents: 0,
              totalDependencies: 0,
              orphanComponents: 0,
              unusedProps: 0,
              reportPath: htmlOut,
              jsonPath: jsonOut,
              stdout,
              stderr,
            },
          });
        }
      } else {
        res.status(500).json({
          success: false,
          error: "分析失败",
          stdout,
          stderr,
        });
      }
    });

    child.on("error", (error) => {
      console.error("执行分析命令失败:", error);
      res.status(500).json({
        success: false,
        error: "执行分析命令失败: " + error.message,
      });
    });
  } catch (error) {
    console.error("分析请求处理失败:", error);
    res.status(500).json({
      success: false,
      error: "分析请求处理失败: " + error.message,
    });
  }
});

/**
 * 生成默认配置文件（CLI init）
 */
app.post("/api/init", async (req, res) => {
  try {
    const { format, projectPath } = req.body || {};
    const fmt = format === "js" ? "js" : "json";

    // 目标目录：优先使用前端提供的项目路径
    const targetDir = projectPath
      ? path.isAbsolute(projectPath)
        ? projectPath
        : path.join(__dirname, "..", projectPath)
      : path.join(__dirname, "..");

    // 生成默认配置内容
    const defaultConfig = {
      framework: "react",
      excludePatterns: ["node_modules/**", "dist/**", "build/**"],
      outputPath: "test-output/dependency-graph.html",
      jsonPath: "test-output/graph-data.json",
    };

    let filename;
    let contents;
    if (fmt === "js") {
      filename = "dep-analyzer.config.js";
      contents = `module.exports = ${JSON.stringify(defaultConfig, null, 2)}\n`;
    } else {
      filename = ".dep-analyzer.json";
      contents = JSON.stringify(defaultConfig, null, 2) + "\n";
    }

    const filePath = path.join(targetDir, filename);
    await fs.writeFile(filePath, contents, "utf8");

    res.json({ success: true, path: filePath, format: fmt });
  } catch (error) {
    console.error("初始化请求处理失败:", error);
    res
      .status(500)
      .json({ success: false, error: "初始化请求处理失败: " + error.message });
  }
});

/**
 * 获取分析报告列表
 */
app.get("/api/reports", async (req, res) => {
  try {
    const outputPath = path.join(__dirname, "../test-output");
    const reports = [];

    try {
      const files = await fs.readdir(outputPath);
      for (const file of files) {
        if (file.endsWith(".html")) {
          const filePath = path.join(outputPath, file);
          const stat = await fs.stat(filePath);

          // 尝试读取对应的JSON文件获取详细信息
          const jsonFile = file.replace(".html", ".json");
          const jsonPath = path.join(outputPath, jsonFile);
          let details = {};

          try {
            const jsonData = await fs.readFile(jsonPath, "utf8");
            const data = JSON.parse(jsonData);
            details = {
              components: data.nodes ? Object.keys(data.nodes).length : 0,
              dependencies: Array.isArray(data.edges) ? data.edges.length : 0,
              orphans:
                data.analysis && Array.isArray(data.analysis.orphanComponents)
                  ? data.analysis.orphanComponents.length
                  : 0,
              unusedProps:
                data.analysis && Array.isArray(data.analysis.unusedProps)
                  ? data.analysis.unusedProps.reduce(
                      (sum, c) =>
                        sum +
                        (Array.isArray(c.unusedProps)
                          ? c.unusedProps.length
                          : 0),
                      0
                    )
                  : 0,
            };
          } catch (e) {
            // JSON文件不存在或格式错误
            details = {
              components: 0,
              dependencies: 0,
              orphans: 0,
              unusedProps: 0,
            };
          }

          reports.push({
            id: file.replace(".html", ""),
            title: file.replace(".html", "").replace(/-/g, " "),
            path: file,
            date: stat.mtime.toLocaleString(),
            size: stat.size,
            ...details,
          });
        }
      }
    } catch (e) {
      console.log("输出目录不存在或为空");
    }

    // 按修改时间排序
    reports.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ reports });
  } catch (error) {
    console.error("获取报告列表失败:", error);
    res.status(500).json({ error: "获取报告列表失败" });
  }
});

/**
 * 删除报告
 */
app.delete("/api/reports/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const outputPath = path.join(__dirname, "../test-output");

    // 删除HTML和JSON文件
    const htmlFile = path.join(outputPath, `${id}.html`);
    const jsonFile = path.join(outputPath, `${id}.json`);

    try {
      await fs.unlink(htmlFile);
    } catch (e) {
      console.log("HTML文件不存在:", htmlFile);
    }

    try {
      await fs.unlink(jsonFile);
    } catch (e) {
      console.log("JSON文件不存在:", jsonFile);
    }

    res.json({ success: true, message: "报告删除成功" });
  } catch (error) {
    console.error("删除报告失败:", error);
    res.status(500).json({ error: "删除报告失败" });
  }
});

/**
 * 获取系统信息
 */
app.get("/api/system", (req, res) => {
  res.json({
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
  });
});

/**
 * 健康检查
 */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * 本机目录选择（macOS 原生选择器）
 * 仅在本机运行的服务器中可用，通过 AppleScript 弹出目录选择对话框
 */
app.get("/api/pick-directory", async (req, res) => {
  try {
    if (process.platform !== "darwin") {
      return res
        .status(400)
        .json({ success: false, error: "仅支持在 macOS 上使用系统目录选择器" });
    }

    // 选择器默认定位到项目根目录，提升可用性
    const defaultRoot = path.join(__dirname, "..");
    const script = [
      `set defaultFolder to POSIX file \"${defaultRoot}\"`,
      'set selectedFolder to choose folder with prompt "请选择项目代码目录(建议选择 src)" default location defaultFolder',
      'set p to POSIX path of selectedFolder',
      'p',
    ];

    const child = spawn(
      "osascript",
      script.flatMap((s) => ["-e", s])
    );
    let out = "";
    let err = "";

    child.stdout.on("data", (d) => {
      out += d.toString();
    });
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("close", async (code) => {
      if (code === 0 && out.trim()) {
        // 规范化选择的路径：移除尾部斜杠，优先返回包含代码的 src 子目录
        const raw = out.trim();
        let selected = raw.endsWith("/") ? raw.slice(0, -1) : raw;
        try {
          const st = await fs.stat(selected);
          if (st.isDirectory()) {
            const srcCandidate = path.join(selected, "src");
            try {
              const srcStat = await fs.stat(srcCandidate);
              if (srcStat.isDirectory()) {
                // 检查 src 下是否存在代码文件
                const entries = await fs.readdir(srcCandidate);
                const hasCode = entries.some((f) =>
                  /\.(js|ts|tsx|jsx|vue)$/i.test(f)
                );
                if (hasCode) {
                  selected = srcCandidate;
                }
              }
            } catch (_) {
              // 无 src 子目录，保持原路径
            }
          }
        } catch (_) {
          // stat 失败，返回原始路径
        }
        return res.json({ success: true, path: selected });
      }
      res
        .status(500)
        .json({ success: false, error: err || "未选择目录或选择失败" });
    });
    child.on("error", (e) => {
      res.status(500).json({ success: false, error: e.message });
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "目录选择失败: " + error.message });
  }
});

/**
 * 本机文件选择（macOS 原生选择器）
 * 通过 AppleScript 弹出文件选择对话框，返回所选文件的 POSIX 路径
 */
app.get("/api/pick-file", async (req, res) => {
  try {
    if (process.platform !== "darwin") {
      return res
        .status(400)
        .json({ success: false, error: "仅支持在 macOS 上使用系统文件选择器" });
    }

    // 选择器默认定位到项目根目录，便于选择 src 下的文件
    const defaultRoot = path.join(__dirname, "..");
    const script = [
      `set defaultFolder to POSIX file \"${defaultRoot}\"`,
      'set f to choose file with prompt "请选择项目中的任意文件" default location defaultFolder',
      'set p to POSIX path of f',
      'p',
    ];

    const child = spawn(
      "osascript",
      script.flatMap((s) => ["-e", s])
    );
    let out = "";
    let err = "";

    child.stdout.on("data", (d) => {
      out += d.toString();
    });
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("close", async (code) => {
      if (code === 0 && out.trim()) {
        // 文件选择：返回其父目录，如存在 src 子目录且含代码则优先返回 src
        const raw = out.trim();
        const parentDir = path.dirname(raw);
        let selectedDir = parentDir.endsWith("/")
          ? parentDir.slice(0, -1)
          : parentDir;
        try {
          const srcCandidate = path.join(selectedDir, "src");
          const srcStat = await fs.stat(srcCandidate).catch(() => null);
          if (srcStat && srcStat.isDirectory()) {
            const entries = await fs.readdir(srcCandidate);
            const hasCode = entries.some((f) =>
              /\.(js|ts|tsx|jsx|vue)$/i.test(f)
            );
            if (hasCode) {
              selectedDir = srcCandidate;
            }
          }
        } catch (_) {}
        return res.json({ success: true, path: selectedDir });
      }
      res
        .status(500)
        .json({ success: false, error: err || "未选择文件或选择失败" });
    });
    child.on("error", (e) => {
      res.status(500).json({ success: false, error: e.message });
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "文件选择失败: " + error.message });
  }
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error("服务器错误:", error);
  res.status(500).json({ error: "服务器内部错误" });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: "接口不存在" });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 依赖分析工具Web界面已启动`);
  console.log(`📱 访问地址: http://localhost:${PORT}`);
  console.log(`📊 API文档: http://localhost:${PORT}/api/health`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
});

// 优雅关闭
process.on("SIGTERM", () => {
  console.log("收到SIGTERM信号，正在关闭服务器...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("收到SIGINT信号，正在关闭服务器...");
  process.exit(0);
});