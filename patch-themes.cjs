const fs = require('fs');

let css = fs.readFileSync('src/styles.css', 'utf-8');

const newThemes = "[data-theme='arctic'] {\\n" +
"  --theme-bg: #0B1120;\\n" +
"  --theme-sidebar: #060914;\\n" +
"  --theme-panel: #111827;\\n" +
"  --theme-card: #1e293b;\\n" +
"  --theme-card2: #334155;\\n" +
"  --theme-border: rgba(56, 189, 248, 0.2);\\n" +
"  --theme-border-subtle: rgba(56, 189, 248, 0.1);\\n" +
"  --theme-text: #F3F4F6;\\n" +
"  --theme-muted: #94a3b8;\\n" +
"  --theme-shadow-1: 0 1px 2px rgba(0, 0, 0, 0.4);\\n" +
"  --theme-shadow-2: 0 4px 12px rgba(0, 0, 0, 0.5);\\n" +
"  --theme-shadow-3: 0 12px 24px rgba(0, 0, 0, 0.6);\\n" +
"  --theme-glass: rgba(11, 17, 32, 0.85);\\n" +
"  --theme-focus: #38BDF8;\\n" +
"  --theme-accent: #38BDF8;\\n" +
"  --theme-accent-secondary: #818CF8;\\n" +
"  --theme-accent-subtle: rgba(56, 189, 248, 0.15);\\n" +
"  --theme-accent-border: rgba(56, 189, 248, 0.3);\\n" +
"  --theme-active: #818CF8;\\n" +
"  --theme-link: #38BDF8;\\n" +
"  --theme-success: #10b981;\\n" +
"  --theme-warning: #f59e0b;\\n" +
"  --theme-danger: #ef4444;\\n" +
"  --code-bg: rgba(0, 0, 0, 0.3);\\n" +
"  --code-text: #F3F4F6;\\n" +
"  --code-border: rgba(56, 189, 248, 0.2);\\n" +
"  --theme-input: #111827;\\n" +
"}\\n\\n" +
"[data-theme='synthwave'] {\\n" +
"  --theme-bg: #2b213a;\\n" +
"  --theme-sidebar: #1e172a;\\n" +
"  --theme-panel: #241b2f;\\n" +
"  --theme-card: #3b2a52;\\n" +
"  --theme-card2: #4a3465;\\n" +
"  --theme-border: #ff71ce;\\n" +
"  --theme-border-subtle: rgba(255, 113, 206, 0.3);\\n" +
"  --theme-text: #fdf6e3;\\n" +
"  --theme-muted: #b9a9d9;\\n" +
"  --theme-shadow-1: 0 0 5px rgba(255, 113, 206, 0.2);\\n" +
"  --theme-shadow-2: 0 0 15px rgba(255, 113, 206, 0.3);\\n" +
"  --theme-shadow-3: 0 0 25px rgba(255, 113, 206, 0.4);\\n" +
"  --theme-glass: rgba(43, 33, 58, 0.85);\\n" +
"  --theme-focus: #01cdfe;\\n" +
"  --theme-accent: #ff71ce;\\n" +
"  --theme-accent-secondary: #01cdfe;\\n" +
"  --theme-accent-subtle: rgba(255, 113, 206, 0.15);\\n" +
"  --theme-accent-border: rgba(255, 113, 206, 0.4);\\n" +
"  --theme-active: #01cdfe;\\n" +
"  --theme-link: #05ffa1;\\n" +
"  --theme-success: #05ffa1;\\n" +
"  --theme-warning: #b967ff;\\n" +
"  --theme-danger: #fffb96;\\n" +
"  --code-bg: rgba(0, 0, 0, 0.3);\\n" +
"  --code-text: #05ffa1;\\n" +
"  --code-border: rgba(1, 205, 254, 0.3);\\n" +
"  --theme-input: #241b2f;\\n" +
"}\\n\\n" +
"[data-theme='biolab'] {\\n" +
"  --theme-bg: #121413;\\n" +
"  --theme-sidebar: #0a0b0a;\\n" +
"  --theme-panel: #1a1d1b;\\n" +
"  --theme-card: #272a27;\\n" +
"  --theme-card2: #333633;\\n" +
"  --theme-border: #3f6212;\\n" +
"  --theme-border-subtle: rgba(63, 98, 18, 0.5);\\n" +
"  --theme-text: #e5e7eb;\\n" +
"  --theme-muted: #9ca3af;\\n" +
"  --theme-shadow-1: 0 0 5px rgba(132, 204, 22, 0.1);\\n" +
"  --theme-shadow-2: 0 0 10px rgba(132, 204, 22, 0.2);\\n" +
"  --theme-shadow-3: 0 0 20px rgba(132, 204, 22, 0.3);\\n" +
"  --theme-glass: rgba(18, 20, 19, 0.85);\\n" +
"  --theme-focus: #84cc16;\\n" +
"  --theme-accent: #84cc16;\\n" +
"  --theme-accent-secondary: #eab308;\\n" +
"  --theme-accent-subtle: rgba(132, 204, 22, 0.15);\\n" +
"  --theme-accent-border: rgba(132, 204, 22, 0.4);\\n" +
"  --theme-active: #eab308;\\n" +
"  --theme-link: #bef264;\\n" +
"  --theme-success: #84cc16;\\n" +
"  --theme-warning: #eab308;\\n" +
"  --theme-danger: #dc2626;\\n" +
"  --code-bg: rgba(0, 0, 0, 0.4);\\n" +
"  --code-text: #bef264;\\n" +
"  --code-border: #3f6212;\\n" +
"  --theme-input: #1a1d1b;\\n" +
"}\\n\\n" +
"[data-theme='monokai'] {\\n" +
"  --theme-bg: #222222;\\n" +
"  --theme-sidebar: #191919;\\n" +
"  --theme-panel: #2d2a2e;\\n" +
"  --theme-card: #3d3a3e;\\n" +
"  --theme-card2: #4d4a4e;\\n" +
"  --theme-border: #5b595c;\\n" +
"  --theme-border-subtle: #3b393c;\\n" +
"  --theme-text: #fcfcfa;\\n" +
"  --theme-muted: #939293;\\n" +
"  --theme-shadow-1: 0 2px 4px rgba(0, 0, 0, 0.3);\\n" +
"  --theme-shadow-2: 0 4px 12px rgba(0, 0, 0, 0.4);\\n" +
"  --theme-shadow-3: 0 12px 24px rgba(0, 0, 0, 0.5);\\n" +
"  --theme-glass: rgba(34, 34, 34, 0.85);\\n" +
"  --theme-focus: #ffd866;\\n" +
"  --theme-accent: #ffd866;\\n" +
"  --theme-accent-secondary: #a9dc76;\\n" +
"  --theme-accent-subtle: rgba(255, 216, 102, 0.15);\\n" +
"  --theme-accent-border: rgba(255, 216, 102, 0.4);\\n" +
"  --theme-active: #a9dc76;\\n" +
"  --theme-link: #78dce8;\\n" +
"  --theme-success: #a9dc76;\\n" +
"  --theme-warning: #ffd866;\\n" +
"  --theme-danger: #ff6188;\\n" +
"  --code-bg: #2d2a2e;\\n" +
"  --code-text: #fcfcfa;\\n" +
"  --code-border: #5b595c;\\n" +
"  --theme-input: #2d2a2e;\\n" +
"}\\n\\n" +
"[data-theme='tokyonight'] {\\n" +
"  --theme-bg: #1a1b26;\\n" +
"  --theme-sidebar: #16161e;\\n" +
"  --theme-panel: #24283b;\\n" +
"  --theme-card: #292e42;\\n" +
"  --theme-card2: #3b4261;\\n" +
"  --theme-border: #414868;\\n" +
"  --theme-border-subtle: #292e42;\\n" +
"  --theme-text: #c0caf5;\\n" +
"  --theme-muted: #565f89;\\n" +
"  --theme-shadow-1: 0 1px 2px rgba(0, 0, 0, 0.4);\\n" +
"  --theme-shadow-2: 0 4px 12px rgba(0, 0, 0, 0.5);\\n" +
"  --theme-shadow-3: 0 12px 24px rgba(0, 0, 0, 0.6);\\n" +
"  --theme-glass: rgba(26, 27, 38, 0.85);\\n" +
"  --theme-focus: #7aa2f7;\\n" +
"  --theme-accent: #7aa2f7;\\n" +
"  --theme-accent-secondary: #f7768e;\\n" +
"  --theme-accent-subtle: rgba(122, 162, 247, 0.15);\\n" +
"  --theme-accent-border: rgba(122, 162, 247, 0.4);\\n" +
"  --theme-active: #f7768e;\\n" +
"  --theme-link: #7dcfff;\\n" +
"  --theme-success: #9ece6a;\\n" +
"  --theme-warning: #e0af68;\\n" +
"  --theme-danger: #f7768e;\\n" +
"  --code-bg: #16161e;\\n" +
"  --code-text: #c0caf5;\\n" +
"  --code-border: #414868;\\n" +
"  --theme-input: #24283b;\\n" +
"}\\n\\n" +
"[data-theme='crimson'] {\\n" +
"  --theme-bg: #0a0a0a;\\n" +
"  --theme-sidebar: #050505;\\n" +
"  --theme-panel: #171717;\\n" +
"  --theme-card: #262626;\\n" +
"  --theme-card2: #404040;\\n" +
"  --theme-border: #dc2626;\\n" +
"  --theme-border-subtle: rgba(220, 38, 38, 0.3);\\n" +
"  --theme-text: #a3a3a3;\\n" +
"  --theme-muted: #737373;\\n" +
"  --theme-shadow-1: 0 0 5px rgba(220, 38, 38, 0.2);\\n" +
"  --theme-shadow-2: 0 0 12px rgba(220, 38, 38, 0.3);\\n" +
"  --theme-shadow-3: 0 0 24px rgba(220, 38, 38, 0.4);\\n" +
"  --theme-glass: rgba(10, 10, 10, 0.85);\\n" +
"  --theme-focus: #dc2626;\\n" +
"  --theme-accent: #dc2626;\\n" +
"  --theme-accent-secondary: #ef4444;\\n" +
"  --theme-accent-subtle: rgba(220, 38, 38, 0.15);\\n" +
"  --theme-accent-border: rgba(220, 38, 38, 0.4);\\n" +
"  --theme-active: #ef4444;\\n" +
"  --theme-link: #f87171;\\n" +
"  --theme-success: #10b981;\\n" +
"  --theme-warning: #f59e0b;\\n" +
"  --theme-danger: #ef4444;\\n" +
"  --code-bg: rgba(0, 0, 0, 0.5);\\n" +
"  --code-text: #f87171;\\n" +
"  --code-border: rgba(220, 38, 38, 0.3);\\n" +
"  --theme-input: #171717;\\n" +
"}\\n\\n" +
"[data-theme='deusex'] {\\n" +
"  --theme-bg: #000000;\\n" +
"  --theme-sidebar: #0a0700;\\n" +
"  --theme-panel: #111100;\\n" +
"  --theme-card: #222200;\\n" +
"  --theme-card2: #333300;\\n" +
"  --theme-border: #664400;\\n" +
"  --theme-border-subtle: #442200;\\n" +
"  --theme-text: #ffb000;\\n" +
"  --theme-muted: #aa7700;\\n" +
"  --theme-shadow-1: 0 0 5px rgba(255, 176, 0, 0.2);\\n" +
"  --theme-shadow-2: 0 0 12px rgba(255, 176, 0, 0.3);\\n" +
"  --theme-shadow-3: 0 0 24px rgba(255, 176, 0, 0.4);\\n" +
"  --theme-glass: rgba(0, 0, 0, 0.85);\\n" +
"  --theme-focus: #ffb000;\\n" +
"  --theme-accent: #ffb000;\\n" +
"  --theme-accent-secondary: #cc8800;\\n" +
"  --theme-accent-subtle: rgba(255, 176, 0, 0.15);\\n" +
"  --theme-accent-border: rgba(255, 176, 0, 0.4);\\n" +
"  --theme-active: #cc8800;\\n" +
"  --theme-link: #ffcc00;\\n" +
"  --theme-success: #ffb000;\\n" +
"  --theme-warning: #ffb000;\\n" +
"  --theme-danger: #ff0000;\\n" +
"  --code-bg: rgba(0, 0, 0, 0.8);\\n" +
"  --code-text: #ffb000;\\n" +
"  --code-border: #664400;\\n" +
"  --theme-input: #111100;\\n" +
"}\\n\\n" +
"[data-theme='highcontrast'] {\\n" +
"  --theme-bg: #000000;\\n" +
"  --theme-sidebar: #0a0a0a;\\n" +
"  --theme-panel: #111111;\\n" +
"  --theme-card: #222222;\\n" +
"  --theme-card2: #333333;\\n" +
"  --theme-border: #666666;\\n" +
"  --theme-border-subtle: #444444;\\n" +
"  --theme-text: #FFFFFF;\\n" +
"  --theme-muted: #999999;\\n" +
"  --theme-shadow-1: 0 0 0 1px rgba(255, 255, 255, 0.1);\\n" +
"  --theme-shadow-2: 0 0 0 1px rgba(255, 255, 255, 0.2);\\n" +
"  --theme-shadow-3: 0 0 0 1px rgba(255, 255, 255, 0.3);\\n" +
"  --theme-glass: rgba(0, 0, 0, 0.85);\\n" +
"  --theme-focus: #FFFFFF;\\n" +
"  --theme-accent: #FFFFFF;\\n" +
"  --theme-accent-secondary: #CCCCCC;\\n" +
"  --theme-accent-subtle: rgba(255, 255, 255, 0.15);\\n" +
"  --theme-accent-border: rgba(255, 255, 255, 0.4);\\n" +
"  --theme-active: #CCCCCC;\\n" +
"  --theme-link: #FFFFFF;\\n" +
"  --theme-success: #FFFFFF;\\n" +
"  --theme-warning: #FFFFFF;\\n" +
"  --theme-danger: #FFFFFF;\\n" +
"  --code-bg: rgba(0, 0, 0, 0.8);\\n" +
"  --code-text: #FFFFFF;\\n" +
"  --code-border: #666666;\\n" +
"  --theme-input: #111111;\\n" +
"}\\n\\n" +
"[data-theme='arctic-light'],\\n" +
"[data-theme='synthwave-light'],\\n" +
"[data-theme='biolab-light'],\\n" +
"[data-theme='monokai-light'],\\n" +
"[data-theme='tokyonight-light'],\\n" +
"[data-theme='crimson-light'],\\n" +
"[data-theme='deusex-light'],\\n" +
"[data-theme='highcontrast-light'] {\\n" +
"  --theme-bg: #ffffff;\\n" +
"  --theme-sidebar: #f2f3f5;\\n" +
"  --theme-panel: #e3e5e8;\\n" +
"  --theme-card: #f2f3f5;\\n" +
"  --theme-card2: #e3e5e8;\\n" +
"  --theme-border: rgba(0, 0, 0, 0.08);\\n" +
"  --theme-border-subtle: rgba(0, 0, 0, 0.04);\\n" +
"  --theme-text: #060607;\\n" +
"  --theme-muted: #4e5058;\\n" +
"  --theme-shadow-1: 0 1px 2px rgba(0, 0, 0, 0.05);\\n" +
"  --theme-shadow-2: 0 4px 12px rgba(0, 0, 0, 0.1);\\n" +
"  --theme-shadow-3: 0 12px 24px rgba(0, 0, 0, 0.15);\\n" +
"  --theme-glass: rgba(242, 243, 245, 0.85);\\n" +
"  --theme-focus: #5865f2;\\n" +
"  --theme-accent: #5865f2;\\n" +
"  --theme-accent-secondary: #eb459e;\\n" +
"  --theme-accent-subtle: rgba(88, 101, 242, 0.1);\\n" +
"  --theme-accent-border: rgba(88, 101, 242, 0.2);\\n" +
"  --theme-active: #eb459e;\\n" +
"  --theme-link: #00d7fe;\\n" +
"  --theme-success: #23a559;\\n" +
"  --theme-warning: #f1c40f;\\n" +
"  --theme-danger: #da373c;\\n" +
"  --theme-input: #ebedef;\\n" +
"}\\n";

