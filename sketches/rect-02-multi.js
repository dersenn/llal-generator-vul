// Rect Text sketch - Multi-layer version
// Rectangle text layout with horizontal paths and SVG path generation

class RectSketchMulti {
  constructor(controlsContainer) {
    this.controlsContainer = controlsContainer;
    this.svg = null;
    this.defs = null;
    this.fSet = {};

    // Initialize seed immediately
    const useSeed = true;
    if (useSeed) {
      this.seed = new Hash();
      // Check if we should use a specific seed from URL
      const urlParams = new URLSearchParams(window.location.search);
      const seedFromUrl = urlParams.get('seed');
      if (seedFromUrl) {
        this.seed.hash = seedFromUrl;
        // Regenerate the random number generator with the URL seed
        this.seed.hashTrunc = this.seed.hash.slice(2);
        this.seed.regex = new RegExp('.{' + ((this.seed.hashTrunc.length / 4) | 0) + '}', 'g');
        this.seed.hashes = this.seed.hashTrunc.match(this.seed.regex).map((h) => this.seed.b58dec(h));
        this.seed.rnd = this.seed.sfc32(...this.seed.hashes);
      }
    } else {
      this.seed = false;
    }
  }

  init() {
    this.setupSVG();
    this.setupSketch();
    this.createFilter();
    this.createRectText();
    this.setupControls();

    // No advanced controls in multi-layer version

    // Enable auto-saving now that initialization is complete
    this.isInitializing = false;

    this.updateHashDisplay();
  }

  setupSVG() {
    // === DPI-BASED SCALING ===
    // Set your target DPI here (72 for screen, 300 for print, etc.)
    const DPI = 72;
    const mmToPx = DPI / 25.4; // 1 mm in px at chosen DPI

    // MEASUREMENTS FOR PRINT
    const printWidth = 210; // mm - actual print area
    const printHeight = 297; // mm - actual print area
    const bleedAmount = 3; // mm - bleed on all sides
    const docWidth = printWidth + (bleedAmount * 2); // mm - total document with bleed
    const docHeight = printHeight + (bleedAmount * 2); // mm - total document with bleed

    // Set SVG size to document size in px at chosen DPI
    const setup = {
      id: 'mySVG',
      parent: document.body,
      width: docWidth * mmToPx,
      height: docHeight * mmToPx,
      presAspect: 'xMidYMid meet',
    };

    this.svg = new SVG(setup);
    if (window.sketchManager) {
      window.sketchManager.setSvg(this.svg);
    }

    // Store measurements for later use
    this.mmToPx = mmToPx;
    this.bleedAmount = bleedAmount;
    this.printArea = {
      left: bleedAmount * mmToPx,
      top: bleedAmount * mmToPx,
      right: (printWidth + bleedAmount) * mmToPx,
      bottom: (printHeight + bleedAmount) * mmToPx,
      width: printWidth * mmToPx,
      height: printHeight * mmToPx
    };
  }

  setupSketch() {
    this.defs = document.createElementNS(this.svg.ns, 'defs');
    this.svg.stage.prepend(this.defs);

    // Static settings that don't have controls
    this.staticSettings = {
      useFilter: false,
      useNoise: true,
      marginTop: this.printArea.top,
      marginBottom: this.svg.h - this.printArea.bottom,
      marginLeft: this.printArea.left,
      marginRight: this.svg.w - this.printArea.right,
      wdths: [50, 100, 150, 200],
      opacityLevels: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100],
      nCols: 20,
      txt: 'LLAL',
      numLayers: 3, // Static number of layers
      guides: {
        show: true,
        color: '#0f0',
        width: 1,
        opacity: .3
      }
    };

    // Single background color for the entire sketch
    this.backgroundColor = '#381C4A';

    // Initialize layers with default settings
    this.layers = [];
    this.layers.push({
      id: `layer-1`,
      name: `Layer 1`,
      visible: true,
      nRows: 144,
      colFG: '#FF5909'
    });
    this.layers.push({
      id: `layer-2`,
      name: `Layer 2`,
      visible: true,
      nRows: 72,
      colFG: '#FFFFFF'
    });
    this.layers.push({
      id: `layer-3`,
      name: `Layer 3`,
      visible: true,
      nRows: 36,
      colFG: '#FF5909'
    });

    // Shared settings - everything except layer-specific settings (nRows, colors)
    // Most settings are hidden since we're simplifying the UI
    this.sharedSettings = {
      lineSpacing: {
        type: 'range',
        label: 'Line spacing (font size)',
        min: 0.5,
        max: 3.0,
        step: 0.1,
        default: 1.5,
        value: 1.5,
        locked: true,
        hidden: true
      },
      shiftTextPattern: {
        type: 'select',
        label: 'Shift text',
        options: ['none', 'forward', 'backward', 'random'],
        default: 'forward',
        value: 'forward',
        locked: true,
        hidden: true
      },
      centerText: {
        type: 'toggle',
        label: 'Center text on paths',
        default: false,
        value: true,
        locked: true,
        hidden: true
      },
      positionalNoise: {
        type: 'toggle',
        label: 'Positional noise',
        default: false,
        value: true,
        locked: true,
        hidden: true
      },
      positionalResolution: {
        type: 'range',
        label: 'Positional grid resolution',
        min: 0.001,
        max: 0.1,
        step: 0.001,
        default: 0.01,
        value: 0.01,
        locked: true,
        hidden: true
      },
      yScaleFactor: {
        type: 'range',
        label: 'Y-axis pattern scale',
        min: 0.05,
        max: 5.0,
        step: 0.05,
        default: 0.6,
        value: 0.6,
        locked: true,
        hidden: true
      },
      noiseScale: {
        type: 'range',
        label: 'Noise scale',
        min: 0.001,
        max: 0.1,
        step: 0.001,
        default: 0.075,
        value: 0.075,
        locked: true,
        hidden: true
      },
      noiseOctaves: {
        type: 'range',
        label: 'Noise octaves',
        min: 1,
        max: 6,
        step: 1,
        default: 4,
        value: 4,
        locked: true,
        hidden: true
      },
      noisePersistence: {
        type: 'range',
        label: 'Noise persistence',
        min: 0.1,
        max: 1.0,
        step: 0.1,
        default: 0.6,
        value: 0.6,
        locked: true,
        hidden: true
      },
      noiseContrast: {
        type: 'range',
        label: 'Noise contrast',
        min: 0.1,
        max: 3.0,
        step: 0.1,
        default: 0.9,
        value: 0.9,
        locked: true,
        hidden: true
      },
      noiseLacunarity: {
        type: 'range',
        label: 'Noise lacunarity',
        min: 0.05,
        max: 1.5,
        step: 0.05,
        default: 0.81,
        value: .81,
        locked: true,
        hidden: true
      },
      inverseWidthMapping: {
        type: 'toggle',
        label: 'Inverse width mapping',
        default: false,
        value: false,
        locked: true,
        hidden: true
      },
      fontSizeVariation: {
        type: 'toggle',
        label: 'Font size variation',
        default: false,
        value: false,
        locked: true,
        hidden: true
      },
      fontSizeVariationAmount: {
        type: 'range',
        label: 'Font size variation amount',
        min: 0.1,
        max: 2.0,
        step: 0.1,
        default: 0.3,
        value: 0.3,
        locked: true,
        hidden: true
      },
      fontSizeNoiseScale: {
        type: 'range',
        label: 'Font size noise scale',
        min: 0.005,
        max: 0.1,
        step: 0.005,
        default: 0.05,
        value: 0.05,
        locked: true,
        hidden: true
      },
      adaptiveSpacing: {
        type: 'toggle',
        label: 'Adaptive row spacing',
        default: true,
        value: true,
        locked: true,
        hidden: true
      },
      useTransparency: {
        type: 'toggle',
        label: 'Use transparency',
        default: true,
        value: true,
        locked: true,
        hidden: true
      }
    };

