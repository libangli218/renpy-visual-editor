/**
 * Ren'Py Visual Editor - Interactive Prototype v3
 * 融合 Evan You + Ryan Dahl + PyTom 设计理念
 */

// ========================================
// 状态管理
// ========================================
const state = {
  currentStep: 5,
  totalSteps: 12,
  zoom: 100,
  selectedNode: null,
  isDragging: false,
  dragOffset: { x: 0, y: 0 },
  canvasOffset: { x: 0, y: 0 },
  isPanning: false,
  panStart: { x: 0, y: 0 },
  // 新增状态
  complexityLevel: 'simple', // simple, preview, advanced
  dialogueMode: 'adv', // adv, nvl
  selectedCharacter: 'sylvie',
  selectedLayers: {
    outfit: 'casual',
    expression: 'happy',
    accessory: 'none'
  }
};

// 预览数据
const previewSteps = [
  { bg: 'lecturehall', char: null, speaker: null, text: '当我听到脚步声和收拾东西的声音时，我才意识到讲座结束了。' },
  { bg: 'lecturehall', char: null, speaker: null, text: 'Eileen 教授的课通常很有趣，但今天我就是无法集中注意力。' },
  { bg: 'lecturehall', char: null, speaker: null, text: '我脑子里一直有很多其他的想法...这些想法最终汇聚成一个问题。' },
  { bg: 'lecturehall', char: null, speaker: null, text: '这是我一直想问某人的问题。' },
  { bg: 'uni', char: null, speaker: null, text: '当我们走出大学时，我立刻看到了她。' },
  { bg: 'uni', char: { name: 'sylvie', layers: ['happy', 'casual'], pos: 'center' }, speaker: null, text: '我从小就认识 Sylvie。她心地善良，一直是我的好朋友。' },
  { bg: 'uni', char: { name: 'sylvie', layers: ['happy', 'casual'], pos: 'center' }, speaker: null, text: '但最近...我感觉我想要更多。' },
  { bg: 'uni', char: { name: 'sylvie', layers: ['happy', 'casual'], pos: 'center' }, speaker: 'Sylvie', text: '嗨！今天的课怎么样？', color: '#c8ffc8' },
  { bg: 'uni', char: { name: 'sylvie', layers: ['happy', 'casual'], pos: 'center' }, speaker: 'Me', text: '还好...', color: '#c8c8ff' },
  { bg: 'uni', char: { name: 'sylvie', layers: ['sad', 'casual'], pos: 'center' }, speaker: null, text: '我没法承认我完全没听进去。' },
  { bg: 'uni', char: { name: 'sylvie', layers: ['happy', 'casual'], pos: 'center' }, speaker: null, text: '"当她看到我时，我决定..."', isMenu: true },
  { bg: 'uni', char: { name: 'sylvie', layers: ['surprised', 'casual'], pos: 'center' }, speaker: 'Sylvie', text: '什么？你想问我什么？', color: '#c8ffc8' },
];

const backgrounds = {
  lecturehall: 'linear-gradient(180deg, #87CEEB 0%, #E0F6FF 100%)',
  uni: 'linear-gradient(180deg, #4a90a4 0%, #2d5a6b 100%)',
  meadow: 'linear-gradient(180deg, #90EE90 0%, #228B22 100%)',
  club: 'linear-gradient(180deg, #DEB887 0%, #8B4513 100%)'
};

// ========================================
// 初始化
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  initNodeDragging();
  initCanvasPanning();
  initPreviewControls();
  initPanelCollapse();
  initModeSwitch();
  initZoomControls();
  initNodeSelection();
  initTabSwitch();
  initComplexitySwitch();
  initDialogueModeSwitch();
  initLayerEditor();
  initATLPresets();
  initPositionSelector();
  initExportButton();
  updatePreview();
});

// ========================================
// 三级复杂度切换
// ========================================
function initComplexitySwitch() {
  const btns = document.querySelectorAll('.complexity-btn');
  const indicator = document.querySelector('.complexity-indicator');
  
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      state.complexityLevel = btn.dataset.level;
      
      // 更新 body class
      document.body.classList.remove('simple-mode', 'preview-mode', 'advanced-mode');
      document.body.classList.add(state.complexityLevel + '-mode');
      
      // 更新状态栏指示器
      if (indicator) {
        const labels = { simple: '简单模式', preview: '代码预览', advanced: '高级模式' };
        indicator.textContent = labels[state.complexityLevel];
      }
      
      // 显示/隐藏代码预览区域
      const codeSection = document.querySelector('.code-preview-section');
      if (codeSection) {
        codeSection.style.display = state.complexityLevel === 'simple' ? 'none' : 'block';
      }
    });
  });
}

// ========================================
// ADV/NVL 模式切换
// ========================================
function initDialogueModeSwitch() {
  const btns = document.querySelectorAll('.mode-toggle-btn');
  const advBox = document.querySelector('.stage-dialogue.adv-mode');
  const nvlBox = document.querySelector('.stage-dialogue.nvl-mode');
  const indicator = document.querySelector('.mode-indicator');
  
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      state.dialogueMode = btn.dataset.mode;
      
      // 切换对话框显示
      if (advBox && nvlBox) {
        if (state.dialogueMode === 'adv') {
          advBox.style.display = 'block';
          nvlBox.style.display = 'none';
        } else {
          advBox.style.display = 'none';
          nvlBox.style.display = 'block';
        }
      }
      
      // 更新状态栏
      if (indicator) {
        indicator.textContent = state.dialogueMode.toUpperCase() + ' 模式';
      }
    });
  });
}

// ========================================
// 图层编辑器
// ========================================
function initLayerEditor() {
  const layerSelects = document.querySelectorAll('.layer-select');
  
  layerSelects.forEach(select => {
    select.addEventListener('change', () => {
      const layerName = select.closest('.layer-row').querySelector('.layer-name').textContent;
      state.selectedLayers[layerName] = select.value;
      
      updateCodePreview();
      updateCharacterDisplay();
    });
  });
}

function updateCharacterDisplay() {
  // 更新预览中的角色图层显示
  const layerIndicators = document.querySelector('.layer-indicators');
  if (layerIndicators) {
    layerIndicators.innerHTML = '';
    
    if (state.selectedLayers.outfit && state.selectedLayers.outfit !== 'none') {
      const tag = document.createElement('span');
      tag.className = 'layer-tag outfit';
      tag.textContent = state.selectedLayers.outfit;
      layerIndicators.appendChild(tag);
    }
    
    if (state.selectedLayers.expression) {
      const tag = document.createElement('span');
      tag.className = 'layer-tag expression';
      tag.textContent = state.selectedLayers.expression;
      layerIndicators.appendChild(tag);
    }
  }
  
  // 更新角色标签
  const charTag = document.querySelector('.char-tag');
  if (charTag) {
    const layers = Object.values(state.selectedLayers).filter(v => v && v !== 'none');
    charTag.textContent = `sylvie ${layers.join(' ')}`;
  }
}

function updateCodePreview() {
  const codePreview = document.querySelector('.code-preview code');
  if (codePreview) {
    const layers = Object.values(state.selectedLayers).filter(v => v && v !== 'none');
    const position = document.querySelector('.pos-btn.active')?.dataset.pos || 'center';
    const transition = document.getElementById('transitionSelect')?.value || '';
    
    let code = `show sylvie ${layers.join(' ')}`;
    if (position !== 'center') code += ` at ${position}`;
    if (transition) code += ` with ${transition}`;
    
    codePreview.textContent = code;
  }
}

