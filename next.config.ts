import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: ['192.168.50.47', '192.168.8.88', '192.168.50.*', '192.168.8.*'],
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // satellite.js 的 wasm-build/pthreads-release 在浏览器 bundle 里 import node:worker_threads，
      // 用 IgnorePlugin 整路径屏蔽掉这条 WASM/线程加速分支；satellite.js 会自动回退到纯 JS 实现。
      config.plugins = config.plugins || []
      config.plugins.push(
        // 浏览器 bundle 里不允许任何 node:* 内置模块
        new webpack.IgnorePlugin({ resourceRegExp: /^node:/ }),
        // satellite.js 的 wasm-build 整条线一并忽略，自动回退到纯 JS 实现
        new webpack.IgnorePlugin({
          resourceRegExp: /satellite\.js[\\/]+wasm-build/,
        }),
        // 同上：dist/wasm 走的 runtime 也屏蔽
        new webpack.IgnorePlugin({
          resourceRegExp: /satellite\.js[\\/]+dist[\\/]+wasm/,
        }),
      )
    }
    return config
  },
};

export default nextConfig;