const insertThemesBlock = css.indexOf("[data-theme='claude-nous'] html,");
if (insertThemesBlock > -1) {
  css = css.slice(0, insertThemesBlock) + newThemes + '\\n' + css.slice(insertThemesBlock);
}

const darkSelectors = "[data-theme='matrix'] html,\\n" +
"[data-theme='matrix'] body,\\n" +
"[data-theme='matrix'] #root,\\n" +
"[data-theme='matrix'] .dark,\\n" +
"[data-theme='arctic'] html,\\n" +
"[data-theme='arctic'] body,\\n" +
"[data-theme='arctic'] #root,\\n" +
"[data-theme='arctic'] .dark,\\n" +
"[data-theme='synthwave'] html,\\n" +
"[data-theme='synthwave'] body,\\n" +
"[data-theme='synthwave'] #root,\\n" +
"[data-theme='synthwave'] .dark,\\n" +
"[data-theme='biolab'] html,\\n" +
"[data-theme='biolab'] body,\\n" +
"[data-theme='biolab'] #root,\\n" +
"[data-theme='biolab'] .dark,\\n" +
"[data-theme='monokai'] html,\\n" +
"[data-theme='monokai'] body,\\n" +
"[data-theme='monokai'] #root,\\n" +
"[data-theme='monokai'] .dark,\\n" +
"[data-theme='tokyonight'] html,\\n" +
"[data-theme='tokyonight'] body,\\n" +
"[data-theme='tokyonight'] #root,\\n" +
"[data-theme='tokyonight'] .dark,\\n" +
"[data-theme='crimson'] html,\\n" +
"[data-theme='crimson'] body,\\n" +
"[data-theme='crimson'] #root,\\n" +
"[data-theme='crimson'] .dark,\\n" +
"[data-theme='deusex'] html,\\n" +
"[data-theme='deusex'] body,\\n" +
"[data-theme='deusex'] #root,\\n" +
"[data-theme='deusex'] .dark,\\n" +
"[data-theme='highcontrast'] html,\\n" +
"[data-theme='highcontrast'] body,\\n" +
"[data-theme='highcontrast'] #root,\\n" +
"[data-theme='highcontrast'] .dark,\\n";