// ========================================
// ATL 动画预设
// ========================================
function initATLPresets() {
  const presetBtns = document.querySelectorAll('.atl-preset-btn');
  
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const atlName = btn.dataset.atl;
      
      // 显示动画指示器
      const animIndicator = document.querySelector('.animation-indicator');
      if (animIndicator) {
        animIndicator.style.display = 'flex';
        animIndicator.querySelector('.anim-name').textContent = atlName;
        
        // 3秒后隐藏
        setTimeout(() => {
          animIndicator.style.display = 'none';
          btn.classList.remove('active');
        }, 3000);
      }
      
      // 触发动画效果预览
      triggerATLAnimation(atlName);
    });
  });
}

function triggerATLAnimation(atlName) {
  const charSprite = document.querySelector('.char-sprite');
  if (!charSprite) return;
  
  // 移除之前的动画类
  charSprite.classList.remove('anim-shake', 'anim-bounce', 'anim-heartbeat');
  
  // 添加对应动画
  charSprite.style.animation = '';
  
  switch (atlName) {
    case 'shake':
      charSprite.style.animation = 'shake 0.3s ease-in-out 3';
      break;
    case 'bounce':
      charSprite.style.animation = 'bounce 0.4s ease-in-out';
      break;
    case 'heartbeat':
      charSprite.style.animation = 'heartbeat 1s ease-in-out 2';
      break;
    case 'slide_left':
      charSprite.style.animation = 'slideFromLeft 0.5s ease-out';
      break;
    case 'slide_right':
      charSprite.style.animation = 'slideFromRight 0.5s ease-out';
      break;
  }
}

// 添加动画关键帧
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(-50%); }
    25% { transform: translateX(calc(-50% + 10px)); }
    75% { transform: translateX(calc(-50% - 10px)); }
  }
  @keyframes bounce {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(-20px); }
  }
  @keyframes heartbeat {
    0%, 100% { transform: translateX(-50%) scale(1); }
    25% { transform: translateX(-50%) scale(1.1); }
    50% { transform: translateX(-50%) scale(1); }
  }
  @keyframes slideFromLeft {
    from { transform: translateX(-150%); }
    to { transform: translateX(-50%); }
  }
  @keyframes slideFromRight {
    from { transform: translateX(50%); }
    to { transform: translateX(-50%); }
  }
