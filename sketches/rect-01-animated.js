// Animated Rect Text sketch - based on rect-01.js
// Rectangle text layout with horizontal paths, animated noise movement

class RectAnimatedSketch {
  constructor(controlsContainer) {
    this.controlsContainer = controlsContainer;
    this.svg = null;
    this.defs = null;
    this.fSet = {};
    this.animationId = null;
    this.animationStartTime = null;
    this.lastFrameTime = 0;
    this.isAnimating = false;
    this.animationTime = 0;
    
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
    
    // Enable auto-saving now that initialization is complete
    this.isInitializing = false;
    
    this.updateHashDisplay();
    
    // Start animation
    this.startAnimation();
  }

  setupSVG() {
    // === DPI-BASED SCALING ===
    // Set your target DPI here (72 for screen, 300 for print, etc.)
    const DPI = 72;
    const mmToPx = DPI / 25.4; // 1 mm in px at chosen DPI

    // MEASUREMENTS FOR PRINT
    const docWidth = 420; // mm
    const docHeight = 297; // mm

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
      marginTop: 20,
      marginBottom: 20,
      marginLeft: 30,
      marginRight: 30,
      widthRange: { min: 50, max: 200 }, // Variable font width range
      nCols: 20,
      txt: 'LLAL',
      guides: {
        show: true,
        color: '#0f0',
        width: 1,
        opacity: .3
      }
    };

    // Animation settings
    this.animationSettings = {
      targetFPS: 25, // Reduced FPS for performance
      speed: 0.5, // Animation speed multiplier
      timeOffset: 0, // Current time offset for noise sampling
      frameCount: 0 // Frame counter for performance optimizations
    };