css = css.replace("[data-theme='discord-nitro'] html,", darkSelectors + "[data-theme='discord-nitro'] html,");

const lightSelectors = "[data-theme='matrix-light'] html,\\n" +
"[data-theme='matrix-light'] body,\\n" +
"[data-theme='matrix-light'] #root,\\n" +
"[data-theme='matrix-light'] .light,\\n" +
"[data-theme='arctic-light'] html,\\n" +
"[data-theme='arctic-light'] body,\\n" +
"[data-theme='arctic-light'] #root,\\n" +
"[data-theme='arctic-light'] .light,\\n" +
"[data-theme='synthwave-light'] html,\\n" +
"[data-theme='synthwave-light'] body,\\n" +
"[data-theme='synthwave-light'] #root,\\n" +
"[data-theme='synthwave-light'] .light,\\n" +
"[data-theme='biolab-light'] html,\\n" +
"[data-theme='biolab-light'] body,\\n" +
"[data-theme='biolab-light'] #root,\\n" +
"[data-theme='biolab-light'] .light,\\n" +
"[data-theme='monokai-light'] html,\\n" +
"[data-theme='monokai-light'] body,\\n" +
"[data-theme='monokai-light'] #root,\\n" +
"[data-theme='monokai-light'] .light,\\n" +
"[data-theme='tokyonight-light'] html,\\n" +
"[data-theme='tokyonight-light'] body,\\n" +
"[data-theme='tokyonight-light'] #root,\\n" +
"[data-theme='tokyonight-light'] .light,\\n" +
"[data-theme='crimson-light'] html,\\n" +
"[data-theme='crimson-light'] body,\\n" +
"[data-theme='crimson-light'] #root,\\n" +
"[data-theme='crimson-light'] .light,\\n" +
"[data-theme='deusex-light'] html,\\n" +
"[data-theme='deusex-light'] body,\\n" +
"[data-theme='deusex-light'] #root,\\n" +
"[data-theme='deusex-light'] .light,\\n" +
"[data-theme='highcontrast-light'] html,\\n" +
"[data-theme='highcontrast-light'] body,\\n" +
"[data-theme='highcontrast-light'] #root,\\n" +
"[data-theme='highcontrast-light'] .light,\\n";