`;
document.head.appendChild(styleSheet);

// ========================================
// 位置选择器
// ========================================
function initPositionSelector() {
  const posBtns = document.querySelectorAll('.pos-btn');
  
  posBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      posBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const position = btn.dataset.pos;
      
      // 更新预览中角色位置
      const charEl = document.querySelector('.stage-character');
      if (charEl) {
        switch (position) {
          case 'left':
            charEl.style.left = '25%';
            break;
          case 'center':
            charEl.style.left = '50%';
            break;
          case 'right':
            charEl.style.left = '75%';
            break;
        }
      }
      
      updateCodePreview();
    });
  });
  
  // 转场选择
  const transitionSelect = document.getElementById('transitionSelect');
  if (transitionSelect) {
    transitionSelect.addEventListener('change', updateCodePreview);
  }
}

// ========================================
// 节点拖拽
// ========================================
function initNodeDragging() {
  const nodes = document.querySelectorAll('.node');
  
  nodes.forEach(node => {
    node.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('port') || 
          e.target.tagName === 'TEXTAREA' || 
          e.target.tagName === 'SELECT' ||
          e.target.tagName === 'BUTTON' ||
          e.target.tagName === 'INPUT') return;
      
      e.preventDefault();
      state.isDragging = true;
      state.selectedNode = node;
      
      const rect = node.getBoundingClientRect();
      state.dragOffset.x = e.clientX - rect.left;
      state.dragOffset.y = e.clientY - rect.top;
      
      node.style.zIndex = 1000;
      node.classList.add('dragging');
      
      document.querySelectorAll('.node').forEach(n => n.classList.remove('selected'));
      node.classList.add('selected');
      updatePropertyPanel(node);
    });
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!state.isDragging || !state.selectedNode) return;
    
    const canvas = document.querySelector('.canvas');
    const canvasRect = canvas.getBoundingClientRect();
    
    let x = e.clientX - canvasRect.left - state.dragOffset.x;
    let y = e.clientY - canvasRect.top - state.dragOffset.y;
    
    x = Math.max(0, Math.min(x, canvasRect.width - state.selectedNode.offsetWidth));
    y = Math.max(0, Math.min(y, canvasRect.height - state.selectedNode.offsetHeight));
    
    state.selectedNode.style.left = x + 'px';
    state.selectedNode.style.top = y + 'px';
  });
  
  document.addEventListener('mouseup', () => {
    if (state.selectedNode) {
      state.selectedNode.style.zIndex = '';
      state.selectedNode.classList.remove('dragging');
    }
    state.isDragging = false;
  });
}

// ========================================
// 画布平移
// ========================================
function initCanvasPanning() {
  const canvas = document.querySelector('.canvas');
  if (!canvas) return;
  
  canvas.addEventListener('mousedown', (e) => {
    if (e.target === canvas || e.target.classList.contains('canvas-grid')) {
      state.isPanning = true;
      state.panStart.x = e.clientX;
      state.panStart.y = e.clientY;
      canvas.style.cursor = 'grabbing';
    }
  });
  
  canvas.addEventListener('mouseup', () => {
    state.isPanning = false;
    canvas.style.cursor = 'grab';
  });
}

// ========================================
// 节点选择
// ========================================
function initNodeSelection() {
  document.querySelectorAll('.node').forEach(node => {
    node.addEventListener('click', (e) => {
      if (e.target.tagName === 'TEXTAREA' || 
          e.target.tagName === 'SELECT' ||
          e.target.tagName === 'BUTTON' ||
          e.target.tagName === 'INPUT') return;
      
      document.querySelectorAll('.node').forEach(n => n.classList.remove('selected'));
      node.classList.add('selected');
      updatePropertyPanel(node);
    });
  });
  
  document.querySelector('.canvas')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('canvas-grid') || e.target.classList.contains('canvas')) {
      document.querySelectorAll('.node').forEach(n => n.classList.remove('selected'));
    }
  });
}

function updatePropertyPanel(node) {
  const typeSpan = document.querySelector('.property-node-type');
  if (!typeSpan) return;
  
  const typeMap = {
    'node-dialogue-sequence': '对话序列',
    'node-choice': '选择菜单',
    'node-scene': '场景设置',
    'node-jump': '跳转',
    'node-event': 'Label',
    'node-variable': '变量',
    'node-show': 'Show'
  };
  
  for (const [cls, label] of Object.entries(typeMap)) {
    if (node.classList.contains(cls)) {
      typeSpan.textContent = label;
      break;
    }
  }
}

// ========================================
// 预览控制
// ========================================
function initPreviewControls() {
  const prevBtn = document.querySelectorAll('.preview-nav')[0];
  const nextBtn = document.querySelectorAll('.preview-nav')[1];
  
  prevBtn?.addEventListener('click', () => {
    if (state.currentStep > 1) {
      state.currentStep--;
      updatePreview();
    }
  });
  
  nextBtn?.addEventListener('click', () => {
    if (state.currentStep < state.totalSteps) {
      state.currentStep++;
      updatePreview();
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    
    if (e.key === 'ArrowLeft') {
      if (state.currentStep > 1) {
        state.currentStep--;
        updatePreview();
      }
    } else if (e.key === 'ArrowRight' || e.key === ' ') {
      if (state.currentStep < state.totalSteps) {
        state.currentStep++;
        updatePreview();
      }
    }
  });
}

function updatePreview() {
  const stepSpan = document.querySelector('.preview-step');
  if (stepSpan) {
    stepSpan.textContent = `步骤 ${state.currentStep} / ${state.totalSteps}`;
  }
  
  const step = previewSteps[state.currentStep - 1];
  if (!step) return;
  
  // 更新背景
  const bgEl = document.querySelector('.stage-background');
  if (bgEl && backgrounds[step.bg]) {
    bgEl.style.background = backgrounds[step.bg];
  }
  
  const bgLabel = document.querySelector('.stage-bg-label');
  if (bgLabel) {
    bgLabel.textContent = `bg ${step.bg}`;
  }
  
  // 更新角色
  const charEl = document.querySelector('.stage-character');
  if (charEl) {
    if (step.char) {
      charEl.style.display = 'flex';
      const charTag = charEl.querySelector('.char-tag');
      if (charTag) {
        charTag.textContent = `${step.char.name} ${step.char.layers.join(' ')}`;
      }
      // 更新图层指示器
      const layerIndicators = charEl.querySelector('.layer-indicators');
      if (layerIndicators && step.char.layers) {
        layerIndicators.innerHTML = step.char.layers.map((l, i) => 
          `<span class="layer-tag ${i === 0 ? 'expression' : 'outfit'}">${l}</span>`
        ).join('');
      }
    } else {
      charEl.style.display = 'none';
    }
  }
  
  // 更新对话 (ADV 模式)
  const nameBox = document.querySelector('.dialogue-namebox span');
  const textBox = document.querySelector('.dialogue-content');
  
  if (nameBox) {
    if (step.speaker) {
      nameBox.textContent = step.speaker;
      nameBox.style.color = step.color || '#ffffff';
      nameBox.parentElement.style.display = 'block';
    } else {
      nameBox.parentElement.style.display = 'none';
    }
  }
  
  if (textBox) {
    textBox.textContent = step.text;
  }
  
  highlightCurrentDialogue();
}

function highlightCurrentDialogue() {
  const dialogueItems = document.querySelectorAll('.dialogue-item');
  dialogueItems.forEach((item, index) => {
    item.classList.remove('active');
    if (index === (state.currentStep - 1) % dialogueItems.length) {
      item.classList.add('active');
    }
  });
}

// ========================================
// 面板折叠
// ========================================
function initPanelCollapse() {
  document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.classList.contains('section-action')) return;
      
      const section = header.parentElement;
      const content = section.querySelector('.section-content, .palette-content');
      const icon = header.querySelector('.collapse-icon');
      
      if (content) {
        const isCollapsed = content.style.display === 'none';
        content.style.display = isCollapsed ? '' : 'none';
        if (icon) {
          icon.textContent = isCollapsed ? '▼' : '▶';
        }
      }
    });
  });
}

// ========================================
// 模式切换
// ========================================
function initModeSwitch() {
  const modeBtns = document.querySelectorAll('.mode-btn');
  
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const isStoryMode = btn.textContent.includes('故事');
      
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      if (isStoryMode && !window.location.href.includes('story-mode')) {
        window.location.href = 'story-mode.html';
      } else if (!isStoryMode && window.location.href.includes('story-mode')) {
        window.location.href = 'index.html';
      }
    });
  });
}

// ========================================
// 缩放控制
// ========================================
function initZoomControls() {
  const zoomIn = document.querySelector('.zoom-in');
  const zoomOut = document.querySelector('.zoom-out');
  const zoomInfo = document.querySelector('.zoom-info');
  
  zoomIn?.addEventListener('click', () => {
    if (state.zoom < 200) {
      state.zoom += 10;
      updateZoom();
    }
  });
  
  zoomOut?.addEventListener('click', () => {
    if (state.zoom > 50) {
      state.zoom -= 10;
      updateZoom();
    }
  });
  
  function updateZoom() {
    if (zoomInfo) {
      zoomInfo.textContent = state.zoom + '%';
    }
    const nodesLayer = document.querySelector('.nodes-layer');
    if (nodesLayer) {
      nodesLayer.style.transform = `scale(${state.zoom / 100})`;
      nodesLayer.style.transformOrigin = 'top left';
    }
  }
}

// ========================================
// 标签页切换
// ========================================
function initTabSwitch() {
  const tabs = document.querySelectorAll('.canvas-tabs .tab:not(.add-tab)');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const sceneName = tab.textContent;
      document.querySelectorAll('.panel-left .tree-item').forEach(item => {
        item.classList.remove('active');
        if (item.textContent.includes(sceneName)) {
          item.classList.add('active');
        }
      });
    });
  });
  
  document.querySelectorAll('.panel-left .panel-section:first-of-type .tree-item').forEach(item => {
    item.addEventListener('click', () => {
      const sceneName = item.textContent.trim().split(' ')[0];
      
      document.querySelectorAll('.panel-left .tree-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent === sceneName) {
          tab.classList.add('active');
        }
      });
    });
  });
}

// ========================================
// 导出功能
// ========================================
function initExportButton() {
  document.querySelector('.export-btn')?.addEventListener('click', () => {
    const code = generateRenpyCode();
    showCodeModal(code);
  });
  
  document.querySelector('.preview-btn')?.addEventListener('click', () => {
    alert('🎮 运行预览功能\n\n在实际项目中，这将启动 Ren\'Py 引擎预览游戏。');
  });
}

function generateRenpyCode() {
  return `# Generated by Ren'Py Visual Editor v3
# 支持图层系统 (Layered Images)

define s = Character(_("Sylvie"), color="#c8ffc8")
define m = Character(_("Me"), color="#c8c8ff")

# 图层定义
layeredimage sylvie:
    group outfit:
        attribute casual default
        attribute dress
    group expression:
        attribute happy default
        attribute sad
        attribute surprised
        attribute angry
    group accessory:
        attribute none default
        attribute glasses

default book = False
default points = 0

label start:
    play music "illurock.opus"
    
    scene bg lecturehall
    with fade
    
    "当我听到脚步声和收拾东西的声音时，我才意识到讲座结束了。"
    
    "Eileen 教授的课通常很有趣，但今天我就是无法集中注意力。"
    
    "我脑子里一直有很多其他的想法...这些想法最终汇聚成一个问题。"
    
    "这是我一直想问某人的问题。"
    
    scene bg uni
    with fade
    
    "当我们走出大学时，我立刻看到了她。"
    
    show sylvie happy casual
    with dissolve
    
    "我从小就认识 Sylvie。她心地善良，一直是我的好朋友。"
    
    "但最近...我感觉我想要更多。"
    
    show sylvie happy casual at center
    
    s "嗨！今天的课怎么样？"
    
    m "还好..."
    
    "我没法承认我完全没听进去。"
    
    menu:
        "当她看到我时，我决定..."
        
        "现在就问她":
            jump rightaway
            
        "聊聊那本书" if book:
            $ book = True
            jump book_talk
            
        "以后再问":
            jump later

label rightaway:
    show sylvie happy casual
    
    s "嗨！今天的课怎么样？"
    
    m "还好..."
    
    "我没法承认我完全没听进去。"
    
    return

label later:
    "我决定以后再问..."
    
    show sylvie sad casual
    
    "但我是个优柔寡断的人。"
    
    return