    // Comprehensive control settings - each control has all its configuration in one place
    this.controlSettings = {
      // Layout controls
      nRows: {
        type: 'range',
        label: 'Number of lines',
        min: 90,
        max: 240,
        step: 1,
        default: 150,
        value: 150,
        locked: false
      },
      lineSpacing: {
        type: 'range',
        label: 'Line spacing (font size)',
        min: 0.5,
        max: 3.0,
        step: 0.1,
        default: 1.5,
        value: 1.5,
        locked: true
      },
      
      // Animation controls
      animationSpeed: {
        type: 'range',
        label: 'Animation speed',
        min: 0.1,
        max: 2.0,
        step: 0.1,
        default: 0.5,
        value: 0.5,
        locked: false
      },
      animationEnabled: {
        type: 'toggle',
        label: 'Enable animation',
        default: true,
        value: true,
        locked: false
      },
      performanceMode: {
        type: 'toggle',
        label: 'Performance mode',
        default: false,
        value: false,
        locked: false
      },
      
      // Text controls
      shiftTextPattern: {
        type: 'select',
        label: 'Shift text',
        options: ['none', 'forward', 'backward', 'random'],
        default: 'forward',
        value: 'forward',
        locked: true
      },
      
      // Noise controls
      positionalNoise: {
        type: 'toggle',
        label: 'Positional noise',
        default: false,
        value: true,
        locked: true
      },
      positionalResolution: {
        type: 'range',
        label: 'Positional grid resolution',
        min: 0.05,
        max: 2,
        step: 0.05,
        default: 0.6,
        value: 0.6,
        locked: true
      },
      yScaleFactor: {
        type: 'range',
        label: 'Y-axis pattern scale',
        min: 0.05,
        max: 5.0,
        step: 0.05,
        default: 0.45,
        value: 0.45,
        locked: true
      },
      noiseScale: {
        type: 'range',
        label: 'Noise scale',
        min: 0.001,
        max: 0.1,
        step: 0.001,
        default: 0.09,
        value: 0.09,
        locked: false
      },
      noiseOctaves: {
        type: 'range',
        label: 'Noise octaves',
        min: 1,
        max: 6,
        step: 1,
        default: 3,
        value: 3,
        locked: false
      },
      noisePersistence: {
        type: 'range',
        label: 'Noise persistence',
        min: 0.1,
        max: 1.0,
        step: 0.1,
        default: 0.6,
        value: 0.6,
        locked: false
      },
      noiseContrast: {
        type: 'range',
        label: 'Noise contrast',
        min: 0.1,
        max: 3.0,
        step: 0.1,
        default: 0.9,
        value: 0.9,
        locked: true
      },
      noiseLacunarity: {
        type: 'range',
        label: 'Noise lacunarity',
        min: 0.05,
        max: 1.5,
        step: 0.05,
        default: 0.75,
        value: 0.75,
        locked: false
      },
      inverseWidthMapping: {
        type: 'toggle',
        label: 'Inverse width mapping',
        default: false,
        value: false,
        locked: true
      },

      // Font size variation controls
      fontSizeVariation: {
        type: 'toggle',
        label: 'Font size variation',
        default: false,
        value: false,
        locked: true
      },
      fontSizeVariationAmount: {
        type: 'range',
        label: 'Font size variation amount',
        min: 0.1,
        max: 2.0,
        step: 0.1,
        default: 0.3,
        value: 0.3,
        locked: true
      },
      fontSizeNoiseScale: {
        type: 'range',
        label: 'Font size noise scale',
        min: 0.005,
        max: 0.1,
        step: 0.005,
        default: 0.05,
        value: 0.05,
        locked: true
      },
      adaptiveSpacing: {
        type: 'toggle',
        label: 'Adaptive row spacing',
        default: true,
        value: true,
        locked: true
      },

      // Color controls
      colBG: {
        type: 'color',
        label: 'Background color',
        default: '#000000',
        value: '#000000',
        locked: true
      },
      colFG: {
        type: 'color',
        label: 'Text color',
        default: '#ff794e',
        value: '#ff794e',
        locked: true
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
    // Create style element for variable font
    const style = document.createElementNS(this.svg.ns, 'style');
    style.setAttribute('type', 'text/css');
    
    // Define CSS for variable font usage
    const cssRules = `
      .st0 { 
        fill: ${this.controlSettings.colFG.value}; 
        font-family: 'LLAL-linear', 'LLALLogoLinearGX', sans-serif;
      }
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
    const availableHeight = this.svg.h - this.staticSettings.marginTop - this.staticSettings.marginBottom;
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

  // Animation methods
  startAnimation() {
    if (!this.isAnimating && this.controlSettings.animationEnabled.value) {
      this.isAnimating = true;
      this.animationStartTime = performance.now();
      this.animationSettings.frameCount = 0; // Reset frame counter
      this.animationLoop();
    }
  }

  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isAnimating = false;
  }

  animationLoop() {
    if (!this.isAnimating) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    
    // Adjust target FPS based on performance mode
    const targetFPS = this.controlSettings.performanceMode.value ? 15 : this.animationSettings.targetFPS;
    const targetFrameTime = 1000 / targetFPS;

    // Only update if enough time has passed (FPS throttling)
    if (deltaTime >= targetFrameTime) {
      // Increment frame counter
      this.animationSettings.frameCount++;
      
      // Update animation time
      this.animationTime = (currentTime - this.animationStartTime) * 0.001 * this.controlSettings.animationSpeed.value;
      
      // Performance mode: Skip every other frame for calculations
      const shouldUpdateCalculations = !this.controlSettings.performanceMode.value || (this.animationSettings.frameCount % 2 === 0);
      
      if (shouldUpdateCalculations) {
        // Update the text with new animation time
        this.updateRectText();
      }
      
      this.lastFrameTime = currentTime;
    }

    this.animationId = requestAnimationFrame(() => this.animationLoop());
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

  calculateRowFontSize(row) {
    const baseFontSize = parseFloat(this.fSize);
    
    if (!this.controlSettings.fontSizeVariation.value || !this.noise) {
      return baseFontSize;
    }
    
    // Calculate noise for this row with animation time
    let noiseValue = 0;
    let amplitude = 1.0;
    let frequency = 1.0;
    
    // Use fewer octaves in performance mode
    const maxOctaves = this.controlSettings.performanceMode.value ? 2 : this.controlSettings.noiseOctaves.value;
    
    for (let octave = 0; octave < maxOctaves; octave++) {
      // Create more interesting movement through noise space for font size
      const baseX = 0; // Keep X centered for font size
      const baseY = row * this.controlSettings.fontSizeNoiseScale.value;
      
      // Simplified movement in performance mode
      if (this.controlSettings.performanceMode.value) {
        const timeSpeed = this.animationTime * 0.1; // Slower for font size
        const offsetX = Math.sin(timeSpeed) * 0.3;
        const offsetY = Math.cos(timeSpeed * 0.7) * 0.1;
        
        const noiseX = (baseX + offsetX) * frequency;
        const noiseY = (baseY + offsetY) * frequency;
        
        noiseValue += this.noise.noise2D(noiseX, noiseY) * amplitude;
      } else {
        // Multi-dimensional movement through noise space
        const timeSpeed = this.animationTime * 0.15; // Slower for font size
        const offsetX = Math.cos(timeSpeed * 0.4) * 0.5 + Math.sin(timeSpeed * 0.8) * 0.3;
        const offsetY = Math.sin(timeSpeed * 0.3) * 0.2 + Math.cos(timeSpeed * 0.6) * 0.1;
        
        const noiseX = (baseX + offsetX) * frequency;
        const noiseY = (baseY + offsetY) * frequency;
        
        noiseValue += this.noise.noise2D(noiseX, noiseY) * amplitude;
      }
      
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

  calculateRowYPositions(rowFontSizes, nRows) {
    const marginTop = this.staticSettings.marginTop;
    const marginBottom = this.staticSettings.marginBottom;
    const availableHeight = this.svg.h - marginTop - marginBottom;
    
    if (nRows === 0) return [];
    
    // Calculate spacing needed for each row based on font size and line spacing
    const spacingMultiplier = this.controlSettings.lineSpacing.value;
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

  createRectText() {
    const textAreaLeft = this.staticSettings.marginLeft;
    const textAreaRight = this.svg.w - this.staticSettings.marginRight;
    const textAreaWidth = textAreaRight - textAreaLeft;

    this.drawControlPoints = false; // Turn off control points for cleaner look

    // Draw reference rectangle outline (if enabled)
    this.makeGuides();

    // Generate multiple lines of text along horizontal paths
    this.createRectTextLines(textAreaLeft, textAreaRight, textAreaWidth);
  }

  updateRectText() {
    if (!this.controlSettings.animationEnabled.value) return;
    
    // Clear existing text elements
    const existingTexts = this.svg.stage.querySelectorAll('text');
    existingTexts.forEach(text => text.remove());
    
    // Clear existing paths from defs
    const existingDefPaths = this.defs.querySelectorAll('[id^="rect-path-"]');
    existingDefPaths.forEach(path => path.remove());
    
    const textAreaLeft = this.staticSettings.marginLeft;
    const textAreaRight = this.svg.w - this.staticSettings.marginRight;
    const textAreaWidth = textAreaRight - textAreaLeft;

    // Generate multiple lines of text along horizontal paths
    this.createRectTextLines(textAreaLeft, textAreaRight, textAreaWidth);
  }

  createRectTextLines(textAreaLeft, textAreaRight, textAreaWidth) {
    const nRows = this.controlSettings.nRows.value;
    const fSize = this.fSize;
    const txt = this.staticSettings.txt;
    const colFG = this.controlSettings.colFG.value;
    
    // Calculate font sizes for all rows first
    const rowFontSizes = [];
    for (let row = 0; row < nRows; row++) {
      rowFontSizes.push(this.calculateRowFontSize(row));
    }
    
    // Calculate Y positions - either adaptive or fixed spacing
    let rowYPositions;
    if (this.controlSettings.adaptiveSpacing.value) {
      // Use adaptive spacing based on font sizes
      rowYPositions = this.calculateRowYPositions(rowFontSizes, nRows);
    } else {
      // Use fixed spacing (original behavior)
      const marginTop = this.staticSettings.marginTop;
      const marginBottom = this.staticSettings.marginBottom;
      const availableHeight = this.svg.h - marginTop - marginBottom;
      const yStep = availableHeight / (nRows - 1);
      
      rowYPositions = [];
      for (let row = 0; row < nRows; row++) {
        rowYPositions.push(marginTop + (row * yStep));
      }
    }
    
    // Generate text for each line - follow horizontal paths using textPath
    for (let row = 0; row < nRows; row++) {
      const yPos = rowYPositions[row];
      
      // Create the horizontal path for this row
      const pathId = `rect-path-${row}`;
      this.makeHorizontalPath(textAreaLeft, yPos, textAreaRight, pathId);
      
      // Calculate repetitions based on actual row font size
      const actualFontSize = rowFontSizes[row];
      const avgCharWidth = actualFontSize * 0.4; // Character width based on actual font size
      const charsPerLLAL = txt.length;
      const avgLLALWidth = avgCharWidth * charsPerLLAL;
      
      // Calculate repetitions with safety margin (reduced in performance mode)
      const baseRepetitions = Math.ceil(textAreaWidth / avgLLALWidth);
      const safetyMargin = this.controlSettings.performanceMode.value ? 1.3 : 2.0; // Reduced margin in performance mode
      const minRepetitions = this.controlSettings.performanceMode.value ? 8 : 12; // Fewer minimum repetitions
      const repetitions = Math.max(baseRepetitions * safetyMargin, minRepetitions);
      
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
      
      // Create textPath element
      const textPath = document.createElementNS(this.svg.ns, 'textPath');
      textPath.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${pathId}`);
      textPath.setAttribute('startOffset', '0%');
      
      // Create individual tspans for each letter with width variations
      for (let i = 0; i < fullText.length; i++) {
        const span = document.createElementNS(this.svg.ns, 'tspan');
        
        // Use noise for width variations with animation time
        let width;
        if (this.staticSettings.useNoise && this.noise) {
          // Create multi-octave noise for more varied patterns
          let noiseValue = 0;
          let amplitude = 1.0;
          let frequency = 1.0;
          
          // Use fewer octaves in performance mode
          const maxOctaves = this.controlSettings.performanceMode.value ? 2 : this.controlSettings.noiseOctaves.value;
          
          for (let octave = 0; octave < maxOctaves; octave++) {
            let noiseX, noiseY;
            
            if (this.controlSettings.positionalNoise.value) {
              // Center-based positional sampling using horizontal geometry
              // Calculate the relative position from the center of the text area
              const totalTextLength = fullText.length;
              const centerIndex = totalTextLength / 2;
              
              // Character's position relative to center (0 at center, negative/positive at edges)
              const charRelativePosition = i - centerIndex;
              
              // Create positional grid centered around the text middle
              const positionalResolution = this.controlSettings.positionalResolution.value; // units per grid cell
              const positionalGridIndex = Math.floor(charRelativePosition / positionalResolution);
              
              // Use grid-based coordinates: positional index and consistent row-based Y
              // This creates consistent patterns that don't depend on character widths
              
              const baseX = positionalGridIndex * this.controlSettings.noiseScale.value;
              const baseY = row * this.controlSettings.noiseScale.value * this.controlSettings.yScaleFactor.value;
              
              // Simplified movement in performance mode
              if (this.controlSettings.performanceMode.value) {
                const timeSpeed = this.animationTime * 0.2;
                const offsetX = Math.sin(timeSpeed) * 0.5;
                const offsetY = Math.cos(timeSpeed * 0.8) * 0.2;
                
                noiseX = (baseX + offsetX) * frequency;
                noiseY = (baseY + offsetY) * frequency;
              } else {
                // Multi-dimensional movement through noise space
                const timeSpeed = this.animationTime * 0.3;
                const offsetX = Math.cos(timeSpeed * 0.7) * 0.8 + Math.sin(timeSpeed * 1.3) * 0.4;
                const offsetY = Math.sin(timeSpeed * 0.5) * 0.3 + Math.cos(timeSpeed * 0.9) * 0.2;
                
                noiseX = (baseX + offsetX) * frequency;
                noiseY = (baseY + offsetY) * frequency;
              }
            } else {
              // Use character index directly (creates pattern that deteriorates with width variation)
              const baseX = i * this.controlSettings.noiseScale.value;
              const baseY = row * this.controlSettings.noiseScale.value * this.controlSettings.yScaleFactor.value;
              
              // Simplified movement in performance mode
              if (this.controlSettings.performanceMode.value) {
                const timeSpeed = this.animationTime * 0.2;
                const offsetX = Math.sin(timeSpeed) * 0.5;
                const offsetY = Math.cos(timeSpeed * 0.8) * 0.2;
                
                noiseX = (baseX + offsetX) * frequency;
                noiseY = (baseY + offsetY) * frequency;
              } else {
                // Multi-dimensional movement through noise space
                const timeSpeed = this.animationTime * 0.3;
                const offsetX = Math.cos(timeSpeed * 0.7) * 0.8 + Math.sin(timeSpeed * 1.3) * 0.4;
                const offsetY = Math.sin(timeSpeed * 0.5) * 0.3 + Math.cos(timeSpeed * 0.9) * 0.2;
                
                noiseX = (baseX + offsetX) * frequency;
                noiseY = (baseY + offsetY) * frequency;
              }
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
          
          // Map noise value (-1 to 1) to width range (50 to 200)
          let normalizedNoise = (noiseValue + 1) / 2; // 0 to 1
          
          // If inverse mapping is enabled, invert the normalized noise
          if (this.controlSettings.inverseWidthMapping.value) {
            normalizedNoise = 1 - normalizedNoise;
          }
          
          // Map to continuous width range from 50 to 200
          width = 50 + (normalizedNoise * 150); // 50 + (0 to 1) * 150 = 50 to 200
        } else {
          // Random width in continuous range
          width = 50 + (Math.random() * 150); // 50 to 200
        }
        
        // Set the width variation using variable font axis
        span.setAttribute('class', 'st0');
        span.setAttribute('style', `font-variation-settings: "wdth" ${width.toFixed(1)};`);
        
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
      
      // Special handling for animation toggle
      if (key === 'animationEnabled') {
        if (config.value) {
          this.startAnimation();
        } else {
          this.stopAnimation();
        }
      }
      
      // Special handling for performance mode toggle
      if (key === 'performanceMode') {
        // Reset frame counter when toggling performance mode
        this.animationSettings.frameCount = 0;
        console.log(`Performance mode ${config.value ? 'enabled' : 'disabled'}`);
      }
      
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

    // Animation control buttons
    const animationControls = document.createElement('li');
    animationControls.innerHTML = `
      <div class="control-button-group">
        <button id="play-pause-btn" class="btn">${this.isAnimating ? 'Pause' : 'Play'}</button>
        <button id="reset-animation-btn" class="btn secondary">Reset</button>
      </div>
    `;
    values.append(animationControls);

    const playPauseBtn = animationControls.querySelector('#play-pause-btn');
    const resetAnimationBtn = animationControls.querySelector('#reset-animation-btn');
    
    playPauseBtn.addEventListener('click', () => {
      this.controlSettings.animationEnabled.value = !this.controlSettings.animationEnabled.value;
      if (this.controlSettings.animationEnabled.value) {
        this.startAnimation();
        playPauseBtn.textContent = 'Pause';
      } else {
        this.stopAnimation();
        playPauseBtn.textContent = 'Play';
      }
      // Update the checkbox
      const animationCheckbox = document.getElementById('animationEnabled-checkbox');
      if (animationCheckbox) {
        animationCheckbox.checked = this.controlSettings.animationEnabled.value;
      }
      if (!this.isInitializing) this.saveSettings();
    });

    resetAnimationBtn.addEventListener('click', () => {
      this.animationTime = 0;
      this.animationStartTime = performance.now();
      this.updateRectText();
    });

    // Generate controls dynamically from controlSettings
    Object.keys(this.controlSettings).forEach(key => {
      const config = this.controlSettings[key];
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
    
    // Handle animation speed change
    this.animationSettings.speed = this.controlSettings.animationSpeed.value;
    
    // Clear existing text elements
    const existingTexts = this.svg.stage.querySelectorAll('text');
    existingTexts.forEach(text => text.remove());
    
    // Clear existing reference lines and paths (but preserve background)
    const existingPaths = this.svg.stage.querySelectorAll('path:not(#background-rect)');
    existingPaths.forEach(path => path.remove());
    const existingLines = this.svg.stage.querySelectorAll('line:not(#background-rect)');
    existingLines.forEach(line => line.remove());
    const existingRects = this.svg.stage.querySelectorAll('rect:not(#background-rect)');
    existingRects.forEach(rect => rect.remove());
    
    // Clear existing paths and styles from defs
    const existingDefPaths = this.defs.querySelectorAll('[id^="rect-path-"]');
    existingDefPaths.forEach(path => path.remove());
    const existingStyles = this.defs.querySelectorAll('style');
    existingStyles.forEach(style => style.remove());
    
    // Recreate styles with updated font size and colors
    this.createWidthStyles();
    
    // Regenerate rect text with new settings
    this.createRectText();
    
    // Restart animation if enabled
    if (this.controlSettings.animationEnabled.value && !this.isAnimating) {
      this.startAnimation();
    } else if (!this.controlSettings.animationEnabled.value && this.isAnimating) {
      this.stopAnimation();
    }
  }

  cleanup() {
    // Stop animation and cleanup resources
    this.stopAnimation();
    if (this.svg && this.svg.stage) {
      // Remove any event listeners or timers if they exist
    }
  }

  saveSettings() {
    try {
      // Only save the actual values and locked states, not configuration metadata
      const valuesToSave = {};
      Object.keys(this.controlSettings).forEach(key => {
        valuesToSave[key] = {
          value: this.controlSettings[key].value,
          locked: this.controlSettings[key].locked
        };
        // For shiftTextPattern, also preserve the current options array
        if (key === 'shiftTextPattern' && this.controlSettings[key].options) {
          valuesToSave[key].options = this.controlSettings[key].options;
        }
      });
      
      const settingsData = {
        controlSettings: valuesToSave
      };
      localStorage.setItem('rectAnimatedSketchSettings', JSON.stringify(settingsData));
      console.log('Settings saved successfully (values and locks only)');
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('rectAnimatedSketchSettings');
      if (saved) {
        const settingsData = JSON.parse(saved);
        // Only restore values and locked states, preserve configuration metadata
        if (settingsData.controlSettings) {
          Object.keys(settingsData.controlSettings).forEach(key => {
            if (this.controlSettings[key] && settingsData.controlSettings[key]) {
              const savedControl = settingsData.controlSettings[key];
              
              // Only restore value and locked, preserve min/max/step/default from code
              if (savedControl.hasOwnProperty('value')) {
                this.controlSettings[key].value = savedControl.value;
              }
              if (savedControl.hasOwnProperty('locked')) {
                this.controlSettings[key].locked = savedControl.locked;
              }
              
              // Special handling for shiftTextPattern options
              if (key === 'shiftTextPattern' && savedControl.options) {
                this.controlSettings[key].options = savedControl.options;
              }
            }
          });
        }
        console.log('Settings loaded successfully (values and locks only, preserved ranges)');
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }

  injectSettingsIntoSVG() {
    // Store settings as a data attribute on the SVG element
    const svgElement = document.querySelector('svg');
    if (svgElement) {
      // Only save values and locked states, not configuration metadata
      const valuesToSave = {};
      Object.keys(this.controlSettings).forEach(key => {
        valuesToSave[key] = {
          value: this.controlSettings[key].value,
          locked: this.controlSettings[key].locked
        };
        // For shiftTextPattern, also preserve the current options array
        if (key === 'shiftTextPattern' && this.controlSettings[key].options) {
          valuesToSave[key].options = this.controlSettings[key].options;
        }
      });
      
      const settingsData = {
        controlSettings: valuesToSave,
        staticSettings: this.staticSettings,
        seed: this.seed ? this.seed.hash : null,
        animationTime: this.animationTime // Save current animation time
      };
      svgElement.setAttribute('data-sketch-settings', JSON.stringify(settingsData));
    }
  }

  // Override the save method to include settings
  saveWithSettings() {
    // Stop animation temporarily for a clean save
    const wasAnimating = this.isAnimating;
    if (wasAnimating) {
      this.stopAnimation();
    }
    
    // Inject settings into SVG
    this.injectSettingsIntoSVG();
    
    // Call the original save method
    if (this.svg && this.svg.save) {
      this.svg.save();
    }
    
    // Restart animation if it was running
    if (wasAnimating) {
      this.startAnimation();
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
                    
                    // Only restore value and locked, preserve min/max/step/default from code
                    if (savedControl.hasOwnProperty('value')) {
                      this.controlSettings[key].value = savedControl.value;
                    }
                    if (savedControl.hasOwnProperty('locked')) {
                      this.controlSettings[key].locked = savedControl.locked;
                    }
                    
                    // Special handling for shiftTextPattern options
                    if (key === 'shiftTextPattern' && savedControl.options) {
                      this.controlSettings[key].options = savedControl.options;
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
              
              // Restore animation time if available
              if (settingsData.animationTime !== undefined) {
                this.animationTime = settingsData.animationTime;
              }
              
              // Reinitialize noise (always enabled)
              const noiseSeed = this.seed ? Math.floor(this.seed.rnd() * 10000) : Math.floor(Math.random() * 10000);
              this.noise = new SimplexNoise(noiseSeed);
              
              // Update UI controls to reflect loaded values
              this.restoreControlsFromSettings();
              
              this.updateSketch();
              this.updateHashDisplay(); // Update the displayed hash
              console.log('Settings and seed loaded from SVG file (values and locks only, preserved ranges)');
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
        // Restore both value and locked state from the original configuration
        this.controlSettings[key].value = this.originalControlSettings[key].value;
        this.controlSettings[key].locked = this.originalControlSettings[key].locked;
      }
    });

    // Clear localStorage
    localStorage.removeItem('rectAnimatedSketchSettings');

    // Reset animation time
    this.animationTime = 0;
    this.animationStartTime = performance.now();

    // Reinitialize noise (always enabled)
    this.noise = new SimplexNoise(this.originalNoiseSeed);

    // Ensure we're not in initialization mode
    this.isInitializing = false;

    // Update UI controls to reflect reset values
    this.restoreControlsFromSettings();

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
    Object.keys(this.controlSettings).forEach(key => {
      const lockElement = document.getElementById(`${key}-lock`);
      if (lockElement) {
        this.controlSettings[key].locked = lockElement.checked;
      }
    });
    
    // Return the lock states
    const lockStates = {};
    Object.keys(this.controlSettings).forEach(key => {
      lockStates[key] = this.controlSettings[key].locked;
    });
    return lockStates;
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
    
    // Update play/pause button state
    const playPauseBtn = document.getElementById('play-pause-btn');
    if (playPauseBtn) {
      playPauseBtn.textContent = this.controlSettings.animationEnabled.value ? 'Pause' : 'Play';
    }
    
    // Update the lock-all checkbox to reflect the current state
    this.updateLockAllCheckbox();
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