css = css.replace("[data-theme='discord-nitro-light'] html,", lightSelectors + "[data-theme='discord-nitro-light'] html,");

const darkRemap = "[data-theme='matrix'],\\n" +
"[data-theme='arctic'],\\n" +
"[data-theme='synthwave'],\\n" +
"[data-theme='biolab'],\\n" +
"[data-theme='monokai'],\\n" +
"[data-theme='tokyonight'],\\n" +
"[data-theme='crimson'],\\n" +
"[data-theme='deusex'],\\n" +
"[data-theme='highcontrast'],\\n";

css = css.replace("[data-theme='discord-nitro'] {\\n  --color-primary-50", darkRemap + "[data-theme='discord-nitro'] {\\n  --color-primary-50");

const lightRemap = "[data-theme='matrix-light'],\\n" +
"[data-theme='arctic-light'],\\n" +
"[data-theme='synthwave-light'],\\n" +
"[data-theme='biolab-light'],\\n" +
"[data-theme='monokai-light'],\\n" +
"[data-theme='tokyonight-light'],\\n" +
"[data-theme='crimson-light'],\\n" +
"[data-theme='deusex-light'],\\n" +
"[data-theme='highcontrast-light'],\\n";

css = css.replace("[data-theme='discord-nitro-light'] {\\n  color-scheme:", lightRemap + "[data-theme='discord-nitro-light'] {\\n  color-scheme:");

fs.writeFileSync('src/styles.css', css);
console.log('patched styles.css successfully');