`;
}

function showCodeModal(code) {
  const modal = document.createElement('div');
  modal.className = 'code-modal';
  modal.innerHTML = `
    <div class="code-modal-content">
      <div class="code-modal-header">
        <span>导出的 Ren'Py 代码 (支持图层系统)</span>
        <button class="code-modal-close">×</button>
      </div>
      <pre class="code-modal-body">${escapeHtml(code)}</pre>
      <div class="code-modal-footer">
        <button class="code-copy-btn">📋 复制代码</button>
        <button class="code-download-btn">💾 下载 .rpy</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector('.code-modal-close').addEventListener('click', () => modal.remove());
  
  modal.querySelector('.code-copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(code);
    alert('代码已复制到剪贴板！');
  });
  
  modal.querySelector('.code-download-btn').addEventListener('click', () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'script.rpy';
    a.click();
    URL.revokeObjectURL(url);
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========================================
// 对话编辑
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.dialogue-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.dialogue-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
  
  document.querySelectorAll('.add-dialogue-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const list = btn.previousElementSibling;
      if (list && list.classList.contains('dialogue-list')) {
        const newItem = document.createElement('div');
        newItem.className = 'dialogue-item narration';
        newItem.innerHTML = `
          <span class="dialogue-speaker">旁白</span>
          <span class="dialogue-text-preview">新对话...</span>
        `;
        list.appendChild(newItem);
        
        const countSpan = btn.closest('.node').querySelector('.node-count');
        if (countSpan) {
          const count = list.querySelectorAll('.dialogue-item').length;
          countSpan.textContent = count + ' 句';
        }
      }
    });
  });
  
  document.querySelectorAll('.add-choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const options = btn.previousElementSibling;
      if (options && options.classList.contains('choice-options')) {
        const newOption = document.createElement('div');
        newOption.className = 'choice-option';
        newOption.innerHTML = `
          <span class="choice-text">新选项</span>
          <span class="port port-output port-flow"></span>
        `;
        options.appendChild(newOption);
      }
    });
  });
});


// ========================================
// PyTom v3 新功能
// ========================================

// 初始化新功能
document.addEventListener('DOMContentLoaded', () => {
  initFloatingPanels();
  initResourceBrowser();
  initDialogueHistory();
  initTransitionPreview();
  initAudioTracks();
  initDirectorMode();
  initTextEditor();
  initKeyboardShortcuts();
});

// ========================================
// 浮动面板管理
// ========================================
function initFloatingPanels() {
  // 面板拖拽
  document.querySelectorAll('.floating-panel-header').forEach(header => {
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      const panel = header.parentElement;
      const rect = panel.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      panel.style.position = 'fixed';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const panel = header.parentElement;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      panel.style.left = (startLeft + dx) + 'px';
      panel.style.top = (startTop + dy) + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  });
  
  // 关闭按钮
  document.querySelectorAll('.panel-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.floating-panel').style.display = 'none';
    });
  });
  
  // 最小化按钮
  document.querySelectorAll('.panel-minimize-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.closest('.floating-panel');
      const body = panel.querySelector('.floating-panel-body');
      if (body) {
        body.style.display = body.style.display === 'none' ? 'block' : 'none';
        btn.textContent = body.style.display === 'none' ? '+' : '−';
      }
    });
  });
  
  // 工具栏按钮
  document.getElementById('btnResourceBrowser')?.addEventListener('click', () => {
    togglePanel('resourceBrowser');
  });
  
  document.getElementById('btnDialogueHistory')?.addEventListener('click', () => {
    togglePanel('dialogueHistory');
  });
  
  document.getElementById('btnTransitionPreview')?.addEventListener('click', () => {
    togglePanel('transitionPreview');
  });
  
  document.getElementById('btnAudioTracks')?.addEventListener('click', () => {
    togglePanel('audioTracks');
  });
  
  document.getElementById('btnDirectorMode')?.addEventListener('click', () => {
    toggleDirectorMode();
  });
  
  document.getElementById('btnShortcuts')?.addEventListener('click', () => {
    togglePanel('shortcutsHint');
  });
}

function togglePanel(panelId) {
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }
}


// ========================================
// 资源浏览器
// ========================================
function initResourceBrowser() {
  const tabs = document.querySelectorAll('.resource-tab');
  const grid = document.getElementById('resourceGrid');
  
  const resources = {
    characters: [
      { name: 'Sylvie', color: '#c8ffc8', layers: 3 },
      { name: 'Me', color: '#c8c8ff', layers: 0 }
    ],
    backgrounds: [
      { name: 'lecturehall', preview: 'linear-gradient(180deg, #87CEEB 0%, #E0F6FF 100%)' },
      { name: 'uni', preview: 'linear-gradient(180deg, #4a90a4 0%, #2d5a6b 100%)' },
      { name: 'meadow', preview: 'linear-gradient(180deg, #90EE90 0%, #228B22 100%)', variants: ['night'] },
      { name: 'club', preview: 'linear-gradient(180deg, #DEB887 0%, #8B4513 100%)' }
    ],
    audio: [
      { name: 'illurock.opus', type: 'music', icon: '🎵' },
      { name: 'door.wav', type: 'sound', icon: '🔔' },
      { name: 'click.wav', type: 'sound', icon: '🔔' },
      { name: 'sylvie_001.ogg', type: 'voice', icon: '🎤' }
    ]
  };
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderResources(tab.dataset.type);
    });
  });
  
  function renderResources(type) {
    if (!grid) return;
    grid.innerHTML = '';
    
    if (type === 'characters') {
      resources.characters.forEach(char => {
        grid.innerHTML += `
          <div class="resource-item" draggable="true" data-type="character" data-name="${char.name.toLowerCase()}">
            <div class="resource-thumb char-thumb" style="background: ${char.color};">
              <span>${char.name[0]}</span>
            </div>
            <span class="resource-name">${char.name}</span>
            ${char.layers ? `<span class="resource-badge">${char.layers}层</span>` : ''}
          </div>
        `;
      });
    } else if (type === 'backgrounds') {
      resources.backgrounds.forEach(bg => {
        grid.innerHTML += `
          <div class="resource-item" draggable="true" data-type="background" data-name="${bg.name}">
            <div class="resource-thumb" style="background: ${bg.preview}; border-radius: 4px;"></div>
            <span class="resource-name">${bg.name}</span>
            ${bg.variants ? `<span class="resource-badge">+${bg.variants.join(',')}</span>` : ''}
          </div>
        `;
      });
    } else if (type === 'audio') {
      resources.audio.forEach(audio => {
        grid.innerHTML += `
          <div class="resource-item" draggable="true" data-type="audio" data-name="${audio.name}">
            <div class="resource-thumb" style="background: var(--bg-medium); font-size: 24px;">
              ${audio.icon}
            </div>
            <span class="resource-name">${audio.name}</span>
            <span class="resource-badge">${audio.type}</span>
          </div>
        `;
      });
    }
    
    // 添加"添加"按钮
    grid.innerHTML += `
      <div class="resource-item add-resource">
        <div class="resource-thumb add-thumb"><span>+</span></div>
        <span class="resource-name">添加${type === 'characters' ? '角色' : type === 'backgrounds' ? '背景' : '音频'}</span>
      </div>
    `;
    
    // 重新绑定拖拽事件
    initResourceDrag();
  }
  
  function initResourceDrag() {
    document.querySelectorAll('.resource-item[draggable="true"]').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({
          type: item.dataset.type,
          name: item.dataset.name
        }));
      });
    });
  }
  
  // 初始渲染
  renderResources('characters');
}


