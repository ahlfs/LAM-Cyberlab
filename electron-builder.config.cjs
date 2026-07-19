module.exports = {
  appId: 'com.hermesworkspace.app',
  productName: 'lam-cyberlab',
  copyright: 'Copyright © 2026 lam-cyberlab',
  icon: 'assets/icon.png',
  directories: {
    output: 'release',
    buildResources: 'assets',
  },
  files: [
    'dist/client/**/*',
    'dist/server/**/*',
    'electron/main.cjs',
    'electron/preload.cjs',
    'electron/prod-server.cjs',
    'electron/server-bundle.cjs',
    'assets/**/*',
    'public/**/*',
    'package.json',
    // better-sqlite3 (Linku storage) is the one native dependency in this
    // app, so it's excluded from the esbuild server bundle (--external)
    // and shipped here instead, with its actual runtime require chain:
    // better-sqlite3 -> bindings -> file-uri-to-path. The compiled
    // .node binary is rebuilt against Electron's ABI by the
    // `electron:rebuild-native` script that runs before electron-builder
    // (see package.json) — run `pnpm electron:restore-native` afterward
    // to restore the system-Node-ABI binary `pnpm dev` needs.
    'node_modules/better-sqlite3/**/*',
    'node_modules/bindings/**/*',
    'node_modules/file-uri-to-path/**/*',
    '!**/puppeteer-extra-plugin-stealth/**/*',
    '!**/playwright-extra/**/*',
  ],
  npmArgs: ['--ignore-scripts'],
  // Native rebuild is handled explicitly by `electron:rebuild-native`
  // (via @electron/rebuild) before electron-builder runs, so its own
  // automatic node-gyp rebuild step stays off to avoid double-building.
  nodeGypRebuild: false,
  mac: {
    category: 'public.app-category.developer-tools',
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }],
    darkModeSupport: true,
    hardenedRuntime: false,
    gatekeeperAssess: false,
  },
  dmg: {
    title: 'Lam Cyberlab',
    iconSize: 80,
    contents: [
      { x: 130, y: 220 },
      { x: 410, y: 220, type: 'link', path: '/Applications' },
    ],
  },
  win: {
    target: ['portable', 'nsis'],
    executableName: 'lam-cyberlab',
  },
  nsis: {
    oneClick: true,
    perMachine: false,
    allowToChangeInstallationDirectory: false,
    deleteAppDataOnUninstall: false,
  },
  publish: {
    provider: 'github',
    owner: 'ahlfs',
    repo: 'lam-cyberlab',
    releaseType: 'release',
  },
  asar: false,
  compression: 'maximum',
  artifactName: 'lam-cyberlab-setup-${version}.${ext}',
}
