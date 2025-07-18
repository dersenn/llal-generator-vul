// Arc Text sketch - based on vul2
// Cone arc text layout with SVG path generation

class ArcSketch {
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
    this.createArcText();
    this.setupControls();
    
    // Initialize advanced controls visibility after controls are set up
    this.toggleAdvancedControls(this.controlSettings.showAdvancedControls.value);
    
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
    const docWidth = 306; // mm
    const docHeight = 285; // mm

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
    
    // Store mmToPx for later use
    this.mmToPx = mmToPx;
  }

  setupSketch() {
    this.defs = document.createElementNS(this.svg.ns, 'defs');
    this.svg.stage.prepend(this.defs);

    // Static settings that don't have controls
    this.staticSettings = {
      useFilter: false,
      useNoise: true,
      borderTop: 0,
      wdths: [50, 100, 150, 200],
      opacityLevels: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100],
      nCols: 20,
      leftAngle: 24,
      rightAngle: 24,
      txt: 'LLAL',
      guides: {
        show: true,
        color: '#0f0',
        width: 1,
        opacity: .3
      }
    };

    // Comprehensive control settings - each control has all its configuration in one place
    this.controlSettings = {
      // Layout controls
      nRows: {
        type: 'range',
        label: 'Number of lines',
        min: 60,
        max: 180,
        step: 1,
        default: 120,
        value: 120,
        locked: false,
        hidden: false
      },
      lineSpacing: {
        type: 'range',
        label: 'Line spacing (font size)',
        min: 0.5,
        max: 3.0,
        step: 0.1,
        default: 1.5,
        value: 1.5,
        locked: true,
        hidden: false
      },
      
      // Text controls
      shiftTextPattern: {
        type: 'select',
        label: 'Shift text',
        options: ['none', 'forward', 'backward', 'random'],
        default: 'forward',
        value: 'forward',
        locked: true,
        hidden: false
      },
      
      // Noise controls
      angularNoise: {
        type: 'toggle',
        label: 'Angular noise',
        default: false,
        value: true,
        locked: true,
        hidden: false
      },
      angularResolution: {
        type: 'range',
        label: 'Angular grid resolution (°)',
        min: 0.05,
        max: 0.9,
        step: 0.05,
        default: 0.15,
        value: 0.15,
        locked: true,
        hidden: true
      },
      yScaleFactor: {
        type: 'range',
        label: 'Y-axis pattern scale',
        min: 0.05,
        max: 5.0,
        step: 0.05,
        default: 0.45,
        value: 0.45,
        locked: true,
        hidden: true
      },
      noiseScale: {
        type: 'range',
        label: 'Noise scale',
        min: 0.001,
        max: 0.1,
        step: 0.001,
        default: 0.09,
        value: 0.09,
        locked: false,
        hidden: false
      },
      noiseOctaves: {
        type: 'range',
        label: 'Noise octaves',
        min: 1,
        max: 6,
        step: 1,
        default: 3,
        value: 3,
        locked: false,
        hidden: false
      },
      noisePersistence: {
        type: 'range',
        label: 'Noise persistence',
        min: 0.1,
        max: 1.0,
        step: 0.1,
        default: 0.6,
        value: 0.6,
        locked: false,
        hidden: false
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
        hidden: false
      },
      noiseLacunarity: {
        type: 'range',
        label: 'Noise lacunarity',
        min: 0.05,
        max: 1.5,
        step: 0.05,
        default: 0.75,
        value: 0.75,
        locked: false,
        hidden: false
      },
      inverseWidthMapping: {
        type: 'toggle',
        label: 'Inverse width mapping',
        default: false,
        value: false,
        locked: true,
        hidden: false
      },

      // Font size variation controls
      fontSizeVariation: {
        type: 'toggle',
        label: 'Font size variation',
        default: false,
        value: false,
        locked: true,
        hidden: false
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
        hidden: false
      },

      // Transparency controls
      useTransparency: {
        type: 'toggle',
        label: 'Use transparency',
        default: true,
        value: true,
        locked: true,
        hidden: false
      },

      // Color controls
      colBG: {
        type: 'color',
        label: 'Background color',
        default: '#000000',
        value: '#000000',
        locked: true,
        hidden: false
      },
      colFG: {
        type: 'color',
        label: 'Text color',
        default: '#ffffff',
        value: '#ffffff',
        locked: true,
        hidden: false
      },

      // Control visibility
      showAdvancedControls: {
        type: 'toggle',
        label: 'Show advanced controls',
        default: false,
        value: false,
        locked: false,
        hidden: false
      }
    };

    // Store original default settings before any modifications
    this.originalControlSettings = JSON.parse(JSON.stringify(this.controlSettings));
    
    // Load saved settings if available
    this.loadSettings();
    
    // Flag to prevent auto-saving during initial setup
    this.isInitializing = true;

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
    this.svg.stage.style['background-color'] = this.controlSettings.colBG.value;
    
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
    const cssRules = `
      .st0 { fill: ${this.controlSettings.colFG.value}; }
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
    bgRect.setAttribute('fill', this.controlSettings.colBG.value);
    
    // Insert as first element so it appears behind everything
    this.svg.stage.insertBefore(bgRect, this.svg.stage.firstChild);
  }

  updateFontSize() {
    // Calculate font size based on available space and number of rows
    const availableHeight = this.svg.h - this.staticSettings.borderTop;
    this.fSize = (availableHeight / this.controlSettings.nRows.value) * this.controlSettings.lineSpacing.value + 'px';
  }

  createFilter() {
    this.fSet = {
      rows: this.controlSettings.nRows.value,
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

  arcPath(cx, cy, r, startAngle, endAngle, sweepFlag = 0) {
    // Angles in degrees, 0° = right, 90° = down, 180° = left, 270° = up
    // sweepFlag: 0 = shorter arc, 1 = longer arc
    const start = {
      x: cx + r * Math.cos(rad(startAngle)),
      y: cy + r * Math.sin(rad(startAngle))
    };
    const end = {
      x: cx + r * Math.cos(rad(endAngle)),
      y: cy + r * Math.sin(rad(endAngle))
    };
    const largeArcFlag = (Math.abs(endAngle - startAngle) > 180) ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
  }

  makeArc(cx, cy, r, startAngle, endAngle, sweepFlag = 0) {
    const path = document.createElementNS(this.svg.ns, 'path');
    path.setAttribute('d', this.arcPath(cx, cy, r, startAngle, endAngle, sweepFlag));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', this.staticSettings.guides.color);
    path.setAttribute('stroke-width', this.staticSettings.guides.width);
    path.setAttribute('stroke-opacity', this.staticSettings.guides.opacity);
    
    if (this.drawControlPoints) {
      const start = {
        x: cx + r * Math.cos(rad(startAngle)),
        y: cy + r * Math.sin(rad(startAngle))
      };
      const end = {
        x: cx + r * Math.cos(rad(endAngle)),
        y: cy + r * Math.sin(rad(endAngle))
      };
      this.svg.makeCircle(start, 8, '#f00');
      this.svg.makeCircle(end, 8, '#00f');
    }
    this.svg.stage.append(path);
  }

  drawConeConnectors(cx, cy, rOuter, rInner, startAngle, endAngle) {
    // Calculate the endpoints of the inner and outer arcs
    const outerStart = {
      x: cx + rOuter * Math.cos(rad(startAngle)),
      y: cy + rOuter * Math.sin(rad(startAngle))
    };
    const outerEnd = {
      x: cx + rOuter * Math.cos(rad(endAngle)),
      y: cy + rOuter * Math.sin(rad(endAngle))
    };
    const innerStart = {
      x: cx + rInner * Math.cos(rad(startAngle)),
      y: cy + rInner * Math.sin(rad(startAngle))
    };
    const innerEnd = {
      x: cx + rInner * Math.cos(rad(endAngle)),
      y: cy + rInner * Math.sin(rad(endAngle))
    };

    // Draw connecting lines to complete the cone shape
    this.drawLine(outerStart, innerStart);
    this.drawLine(outerEnd, innerEnd);
  }

  makeGuides(cx, cy, rOuter, rInner, arcStart, arcEnd) {
    if (this.staticSettings.guides.show) {
      // Draw reference cone outline
      this.makeArc(cx, cy, rOuter, arcStart, arcEnd);
      this.makeArc(cx, cy, rInner, arcStart, arcEnd);
      
      // Connect the arc endpoints to complete the cone shape
      this.drawConeConnectors(cx, cy, rOuter, rInner, arcStart, arcEnd);
    }
  }

  drawLine(start, end) {
    const line = document.createElementNS(this.svg.ns, 'line');
    line.setAttribute('x1', start.x);
    line.setAttribute('y1', start.y);
    line.setAttribute('x2', end.x);
    line.setAttribute('y2', end.y);
    line.setAttribute('stroke', this.staticSettings.guides.color);
    line.setAttribute('stroke-width', this.staticSettings.guides.width);
    line.setAttribute('stroke-opacity', this.staticSettings.guides.opacity);
    this.svg.stage.append(line);
  }

  calculateRowFontSize(row) {
    const baseFontSize = parseFloat(this.fSize);
    
    if (!this.controlSettings.fontSizeVariation.value || !this.noise) {
      return baseFontSize;
    }
    
    // Calculate noise for this row
    let noiseValue = 0;
    let amplitude = 1.0;
    let frequency = 1.0;
    
    for (let octave = 0; octave < this.controlSettings.noiseOctaves.value; octave++) {
      const noiseX = 0; // Keep X constant for row-based variation
      const noiseY = (row - 1) * this.controlSettings.fontSizeNoiseScale.value * frequency;
      noiseValue += this.noise.noise2D(noiseX, noiseY) * amplitude;
      
      amplitude *= this.controlSettings.noisePersistence.value;
      frequency *= this.controlSettings.noiseLacunarity.value;
    }
    
    // Apply contrast
    const contrast = this.controlSettings.noiseContrast.value;
    if (contrast !== 1.0) {
      noiseValue = Math.sign(noiseValue) * Math.pow(Math.abs(noiseValue), contrast);
    }
    
    // Clamp noise value
    noiseValue = Math.max(-1, Math.min(1, noiseValue));
    
    // Apply variation
    const variation = this.controlSettings.fontSizeVariationAmount.value;
    const scaleFactor = 1 + (noiseValue * variation);
    
    // Ensure font size doesn't go below a minimum threshold or above maximum
    const minFontSize = baseFontSize * 0.3;
    const maxFontSize = baseFontSize * 2.0;
    
    return Math.max(minFontSize, Math.min(maxFontSize, baseFontSize * scaleFactor));
  }

  calculateRowRadii(rowFontSizes, rOuter, rInner, nRows) {
    const availableSpace = rOuter - rInner;
    const numRows = rowFontSizes.length;
    
    if (numRows === 0) return [];
    
    // Calculate spacing needed for each row based on font size and line spacing
    const spacingMultiplier = this.controlSettings.lineSpacing.value;
    const rowSpacings = rowFontSizes.map(fontSize => fontSize * spacingMultiplier);
    
    // Calculate total spacing needed
    const totalSpacing = rowSpacings.reduce((sum, spacing) => sum + spacing, 0);
    
    // If total spacing exceeds available space, scale down proportionally
    const scaleFactor = totalSpacing > availableSpace ? availableSpace / totalSpacing : 1.0;
    
    // Calculate actual radius positions
    const rowRadii = [];
    let currentRadius = rOuter; // Start from outer radius and work inward
    
    for (let i = 0; i < numRows; i++) {
      // For the first row, start at the outer radius
      if (i === 0) {
        rowRadii.push(currentRadius);
      } else {
        // Move inward by the scaled spacing for the previous row
        const previousSpacing = rowSpacings[i - 1] * scaleFactor;
        currentRadius -= previousSpacing;
        rowRadii.push(Math.max(currentRadius, rInner)); // Don't go below inner radius
      }
    }
    
    return rowRadii;
  }

  calculateOpacityClass(width, row, nRows, noiseValue) {
    // Check if transparency is enabled
    if (!this.controlSettings.useTransparency.value) {
      return 'op-100'; // All letters fully opaque when transparency is disabled
    }
    
    // Calculate base factors (all range from 0 to 1)
    const normalizedNoise = (noiseValue + 1) / 2; // 0 to 1
    const rowPosition = (row - 1) / (nRows - 1); // 0 to 1 (0 = first row, 1 = last row)
    
    // Apply curve to row position for more natural falloff
    const rowFactor = Math.pow(rowPosition, 0.6);
    
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
    
    const weights = widthWeights[width] || { noise: 0.8, row: 0.2 };
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

  createArcText() {
    const rOuter = 376 * this.mmToPx;
    const rInner = 100 * this.mmToPx;
    const cx = this.svg.w / 2;
    const cy = this.svg.h - rOuter; // center above SVG, arc at bottom

    const arcStart = 90 + this.staticSettings.leftAngle;   // bottom-right of circle
    const arcEnd = 90 - this.staticSettings.rightAngle;      // bottom-left of circle

    this.drawControlPoints = false; // Turn off control points for cleaner look

    // Draw reference cone outline (if enabled)
    this.makeGuides(cx, cy, rOuter, rInner, arcStart, arcEnd);

    // Generate multiple lines of text along the arcs
    this.createArcTextLines(cx, cy, rOuter, rInner, arcStart, arcEnd);
  }

  createArcTextLines(cx, cy, rOuter, rInner, arcStart, arcEnd) {
    const nRows = this.controlSettings.nRows.value;
    const fSize = this.fSize;
    const txt = this.staticSettings.txt;
    const colFG = this.controlSettings.colFG.value;
    
    // Calculate font sizes for all rows first
    const rowFontSizes = [];
    for (let row = 1; row < nRows; row++) {
      rowFontSizes.push(this.calculateRowFontSize(row));
    }
    
    // Calculate radius positions - either adaptive or fixed spacing
    let rowRadii;
    if (this.controlSettings.adaptiveSpacing.value) {
      // Use adaptive spacing based on font sizes
      rowRadii = this.calculateRowRadii(rowFontSizes, rOuter, rInner, nRows);
    } else {
      // Use fixed spacing (original behavior)
      const radiusStep = (rOuter - rInner) / (nRows - 1);
      rowRadii = [];
      for (let row = 1; row < nRows; row++) {
        rowRadii.push(rInner + (row * radiusStep));
      }
    }
    
    // Generate text for each line - follow the arc using textPath
    for (let row = 1; row < nRows; row++) {
      const radius = rowRadii[row - 1]; // rowRadii is 0-indexed, row starts from 1
      
      // Create the arc path for this radius
      const pathId = `arc-path-${row}`;
      const path = document.createElementNS(this.svg.ns, 'path');
      path.setAttribute('id', pathId);
      path.setAttribute('d', this.arcPath(cx, cy, radius, arcStart, arcEnd));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'none'); // Make path invisible
      this.defs.appendChild(path);
      
      // Calculate arc length for this radius
      const arcLength = radius * Math.abs(rad(arcEnd - arcStart));
      
      // Calculate repetitions based on actual row font size (not base font size)
      const actualFontSize = rowFontSizes[row - 1]; // Use the actual font size for this row
      const avgCharWidth = actualFontSize * 0.4; // Character width based on actual font size
      const charsPerLLAL = txt.length;
      const avgLLALWidth = avgCharWidth * charsPerLLAL;
      
      // Calculate repetitions with much more generous safety margin for smaller fonts
      const baseRepetitions = Math.ceil(arcLength / avgLLALWidth);
      const repetitions = Math.max(baseRepetitions * 3.0, 24); // Minimum 24 repetitions, 200% safety margin
      
      // Create the full line of repeating text
      let fullText = '';
      for (let i = 0; i < repetitions; i++) {
        fullText += txt;
      }
      
      // Apply text pattern shifting based on selected mode
      const shiftMode = this.controlSettings.shiftTextPattern.value;
      if (shiftMode !== 'none') {
        let shiftAmount = 0;
        
        switch (shiftMode) {
          case 'forward':
            // Shift forward by row number (adjusted for skipped first row)
            shiftAmount = (row - 1) % txt.length;
            break;
          case 'backward':
            // Shift backward by row number (adjusted for skipped first row)
            shiftAmount = txt.length - ((row - 1) % txt.length);
            break;
          case 'random':
            // Use seeded random for consistent results (adjusted for skipped first row)
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
      
      // Apply font size variation per row (use pre-calculated size)
      const rowFontSize = rowFontSizes[row - 1]; // rowFontSizes is 0-indexed, row starts from 1
      text.setAttribute('style', `font-size: ${rowFontSize}px`);
      
      // Create textPath element
      const textPath = document.createElementNS(this.svg.ns, 'textPath');
      textPath.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${pathId}`);
      textPath.setAttribute('startOffset', '0%');
      
      // Create individual tspans for each letter with width variations
      for (let i = 0; i < fullText.length; i++) {
        const span = document.createElementNS(this.svg.ns, 'tspan');
        
        // Use noise for width variations (always enabled)
        let width;
        let noiseValue = 0; // Initialize outside the if block
        
        if (this.staticSettings.useNoise && this.noise) {
          // Create multi-octave noise for more varied patterns
          let amplitude = 1.0;
          let frequency = 1.0;
          
          for (let octave = 0; octave < this.controlSettings.noiseOctaves.value; octave++) {
            let noiseX, noiseY;
            
            if (this.controlSettings.angularNoise.value) {
              // Center-based angular sampling using arc geometry
              // Calculate the actual angular position for this character relative to arc center
              const totalArcAngle = Math.abs(arcEnd - arcStart); // total arc span in degrees
              const midAngle = totalArcAngle / 2; // center angle of the arc
              
              // Character's angular position relative to arc center (0 at center, negative/positive at edges)
              const charRelativeAngle = (i / fullText.length) * totalArcAngle - midAngle;
              
              // Create angular grid centered around the arc middle
              const angularResolution = this.controlSettings.angularResolution.value; // degrees per grid cell
              const angularGridIndex = Math.floor(charRelativeAngle / angularResolution);
              
              // Use polar-like coordinates: angular position and consistent row-based Y
              // This creates concentric patterns that follow the arc's natural geometry
              noiseX = angularGridIndex * this.controlSettings.noiseScale.value * frequency;
              noiseY = (row - 1) * this.controlSettings.noiseScale.value * frequency * this.controlSettings.yScaleFactor.value;
            } else {
              // Use character index directly (creates skewed pattern)
              noiseX = i * this.controlSettings.noiseScale.value * frequency;
              noiseY = (row - 1) * this.controlSettings.noiseScale.value * frequency * this.controlSettings.yScaleFactor.value;
            }
            noiseValue += this.noise.noise2D(noiseX, noiseY) * amplitude;
            
            amplitude *= this.controlSettings.noisePersistence.value;
            frequency *= this.controlSettings.noiseLacunarity.value;
          }
          
          // Apply contrast to create sharper transitions
          const contrast = this.controlSettings.noiseContrast.value;
          if (contrast !== 1.0) {
            noiseValue = Math.sign(noiseValue) * Math.pow(Math.abs(noiseValue), contrast);
          }
          
          // Clamp noise value to ensure it's within expected range
          noiseValue = Math.max(-1, Math.min(1, noiseValue));
          
          // Map noise value (-1 to 1) to width range
          let normalizedNoise = (noiseValue + 1) / 2; // 0 to 1
          
          // If inverse mapping is enabled, invert the normalized noise
          if (this.controlSettings.inverseWidthMapping.value) {
            normalizedNoise = 1 - normalizedNoise;
          }

          // noiseValue = normalizedNoise;
          // console.log('in: ', noiseValue);
          
          // Use predefined width steps for CSS classes with bounds checking
          const widthIndex = Math.floor(normalizedNoise * this.staticSettings.wdths.length);
          const clampedIndex = Math.max(0, Math.min(this.staticSettings.wdths.length - 1, widthIndex));
          width = this.staticSettings.wdths[clampedIndex];
        } else {
          // Random predefined width
          width = this.staticSettings.wdths[rndInt(0, this.staticSettings.wdths.length - 1)];
        }
        
        // Calculate opacity based on width, row position, and raw noise value
        // console.log('out: ', noiseValue);

        const opacityClass = this.calculateOpacityClass(width, row, nRows, noiseValue);
        
        // Set the width variation and opacity using CSS classes
        span.setAttribute('class', `st0 width-${width} ${opacityClass}`);
        
        span.textContent = fullText[i];
        textPath.appendChild(span);
      }
      
      text.appendChild(textPath);
      this.svg.stage.appendChild(text);
    }
  }

  createRangeControl(key, config) {
    const control = document.createElement('li');
    control.innerHTML = `
      <label for="${key}-slider">${config.label}: </label>
      <div class="control-row">
        <div class="control-input-group">
          <input type="range" id="${key}-slider" min="${config.min}" max="${config.max}" step="${config.step}" value="${config.value}" class="control-slider">
          <input type="number" id="${key}-input" min="${config.min}" max="${config.max}" step="${config.step}" value="${config.value}" class="control-number">
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="${key}-lock" ${config.locked ? 'checked' : ''} class="control-checkbox">
        </label>
      </div>
    `;

    const slider = control.querySelector(`#${key}-slider`);
    const input = control.querySelector(`#${key}-input`);
    const lock = control.querySelector(`#${key}-lock`);
    
    // Link slider and input
    slider.addEventListener('input', (e) => {
      input.value = e.target.value;
      config.value = parseFloat(e.target.value);
      this.updateSketch();
      if (!this.isInitializing) this.saveSettings();
    });
    
    input.addEventListener('input', (e) => {
      slider.value = e.target.value;
      config.value = parseFloat(e.target.value);
      this.updateSketch();
      if (!this.isInitializing) this.saveSettings();
    });

    lock.addEventListener('change', (e) => {
      config.locked = e.target.checked;
      this.updateLockAllCheckbox();
      if (!this.isInitializing) this.saveSettings();
    });

    return control;
  }

  createSelectControl(key, config) {
    const control = document.createElement('li');
    control.innerHTML = `
      <div class="control-row">
        <div class="control-input-group">
          <label for="${key}-select">${config.label}:</label>
          <select id="${key}-select" class="control-select">
            ${config.options.map(option => 
              `<option value="${option}" ${option === config.value ? 'selected' : ''}>${option.charAt(0).toUpperCase() + option.slice(1)}</option>`
            ).join('')}
          </select>
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="${key}-lock" ${config.locked ? 'checked' : ''} class="control-checkbox">
        </label>
      </div>
    `;

    const select = control.querySelector(`#${key}-select`);
    const lock = control.querySelector(`#${key}-lock`);
    
    select.addEventListener('change', (e) => {
      config.value = e.target.value;
      this.updateSketch();
      if (!this.isInitializing) this.saveSettings();
    });

    lock.addEventListener('change', (e) => {
      config.locked = e.target.checked;
      this.updateLockAllCheckbox();
      if (!this.isInitializing) this.saveSettings();
    });

    return control;
  }

  createToggleControl(key, config) {
    const control = document.createElement('li');
    control.innerHTML = `
      <div class="control-row">
        <div class="control-input-group">
          <label for="${key}-checkbox">${config.label}: </label>
          <input type="checkbox" id="${key}-checkbox" ${config.value ? 'checked' : ''}>
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="${key}-lock" ${config.locked ? 'checked' : ''} class="control-checkbox">
        </label>
      </div>
    `;

    const checkbox = control.querySelector(`#${key}-checkbox`);
    const lock = control.querySelector(`#${key}-lock`);
    
    checkbox.addEventListener('change', (e) => {
      config.value = e.target.checked;
      
      // Special handling for showAdvancedControls toggle
      if (key === 'showAdvancedControls') {
        this.toggleAdvancedControls(e.target.checked);
      } else {
        this.updateSketch();
      }
      
      if (!this.isInitializing) this.saveSettings();
    });

    lock.addEventListener('change', (e) => {
      config.locked = e.target.checked;
      this.updateLockAllCheckbox();
      if (!this.isInitializing) this.saveSettings();
    });

    return control;
  }

  createColorControl(key, config) {
    const control = document.createElement('li');
    control.innerHTML = `
      <label for="${key}-input">${config.label}: </label>
      <div class="control-row">
        <div class="control-input-group">
          <input type="color" id="${key}-input" value="${config.value}" class="control-color-input">
          <input type="text" id="${key}-text" value="${config.value}" class="control-color-text">
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="${key}-lock" ${config.locked ? 'checked' : ''} class="control-checkbox">
        </label>
      </div>
    `;

    const colorInput = control.querySelector(`#${key}-input`);
    const colorText = control.querySelector(`#${key}-text`);
    const lock = control.querySelector(`#${key}-lock`);
    
    colorInput.addEventListener('input', (e) => {
      colorText.value = e.target.value;
      config.value = e.target.value;
      this.updateSketch();
      if (!this.isInitializing) this.saveSettings();
    });
    
    colorText.addEventListener('input', (e) => {
      colorInput.value = e.target.value;
      config.value = e.target.value;
      this.updateSketch();
      if (!this.isInitializing) this.saveSettings();
    });

    lock.addEventListener('change', (e) => {
      config.locked = e.target.checked;
      this.updateLockAllCheckbox();
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

    // Generate controls dynamically from controlSettings
    Object.keys(this.controlSettings).forEach(key => {
      const config = this.controlSettings[key];
      
      // Skip hidden controls
      if (config.hidden) {
        return;
      }
      
      let control;
      
      switch (config.type) {
        case 'range':
          control = this.createRangeControl(key, config);
          break;
        case 'select':
          control = this.createSelectControl(key, config);
          break;
        case 'toggle':
          control = this.createToggleControl(key, config);
          break;
        case 'color':
          control = this.createColorControl(key, config);
          break;
        default:
          console.warn(`Unknown control type: ${config.type} for ${key}`);
          return;
      }
      
      if (control) {
        values.append(control);
      }
    });

    // Lock/Unlock All control
    const lockAllControl = document.createElement('li');
    lockAllControl.innerHTML = `
      <div class="control-row lock-all-control">
        <div class="control-input-group">
          <label>Lock all controls</label>
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="lockAll-checkbox" class="control-checkbox">
        </label>
      </div>
    `;
    values.append(lockAllControl);

    const lockAllCheckbox = lockAllControl.querySelector('#lockAll-checkbox');
    
    lockAllCheckbox.addEventListener('change', (e) => {
      const shouldLockAll = e.target.checked;
      this.setAllLockStates(shouldLockAll);
      this.updateAllLockCheckboxes();
      if (!this.isInitializing) this.saveSettings();
    });

    // Store reference for later updates
    this.lockAllCheckbox = lockAllCheckbox;

    // Settings randomizer control
    const settingsRandomizerControl = document.createElement('li');
    settingsRandomizerControl.innerHTML = `
      <button id="randomize-settings-btn" class="btn">Randomize Settings</button>
    `;
    values.append(settingsRandomizerControl);

    const randomizeBtn = settingsRandomizerControl.querySelector('#randomize-settings-btn');
    randomizeBtn.addEventListener('click', () => {
      this.randomizeSettings();
      this.updateControlsFromSettings(); // Update UI without touching lock states
      this.updateSketch();
      
      // Show feedback
      randomizeBtn.textContent = 'Randomized!';
      setTimeout(() => {
        randomizeBtn.textContent = 'Randomize Settings';
      }, 1000);
    });

    // Load from SVG and Reset controls
    const loadFromSvgControl = document.createElement('li');
    loadFromSvgControl.innerHTML = `
      <div class="control-button-group">
        <button id="load-from-svg-btn" class="btn secondary">Load from SVG</button>
        <button id="reset-to-defaults-btn" class="btn secondary">Reset Defaults</button>
      </div>
    `;
    values.append(loadFromSvgControl);

    const loadFromSvgBtn = loadFromSvgControl.querySelector('#load-from-svg-btn');
    const resetToDefaultsBtn = loadFromSvgControl.querySelector('#reset-to-defaults-btn');
    
    loadFromSvgBtn.addEventListener('click', () => {
      this.loadSettingsFromFile();
    });

    resetToDefaultsBtn.addEventListener('click', () => {
      this.resetToDefaults();
    });

    const btnLi = document.createElement('li');
    btnLi.append(reloadBtn);
    values.append(btnLi);

    this.controlsContainer.append(values);

    reloadBtn.addEventListener('click', () => this.newSketch());
    
    // Initialize the lock-all checkbox state
    this.updateLockAllCheckbox();
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

  updateSketch() {
    // Update font size based on new number of rows
    this.updateFontSize();
    
    // Update both CSS background (for browser) and rectangle (for exports)
    this.svg.stage.style['background-color'] = this.controlSettings.colBG.value;
    this.createBackgroundRect();
    
    // Clear existing text elements
    const existingTexts = this.svg.stage.querySelectorAll('text');
    existingTexts.forEach(text => text.remove());
    
    // Clear existing reference lines and arcs (but preserve background)
    const existingPaths = this.svg.stage.querySelectorAll('path:not(#background-rect)');
    existingPaths.forEach(path => path.remove());
    const existingLines = this.svg.stage.querySelectorAll('line:not(#background-rect)');
    existingLines.forEach(line => line.remove());
    const existingCircles = this.svg.stage.querySelectorAll('circle:not(#background-rect)');
    existingCircles.forEach(circle => circle.remove());
    
    // Clear existing arc paths and styles from defs
    const existingDefPaths = this.defs.querySelectorAll('[id^="arc-path-"]');
    existingDefPaths.forEach(path => path.remove());
    const existingStyles = this.defs.querySelectorAll('style');
    existingStyles.forEach(style => style.remove());
    
    // Recreate styles with updated font size and colors
    this.createWidthStyles();
    
    // Regenerate arc text with new settings (this will also redraw the cone outline)
    this.createArcText();
  }

  cleanup() {
    // Cleanup any resources if needed
    if (this.svg && this.svg.stage) {
      // Remove any event listeners or timers if they exist
    }
  }

  saveSettings() {
    try {
      // Only save the actual values, locked states, and hidden states, not configuration metadata
      const valuesToSave = {};
      Object.keys(this.controlSettings).forEach(key => {
        valuesToSave[key] = {
          value: this.controlSettings[key].value,
          locked: this.controlSettings[key].locked,
          hidden: this.controlSettings[key].hidden
        };
        // For shiftTextPattern, also preserve the current options array
        if (key === 'shiftTextPattern' && this.controlSettings[key].options) {
          valuesToSave[key].options = this.controlSettings[key].options;
        }
      });
      
      const settingsData = {
        controlSettings: valuesToSave
      };
      localStorage.setItem('arcSketchSettings', JSON.stringify(settingsData));
              console.log('Settings saved successfully (values, locks, and hidden states)');
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('arcSketchSettings');
      if (saved) {
        const settingsData = JSON.parse(saved);
        // Only restore values and locked states, preserve configuration metadata
        if (settingsData.controlSettings) {
          Object.keys(settingsData.controlSettings).forEach(key => {
            if (this.controlSettings[key] && settingsData.controlSettings[key]) {
              const savedControl = settingsData.controlSettings[key];
              
              // Only restore value, locked, and hidden, preserve min/max/step/default from code
              if (savedControl.hasOwnProperty('value')) {
                this.controlSettings[key].value = savedControl.value;
              }
              if (savedControl.hasOwnProperty('locked')) {
                this.controlSettings[key].locked = savedControl.locked;
              }
              if (savedControl.hasOwnProperty('hidden')) {
                this.controlSettings[key].hidden = savedControl.hidden;
              }
              
              // Special handling for shiftTextPattern options
              if (key === 'shiftTextPattern' && savedControl.options) {
                this.controlSettings[key].options = savedControl.options;
              }
            }
          });
        }
        console.log('Settings loaded successfully (values, locks, and hidden states, preserved ranges)');
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }

  injectSettingsIntoSVG() {
    // Store settings as a data attribute on the SVG element
    // This is more reliable than embedding in the SVG structure
    const svgElement = document.querySelector('svg');
    if (svgElement) {
      // Only save values, locked states, and hidden states, not configuration metadata
      const valuesToSave = {};
      Object.keys(this.controlSettings).forEach(key => {
        valuesToSave[key] = {
          value: this.controlSettings[key].value,
          locked: this.controlSettings[key].locked,
          hidden: this.controlSettings[key].hidden
        };
        // For shiftTextPattern, also preserve the current options array
        if (key === 'shiftTextPattern' && this.controlSettings[key].options) {
          valuesToSave[key].options = this.controlSettings[key].options;
        }
      });
      
      const settingsData = {
        controlSettings: valuesToSave,
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
              
              // Handle both old format and new format
              if (settingsData.controlSettings) {
                // New format - only restore values and locked states, preserve configuration metadata
                Object.keys(settingsData.controlSettings).forEach(key => {
                  if (this.controlSettings[key] && settingsData.controlSettings[key]) {
                    const savedControl = settingsData.controlSettings[key];
                    
                    // Only restore value, locked, and hidden, preserve min/max/step/default from code
                    if (savedControl.hasOwnProperty('value')) {
                      this.controlSettings[key].value = savedControl.value;
                    }
                    if (savedControl.hasOwnProperty('locked')) {
                      this.controlSettings[key].locked = savedControl.locked;
                    }
                    if (savedControl.hasOwnProperty('hidden')) {
                      this.controlSettings[key].hidden = savedControl.hidden;
                    }
                    
                    // Special handling for shiftTextPattern options
                    if (key === 'shiftTextPattern' && savedControl.options) {
                      this.controlSettings[key].options = savedControl.options;
                    }
                  }
                });
              } else {
                // Old format - try to migrate
                console.log('Migrating old settings format from SVG...');
                Object.keys(settingsData).forEach(key => {
                  if (this.controlSettings[key]) {
                    // Special handling for shiftTextPattern migration from boolean to string
                    if (key === 'shiftTextPattern') {
                      this.controlSettings[key].value = settingsData[key] ? 'forward' : 'none';
                    } else {
                      this.controlSettings[key].value = settingsData[key];
                    }
                  }
                });
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
    // Reset all control settings to their original values and lock states
    Object.keys(this.controlSettings).forEach(key => {
      if (this.originalControlSettings[key]) {
        // Restore value, locked state, and hidden state from the original configuration
        this.controlSettings[key].value = this.originalControlSettings[key].value;
        this.controlSettings[key].locked = this.originalControlSettings[key].locked;
        this.controlSettings[key].hidden = this.originalControlSettings[key].hidden;
      }
    });

    // Clear localStorage
    localStorage.removeItem('arcSketchSettings');

    // Reinitialize noise (always enabled)
    this.noise = new SimplexNoise(this.originalNoiseSeed);

    // Ensure we're not in initialization mode
    this.isInitializing = false;

    // Update UI controls to reflect reset values
    this.refreshControlsPanel();

    // Update sketch with reset values
    this.updateSketch();

    // Show feedback
    const resetBtn = document.getElementById('reset-to-defaults-btn');
    if (resetBtn) {
      const originalText = resetBtn.textContent;
      resetBtn.textContent = 'Reset!';
      setTimeout(() => {
        resetBtn.textContent = originalText;
      }, 1000);
    }

    console.log('All settings reset to defaults');
  }

  getCurrentLockStates() {
    // Sync the internal state with the DOM and return current lock states
    // Update internal state from DOM
    this.controlSettings.nRows.locked = document.getElementById('nRows-lock')?.checked || false;
    this.controlSettings.lineSpacing.locked = document.getElementById('lineSpacing-lock')?.checked || false;
    this.controlSettings.shiftTextPattern.locked = document.getElementById('shiftTextPattern-lock')?.checked || false;
    this.controlSettings.angularNoise.locked = document.getElementById('angularNoise-lock')?.checked || false;
    this.controlSettings.angularResolution.locked = document.getElementById('angularResolution-lock')?.checked || false;
    this.controlSettings.yScaleFactor.locked = document.getElementById('yScaleFactor-lock')?.checked || false;
    this.controlSettings.inverseWidthMapping.locked = document.getElementById('inverseWidthMapping-lock')?.checked || false;
    this.controlSettings.fontSizeVariation.locked = document.getElementById('fontSizeVariation-lock')?.checked || false;
    this.controlSettings.fontSizeVariationAmount.locked = document.getElementById('fontSizeVariationAmount-lock')?.checked || false;
    this.controlSettings.fontSizeNoiseScale.locked = document.getElementById('fontSizeNoiseScale-lock')?.checked || false;
    this.controlSettings.adaptiveSpacing.locked = document.getElementById('adaptiveSpacing-lock')?.checked || false;
    this.controlSettings.noiseScale.locked = document.getElementById('noiseScale-lock')?.checked || false;
    this.controlSettings.noiseOctaves.locked = document.getElementById('noiseOctaves-lock')?.checked || false;
    this.controlSettings.noisePersistence.locked = document.getElementById('noisePersistence-lock')?.checked || false;
    this.controlSettings.noiseContrast.locked = document.getElementById('noiseContrast-lock')?.checked || false;
    this.controlSettings.noiseLacunarity.locked = document.getElementById('noiseLacunarity-lock')?.checked || false;
    this.controlSettings.colBG.locked = document.getElementById('colBG-lock')?.checked || false;
    this.controlSettings.colFG.locked = document.getElementById('colFG-lock')?.checked || false;
    
    // Return the lock states
    return {
      nRows: this.controlSettings.nRows.locked,
      lineSpacing: this.controlSettings.lineSpacing.locked,
      shiftTextPattern: this.controlSettings.shiftTextPattern.locked,
      angularNoise: this.controlSettings.angularNoise.locked,
      angularResolution: this.controlSettings.angularResolution.locked,
      yScaleFactor: this.controlSettings.yScaleFactor.locked,
      inverseWidthMapping: this.controlSettings.inverseWidthMapping.locked,
      fontSizeVariation: this.controlSettings.fontSizeVariation.locked,
      fontSizeVariationAmount: this.controlSettings.fontSizeVariationAmount.locked,
      fontSizeNoiseScale: this.controlSettings.fontSizeNoiseScale.locked,
      adaptiveSpacing: this.controlSettings.adaptiveSpacing.locked,
      noiseScale: this.controlSettings.noiseScale.locked,
      noiseOctaves: this.controlSettings.noiseOctaves.locked,
      noisePersistence: this.controlSettings.noisePersistence.locked,
      noiseContrast: this.controlSettings.noiseContrast.locked,
      noiseLacunarity: this.controlSettings.noiseLacunarity.locked,
      colBG: this.controlSettings.colBG.locked,
      colFG: this.controlSettings.colFG.locked
    };
  }

  restoreControlsFromSettings(locks = null) {
    // This method is called by the sketch manager when reloading with preserved settings
    // It updates all control inputs to reflect the current settings
    if (!this.controlSettings) return;
    
    // Data-driven approach - update all controls based on their type
    Object.keys(this.controlSettings).forEach(key => {
      const config = this.controlSettings[key];
      
      switch (config.type) {
        case 'range':
          const slider = document.getElementById(`${key}-slider`);
          const input = document.getElementById(`${key}-input`);
          if (slider && input) {
            slider.value = config.value;
            input.value = config.value;
          }
          break;
          
        case 'select':
          const select = document.getElementById(`${key}-select`);
          if (select) {
            select.value = config.value;
          }
          break;
          
        case 'toggle':
          const checkbox = document.getElementById(`${key}-checkbox`);
          if (checkbox) {
            checkbox.checked = config.value;
          }
          break;
          
        case 'color':
          const colorInput = document.getElementById(`${key}-input`);
          const colorText = document.getElementById(`${key}-text`);
          if (colorInput && colorText) {
            colorInput.value = config.value;
            colorText.value = config.value;
          }
          break;
      }
    });
    
    // Restore lock states - either from parameter or from internal state
    let lockStates = locks;
    
    if (!lockStates) {
      // Use internal lock states if not provided as parameter
      lockStates = {};
      Object.keys(this.controlSettings).forEach(key => {
        lockStates[key] = this.controlSettings[key].locked;
      });
    }
    
          // Apply lock states if available - data-driven approach
      if (lockStates) {
        Object.keys(this.controlSettings).forEach(key => {
          const lockCheckbox = document.getElementById(`${key}-lock`);
          if (lockCheckbox) {
            lockCheckbox.checked = lockStates[key] || false;
          }
          
          // Update internal state to match
          this.controlSettings[key].locked = lockStates[key] || false;
        });
      }
    
    // Update the lock-all checkbox to reflect the current state
    this.updateLockAllCheckbox();
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
    // Define which controls are considered "advanced"
    const advancedControls = [
      'angularResolution',
      'yScaleFactor',
      'fontSizeVariationAmount',
      'fontSizeNoiseScale',
      'noiseContrast',
      'noiseLacunarity',
      'inverseWidthMapping'
    ];
    
    // Toggle the hidden state of advanced controls
    advancedControls.forEach(key => {
      if (this.controlSettings[key]) {
        this.controlSettings[key].hidden = !show;
      }
    });
    
    // Refresh the controls panel to show/hide the controls
    this.refreshControlsPanel();
  }

  setAllLockStates(shouldLock) {
    // Set all lock states to the specified value
    Object.keys(this.controlSettings).forEach(key => {
      this.controlSettings[key].locked = shouldLock;
    });
  }

  updateAllLockCheckboxes() {
    // Update all lock checkboxes in the UI to match the current lock states
    // Data-driven approach - no hardcoded lists needed!
    Object.keys(this.controlSettings).forEach(key => {
      const lockCheckbox = document.getElementById(`${key}-lock`);
      if (lockCheckbox) {
        lockCheckbox.checked = this.controlSettings[key].locked;
      }
    });
  }

  updateLockAllCheckbox() {
    // Update the lock-all checkbox based on the current state of all individual locks
    if (!this.lockAllCheckbox) return;

    const allLocked = Object.keys(this.controlSettings).every(key => 
      this.controlSettings[key].locked
    );

    const someLocked = Object.keys(this.controlSettings).some(key => 
      this.controlSettings[key].locked
    );

    // Set the checkbox state
    this.lockAllCheckbox.checked = allLocked;
    
    // Set indeterminate state if some but not all are locked
    this.lockAllCheckbox.indeterminate = someLocked && !allLocked;
  }

  randomizeSettings() {
    // Generate random values only for unlocked parameters
    Object.keys(this.controlSettings).forEach(key => {
      const config = this.controlSettings[key];
      if (config.locked) return; // Skip locked controls
      
      switch (config.type) {
        case 'range':
          // Generate random value within range
          const multiplier = config.step < 1 ? (1 / config.step) : 1;
          const randomValue = rndInt(config.min * multiplier, config.max * multiplier) / multiplier;
          config.value = randomValue;
          break;
          
        case 'select':
          // Pick random option
          if (config.options && config.options.length > 0) {
            config.value = config.options[rndInt(0, config.options.length - 1)];
          }
          break;
          
        case 'toggle':
          // Random boolean
          config.value = Math.random() > 0.5; // 50% chance for toggles
          break;
          
        case 'color':
          // Generate random colors with some constraints
          if (key === 'colBG') {
            // Generate random dark color for background
            const r = rndInt(0, 80);
            const g = rndInt(0, 80);
            const b = rndInt(0, 80);
            config.value = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          } else if (key === 'colFG') {
            // Generate random light color for foreground
            const r = rndInt(180, 255);
            const g = rndInt(180, 255);
            const b = rndInt(180, 255);
            config.value = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          }
          break;
      }
    });
  }

  updateControlsFromSettings() {
    // Update UI controls to match current settings values (without touching lock states)
    Object.keys(this.controlSettings).forEach(key => {
      const config = this.controlSettings[key];
      
      switch (config.type) {
        case 'range':
          const slider = document.getElementById(`${key}-slider`);
          const input = document.getElementById(`${key}-input`);
          if (slider && input) {
            slider.value = config.value;
            input.value = config.value;
          }
          break;
          
        case 'select':
          const select = document.getElementById(`${key}-select`);
          if (select) {
            select.value = config.value;
          }
          break;
          
        case 'toggle':
          const checkbox = document.getElementById(`${key}-checkbox`);
          if (checkbox) {
            checkbox.checked = config.value;
          }
          break;
          
        case 'color':
          const colorInput = document.getElementById(`${key}-input`);
          const colorText = document.getElementById(`${key}-text`);
          if (colorInput && colorText) {
            colorInput.value = config.value;
            colorText.value = config.value;
          }
          break;
      }
    });
  }
} 