// ========================================
// 对话历史
// ========================================
function initDialogueHistory() {
  // 对话历史会随着预览步骤更新
  const historyList = document.getElementById('historyList');
  if (!historyList) return;
  
  // 滚动到当前项
  const currentItem = historyList.querySelector('.current');
  if (currentItem) {
    currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// ========================================
// 转场效果预览
// ========================================
function initTransitionPreview() {
  const items = document.querySelectorAll('.transition-item');
  const durationSlider = document.querySelector('.transition-duration');
  const durationValue = document.querySelector('.duration-value');
  
  items.forEach(item => {
    item.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      const transition = item.dataset.transition;
      
      // 更新属性面板中的转场选择
      const transitionSelect = document.getElementById('transitionSelect');
      if (transitionSelect) {
        transitionSelect.value = transition;
        updateCodePreview();
      }
    });
  });
  
  if (durationSlider && durationValue) {
    durationSlider.addEventListener('input', () => {
      durationValue.textContent = durationSlider.value + 's';
    });
  }
}

// ========================================
// 音频轨道
// ========================================
function initAudioTracks() {
  // 静音按钮
  document.querySelectorAll('.mute-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const isMuted = btn.textContent === '🔇';
      btn.textContent = isMuted ? '🔊' : '🔇';
      
      const slider = btn.parentElement.querySelector('.volume-slider');
      if (slider) {
        slider.disabled = !isMuted;
        slider.style.opacity = isMuted ? 1 : 0.5;
      }
    });
  });
  
  // 音量滑块
  document.querySelectorAll('.volume-slider').forEach(slider => {
    slider.addEventListener('input', () => {
      // 可以在这里添加音量变化的视觉反馈
    });
  });
}


// ========================================
// 导演模式
// ========================================
function initDirectorMode() {
  const directorMode = document.getElementById('directorMode');
  const closeBtn = document.querySelector('.director-close');
  const playBtn = document.getElementById('directorPlay');
  const pauseBtn = document.getElementById('directorPause');
  const stopBtn = document.getElementById('directorStop');
  
  let isPlaying = false;
  let playheadPosition = 55;
  let animationFrame = null;
  
  closeBtn?.addEventListener('click', () => {
    if (directorMode) {
      directorMode.style.display = 'none';
      stopPlayback();
    }
  });
  
  playBtn?.addEventListener('click', () => {
    if (!isPlaying) {
      isPlaying = true;
      animatePlayhead();
    }
  });
  
  pauseBtn?.addEventListener('click', () => {
    isPlaying = false;
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  });
  
  stopBtn?.addEventListener('click', () => {
    stopPlayback();
  });
  
  function stopPlayback() {
    isPlaying = false;
    playheadPosition = 0;
    updatePlayhead();
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  }
  
  function animatePlayhead() {
    if (!isPlaying) return;
    
    playheadPosition += 0.1;
    if (playheadPosition > 100) {
      playheadPosition = 0;
    }
    
    updatePlayhead();
    updateTimeDisplay();
    
    animationFrame = requestAnimationFrame(animatePlayhead);
  }
  
  function updatePlayhead() {
    const playhead = document.querySelector('.timeline-playhead-main');
    if (playhead) {
      playhead.style.left = `calc(60px + ${playheadPosition}%)`;
    }
  }
  
  function updateTimeDisplay() {
    const timeDisplay = document.querySelector('.director-time');
    if (timeDisplay) {
      const currentTime = (playheadPosition / 100 * 30).toFixed(2);
      const minutes = Math.floor(currentTime / 60);
      const seconds = (currentTime % 60).toFixed(2).padStart(5, '0');
      timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds} / 00:30.00`;
    }
  }
  
  // 点击时间轴跳转
  document.querySelectorAll('.track-content').forEach(track => {
    track.addEventListener('click', (e) => {
      const rect = track.getBoundingClientRect();
      const x = e.clientX - rect.left;
      playheadPosition = (x / rect.width) * 100;
      updatePlayhead();
      updateTimeDisplay();
    });
  });
}

function toggleDirectorMode() {
  const directorMode = document.getElementById('directorMode');
  if (directorMode) {
    directorMode.style.display = directorMode.style.display === 'none' ? 'flex' : 'none';
  }
}


// ========================================
// 富文本编辑器
// ========================================
function initTextEditor() {
  const modal = document.getElementById('textEditorModal');
  const closeBtn = modal?.querySelector('.text-editor-close');
  const cancelBtn = modal?.querySelector('.text-editor-cancel');
  const saveBtn = modal?.querySelector('.text-editor-save');
  const textarea = modal?.querySelector('.dialogue-textarea');
  const previewText = modal?.querySelector('.preview-text');
  const generatedCode = modal?.querySelector('.generated-code');
  const speakerSelect = modal?.querySelector('.speaker-select');
  const speakerPreview = modal?.querySelector('.speaker-preview');
  
  // 关闭模态框
  closeBtn?.addEventListener('click', () => modal.style.display = 'none');
  cancelBtn?.addEventListener('click', () => modal.style.display = 'none');
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });
  
  // 保存
  saveBtn?.addEventListener('click', () => {
    // 这里可以保存对话内容
    modal.style.display = 'none';
  });
  
  // 文本标签按钮
  document.querySelectorAll('.text-tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!textarea) return;
      
      const tag = btn.dataset.tag;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      
      let insertText = '';
      
      switch (tag) {
        case 'b':
        case 'i':
        case 'u':
        case 's':
          insertText = `{${tag}}${selectedText}{/${tag}}`;
          break;
        case 'color':
          const colorPicker = btn.querySelector('.color-picker');
          const color = colorPicker?.value || '#ff6b6b';
          insertText = `{color=${color}}${selectedText}{/color}`;
          break;
        case 'size':
          insertText = `{size=+10}${selectedText}{/size}`;
          break;
        case 'cps':
          insertText = `{cps=20}${selectedText}{/cps}`;
          break;
        case 'w':
          insertText = `{w}`;
          break;
        case 'p':
          insertText = `{p=0.5}`;
          break;
        case 'nw':
          insertText = `{nw}`;
          break;
        case 'image':
          insertText = `{image=icon.png}`;
          break;
        case 'a':
          insertText = `{a=https://example.com}${selectedText || '链接文字'}{/a}`;
          break;
      }
      
      textarea.value = textarea.value.substring(0, start) + insertText + textarea.value.substring(end);
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + insertText.length;
      
      updateTextPreview();
    });
  });
  
  // 实时预览
  textarea?.addEventListener('input', updateTextPreview);
  
  // 说话者选择
  speakerSelect?.addEventListener('change', () => {
    const speakers = {
      '': { name: '旁白', color: '#888888' },
      'sylvie': { name: 'Sylvie', color: '#c8ffc8' },
      'me': { name: 'Me', color: '#c8c8ff' }
    };
    
    const speaker = speakers[speakerSelect.value];
    if (speakerPreview) {
      speakerPreview.style.background = speaker.color;
      speakerPreview.textContent = speaker.name[0];
    }
    
    const previewSpeaker = modal?.querySelector('.preview-speaker');
    if (previewSpeaker) {
      previewSpeaker.textContent = speaker.name;
      previewSpeaker.style.color = speaker.color;
    }
    
    updateTextPreview();
  });
  
  function updateTextPreview() {
    if (!textarea || !previewText || !generatedCode) return;
    
    let text = textarea.value;
    
    // 转换标签为 HTML 预览
    let preview = text
      .replace(/\{b\}/g, '<b>').replace(/\{\/b\}/g, '</b>')
      .replace(/\{i\}/g, '<i>').replace(/\{\/i\}/g, '</i>')
      .replace(/\{u\}/g, '<u>').replace(/\{\/u\}/g, '</u>')
      .replace(/\{s\}/g, '<s>').replace(/\{\/s\}/g, '</s>')
      .replace(/\{color=([^}]+)\}/g, '<span style="color:$1">').replace(/\{\/color\}/g, '</span>')
      .replace(/\{size=[^}]+\}/g, '').replace(/\{\/size\}/g, '')
      .replace(/\{cps=[^}]+\}/g, '').replace(/\{\/cps\}/g, '')
      .replace(/\{w\}/g, '<span class="tag-indicator">[等待]</span>')
      .replace(/\{w=[^}]+\}/g, '<span class="tag-indicator">[等待]</span>')
      .replace(/\{p=[^}]+\}/g, '<span class="tag-indicator">[暂停]</span>')
      .replace(/\{nw\}/g, '<span class="tag-indicator">[不等待]</span>')
      .replace(/\{image=[^}]+\}/g, '🖼️')
      .replace(/\{a=[^}]+\}/g, '<a href="#">').replace(/\{\/a\}/g, '</a>');
    
    previewText.innerHTML = preview;
    
    // 生成代码
    const speakerCode = speakerSelect?.value || '';
    const prefix = speakerCode ? `${speakerCode[0]} ` : '';
    generatedCode.textContent = `${prefix}"${text}"`;
  }
  
  // 双击对话项打开编辑器
  document.querySelectorAll('.dialogue-item').forEach(item => {
    item.addEventListener('dblclick', () => {
      if (modal) {
        modal.style.display = 'flex';
        const text = item.querySelector('.dialogue-text-preview')?.textContent || '';
        if (textarea) textarea.value = text;
        updateTextPreview();
      }
    });
  });
}