    // Layer-specific controls that will be visible
    this.layerControlTemplate = {
      nRows: {
        type: 'range',
        label: 'Lines',
        min: 24,
        max: 180,
        step: 1,
        default: 120,
        locked: false,
        hidden: false
      },
      colFG: {
        type: 'color',
        label: 'Text',
        default: '#ffffff',
        locked: false,
        hidden: false
      },
      visible: {
        type: 'toggle',
        label: 'Visible',
        default: true,
        locked: false,
        hidden: false
      }
    };

    // Store original default settings before any modifications
    this.originalSharedSettings = JSON.parse(JSON.stringify(this.sharedSettings));
    this.originalLayers = JSON.parse(JSON.stringify(this.layers));
    
    // Load saved settings if available
    this.loadSettings();

    // Flag to prevent auto-saving during initial setup
    this.isInitializing = true;

    // Performance optimization: debounce update calls
    this.updateTimeout = null;
    this.debounceDelay = 150; // ms for text inputs
    this.sliderDebounceDelay = 50; // ms for sliders (more responsive)

    // Initialize noise generator using the main seed system
    // Always use noise for all sketches
    this.originalNoiseSeed = this.seed ? Math.floor(this.seed.rnd() * 10000) : Math.floor(Math.random() * 10000);
    this.noise = new SimplexNoise(this.originalNoiseSeed);

    // Calculate font size dynamically based on number of rows
    this.updateFontSize();

    // Create CSS style definitions for width variations (after settings and font size are set)
    this.createWidthStyles();

    document.body.style['background-color'] = '#eee';
    this.svg.stage.style['font-family'] = 'LLAL-linear';
    this.svg.stage.style['background-color'] = this.backgroundColor;

