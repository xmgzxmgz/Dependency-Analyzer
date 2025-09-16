const { defineConfig } = require('@vue/cli-service');
const path = require('path');

module.exports = defineConfig({
  // 基础配置
  transpileDependencies: true,
  lintOnSave: process.env.NODE_ENV !== 'production',
  productionSourceMap: false,
  
  // 公共路径
  publicPath: process.env.NODE_ENV === 'production' ? '/vue-demo/' : '/',
  
  // 输出目录
  outputDir: 'dist',
  assetsDir: 'static',
  
  // 开发服务器配置
  devServer: {
    port: 8080,
    host: 'localhost',
    https: false,
    open: true,
    hot: true,
    compress: true,
    historyApiFallback: true,
    client: {
      overlay: {
        warnings: false,
        errors: true
      }
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        pathRewrite: {
          '^/api': '/api'
        }
      }
    }
  },
  
  // 路径别名
  configureWebpack: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@/components': path.resolve(__dirname, 'src/components'),
        '@/views': path.resolve(__dirname, 'src/views'),
        '@/router': path.resolve(__dirname, 'src/router'),
        '@/store': path.resolve(__dirname, 'src/store'),
        '@/services': path.resolve(__dirname, 'src/services'),
        '@/types': path.resolve(__dirname, 'src/types'),
        '@/utils': path.resolve(__dirname, 'src/utils'),
        '@/assets': path.resolve(__dirname, 'src/assets'),
        '@/styles': path.resolve(__dirname, 'src/styles')
      }
    },
    
    // 性能优化
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            name: 'chunk-vendors',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            chunks: 'initial'
          },
          common: {
            name: 'chunk-common',
            minChunks: 2,
            priority: 5,
            chunks: 'initial',
            reuseExistingChunk: true
          }
        }
      }
    }
  },
  
  // Webpack 链式配置
  chainWebpack: config => {
    // 设置标题
    config.plugin('html').tap(args => {
      args[0].title = 'Vue 依赖分析演示';
      return args;
    });
    
    // 预加载配置
    config.plugin('preload').tap(() => [
      {
        rel: 'preload',
        include: 'initial',
        fileBlacklist: [/\.map$/, /hot-update\.js$/, /runtime\..*\.js$/]
      }
    ]);
    
    // 预获取配置
    config.plugin('prefetch').tap(() => [
      {
        rel: 'prefetch',
        include: 'asyncChunks'
      }
    ]);
    
    // SVG 图标配置
    config.module
      .rule('svg')
      .exclude.add(path.resolve(__dirname, 'src/assets/icons'))
      .end();
    
    config.module
      .rule('icons')
      .test(/\.svg$/)
      .include.add(path.resolve(__dirname, 'src/assets/icons'))
      .end()
      .use('svg-sprite-loader')
      .loader('svg-sprite-loader')
      .options({
        symbolId: 'icon-[name]'
      })
      .end();
    
    // 图片压缩
    config.module
      .rule('images')
      .test(/\.(gif|png|jpe?g|svg)$/i)
      .use('image-webpack-loader')
      .loader('image-webpack-loader')
      .options({
        mozjpeg: {
          progressive: true,
          quality: 80
        },
        optipng: {
          enabled: false
        },
        pngquant: {
          quality: [0.65, 0.90],
          speed: 4
        },
        gifsicle: {
          interlaced: false
        }
      })
      .end();
    
    // 生产环境优化
    if (process.env.NODE_ENV === 'production') {
      // 移除 console
      config.optimization.minimizer('terser').tap(args => {
        args[0].terserOptions.compress.drop_console = true;
        args[0].terserOptions.compress.drop_debugger = true;
        return args;
      });
      
      // Gzip 压缩
      config.plugin('compression').use(require('compression-webpack-plugin'), [
        {
          algorithm: 'gzip',
          test: /\.(js|css|html|svg)$/,
          threshold: 8192,
          minRatio: 0.8
        }
      ]);
      
      // Bundle 分析
      if (process.env.ANALYZE) {
        config.plugin('bundle-analyzer').use(require('webpack-bundle-analyzer').BundleAnalyzerPlugin);
      }
    }
  },
  
  // CSS 配置
  css: {
    extract: process.env.NODE_ENV === 'production',
    sourceMap: process.env.NODE_ENV !== 'production',
    loaderOptions: {
      scss: {
        additionalData: `
          @import "@/styles/variables.scss";
          @import "@/styles/mixins.scss";
        `
      },
      postcss: {
        postcssOptions: {
          plugins: [
            require('autoprefixer'),
            require('cssnano')({
              preset: 'default'
            })
          ]
        }
      }
    }
  },
  
  // PWA 配置
  pwa: {
    name: 'Vue 依赖分析演示',
    themeColor: '#4DBA87',
    msTileColor: '#000000',
    appleMobileWebAppCapable: 'yes',
    appleMobileWebAppStatusBarStyle: 'black',
    
    // 图标配置
    iconPaths: {
      favicon32: 'img/icons/favicon-32x32.png',
      favicon16: 'img/icons/favicon-16x16.png',
      appleTouchIcon: 'img/icons/apple-touch-icon-152x152.png',
      maskIcon: 'img/icons/safari-pinned-tab.svg',
      msTileImage: 'img/icons/msapplication-icon-144x144.png'
    },
    
    // Service Worker 配置
    workboxPluginMode: 'InjectManifest',
    workboxOptions: {
      swSrc: 'src/sw.js',
      swDest: 'sw.js'
    }
  },
  
  // 插件配置
  pluginOptions: {
    // ESLint 配置
    eslint: {
      lintOnSave: true,
      extensions: ['js', 'vue', 'ts']
    },
    
    // TypeScript 配置
    typescript: {
      outputDir: 'dist'
    }
  },
  
  // 并行处理
  parallel: require('os').cpus().length > 1,
  
  // 缓存配置
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename]
    }
  }
});