function openTextEditor(text = '', speaker = '') {
  const modal = document.getElementById('textEditorModal');
  if (modal) {
    modal.style.display = 'flex';
    const textarea = modal.querySelector('.dialogue-textarea');
    const speakerSelect = modal.querySelector('.speaker-select');
    if (textarea) textarea.value = text;
    if (speakerSelect) speakerSelect.value = speaker;
  }
}


// ========================================
// 键盘快捷键
// ========================================
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // 忽略输入框中的快捷键
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    
    // Ctrl 组合键
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'h':
          e.preventDefault();
          togglePanel('dialogueHistory');
          break;
        case 'b':
          e.preventDefault();
          togglePanel('resourceBrowser');
          break;
        case 't':
          e.preventDefault();
          togglePanel('transitionPreview');
          break;
        case 'm':
          e.preventDefault();
          togglePanel('audioTracks');
          break;
        case 'd':
          e.preventDefault();
          toggleDirectorMode();
          break;
      }
    }
    
    // 单键快捷键
    switch (e.key) {
      case '?':
        togglePanel('shortcutsHint');
        break;
      case 'Escape':
        // 关闭所有浮动面板
        document.querySelectorAll('.floating-panel').forEach(panel => {
          panel.style.display = 'none';
        });
        document.getElementById('textEditorModal').style.display = 'none';
        document.getElementById('directorMode').style.display = 'none';
        document.getElementById('shortcutsHint').style.display = 'none';
        break;
    }
  });
}

// ========================================
// 画布拖放支持
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('nodeCanvas');
  if (!canvas) return;
  
  canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // 根据资源类型创建对应节点
      if (data.type === 'character') {
        createShowNode(data.name, x, y);
      } else if (data.type === 'background') {
        createSceneNode(data.name, x, y);
      } else if (data.type === 'audio') {
        createAudioNode(data.name, x, y);
      }
    } catch (err) {
      // 忽略非 JSON 数据
    }
  });
});

function createShowNode(charName, x, y) {
  const nodesLayer = document.querySelector('.nodes-layer');
  if (!nodesLayer) return;
  
  const colors = { sylvie: '#c8ffc8', me: '#c8c8ff' };
  const color = colors[charName] || '#888888';
  
  const node = document.createElement('div');
  node.className = 'node node-show';
  node.style.left = x + 'px';
  node.style.top = y + 'px';
  node.style.width = '180px';
  node.innerHTML = `
    <div class="node-header">
      <span class="node-icon">👤</span>
      <span class="node-title">Show</span>
    </div>
    <div class="node-body">
      <div class="node-row">
        <span class="port port-input port-flow"></span>
        <span class="port-label">输入</span>
        <span class="port-label right">输出</span>
        <span class="port port-output port-flow"></span>
      </div>
      <div class="show-preview">
        <div class="show-char-icon" style="background: ${color};">${charName[0].toUpperCase()}</div>
        <div class="show-details">
          <span class="show-char-name">${charName}</span>
          <div class="show-layers">
            <span class="layer-chip">happy</span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  nodesLayer.appendChild(node);
  initNodeDragging();
}

function createSceneNode(sceneName, x, y) {
  const nodesLayer = document.querySelector('.nodes-layer');
  if (!nodesLayer) return;
  
  const backgrounds = {
    lecturehall: 'linear-gradient(180deg, #87CEEB 0%, #E0F6FF 100%)',
    uni: 'linear-gradient(180deg, #4a90a4 0%, #2d5a6b 100%)',
    meadow: 'linear-gradient(180deg, #90EE90 0%, #228B22 100%)',
    club: 'linear-gradient(180deg, #DEB887 0%, #8B4513 100%)'
  };
  
  const node = document.createElement('div');
  node.className = 'node node-scene';
  node.style.left = x + 'px';
  node.style.top = y + 'px';
  node.innerHTML = `
    <div class="node-header">
      <span class="node-icon">🎬</span>
      <span class="node-title">Scene</span>
    </div>
    <div class="node-body">
      <div class="node-row">
        <span class="port port-input port-flow"></span>
        <span class="port-label">输入</span>
        <span class="port-label right">输出</span>
        <span class="port port-output port-flow"></span>
      </div>
      <div class="scene-mini-preview">
        <div class="mini-bg" style="background: ${backgrounds[sceneName] || '#333'};"></div>
        <span class="mini-label">bg ${sceneName}</span>
      </div>
    </div>
  `;
  
  nodesLayer.appendChild(node);
  initNodeDragging();
}

function createAudioNode(audioName, x, y) {
  const nodesLayer = document.querySelector('.nodes-layer');
  if (!nodesLayer) return;
  
  const isMusic = audioName.includes('.opus') || audioName.includes('.mp3');
  
  const node = document.createElement('div');
  node.className = 'node node-scene';
  node.style.left = x + 'px';
  node.style.top = y + 'px';
  node.innerHTML = `
    <div class="node-header" style="background: linear-gradient(135deg, #6b3a5a 0%, #4a2a3a 100%);">
      <span class="node-icon">${isMusic ? '🎵' : '🔔'}</span>
      <span class="node-title">${isMusic ? 'Play Music' : 'Play Sound'}</span>
    </div>
    <div class="node-body">
      <div class="node-row">
        <span class="port port-input port-flow"></span>
        <span class="port-label">输入</span>
        <span class="port-label right">输出</span>
        <span class="port port-output port-flow"></span>
      </div>
      <div class="node-info-row">
        <span class="info-icon">📁</span>
        <span class="info-text">${audioName}</span>
      </div>
    </div>
  `;
  
  nodesLayer.appendChild(node);
  initNodeDragging();
}


// ========================================
// PyTom v3.1 新功能
// ========================================

// 初始化 v3.1 功能
document.addEventListener('DOMContentLoaded', () => {
  initPositionGrid();
  initQuickExpressionPicker();
  initExtendSupport();
  initNVLClearMarkers();
  initWithNode();
  initCharacterDrag();
});

// ========================================
// 1. 多角色位置预览 - 位置网格
// ========================================
function initPositionGrid() {
  const positionGrid = document.getElementById('positionGrid');
  const stageCharacters = document.querySelector('.stage-characters');
  
  if (!positionGrid || !stageCharacters) return;
  
  const posZones = positionGrid.querySelectorAll('.pos-zone');
  
  // 位置映射
  const positionMap = {
    'far_left': '5%',
    'left': '20%',
    'center': '50%',
    'right': '80%',
    'far_right': '95%'
  };
  
  // 点击位置区域移动角色
  posZones.forEach(zone => {
    zone.addEventListener('click', () => {
      const selectedChar = stageCharacters.querySelector('.stage-character.selected') 
                          || stageCharacters.querySelector('.stage-character');
      if (selectedChar) {
        const pos = zone.dataset.pos;
        selectedChar.style.left = positionMap[pos];
        selectedChar.dataset.position = pos;
        
        // 更新角色标签
        updateCharacterTag(selectedChar);
        
        // 高亮当前位置
        posZones.forEach(z => z.classList.remove('highlight'));
        zone.classList.add('highlight');
        
        // 更新代码预览
        updateCodePreview();
        
        // 显示位置变化提示
        showPositionToast(pos);
      }
    });
    
    // 悬停效果
    zone.addEventListener('mouseenter', () => {
      zone.classList.add('hover');
    });
    
    zone.addEventListener('mouseleave', () => {
      zone.classList.remove('hover');
    });
  });
}

function updateCharacterTag(charEl) {
  const charTag = charEl.querySelector('.char-tag');
  if (charTag) {
    const charName = charEl.dataset.char || 'sylvie';
    const layers = [];
    
    // 获取当前图层
    const layerTags = charEl.querySelectorAll('.layer-tag');
    layerTags.forEach(tag => layers.push(tag.textContent));
    
    charTag.textContent = `${charName} ${layers.join(' ')}`;
  }
}

function showPositionToast(position) {
  // 创建临时提示
  const toast = document.createElement('div');
  toast.className = 'position-toast';
  toast.textContent = `位置: ${position}`;
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(57, 197, 207, 0.9);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 12px;
    z-index: 9999;
    animation: fadeInOut 1.5s ease forwards;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 1500);
}

// 添加 toast 动画
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
    20% { opacity: 1; transform: translateX(-50%) translateY(0); }
    80% { opacity: 1; transform: translateX(-50%) translateY(0); }
    100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  }
`;
document.head.appendChild(toastStyle);

// ========================================
// 2. 快速表情切换器
// ========================================
function initQuickExpressionPicker() {
  const expressionPickers = document.querySelectorAll('.quick-expression-picker');
  
  expressionPickers.forEach(picker => {
    const charEl = picker.closest('.stage-character');
    const exprBtns = picker.querySelectorAll('.expr-btn');
    
    exprBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // 更新按钮状态
        exprBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const expression = btn.dataset.expr;
        
        // 更新角色表情显示
        updateCharacterExpression(charEl, expression);
        
        // 触发表情变化动画
        const sprite = charEl.querySelector('.char-sprite');
        if (sprite) {
          sprite.classList.add('expression-change');
          setTimeout(() => sprite.classList.remove('expression-change'), 300);
        }
        
        // 更新代码预览
        state.selectedLayers.expression = expression;
        updateCodePreview();
        
        // 更新属性面板中的图层选择
        const layerSelect = document.querySelector('.layer-row:nth-child(2) .layer-select');
        if (layerSelect) {
          layerSelect.value = expression;
        }
      });
    });
  });
}