    // Create actual background rectangle for export compatibility
    this.createBackgroundRect();
  }

  createWidthStyles() {
    // Create style element following Illustrator SVG pattern
    const style = document.createElementNS(this.svg.ns, 'style');
    style.setAttribute('type', 'text/css');

    // Generate opacity classes dynamically from staticSettings
    const opacityClasses = this.staticSettings.opacityLevels.map(level =>
      `.op-${level} { opacity: ${level / 100}; }`
    ).join('\n      ');

    // Define CSS classes for each width variation using distinct font files
    // Note: font-size is now applied per-row to allow for size variation
    // Colors will be set per-layer, so we use a generic fill class
    const cssRules = `
      .st0 { fill: currentColor; }
      .width-50 { font-family: 'LLALLogoLinear-Condensed'; }
      .width-100 { font-family: 'LLALLogoLinear-Regular'; }
      .width-150 { font-family: 'LLALLogoLinear-Extended'; }
      .width-200 { font-family: 'LLALLogoLinear-Expanded'; }
      ${opacityClasses}
    `;

    style.textContent = cssRules;
    this.defs.appendChild(style);
  }

  createBackgroundRect() {
    // Remove existing background rectangle if it exists
    const existingBg = this.svg.stage.querySelector('#background-rect');
    if (existingBg) {
      existingBg.remove();
    }

    // Create new background rectangle
    const bgRect = document.createElementNS(this.svg.ns, 'rect');
    bgRect.setAttribute('id', 'background-rect');
    bgRect.setAttribute('x', '0');
    bgRect.setAttribute('y', '0');
    bgRect.setAttribute('width', this.svg.w);
    bgRect.setAttribute('height', this.svg.h);
    bgRect.setAttribute('fill', this.backgroundColor);

    // Insert as first element so it appears behind everything
    this.svg.stage.insertBefore(bgRect, this.svg.stage.firstChild);
  }

  updateFontSize() {
    // In multi-layer version, font size will be calculated per layer
    // This method is kept for compatibility but the actual calculation happens in calculateLayerFontSize
    const availableHeight = this.svg.h - this.staticSettings.marginTop - this.staticSettings.marginBottom;
    this.baseFontSizeCalculation = availableHeight; // Store for use in per-layer calculations
  }

  calculateLayerFontSize(nRows) {
    // Calculate font size based on available space and this layer's number of rows
    const availableHeight = this.baseFontSizeCalculation || (this.svg.h - this.staticSettings.marginTop - this.staticSettings.marginBottom);
    return (availableHeight / nRows) * this.sharedSettings.lineSpacing.value;
  }

  createFilter() {
    const maxRows = Math.max(...this.layers.map(layer => layer.nRows));
    this.fSet = {
      rows: maxRows,
      seed: Math.round(rnd() * 100),
      freqX: Math.round((rndInt(40, 100) / 10000) * 100000) / 100000,
      freqY: Math.round((rndInt(40, 100) / 10000) * 100000) / 100000,
      nOct: rndInt(5, 20),
      scale: rndInt(75, 120)
    };

    if (this.staticSettings.useFilter) {
      let swirl = document.createElementNS(this.svg.ns, 'filter');
      swirl.setAttribute('id', 'swirl');
      swirl.setAttribute('width', this.svg.w);
      swirl.setAttribute('height', this.svg.h);

      let turb = document.createElementNS(this.svg.ns, 'feTurbulence');
      turb.setAttribute('type', 'turbulence');
      turb.setAttribute('seed', this.fSet.seed);
      turb.setAttribute('baseFrequency', `${this.fSet.freqX} ${this.fSet.freqY}`);
      turb.setAttribute('numOctaves', this.fSet.nOct);
      turb.setAttribute('color-interpolation-filters', 'sRGB');
      turb.setAttribute('result', 'turbulence');

      let disp = document.createElementNS(this.svg.ns, 'feDisplacementMap');
      disp.setAttribute('in', 'SourceGraphic');
      disp.setAttribute('in2', 'turbulence');
      disp.setAttribute('scale', this.fSet.scale);
      disp.setAttribute('color-interpolation-filters', 'sRGB');

      swirl.append(turb, disp);
      this.defs.append(swirl);

      // Apply filter to all text elements
      const textElements = this.svg.stage.querySelectorAll('text');
      textElements.forEach(text => text.setAttribute('style', 'filter: url(#swirl)'));
    }
  }

  horizontalPath(x1, y, x2) {
    // Create a simple horizontal path from x1 to x2 at y position
    return `M ${x1} ${y} L ${x2} ${y}`;
  }

  makeHorizontalPath(x1, y, x2, id) {
    const path = document.createElementNS(this.svg.ns, 'path');
    path.setAttribute('id', id);
    path.setAttribute('d', this.horizontalPath(x1, y, x2));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'none'); // Make path invisible
    this.defs.appendChild(path);
    return path;
  }

  makeGuides() {
    if (this.staticSettings.guides.show) {
      // Draw reference rectangle outline
      const rect = document.createElementNS(this.svg.ns, 'rect');
      rect.setAttribute('x', this.staticSettings.marginLeft);
      rect.setAttribute('y', this.staticSettings.marginTop);
      rect.setAttribute('width', this.svg.w - this.staticSettings.marginLeft - this.staticSettings.marginRight);
      rect.setAttribute('height', this.svg.h - this.staticSettings.marginTop - this.staticSettings.marginBottom);
      rect.setAttribute('fill', 'none');
      rect.setAttribute('stroke', this.staticSettings.guides.color);
      rect.setAttribute('stroke-width', this.staticSettings.guides.width);
      rect.setAttribute('stroke-opacity', this.staticSettings.guides.opacity);
      this.svg.stage.append(rect);
    }
  }

  calculateRowFontSize(row, layerBaseFontSize) {
    // Use the provided layer base font size, or fall back to the old calculation for compatibility
    const baseFontSize = layerBaseFontSize ? layerBaseFontSize : parseFloat(this.fSize || '16');

    if (!this.sharedSettings.fontSizeVariation.value || !this.noise) {
      return baseFontSize;
    }

    // Calculate noise for this row
    let noiseValue = 0;
    let amplitude = 1.0;
    let frequency = 1.0;

    for (let octave = 0; octave < this.sharedSettings.noiseOctaves.value; octave++) {
      const noiseX = 0; // Keep X constant for row-based variation
      const noiseY = row * this.sharedSettings.fontSizeNoiseScale.value * frequency;
      noiseValue += this.noise.noise2D(noiseX, noiseY) * amplitude;

      amplitude *= this.sharedSettings.noisePersistence.value;
      frequency *= this.sharedSettings.noiseLacunarity.value;
    }

    // Apply contrast
    const contrast = this.sharedSettings.noiseContrast.value;
    if (contrast !== 1.0) {
      noiseValue = Math.sign(noiseValue) * Math.pow(Math.abs(noiseValue), contrast);
    }

    // Clamp noise value
    noiseValue = Math.max(-1, Math.min(1, noiseValue));

    // Apply variation
    const variation = this.sharedSettings.fontSizeVariationAmount.value;
    const scaleFactor = 1 + (noiseValue * variation);

    // Ensure font size doesn't go below a minimum threshold or above maximum
    const minFontSize = baseFontSize * 0.3;
    const maxFontSize = baseFontSize * 2.0;

    return Math.max(minFontSize, Math.min(maxFontSize, baseFontSize * scaleFactor));
  }

  calculateRowYPositions(rowFontSizes, nRows) {
    const marginTop = this.staticSettings.marginTop;
    const marginBottom = this.staticSettings.marginBottom;
    const availableHeight = this.svg.h - marginTop - marginBottom;
    
    if (nRows === 0) return [];
    
    // Calculate spacing needed for each row based on font size and line spacing
    const spacingMultiplier = this.sharedSettings.lineSpacing.value;
    const rowSpacings = rowFontSizes.map(fontSize => fontSize * spacingMultiplier);
    
    // Calculate total spacing needed
    const totalSpacing = rowSpacings.reduce((sum, spacing) => sum + spacing, 0);
    
    // If total spacing exceeds available space, scale down proportionally
    const scaleFactor = totalSpacing > availableHeight ? availableHeight / totalSpacing : 1.0;
    
    // Calculate actual Y positions
    const rowYPositions = [];
    let currentY = marginTop; // Start from top margin
    
    for (let i = 0; i < nRows; i++) {
      const currentSpacing = rowSpacings[i] * scaleFactor;
      
      if (i === 0) {
        // First row: position closer to top margin for better visual alignment
        currentY += currentSpacing * 0.8; // Font baseline is typically ~80% down from top
        rowYPositions.push(currentY);
        // Move currentY by the normal half-spacing to maintain consistent spacing to next row
        currentY += currentSpacing * 0.5;
      } else {
        // Subsequent rows: use normal spacing
        currentY += currentSpacing * 0.5;
        rowYPositions.push(currentY);
        currentY += currentSpacing * 0.5;
      }
    }
    
    return rowYPositions;
  }



  calculateOpacityClass(width, row, nRows, noiseValue) {
    // Check if transparency is enabled
    if (!this.sharedSettings.useTransparency.value) {
      return 'op-100'; // All letters fully opaque when transparency is disabled
    }
    
    // Calculate base factors (all range from 0 to 1)
    const normalizedNoise = (noiseValue + 1) / 2; // 0 to 1
    const rowPosition = (row - 1) / (nRows - 1); // 0 to 1 (0 = first row, 1 = last row) - account for bleed line
    
    // Apply curve to row position for more natural falloff
    const rowFactor = Math.pow(rowPosition, 2);
    
    // Calculate opacity: higher noise = wider letters = lower opacity
    // Lower row position = lower opacity
    const noiseOpacity = 1 - normalizedNoise; // Higher noise = lower opacity
    const rowOpacity = 1 - rowFactor; // Lower rows = lower opacity
    
    // Adjust weighting based on width - wider letters are more affected by row position
    const widthWeights = {
      50: { noise: 0.9, row: 0.1 },
      100: { noise: 0.8, row: 0.2 },
      150: { noise: 0.6, row: 0.4 },
      200: { noise: 0.4, row: 0.6 }
    };

    // const weights = { noise: 0.8, row: 0.2 };
    const weights = { noise: 1, row: 0 };

    // const weights = widthWeights[width] || { noise: 0.8, row: 0.2 };
    const finalOpacity = (noiseOpacity * weights.noise) + (rowOpacity * weights.row);
    
    // Width-based thresholds - determines if this width should be transparent at all
    const widthThresholds = { 
      50: 0.95, // width-50: small chance of transparency (only when opacity < 0.95)
      100: 0.7, // width-100: only becomes transparent if opacity < 0.7
      150: 0.9, // width-150: only becomes transparent if opacity < 0.9
      200: 1    // width-200: only becomes transparent if opacity < 1
    };
    
    const threshold = widthThresholds[width] || 0;
    
    // If opacity is above threshold, stay fully opaque
    if (finalOpacity >= threshold) {
      return 'op-100';
    }
    
    // Below threshold: map opacity to discrete levels
    const opacityLevels = this.staticSettings.opacityLevels;
    const opacityIndex = Math.floor(finalOpacity * opacityLevels.length);
    const clampedIndex = Math.max(0, Math.min(opacityLevels.length - 1, opacityIndex));
    
    return `op-${opacityLevels[clampedIndex]}`;
  }

  createRectText() {
    // Text extends into bleed area horizontally (3mm on each side)
    const textAreaLeft = 0; // Start from the edge (full bleed)
    const textAreaRight = this.svg.w; // Extend to the edge (full bleed)
    const textAreaWidth = textAreaRight - textAreaLeft;

    this.drawControlPoints = false; // Turn off control points for cleaner look

    // Draw reference rectangle outline (if enabled)
    this.makeGuides();

    // Generate multiple layers of text along horizontal paths
    this.layers.forEach((layer, layerIndex) => {
      if (layer.visible) {
        this.createRectTextLines(textAreaLeft, textAreaRight, textAreaWidth, layer, layerIndex);
      }
    });
  }

  createRectTextLines(textAreaLeft, textAreaRight, textAreaWidth, layer, layerIndex) {
    const baseRows = layer.nRows + 1; // Base rows from arc logic (includes top line)
    const layerFontSize = this.calculateLayerFontSize(layer.nRows); // Calculate font size for this layer
    const txt = this.staticSettings.txt;
    const colFG = layer.colFG;
    
    // Calculate font sizes for base rows first
    const rowFontSizes = [];
    for (let row = 0; row < baseRows; row++) {
      rowFontSizes.push(this.calculateRowFontSize(row, layerFontSize));
    }
    
    // Calculate Y positions for base rows
    let rowYPositions;
    if (this.sharedSettings.adaptiveSpacing.value && this.sharedSettings.fontSizeVariation.value) {
      // Use adaptive spacing based on font sizes
      rowYPositions = this.calculateRowYPositions(rowFontSizes, baseRows);
    } else {
      // Use fixed spacing (original behavior)
      const marginTop = this.staticSettings.marginTop;
      const marginBottom = this.staticSettings.marginBottom;
      const availableHeight = this.svg.h - marginTop - marginBottom;
      const yStep = availableHeight / (baseRows - 1);
      
      rowYPositions = [];
      for (let row = 0; row < baseRows; row++) {
        rowYPositions.push(marginTop + (row * yStep));
      }
    }
    
    // Add one extra line at the bottom for bleed
    const lastRowFontSize = this.calculateRowFontSize(baseRows, layerFontSize);
    rowFontSizes.push(lastRowFontSize);
    
    const lastYStep = rowYPositions[baseRows - 1] - rowYPositions[baseRows - 2]; // Use same step as last interval
    rowYPositions.push(rowYPositions[baseRows - 1] + lastYStep);
    
    const nRows = baseRows + 1; // Total rows including bottom bleed
    
    // Generate text for each line - follow horizontal paths using textPath
    for (let row = 0; row < nRows; row++) {
      const yPos = rowYPositions[row];
      
      // Create the horizontal path for this row (unique per layer)
      const pathId = `rect-path-layer${layerIndex}-row${row}`;
      this.makeHorizontalPath(textAreaLeft, yPos, textAreaRight, pathId);
      
      // Calculate repetitions based on actual row font size
      const actualFontSize = rowFontSizes[row];
      const avgCharWidth = actualFontSize * 0.4; // Character width based on actual font size
      const charsPerLLAL = txt.length;
      const avgLLALWidth = avgCharWidth * charsPerLLAL;
      
      // Calculate exact repetitions needed (no safety margin needed for uniform horizontal lines)
      const baseRepetitions = Math.ceil(textAreaWidth / avgLLALWidth);
      const repetitions = Math.max(baseRepetitions + 1, 6); // Just +1 for rounding safety, minimum 6
      
      // Create the full line of repeating text
      let fullText = '';
      for (let i = 0; i < repetitions; i++) {
        fullText += txt;
      }
      
      // Apply text pattern shifting based on selected mode
      const shiftMode = this.sharedSettings.shiftTextPattern.value;
      if (shiftMode !== 'none') {
        let shiftAmount = 0;
        
        switch (shiftMode) {
          case 'forward':
            // Shift forward by row number
            shiftAmount = row % txt.length;
            break;
          case 'backward':
            // Shift backward by row number
            shiftAmount = txt.length - (row % txt.length);
            break;
          case 'random':
            // Use seeded random for consistent results
            const rowSeed = this.seed ? this.seed.rnd() : Math.random();
            shiftAmount = Math.floor(rowSeed * txt.length);
            break;
        }
        
        if (shiftAmount > 0) {
          // Move the first 'shiftAmount' characters to the end
          fullText = fullText.slice(shiftAmount) + fullText.slice(0, shiftAmount);
        }
      }
      
      // Create text element that follows the path
      const text = document.createElementNS(this.svg.ns, 'text');
      
      // Apply font size variation per row
      const rowFontSize = rowFontSizes[row];
      text.setAttribute('style', `font-size: ${rowFontSize}px`);
      
      // Set the color for this layer
      text.setAttribute('color', colFG);
      
      // Apply text centering if enabled
      if (this.sharedSettings.centerText.value) {
        text.setAttribute('text-anchor', 'middle');
      }
      
      // Create textPath element
      const textPath = document.createElementNS(this.svg.ns, 'textPath');
      textPath.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${pathId}`);
      textPath.setAttribute('startOffset', this.sharedSettings.centerText.value ? '50%' : '0%');
      
      // Performance optimization: Create spans in batches and group by similar properties
      const spans = this.createOptimizedSpans(fullText, row, nRows);
      
      // Append all spans to textPath
      spans.forEach(span => textPath.appendChild(span));

      text.appendChild(textPath);
      this.svg.stage.appendChild(text);
    }
  }

  createOptimizedSpans(fullText, row, nRows) {
    const spans = [];
    const batchSize = 50; // Process characters in batches
    
    // Pre-calculate noise settings to avoid repeated property access
    const noiseSettings = {
      useNoise: this.staticSettings.useNoise,
      hasNoise: !!this.noise,
      octaves: this.sharedSettings.noiseOctaves.value,
      positionalNoise: this.sharedSettings.positionalNoise.value,
      positionalResolution: this.sharedSettings.positionalResolution.value,
      noiseScale: this.sharedSettings.noiseScale.value,
      yScaleFactor: this.sharedSettings.yScaleFactor.value,
      persistence: this.sharedSettings.noisePersistence.value,
      lacunarity: this.sharedSettings.noiseLacunarity.value,
      contrast: this.sharedSettings.noiseContrast.value,
      inverseMapping: this.sharedSettings.inverseWidthMapping.value
    };

    for (let i = 0; i < fullText.length; i += batchSize) {
      const fragment = document.createDocumentFragment();
      const endIndex = Math.min(i + batchSize, fullText.length);
      
      for (let j = i; j < endIndex; j++) {
        const span = document.createElementNS(this.svg.ns, 'tspan');
        
        // Calculate width and opacity for this character
        const { width, opacityClass } = this.calculateCharacterProperties(
          j, fullText.length, row, nRows, noiseSettings
        );
        
        // Set the width variation and opacity using CSS classes
        span.setAttribute('class', `st0 width-${width} ${opacityClass}`);
        span.textContent = fullText[j];
        
        fragment.appendChild(span);
      }
      
      // Convert fragment children to array and add to spans
      Array.from(fragment.children).forEach(span => spans.push(span));
    }
    
    return spans;
  }

  calculateCharacterProperties(charIndex, totalChars, row, nRows, noiseSettings) {
    let width;
    let noiseValue = 0;

    if (noiseSettings.useNoise && noiseSettings.hasNoise) {
      // Create multi-octave noise for more varied patterns
      let amplitude = 1.0;
      let frequency = 1.0;

      for (let octave = 0; octave < noiseSettings.octaves; octave++) {
        let noiseX, noiseY;

        if (noiseSettings.positionalNoise) {
          // Center-based positional sampling using horizontal geometry
          // Use proportional position relative to center for better consistency
          // Character's position relative to center (-0.5 to 0.5, centered at 0)
          const charRelativePosition = (charIndex / totalChars) - 0.5;
          
          // Create positional grid centered around the text middle
          const positionalResolution = noiseSettings.positionalResolution; // units per grid cell
          const positionalGridIndex = Math.floor(charRelativePosition / positionalResolution);
          
          // Use grid-based coordinates: positional index and consistent row-based Y
          // This creates consistent patterns that don't depend on character widths or text length
          noiseX = positionalGridIndex * noiseSettings.noiseScale * frequency;
          noiseY = row * noiseSettings.noiseScale * frequency * noiseSettings.yScaleFactor;
        } else {
          // Use character index directly (creates pattern that deteriorates with width variation)
          noiseX = charIndex * noiseSettings.noiseScale * frequency;
          noiseY = row * noiseSettings.noiseScale * frequency * noiseSettings.yScaleFactor;
        }
        
        noiseValue += this.noise.noise2D(noiseX, noiseY) * amplitude;
        amplitude *= noiseSettings.persistence;
        frequency *= noiseSettings.lacunarity;
      }

      // Apply contrast
      if (noiseSettings.contrast !== 1.0) {
        noiseValue = Math.sign(noiseValue) * Math.pow(Math.abs(noiseValue), noiseSettings.contrast);
      }

      // Clamp and normalize
      noiseValue = Math.max(-1, Math.min(1, noiseValue));
      let normalizedNoise = (noiseValue + 1) / 2;

      if (noiseSettings.inverseMapping) {
        normalizedNoise = 1 - normalizedNoise;
      }

      // Map to width
      const widthIndex = Math.floor(normalizedNoise * this.staticSettings.wdths.length);
      const clampedIndex = Math.max(0, Math.min(this.staticSettings.wdths.length - 1, widthIndex));
      width = this.staticSettings.wdths[clampedIndex];
    } else {
      // Random width
      width = this.staticSettings.wdths[rndInt(0, this.staticSettings.wdths.length - 1)];
    }

    const opacityClass = this.calculateOpacityClass(width, row, nRows, noiseValue);
    
    return { width, opacityClass };
  }

  createLayerRangeControl(layerIndex, property, label, value, min, max, step) {
    const control = document.createElement('li');
    control.innerHTML = `
      <label for="layer${layerIndex}-${property}-slider">${label}: </label>
      <div class="control-row">
        <div class="control-input-group">
          <input type="range" id="layer${layerIndex}-${property}-slider" min="${min}" max="${max}" step="${step}" value="${value}" class="control-slider">
          <input type="number" id="layer${layerIndex}-${property}-input" min="${min}" max="${max}" step="${step}" value="${value}" class="control-number">
        </div>
      </div>
    `;

    const slider = control.querySelector(`#layer${layerIndex}-${property}-slider`);
    const input = control.querySelector(`#layer${layerIndex}-${property}-input`);
    
    // Link slider and input with optimized debouncing
    slider.addEventListener('input', (e) => {
      input.value = e.target.value;
      this.layers[layerIndex][property] = parseFloat(e.target.value);
      this.debouncedUpdateSketch(true); // Use faster delay for sliders
      if (!this.isInitializing) this.saveSettings();
    });
    
    input.addEventListener('input', (e) => {
      slider.value = e.target.value;
      this.layers[layerIndex][property] = parseFloat(e.target.value);
      this.debouncedUpdateSketch(false); // Use slower delay for text inputs
      if (!this.isInitializing) this.saveSettings();
    });

    return control;
  }

  createLayerColorControl(layerIndex, property, label, value) {
    const control = document.createElement('li');
    control.innerHTML = `
      <label for="layer${layerIndex}-${property}-input">${label}: </label>
      <div class="control-row">
        <div class="control-input-group">
          <input type="color" id="layer${layerIndex}-${property}-input" value="${value}" class="control-color-input">
          <input type="text" id="layer${layerIndex}-${property}-text" value="${value}" class="control-color-text">
        </div>
      </div>
    `;

    const colorInput = control.querySelector(`#layer${layerIndex}-${property}-input`);
    const colorText = control.querySelector(`#layer${layerIndex}-${property}-text`);
    
    colorInput.addEventListener('input', (e) => {
      colorText.value = e.target.value;
      this.layers[layerIndex][property] = e.target.value;
      this.debouncedUpdateSketch();
      if (!this.isInitializing) this.saveSettings();
    });
    
    colorText.addEventListener('input', (e) => {
      colorInput.value = e.target.value;
      this.layers[layerIndex][property] = e.target.value;
      this.debouncedUpdateSketch();
      if (!this.isInitializing) this.saveSettings();
    });

    return control;
  }

  createLayerToggleControl(layerIndex, property, label, value) {
    const control = document.createElement('li');
    control.innerHTML = `
      <div class="control-row">
        <div class="control-input-group">
          <label for="layer${layerIndex}-${property}-checkbox">${label}: </label>
          <input type="checkbox" id="layer${layerIndex}-${property}-checkbox" ${value ? 'checked' : ''}>
        </div>
      </div>
    `;

    const checkbox = control.querySelector(`#layer${layerIndex}-${property}-checkbox`);
    
    checkbox.addEventListener('change', (e) => {
      this.layers[layerIndex][property] = e.target.checked;
      this.debouncedUpdateSketch();
      if (!this.isInitializing) this.saveSettings();
    });

    return control;
  }

  createBackgroundColorControl() {
    const control = document.createElement('li');
    control.innerHTML = `
      <label for="background-color-input">Color: </label>
      <div class="control-row">
        <div class="control-input-group">
          <input type="color" id="background-color-input" value="${this.backgroundColor}" class="control-color-input">
          <input type="text" id="background-color-text" value="${this.backgroundColor}" class="control-color-text">
        </div>
      </div>
    `;

    const colorInput = control.querySelector('#background-color-input');
    const colorText = control.querySelector('#background-color-text');
    
    colorInput.addEventListener('input', (e) => {
      colorText.value = e.target.value;
      this.backgroundColor = e.target.value;
      this.debouncedUpdateSketch();
      if (!this.isInitializing) this.saveSettings();
    });
    
    colorText.addEventListener('input', (e) => {
      colorInput.value = e.target.value;
      this.backgroundColor = e.target.value;
      this.debouncedUpdateSketch();
      if (!this.isInitializing) this.saveSettings();
    });

    return control;
  }

  setupControls() {
    const values = document.createElement('ul');

    const reloadBtn = document.createElement('a');
    reloadBtn.classList.add('btn');
    reloadBtn.setAttribute('id', 'btnreload');
    reloadBtn.append('New Seed');

    // Global background color control
    const bgColorHeader = document.createElement('li');
    bgColorHeader.innerHTML = `<h3 style="margin: 1em 0 0.5em 0; color: #333;">Background</h3>`;
    values.append(bgColorHeader);

    const bgColorControl = this.createBackgroundColorControl();
    values.append(bgColorControl);

    // Create layer controls for each layer
    this.layers.forEach((layer, layerIndex) => {
      // Layer header
      const layerHeader = document.createElement('li');
      layerHeader.innerHTML = `<h3 style="margin: 1em 0 0.5em 0; color: #333;">${layer.name}</h3>`;
      values.append(layerHeader);

      // Layer visibility toggle
      const visibilityControl = this.createLayerToggleControl(layerIndex, 'visible', 'Visible', layer.visible);
      values.append(visibilityControl);

      // Layer line count control
      const linesControl = this.createLayerRangeControl(layerIndex, 'nRows', 'Lines', layer.nRows, 60, 180, 1);
      values.append(linesControl);

      // Layer text color control
      const fgColorControl = this.createLayerColorControl(layerIndex, 'colFG', 'Text', layer.colFG);
      values.append(fgColorControl);
    });

    // Add randomize button
    const randomizeBtn = document.createElement('a');
    randomizeBtn.classList.add('btn');
    randomizeBtn.setAttribute('id', 'btnrandomize');
    randomizeBtn.append('Randomize Layers');

    const btnLi = document.createElement('li');
    btnLi.append(reloadBtn);
    values.append(btnLi);

    const randomizeLi = document.createElement('li');
    randomizeLi.append(randomizeBtn);
    values.append(randomizeLi);

    this.controlsContainer.append(values);

    reloadBtn.addEventListener('click', () => this.newSketch());
    randomizeBtn.addEventListener('click', () => {
      this.randomizeSettings();
      this.updateControlsFromSettings();
      this.updateSketch();
      
      // Show feedback
      randomizeBtn.textContent = 'Randomized!';
      setTimeout(() => {
        randomizeBtn.textContent = 'Randomize Layers';
      }, 1000);
    });
  }

  updateHashDisplay() {
    const hashDisplay = document.getElementById('hash-display');
    if (hashDisplay && this.seed) {
      hashDisplay.textContent = this.seed.hash;
    }
  }

  newSketch() {
    // Use the sketch manager to reload the current sketch with a new seed
    if (window.sketchManager) {
      window.sketchManager.reloadCurrentSketch();
    }
  }

  debouncedUpdateSketch(useSliderDelay = false) {
    // Cancel any pending update
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    
    // Use shorter delay for sliders, longer for text inputs
    const delay = useSliderDelay ? this.sliderDebounceDelay : this.debounceDelay;
    
    // Schedule new update with requestAnimationFrame for smoother performance
    this.updateTimeout = setTimeout(() => {
      requestAnimationFrame(() => {
        this.updateSketch();
      });
    }, delay);
  }

  updateSketch() {
    // Clear any pending debounced update since we're updating now
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }

    // Show loading indicator for longer operations
    const startTime = performance.now();
    
    // Update font size based on new number of rows across all layers
    this.updateFontSize();

    // Update both CSS background (for browser) and rectangle (for exports)
    this.svg.stage.style['background-color'] = this.backgroundColor;
    this.createBackgroundRect();

    // Performance optimization: Use more efficient DOM clearing
    this.clearExistingElements();

    // Recreate styles with updated font size and colors
    this.createWidthStyles();

    // Regenerate rect text with new settings
    this.createRectText();
    
    // Log performance for debugging
    const endTime = performance.now();
    if (endTime - startTime > 100) { // Only log if update took more than 100ms
      console.log(`Update took ${Math.round(endTime - startTime)}ms`);
    }
  }

  clearExistingElements() {
    // More efficient clearing - remove in batches and use fragment
    const elementsToRemove = [
      ...this.svg.stage.querySelectorAll('text'),
      ...this.svg.stage.querySelectorAll('path:not(#background-rect)'),
      ...this.svg.stage.querySelectorAll('line:not(#background-rect)'),
      ...this.svg.stage.querySelectorAll('rect:not(#background-rect)'),
      ...this.defs.querySelectorAll('[id^="rect-path-"]'),
      ...this.defs.querySelectorAll('style')
    ];
    
    // Remove all elements in one batch
    elementsToRemove.forEach(element => element.remove());
  }

  cleanup() {
    // Cleanup any resources if needed
    if (this.svg && this.svg.stage) {
      // Remove any event listeners or timers if they exist
    }
  }

  saveSettings() {
    try {
      // Save shared settings and layer data
      const sharedSettingsToSave = {};
      Object.keys(this.sharedSettings).forEach(key => {
        sharedSettingsToSave[key] = {
          value: this.sharedSettings[key].value,
          locked: this.sharedSettings[key].locked,
          hidden: this.sharedSettings[key].hidden
        };
      });

      const settingsData = {
        sharedSettings: sharedSettingsToSave,
        layers: this.layers,
        backgroundColor: this.backgroundColor
      };
      localStorage.setItem('rectSketchMultiSettings', JSON.stringify(settingsData));
      console.log('Multi-layer rect settings saved successfully');
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('rectSketchMultiSettings');
      if (saved) {
        const settingsData = JSON.parse(saved);
        
        // Load shared settings
        if (settingsData.sharedSettings) {
          Object.keys(settingsData.sharedSettings).forEach(key => {
            if (this.sharedSettings[key] && settingsData.sharedSettings[key]) {
              const savedControl = settingsData.sharedSettings[key];
              
              // Only restore value, locked, and hidden, preserve min/max/step/default from code
              if (savedControl.hasOwnProperty('value')) {
                this.sharedSettings[key].value = savedControl.value;
              }
              if (savedControl.hasOwnProperty('locked')) {
                this.sharedSettings[key].locked = savedControl.locked;
              }
              if (savedControl.hasOwnProperty('hidden')) {
                this.sharedSettings[key].hidden = savedControl.hidden;
              }
            }
          });
        }
        
        // Load layer settings
        if (settingsData.layers && Array.isArray(settingsData.layers)) {
          settingsData.layers.forEach((savedLayer, index) => {
            if (this.layers[index]) {
              // Restore layer properties
              this.layers[index].nRows = savedLayer.nRows || this.layers[index].nRows;
              this.layers[index].colFG = savedLayer.colFG || this.layers[index].colFG;
              this.layers[index].visible = savedLayer.hasOwnProperty('visible') ? savedLayer.visible : this.layers[index].visible;
            }
          });
        }
        
        // Load background color
        if (settingsData.backgroundColor) {
          this.backgroundColor = settingsData.backgroundColor;
        }
        
        console.log('Multi-layer rect settings loaded successfully');
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }

  injectSettingsIntoSVG() {
    // Store settings as a data attribute on the SVG element
    const svgElement = document.querySelector('svg');
    if (svgElement) {
      // Save shared settings and layer data
      const sharedSettingsToSave = {};
      Object.keys(this.sharedSettings).forEach(key => {
        sharedSettingsToSave[key] = {
          value: this.sharedSettings[key].value,
          locked: this.sharedSettings[key].locked,
          hidden: this.sharedSettings[key].hidden
        };
      });

      const settingsData = {
        sharedSettings: sharedSettingsToSave,
        layers: this.layers,
        backgroundColor: this.backgroundColor,
        staticSettings: this.staticSettings,
        seed: this.seed ? this.seed.hash : null
      };
      svgElement.setAttribute('data-sketch-settings', JSON.stringify(settingsData));
    }
  }

  // Override the save method to include settings
  saveWithSettings() {
    // Inject settings into SVG
    this.injectSettingsIntoSVG();

    // Call the original save method
    if (this.svg && this.svg.save) {
      this.svg.save();
    }
  }

  loadSettingsFromFile() {
    // Create file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.svg';
    fileInput.style.display = 'none';

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const svgContent = e.target.result;
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');

            // Find settings in the data attribute
            const svgElement = svgDoc.querySelector('svg');
            if (svgElement && svgElement.hasAttribute('data-sketch-settings')) {
              const settingsData = JSON.parse(svgElement.getAttribute('data-sketch-settings'));

              // Handle multi-layer format
              if (settingsData.sharedSettings) {
                // Load shared settings
                Object.keys(settingsData.sharedSettings).forEach(key => {
                  if (this.sharedSettings[key] && settingsData.sharedSettings[key]) {
                    const savedControl = settingsData.sharedSettings[key];
                    
                    if (savedControl.hasOwnProperty('value')) {
                      this.sharedSettings[key].value = savedControl.value;
                    }
                    if (savedControl.hasOwnProperty('locked')) {
                      this.sharedSettings[key].locked = savedControl.locked;
                    }
                    if (savedControl.hasOwnProperty('hidden')) {
                      this.sharedSettings[key].hidden = savedControl.hidden;
                    }
                  }
                });
              }
              
              // Load layer settings
              if (settingsData.layers && Array.isArray(settingsData.layers)) {
                settingsData.layers.forEach((savedLayer, index) => {
                  if (this.layers[index]) {
                    this.layers[index].nRows = savedLayer.nRows || this.layers[index].nRows;
                    this.layers[index].colFG = savedLayer.colFG || this.layers[index].colFG;
                    this.layers[index].visible = savedLayer.hasOwnProperty('visible') ? savedLayer.visible : this.layers[index].visible;
                  }
                });
              }
              
              // Load background color
              if (settingsData.backgroundColor) {
                this.backgroundColor = settingsData.backgroundColor;
              }

              // Restore seed if available
              if (settingsData.seed && settingsData.seed !== null) {
                this.seed.hash = settingsData.seed;
                // Regenerate the random number generator with the restored seed
                this.seed.hashTrunc = this.seed.hash.slice(2);
                this.seed.regex = new RegExp('.{' + ((this.seed.hashTrunc.length / 4) | 0) + '}', 'g');
                this.seed.hashes = this.seed.hashTrunc.match(this.seed.regex).map((h) => this.seed.b58dec(h));
                this.seed.rnd = this.seed.sfc32(...this.seed.hashes);
                console.log('Seed restored from SVG:', this.seed.hash);
              }

              // Reinitialize noise (always enabled)
              const noiseSeed = this.seed ? Math.floor(this.seed.rnd() * 10000) : Math.floor(Math.random() * 10000);
              this.noise = new SimplexNoise(noiseSeed);

              // No advanced controls in multi-layer version

              // Update UI controls to reflect loaded values
              this.refreshControlsPanel();

              this.updateSketch();
              this.updateHashDisplay(); // Update the displayed hash
              console.log('Settings and seed loaded from SVG file (values, locks, and hidden states only, preserved ranges)');
            } else {
              console.log('No settings found in SVG file');
            }
          } catch (error) {
            console.error('Error loading settings from file:', error);
          }
        };
        reader.readAsText(file);
      }
    });

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }

  resetToDefaults() {
    // Reset shared settings to their original values
    Object.keys(this.sharedSettings).forEach(key => {
      if (this.originalSharedSettings[key]) {
        this.sharedSettings[key].value = this.originalSharedSettings[key].value;
        this.sharedSettings[key].locked = this.originalSharedSettings[key].locked;
        this.sharedSettings[key].hidden = this.originalSharedSettings[key].hidden;
      }
    });

    // Reset layers to original state
    this.layers = JSON.parse(JSON.stringify(this.originalLayers));

    // Clear localStorage
    localStorage.removeItem('rectSketchMultiSettings');

    // Reinitialize noise (always enabled)
    this.noise = new SimplexNoise(this.originalNoiseSeed);

    // Ensure we're not in initialization mode
    this.isInitializing = false;

    // Update UI controls to reflect reset values
    this.refreshControlsPanel();

    // Update sketch with reset values
    this.updateSketch();

    console.log('Multi-layer rect settings reset to defaults');
  }

  getCurrentLockStates() {
    // Multi-layer version doesn't use lock states - return empty object
    return {};
  }

  restoreControlsFromSettings(locks = null) {
    // Update background color control
    const bgColorInput = document.getElementById('background-color-input');
    const bgColorText = document.getElementById('background-color-text');
    if (bgColorInput && bgColorText) {
      bgColorInput.value = this.backgroundColor;
      bgColorText.value = this.backgroundColor;
    }

    // Multi-layer version: Update layer controls to match current layer data
    this.layers.forEach((layer, layerIndex) => {
      // Update visibility checkbox
      const visibilityCheckbox = document.getElementById(`layer${layerIndex}-visible-checkbox`);
      if (visibilityCheckbox) {
        visibilityCheckbox.checked = layer.visible;
      }

      // Update line count controls
      const linesSlider = document.getElementById(`layer${layerIndex}-nRows-slider`);
      const linesInput = document.getElementById(`layer${layerIndex}-nRows-input`);
      if (linesSlider && linesInput) {
        linesSlider.value = layer.nRows;
        linesInput.value = layer.nRows;
      }

      // Update text color controls
      const fgColorInput = document.getElementById(`layer${layerIndex}-colFG-input`);
      const fgColorText = document.getElementById(`layer${layerIndex}-colFG-text`);
      if (fgColorInput && fgColorText) {
        fgColorInput.value = layer.colFG;
        fgColorText.value = layer.colFG;
      }
    });
  }

  refreshControlsPanel() {
    // Clear existing controls
    if (this.controlsContainer) {
      this.controlsContainer.innerHTML = '';
    }

    // Recreate the controls panel
    this.setupControls();
  }

  toggleAdvancedControls(show) {
    // Multi-layer version doesn't have advanced controls
  }

  setAllLockStates(shouldLock) {
    // Multi-layer version doesn't use lock states
  }

  updateAllLockCheckboxes() {
    // Multi-layer version doesn't use lock states
  }

  updateLockAllCheckbox() {
    // Multi-layer version doesn't use lock states
  }

  randomizeSettings() {
    // Multi-layer version: randomize layer settings
    this.layers.forEach(layer => {
      // Randomize line count
      layer.nRows = rndInt(60, 180);
      
      // Randomize colors
      const r = rndInt(0, 255);
      const g = rndInt(0, 255);
      const b = rndInt(0, 255);
      layer.colFG = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    });
  }

  updateControlsFromSettings() {
    // Multi-layer version: Update layer controls from current layer data
    this.restoreControlsFromSettings();
  }
}