function updateCharacterExpression(charEl, expression) {
  // 更新图层指示器
  const expressionTag = charEl.querySelector('.layer-tag.expression');
  if (expressionTag) {
    expressionTag.textContent = expression;
  }
  
  // 更新角色标签
  updateCharacterTag(charEl);
  
  // 更新预览对话框中的表情描述
  const previewStep = previewSteps[state.currentStep - 1];
  if (previewStep && previewStep.char) {
    previewStep.char.layers[0] = expression;
  }
}

// ========================================
// 3. Extend 支持 - 追加对话
// ========================================
function initExtendSupport() {
  // 为对话项添加 extend 切换按钮
  document.querySelectorAll('.dialogue-item').forEach((item, index) => {
    if (index === 0) return; // 第一项不能是 extend
    
    // 创建 extend 切换按钮
    const extendToggle = document.createElement('button');
    extendToggle.className = 'extend-toggle';
    extendToggle.title = '切换 extend (追加到上一句)';
    extendToggle.textContent = '↳';
    
    extendToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const isExtend = item.classList.toggle('has-extend');
      extendToggle.classList.toggle('active', isExtend);
      
      // 更新代码预览
      updateExtendCodePreview();
    });
    
    item.appendChild(extendToggle);
  });
}

function updateExtendCodePreview() {
  // 这里可以更新生成的代码，添加 extend 关键字
  const codePreview = document.querySelector('.code-preview code');
  if (codePreview) {
    // 示例：如果当前对话是 extend，显示 extend 代码
    const hasExtend = document.querySelector('.dialogue-item.has-extend.active');
    if (hasExtend) {
      codePreview.textContent = 'extend "...继续的对话内容"';
    }
  }
}

// ========================================
// 4. NVL Clear 标记
// ========================================
function initNVLClearMarkers() {
  // 在 NVL 模式下添加清屏标记
  const nvlContent = document.querySelector('.nvl-content');
  if (!nvlContent) return;
  
  // 添加示例清屏分隔线
  const clearDivider = document.createElement('div');
  clearDivider.className = 'nvl-clear-divider';
  clearDivider.innerHTML = '<span>nvl clear</span>';
  
  // 在第三行后插入
  const nvlLines = nvlContent.querySelectorAll('.nvl-line');
  if (nvlLines.length >= 3) {
    nvlLines[2].after(clearDivider);
  }
  
  // 为节点库添加 NVL Clear 节点类型
  addNVLClearToPalette();
}

function addNVLClearToPalette() {
  const nvlPaletteItem = document.querySelector('.palette-item[data-type="nvl"]');
  if (!nvlPaletteItem) return;
  
  // 在 NVL 节点后添加 NVL Clear 节点
  const nvlClearItem = document.createElement('div');
  nvlClearItem.className = 'palette-item';
  nvlClearItem.draggable = true;
  nvlClearItem.dataset.type = 'nvl-clear';
  nvlClearItem.innerHTML = `
    <span class="palette-icon mode" style="background: #8a5ab5;">🧹</span>
    <span>NVL Clear</span>
  `;
  
  nvlPaletteItem.after(nvlClearItem);
  
  // 添加拖拽事件
  nvlClearItem.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'nvl-clear',
      name: 'nvl clear'
    }));
  });
}

// ========================================
// 5. 独立 With 节点 (转场节点)
// ========================================
function initWithNode() {
  // 在节点库中添加 With 节点
  addWithToPalette();
}

function addWithToPalette() {
  const pausePaletteItem = document.querySelector('.palette-item[data-type="pause"]');
  if (!pausePaletteItem) return;
  
  // 在 Pause 节点后添加 With 节点
  const withItem = document.createElement('div');
  withItem.className = 'palette-item';
  withItem.draggable = true;
  withItem.dataset.type = 'with';
  withItem.innerHTML = `
    <span class="palette-icon transition">✨</span>
    <span>With</span>
  `;
  
  pausePaletteItem.after(withItem);
  
  // 添加拖拽事件
  withItem.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'with',
      name: 'with'
    }));
  });
}

function createWithNode(transitionName, x, y) {
  const nodesLayer = document.querySelector('.nodes-layer');
  if (!nodesLayer) return;
  
  const transitions = {
    'dissolve': { duration: '0.5s', demo: 'dissolveAnim' },
    'fade': { duration: '1.0s', demo: 'fadeAnim' },
    'move': { duration: '0.5s', demo: 'moveAnim' },
    'ease': { duration: '0.5s', demo: 'easeAnim' },
    'wipeleft': { duration: '0.5s', demo: 'wipeAnim' }
  };
  
  const transition = transitions[transitionName] || transitions['dissolve'];
  
  const node = document.createElement('div');
  node.className = 'node node-with';
  node.style.left = x + 'px';
  node.style.top = y + 'px';
  node.style.width = '160px';
  node.innerHTML = `
    <div class="node-header">
      <span class="node-icon">✨</span>
      <span class="node-title">With</span>
    </div>
    <div class="node-body">
      <div class="node-row">
        <span class="port port-input port-flow"></span>
        <span class="port-label">输入</span>
        <span class="port-label right">输出</span>
        <span class="port port-output port-flow"></span>
      </div>
      <div class="with-preview">
        <div class="with-demo">
          <div class="demo-layer layer-a"></div>
          <div class="demo-layer layer-b"></div>
        </div>
        <div class="with-details">
          <span class="with-name">${transitionName || 'dissolve'}</span>
          <span class="with-duration">${transition.duration}</span>
        </div>
      </div>
      <select class="atl-select with-select" style="width: 100%; margin-top: 8px;">
        <option value="dissolve" ${transitionName === 'dissolve' ? 'selected' : ''}>dissolve</option>
        <option value="fade" ${transitionName === 'fade' ? 'selected' : ''}>fade</option>
        <option value="move" ${transitionName === 'move' ? 'selected' : ''}>move</option>
        <option value="ease" ${transitionName === 'ease' ? 'selected' : ''}>ease</option>
        <option value="wipeleft" ${transitionName === 'wipeleft' ? 'selected' : ''}>wipeleft</option>
        <option value="pixellate" ${transitionName === 'pixellate' ? 'selected' : ''}>pixellate</option>
      </select>
    </div>
  `;
  
  nodesLayer.appendChild(node);
  
  // 绑定选择器事件
  const select = node.querySelector('.with-select');
  select.addEventListener('change', () => {
    const nameEl = node.querySelector('.with-name');
    if (nameEl) nameEl.textContent = select.value;
  });
  
  initNodeDragging();
}

// 更新画布拖放支持，添加 With 和 NVL Clear 节点
const originalDrop = document.getElementById('nodeCanvas')?.ondrop;
document.getElementById('nodeCanvas')?.addEventListener('drop', (e) => {
  try {
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (data.type === 'with') {
      e.preventDefault();
      createWithNode('dissolve', x, y);
    } else if (data.type === 'nvl-clear') {
      e.preventDefault();
      createNVLClearNode(x, y);
    }
  } catch (err) {
    // 忽略
  }
});

function createNVLClearNode(x, y) {
  const nodesLayer = document.querySelector('.nodes-layer');
  if (!nodesLayer) return;
  
  const node = document.createElement('div');
  node.className = 'node node-scene';
  node.style.left = x + 'px';
  node.style.top = y + 'px';
  node.style.width = '140px';
  node.innerHTML = `
    <div class="node-header" style="background: linear-gradient(135deg, #8a5ab5 0%, #5a3a7a 100%);">
      <span class="node-icon">🧹</span>
      <span class="node-title">NVL Clear</span>
    </div>
    <div class="node-body">
      <div class="node-row">
        <span class="port port-input port-flow"></span>
        <span class="port-label">输入</span>
        <span class="port-label right">输出</span>
        <span class="port port-output port-flow"></span>
      </div>
      <div class="node-nvl-clear">
        <span class="clear-icon">📜</span>
        <span>清除 NVL 文字</span>
      </div>
    </div>
  `;
  
  nodesLayer.appendChild(node);
  initNodeDragging();
}

// ========================================
// 角色拖拽定位
// ========================================
function initCharacterDrag() {
  const stageCharacters = document.querySelector('.stage-characters');
  const positionGrid = document.getElementById('positionGrid');
  
  if (!stageCharacters || !positionGrid) return;
  
  const characters = stageCharacters.querySelectorAll('.stage-character');
  const posZones = positionGrid.querySelectorAll('.pos-zone');
  
  const positionMap = {
    'far_left': '5%',
    'left': '20%',
    'center': '50%',
    'right': '80%',
    'far_right': '95%'
  };
  
  characters.forEach(char => {
    let isDragging = false;
    let startX, startLeft;
    
    char.addEventListener('mousedown', (e) => {
      if (e.target.closest('.quick-expression-picker')) return;
      
      isDragging = true;
      char.classList.add('dragging');
      positionGrid.classList.add('active');
      
      startX = e.clientX;
      startLeft = parseFloat(char.style.left) || 50;
      
      // 选中当前角色
      characters.forEach(c => c.classList.remove('selected'));
      char.classList.add('selected');
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const stage = stageCharacters.closest('.preview-stage-large');
      const stageRect = stage.getBoundingClientRect();
      const dx = e.clientX - startX;
      const newLeft = startLeft + (dx / stageRect.width * 100);
      
      // 限制范围
      const clampedLeft = Math.max(5, Math.min(95, newLeft));
      char.style.left = clampedLeft + '%';
      
      // 高亮最近的位置区域
      highlightNearestZone(clampedLeft, posZones);
    });
    
    document.addEventListener('mouseup', (e) => {
      if (!isDragging) return;
      
      isDragging = false;
      char.classList.remove('dragging');
      positionGrid.classList.remove('active');
      
      // 吸附到最近的位置
      const currentLeft = parseFloat(char.style.left);
      const nearestPos = findNearestPosition(currentLeft);
      
      char.style.left = positionMap[nearestPos];
      char.dataset.position = nearestPos;
      
      // 清除高亮
      posZones.forEach(z => z.classList.remove('highlight', 'drop-target'));
      
      // 更新
      updateCharacterTag(char);
      updateCodePreview();
      showPositionToast(nearestPos);
    });
  });
}

function highlightNearestZone(leftPercent, zones) {
  const positions = {
    'far_left': 10,
    'left': 20,
    'center': 50,
    'right': 80,
    'far_right': 90
  };
  
  let nearestZone = null;
  let minDist = Infinity;
  
  zones.forEach(zone => {
    const pos = zone.dataset.pos;
    const dist = Math.abs(positions[pos] - leftPercent);
    
    zone.classList.remove('highlight', 'drop-target');
    
    if (dist < minDist) {
      minDist = dist;
      nearestZone = zone;
    }
  });
  
  if (nearestZone && minDist < 15) {
    nearestZone.classList.add('drop-target');
  }
}

function findNearestPosition(leftPercent) {
  const positions = {
    'far_left': 5,
    'left': 20,
    'center': 50,
    'right': 80,
    'far_right': 95
  };
  
  let nearest = 'center';
  let minDist = Infinity;
  
  for (const [pos, value] of Object.entries(positions)) {
    const dist = Math.abs(value - leftPercent);
    if (dist < minDist) {
      minDist = dist;
      nearest = pos;
    }
  }
  
  return nearest;
}
