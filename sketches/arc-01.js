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
      borderTop: 0,
      wdths: [50, 100, 150, 200],
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
        min: 30,
        max: 240,
        step: 1,
        default: 120,
        value: 120,
        locked: true
      },
      lineSpacing: {
        min: 0.5,
        max: 3.0,
        step: 0.1,
        default: 1.5,
        value: 1.5,
        locked: true
      },
      
      // Text controls
      shiftTextPattern: {
        options: ['none', 'forward', 'backward', 'random'],
        default: 'forward',
        value: 'forward',
        locked: true
      },
      useBlanks: {
        default: false,
        value: false,
        locked: true
      },
      blanksProb: {
        min: 10,
        max: 90,
        step: 5,
        default: 50,
        value: 50,
        locked: true
      },
      
      // Noise controls
      useNoise: {
        default: true,
        value: true,
        locked: true
      },
      angularNoise: {
        default: false,
        value: true,
        locked: true
      },
      angularResolution: {
        min: 0.05,
        max: 0.9,
        step: 0.05,
        default: 0.3,
        value: 0.3,
        locked: true
      },
      yScaleFactor: {
        min: 0.1,
        max: 30.0,
        step: 0.1,
        default: 1.5,
        value: 1.5,
        locked: false
      },
      inverseWidthMapping: {
        default: false,
        value: false,
        locked: true
      },
      noiseScale: {
        min: 0.005,
        max: 0.2,
        step: 0.005,
        default: 0.06,
        value: 0.06,
        locked: true
      },
      noiseOctaves: {
        min: 1,
        max: 6,
        step: 1,
        default: 3,
        value: 3,
        locked: true
      },
      noisePersistence: {
        min: 0.1,
        max: 1.0,
        step: 0.1,
        default: 0.5,
        value: 0.5,
        locked: false
      },
      noiseContrast: {
        min: 0.1,
        max: 3.0,
        step: 0.1,
        default: 1.2,
        value: 1.2,
        locked: true
      },
      noiseLacunarity: {
        min: 0.05,
        max: 1.5,
        step: 0.05,
        default: 0.9,
        value: 0.9,
        locked: false
      },
      
      // Color controls
      colBG: {
        default: '#000000',
        value: '#000000',
        locked: true
      },
      colFG: {
        default: '#ffffff',
        value: '#ffffff',
        locked: true
      }
    };

    // Load saved settings if available
    this.loadSettings();
    
    // Flag to prevent auto-saving during initial setup
    this.isInitializing = true;

    // Initialize noise generator using the main seed system
    if (this.controlSettings.useNoise.value) {
      // Use the main seed for noise consistency
      const noiseSeed = this.seed ? Math.floor(this.seed.rnd() * 10000) : Math.floor(Math.random() * 10000);
      this.noise = new SimplexNoise(noiseSeed);
    }

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
    
    // Define CSS classes for each width variation using distinct font files
    const cssRules = `
      .st0 { font-size: ${this.fSize}; fill: ${this.controlSettings.colFG.value}; }
      .width-50 { font-family: 'LLALLogoLinear-Condensed'; }
      .width-100 { font-family: 'LLALLogoLinear-Regular'; }
      .width-150 { font-family: 'LLALLogoLinear-Extended'; }
      .width-200 { font-family: 'LLALLogoLinear-Expanded'; }
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
      blnkProb: this.controlSettings.blanksProb.value,
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
    
    // Calculate radius step between lines
    const radiusStep = (rOuter - rInner) / (nRows - 1);
    
    // Generate text for each line - follow the arc using textPath
    for (let row = 1; row < nRows; row++) {
      const radius = rInner + (row * radiusStep);
      
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
      
      // Better estimation for character width and repetitions
      const fontSize = parseFloat(fSize);
      const avgCharWidth = fontSize * 0.4; // More accurate average character width
      const charsPerLLAL = txt.length;
      const avgLLALWidth = avgCharWidth * charsPerLLAL;
      
      // Calculate repetitions with some extra to ensure full coverage
      const baseRepetitions = Math.ceil(arcLength / avgLLALWidth);
      const repetitions = Math.max(baseRepetitions, 3); // Minimum 3 repetitions
      
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
      
      // Create textPath element
      const textPath = document.createElementNS(this.svg.ns, 'textPath');
      textPath.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${pathId}`);
      textPath.setAttribute('startOffset', '0%');
      
      // Create individual tspans for each letter with width variations
      for (let i = 0; i < fullText.length; i++) {
        const span = document.createElementNS(this.svg.ns, 'tspan');
        
        // Use noise for width variations if enabled
        let width;
        if (this.controlSettings.useNoise.value && this.noise) {
          // Create multi-octave noise for more varied patterns
          let noiseValue = 0;
          let amplitude = 1.0;
          let frequency = 1.0;
          
          for (let octave = 0; octave < this.controlSettings.noiseOctaves.value; octave++) {
            let noiseX, noiseY;
            
            if (this.controlSettings.angularNoise.value) {
              // Angular-based sampling for stable "islands" pattern
              // Create a fixed angular grid independent of character count
              const totalArcAngle = Math.abs(arcEnd - arcStart); // in degrees
              const angularResolution = this.controlSettings.angularResolution.value; // degrees per grid cell
              const numGridCells = Math.floor(totalArcAngle / angularResolution);
              
              // Map character to nearest grid cell
              const relativePosition = i / fullText.length; // 0 to 1 along current row
              const gridIndex = Math.floor(relativePosition * numGridCells);
              
              // Use fixed grid position for stable vertical columns
              // Scale Y-axis to match X-axis frequency for balanced pattern changes
              noiseX = gridIndex * this.controlSettings.noiseScale.value * frequency * 2;
              noiseY = (row - 1) * this.controlSettings.noiseScale.value * frequency * 2 * this.controlSettings.yScaleFactor.value;
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
          
          // Use predefined width steps for CSS classes with bounds checking
          const widthIndex = Math.floor(normalizedNoise * this.staticSettings.wdths.length);
          const clampedIndex = Math.max(0, Math.min(this.staticSettings.wdths.length - 1, widthIndex));
          width = this.staticSettings.wdths[clampedIndex];
        } else {
          // Random predefined width
          width = this.staticSettings.wdths[rndInt(0, this.staticSettings.wdths.length - 1)];
        }
        
        // Set the width variation using CSS class
        span.setAttribute('class', `st0 width-${width}`);
        
        // Apply transparent fill if useBlanks is enabled
        if (this.controlSettings.useBlanks.value && Math.random() * 100 < this.controlSettings.blanksProb.value) {
          span.setAttribute('style', 'fill: transparent;');
        }
        
        span.textContent = fullText[i];
        textPath.appendChild(span);
      }
      
      text.appendChild(textPath);
      this.svg.stage.appendChild(text);
    }
  }

  setupControls() {
    const values = document.createElement('ul');

    const reloadBtn = document.createElement('a');
    reloadBtn.classList.add('btn');
    reloadBtn.setAttribute('id', 'btnreload');
    reloadBtn.append('New Seed');

    // Number of lines control
    const linesControl = document.createElement('li');
    const nRowsRange = this.controlSettings.nRows;
    linesControl.innerHTML = `
      <label for="nRows-slider">Number of lines: </label>
      <div class="control-row">
        <div class="control-input-group">
          <input type="range" id="nRows-slider" min="${nRowsRange.min}" max="${nRowsRange.max}" step="${nRowsRange.step}" value="${nRowsRange.value}" class="control-slider">
          <input type="number" id="nRows-input" min="${nRowsRange.min}" max="${nRowsRange.max}" step="${nRowsRange.step}" value="${nRowsRange.value}" class="control-number">
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="nRows-lock" ${nRowsRange.locked ? 'checked' : ''} class="control-checkbox">
        </label>
      </div>
    `;
    values.append(linesControl);

    // Link slider and input
    const slider = linesControl.querySelector('#nRows-slider');
    const input = linesControl.querySelector('#nRows-input');
    const nRowsLock = linesControl.querySelector('#nRows-lock');
    
    slider.addEventListener('input', (e) => {
      input.value = e.target.value;
      this.controlSettings.nRows.value = parseInt(e.target.value);
      this.updateSketch();
      if (!this.isInitializing) this.saveSettings(); // Auto-save when value changes
    });
    
    input.addEventListener('input', (e) => {
      slider.value = e.target.value;
      this.controlSettings.nRows.value = parseInt(e.target.value);
      this.updateSketch();
    });

    // Sync lock state with internal state
    nRowsLock.addEventListener('change', (e) => {
      this.controlSettings.nRows.locked = e.target.checked;
    });

    // Line spacing control (affects font size)
    const lineSpacingControl = document.createElement('li');
    const lineSpacingRange = this.controlSettings.lineSpacing;
    lineSpacingControl.innerHTML = `
      <label for="lineSpacing-slider">Line spacing (font size): </label>
      <div class="control-row">
        <div class="control-input-group">
          <input type="range" id="lineSpacing-slider" min="${lineSpacingRange.min}" max="${lineSpacingRange.max}" step="${lineSpacingRange.step}" value="${lineSpacingRange.value}" class="control-slider">
          <input type="number" id="lineSpacing-input" min="${lineSpacingRange.min}" max="${lineSpacingRange.max}" step="${lineSpacingRange.step}" value="${lineSpacingRange.value}" class="control-number">
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="lineSpacing-lock" ${lineSpacingRange.locked ? 'checked' : ''} class="control-checkbox">
        </label>
      </div>
    `;
    values.append(lineSpacingControl);

    const lineSpacingSlider = lineSpacingControl.querySelector('#lineSpacing-slider');
    const lineSpacingInput = lineSpacingControl.querySelector('#lineSpacing-input');
    const lineSpacingLock = lineSpacingControl.querySelector('#lineSpacing-lock');
    
    lineSpacingSlider.addEventListener('input', (e) => {
      lineSpacingInput.value = e.target.value;
      this.controlSettings.lineSpacing.value = parseFloat(e.target.value);
      this.updateSketch();
      if (!this.isInitializing) this.saveSettings(); // Auto-save when value changes
    });
    
    lineSpacingInput.addEventListener('input', (e) => {
      lineSpacingSlider.value = e.target.value;
      this.controlSettings.lineSpacing.value = parseFloat(e.target.value);
      this.updateSketch();
    });

    // Sync lock state with internal state
    lineSpacingLock.addEventListener('change', (e) => {
      this.controlSettings.lineSpacing.locked = e.target.checked;
    });

    // Text pattern shifting control
    const textPatternShiftControl = document.createElement('li');
    
    // Ensure options array exists (for backward compatibility)
    if (!this.controlSettings.shiftTextPattern.options) {
      this.controlSettings.shiftTextPattern.options = ['none', 'forward', 'backward', 'random'];
    }
    
    textPatternShiftControl.innerHTML = `
      <div class="control-row">
        <div class="control-input-group">
          <label for="shiftTextPattern-select">Shift text pattern:</label>
          <select id="shiftTextPattern-select" class="control-select">
            ${this.controlSettings.shiftTextPattern.options.map(option => 
              `<option value="${option}" ${option === this.controlSettings.shiftTextPattern.value ? 'selected' : ''}>${option.charAt(0).toUpperCase() + option.slice(1)}</option>`
            ).join('')}
          </select>
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="shiftTextPattern-lock" ${this.controlSettings.shiftTextPattern.locked ? 'checked' : ''} class="control-checkbox">
        </label>
      </div>
    `;
    
    console.log('Creating shiftTextPattern dropdown with value:', this.controlSettings.shiftTextPattern.value);
    values.append(textPatternShiftControl);

    const textPatternShiftSelect = textPatternShiftControl.querySelector('#shiftTextPattern-select');
    const textPatternShiftLock = textPatternShiftControl.querySelector('#shiftTextPattern-lock');
    
    textPatternShiftSelect.addEventListener('change', (e) => {
      this.controlSettings.shiftTextPattern.value = e.target.value;
      this.updateSketch();
      if (!this.isInitializing) this.saveSettings(); // Auto-save when value changes
    });

    // Sync lock state with internal state
    textPatternShiftLock.addEventListener('change', (e) => {
      this.controlSettings.shiftTextPattern.locked = e.target.checked;
      if (!this.isInitializing) this.saveSettings(); // Auto-save when lock state changes
    });

    // Use blanks control
    const useBlanksControl = document.createElement('li');
    useBlanksControl.innerHTML = `
      <div class="control-row">
        <div class="control-input-group">
          <label for="useBlanks-checkbox">Use blanks: </label>
          <input type="checkbox" id="useBlanks-checkbox" ${this.controlSettings.useBlanks.value ? 'checked' : ''}>
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="useBlanks-lock" ${this.controlSettings.useBlanks.locked ? 'checked' : ''} class="control-checkbox">
        </label>
      </div>
    `;
    values.append(useBlanksControl);

    const useBlanksCheckbox = useBlanksControl.querySelector('#useBlanks-checkbox');
    const useBlanksLock = useBlanksControl.querySelector('#useBlanks-lock');
    
    useBlanksCheckbox.addEventListener('change', (e) => {
      this.controlSettings.useBlanks.value = e.target.checked;
      this.updateSketch();
      this.saveSettings(); // Auto-save when value changes
    });

    // Sync lock state with internal state
    useBlanksLock.addEventListener('change', (e) => {
      this.controlSettings.useBlanks.locked = e.target.checked;
    });

    // Blanks probability control
    const blanksProbControl = document.createElement('li');
    const blanksProbRange = this.controlSettings.blanksProb;
    blanksProbControl.innerHTML = `
      <label for="blanksProb-slider">Blanks probability (%): </label>
      <div class="control-row">
        <div class="control-input-group">
          <input type="range" id="blanksProb-slider" min="${blanksProbRange.min}" max="${blanksProbRange.max}" step="${blanksProbRange.step}" value="${blanksProbRange.value}" class="control-slider">
          <input type="number" id="blanksProb-input" min="${blanksProbRange.min}" max="${blanksProbRange.max}" step="${blanksProbRange.step}" value="${blanksProbRange.value}" class="control-number">
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="blanksProb-lock" ${blanksProbRange.locked ? 'checked' : ''} class="control-checkbox">
        </label>
      </div>
    `;
    values.append(blanksProbControl);

    const blanksProbSlider = blanksProbControl.querySelector('#blanksProb-slider');
    const blanksProbInput = blanksProbControl.querySelector('#blanksProb-input');
    const blanksProbLock = blanksProbControl.querySelector('#blanksProb-lock');
    
    blanksProbSlider.addEventListener('input', (e) => {
      blanksProbInput.value = e.target.value;
      this.controlSettings.blanksProb.value = parseInt(e.target.value);
      this.updateSketch();
    });
    
    blanksProbInput.addEventListener('input', (e) => {
      blanksProbSlider.value = e.target.value;
      this.controlSettings.blanksProb.value = parseInt(e.target.value);
      this.updateSketch();
    });

    // Sync lock state with internal state
    blanksProbLock.addEventListener('change', (e) => {
      this.controlSettings.blanksProb.locked = e.target.checked;
    });

    // Noise toggle control
    const noiseToggleControl = document.createElement('li');
    noiseToggleControl.innerHTML = `
      <div class="control-row">
        <div class="control-input-group">
          <label for="useNoise-checkbox">Use noise: </label>
          <input type="checkbox" id="useNoise-checkbox" ${this.controlSettings.useNoise.value ? 'checked' : ''}>
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="useNoise-lock" ${this.controlSettings.useNoise.locked ? 'checked' : ''} class="control-checkbox">
        </label>
      </div>
    `;
    values.append(noiseToggleControl);

    const noiseCheckbox = noiseToggleControl.querySelector('#useNoise-checkbox');
    const useNoiseLock = noiseToggleControl.querySelector('#useNoise-lock');
    
    noiseCheckbox.addEventListener('change', (e) => {
      this.controlSettings.useNoise.value = e.target.checked;
      if (this.controlSettings.useNoise.value && !this.noise) {
        // Use the main seed for noise consistency
        const noiseSeed = this.seed ? Math.floor(this.seed.rnd() * 10000) : Math.floor(Math.random() * 10000);
        this.noise = new SimplexNoise(noiseSeed);
      }
      this.updateSketch();
      if (!this.isInitializing) this.saveSettings(); // Auto-save when value changes
    });

    // Sync lock state with internal state
    useNoiseLock.addEventListener('change', (e) => {
      this.controlSettings.useNoise.locked = e.target.checked;
    });

    // Angular noise control
    const angularNoiseControl = document.createElement('li');
    angularNoiseControl.innerHTML = `
      <div class="control-row">
        <div class="control-input-group">
          <label for="angularNoise-checkbox">Angular noise: </label>
          <input type="checkbox" id="angularNoise-checkbox" ${this.controlSettings.angularNoise.value ? 'checked' : ''}>
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="angularNoise-lock" ${this.controlSettings.angularNoise.locked ? 'checked' : ''} class="control-checkbox">
        </label>
      </div>
    `;
    values.append(angularNoiseControl);

    const angularNoiseCheckbox = angularNoiseControl.querySelector('#angularNoise-checkbox');
    const angularNoiseLock = angularNoiseControl.querySelector('#angularNoise-lock');
    
    angularNoiseCheckbox.addEventListener('change', (e) => {
      this.controlSettings.angularNoise.value = e.target.checked;
      this.updateSketch();
    });

    // Sync lock state with internal state
    angularNoiseLock.addEventListener('change', (e) => {
      this.controlSettings.angularNoise.locked = e.target.checked;
    });

    // Angular resolution control
    const angularResolutionControl = document.createElement('li');
    const angularResolutionRange = this.controlSettings.angularResolution;
    angularResolutionControl.innerHTML = `
      <label for="angularResolution-slider">Angular resolution (°): </label>
      <div class="control-row">
        <div class="control-input-group">
          <input type="range" id="angularResolution-slider" min="${angularResolutionRange.min}" max="${angularResolutionRange.max}" step="${angularResolutionRange.step}" value="${angularResolutionRange.value}" class="control-slider">
          <input type="number" id="angularResolution-input" min="${angularResolutionRange.min}" max="${angularResolutionRange.max}" step="${angularResolutionRange.step}" value="${angularResolutionRange.value}" class="control-number">
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="angularResolution-lock" ${angularResolutionRange.locked ? 'checked' : ''} class="control-checkbox">
        </label>
      </div>
    `;
    values.append(angularResolutionControl);

    const angularResolutionSlider = angularResolutionControl.querySelector('#angularResolution-slider');
    const angularResolutionInput = angularResolutionControl.querySelector('#angularResolution-input');
    const angularResolutionLock = angularResolutionControl.querySelector('#angularResolution-lock');
    
    angularResolutionSlider.addEventListener('input', (e) => {
      angularResolutionInput.value = e.target.value;
      this.controlSettings.angularResolution.value = parseFloat(e.target.value);
      this.updateSketch();
    });
    
    angularResolutionInput.addEventListener('input', (e) => {
      angularResolutionSlider.value = e.target.value;
      this.controlSettings.angularResolution.value = parseFloat(e.target.value);
      this.updateSketch();
    });

    // Sync lock state with internal state
    angularResolutionLock.addEventListener('change', (e) => {
      this.controlSettings.angularResolution.locked = e.target.checked;
    });

    // Y-axis scale factor control
    const yScaleFactorControl = document.createElement('li');
    const yScaleFactorRange = this.controlSettings.yScaleFactor;
    yScaleFactorControl.innerHTML = `
      <label for="yScaleFactor-slider">Y-axis pattern scale: </label>
      <div class="control-row">
        <div class="control-input-group">
          <input type="range" id="yScaleFactor-slider" min="${yScaleFactorRange.min}" max="${yScaleFactorRange.max}" step="${yScaleFactorRange.step}" value="${yScaleFactorRange.value}" class="control-slider">
          <input type="number" id="yScaleFactor-input" min="${yScaleFactorRange.min}" max="${yScaleFactorRange.max}" step="${yScaleFactorRange.step}" value="${yScaleFactorRange.value}" class="control-number">
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="yScaleFactor-lock" ${yScaleFactorRange.locked ? 'checked' : ''} class="control-checkbox">
        </label>
      </div>
    `;
    values.append(yScaleFactorControl);

    const yScaleFactorSlider = yScaleFactorControl.querySelector('#yScaleFactor-slider');
    const yScaleFactorInput = yScaleFactorControl.querySelector('#yScaleFactor-input');
    const yScaleFactorLock = yScaleFactorControl.querySelector('#yScaleFactor-lock');
    
    yScaleFactorSlider.addEventListener('input', (e) => {
      yScaleFactorInput.value = e.target.value;
      this.controlSettings.yScaleFactor.value = parseFloat(e.target.value);
      this.updateSketch();
    });
    
    yScaleFactorInput.addEventListener('input', (e) => {
      yScaleFactorSlider.value = e.target.value;
      this.controlSettings.yScaleFactor.value = parseFloat(e.target.value);
      this.updateSketch();
    });

    // Sync lock state with internal state
    yScaleFactorLock.addEventListener('change', (e) => {
      this.controlSettings.yScaleFactor.locked = e.target.checked;
    });

    // Inverse width mapping control
    const inverseWidthMappingControl = document.createElement('li');
    inverseWidthMappingControl.innerHTML = `
      <div class="control-row">
        <div class="control-input-group">
          <label for="inverseWidthMapping-checkbox">Inverse width mapping: </label>
          <input type="checkbox" id="inverseWidthMapping-checkbox" ${this.controlSettings.inverseWidthMapping.value ? 'checked' : ''}>
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="inverseWidthMapping-lock" ${this.controlSettings.inverseWidthMapping.locked ? 'checked' : ''} class="control-checkbox">
        </label>
      </div>
    `;
    values.append(inverseWidthMappingControl);

    const inverseWidthMappingCheckbox = inverseWidthMappingControl.querySelector('#inverseWidthMapping-checkbox');
    const inverseWidthMappingLock = inverseWidthMappingControl.querySelector('#inverseWidthMapping-lock');
    
    inverseWidthMappingCheckbox.addEventListener('change', (e) => {
      this.controlSettings.inverseWidthMapping.value = e.target.checked;
      this.updateSketch();
    });

    // Sync lock state with internal state
    inverseWidthMappingLock.addEventListener('change', (e) => {
      this.controlSettings.inverseWidthMapping.locked = e.target.checked;
    });

    // Noise scale control
    const noiseScaleControl = document.createElement('li');
    const noiseScaleRange = this.controlSettings.noiseScale;
    noiseScaleControl.innerHTML = `
      <label for="noiseScale-slider">Noise scale: </label>
      <div class="control-row">
        <div class="control-input-group">
          <input type="range" id="noiseScale-slider" min="${noiseScaleRange.min}" max="${noiseScaleRange.max}" step="${noiseScaleRange.step}" value="${noiseScaleRange.value}" class="control-slider">
          <input type="number" id="noiseScale-input" min="${noiseScaleRange.min}" max="${noiseScaleRange.max}" step="${noiseScaleRange.step}" value="${noiseScaleRange.value}" class="control-number">
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="noiseScale-lock" ${noiseScaleRange.locked ? 'checked' : ''} class="control-checkbox">
        </label>
      </div>
    `;
    values.append(noiseScaleControl);

    const noiseScaleSlider = noiseScaleControl.querySelector('#noiseScale-slider');
    const noiseScaleInput = noiseScaleControl.querySelector('#noiseScale-input');
    const noiseScaleLock = noiseScaleControl.querySelector('#noiseScale-lock');
    
    noiseScaleSlider.addEventListener('input', (e) => {
      noiseScaleInput.value = e.target.value;
      this.controlSettings.noiseScale.value = parseFloat(e.target.value);
      this.updateSketch();
    });
    
    noiseScaleInput.addEventListener('input', (e) => {
      noiseScaleSlider.value = e.target.value;
      this.controlSettings.noiseScale.value = parseFloat(e.target.value);
      this.updateSketch();
    });

    // Sync lock state with internal state
    noiseScaleLock.addEventListener('change', (e) => {
      this.controlSettings.noiseScale.locked = e.target.checked;
    });

    // Noise octaves control
    const noiseOctavesControl = document.createElement('li');
    const noiseOctavesRange = this.controlSettings.noiseOctaves;
    noiseOctavesControl.innerHTML = `
      <label for="noiseOctaves-slider">Noise octaves: </label>
      <div class="control-row">
        <div class="control-input-group">
          <input type="range" id="noiseOctaves-slider" min="${noiseOctavesRange.min}" max="${noiseOctavesRange.max}" step="${noiseOctavesRange.step}" value="${noiseOctavesRange.value}" class="control-slider">
          <input type="number" id="noiseOctaves-input" min="${noiseOctavesRange.min}" max="${noiseOctavesRange.max}" step="${noiseOctavesRange.step}" value="${noiseOctavesRange.value}" class="control-number">
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="noiseOctaves-lock" ${noiseOctavesRange.locked ? 'checked' : ''} class="control-checkbox">
        </label>
      </div>
    `;
    values.append(noiseOctavesControl);

    const noiseOctavesSlider = noiseOctavesControl.querySelector('#noiseOctaves-slider');
    const noiseOctavesInput = noiseOctavesControl.querySelector('#noiseOctaves-input');
    const noiseOctavesLock = noiseOctavesControl.querySelector('#noiseOctaves-lock');
    
    noiseOctavesSlider.addEventListener('input', (e) => {
      noiseOctavesInput.value = e.target.value;
      this.controlSettings.noiseOctaves.value = parseInt(e.target.value);
      this.updateSketch();
    });
    
    noiseOctavesInput.addEventListener('input', (e) => {
      noiseOctavesSlider.value = e.target.value;
      this.controlSettings.noiseOctaves.value = parseInt(e.target.value);
      this.updateSketch();
    });

    // Sync lock state with internal state
    noiseOctavesLock.addEventListener('change', (e) => {
      this.controlSettings.noiseOctaves.locked = e.target.checked;
    });

    // Noise persistence control
    const noisePersistenceControl = document.createElement('li');
    const noisePersistenceRange = this.controlSettings.noisePersistence;
    noisePersistenceControl.innerHTML = `
      <label for="noisePersistence-slider">Noise persistence: </label>
      <div class="control-row">
        <div class="control-input-group">
          <input type="range" id="noisePersistence-slider" min="${noisePersistenceRange.min}" max="${noisePersistenceRange.max}" step="${noisePersistenceRange.step}" value="${noisePersistenceRange.value}" class="control-slider">
          <input type="number" id="noisePersistence-input" min="${noisePersistenceRange.min}" max="${noisePersistenceRange.max}" step="${noisePersistenceRange.step}" value="${noisePersistenceRange.value}" class="control-number">
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="noisePersistence-lock" ${noisePersistenceRange.locked ? 'checked' : ''} class="control-checkbox">
        </label>
      </div>
    `;
    values.append(noisePersistenceControl);

    const noisePersistenceSlider = noisePersistenceControl.querySelector('#noisePersistence-slider');
    const noisePersistenceInput = noisePersistenceControl.querySelector('#noisePersistence-input');
    const noisePersistenceLock = noisePersistenceControl.querySelector('#noisePersistence-lock');
    
    noisePersistenceSlider.addEventListener('input', (e) => {
      noisePersistenceInput.value = e.target.value;
      this.controlSettings.noisePersistence.value = parseFloat(e.target.value);
      this.updateSketch();
    });
    
    noisePersistenceInput.addEventListener('input', (e) => {
      noisePersistenceSlider.value = e.target.value;
      this.controlSettings.noisePersistence.value = parseFloat(e.target.value);
      this.updateSketch();
    });

    // Sync lock state with internal state
    noisePersistenceLock.addEventListener('change', (e) => {
      this.controlSettings.noisePersistence.locked = e.target.checked;
    });

    // Noise contrast control
    const noiseContrastControl = document.createElement('li');
    const noiseContrastRange = this.controlSettings.noiseContrast;
    noiseContrastControl.innerHTML = `
      <label for="noiseContrast-slider">Noise contrast: </label>
      <div class="control-row">
        <div class="control-input-group">
          <input type="range" id="noiseContrast-slider" min="${noiseContrastRange.min}" max="${noiseContrastRange.max}" step="${noiseContrastRange.step}" value="${noiseContrastRange.value}" class="control-slider">
          <input type="number" id="noiseContrast-input" min="${noiseContrastRange.min}" max="${noiseContrastRange.max}" step="${noiseContrastRange.step}" value="${noiseContrastRange.value}" class="control-number">
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="noiseContrast-lock" ${noiseContrastRange.locked ? 'checked' : ''} class="control-checkbox">
        </label>
      </div>
    `;
    values.append(noiseContrastControl);

    const noiseContrastSlider = noiseContrastControl.querySelector('#noiseContrast-slider');
    const noiseContrastInput = noiseContrastControl.querySelector('#noiseContrast-input');
    const noiseContrastLock = noiseContrastControl.querySelector('#noiseContrast-lock');
    
    noiseContrastSlider.addEventListener('input', (e) => {
      noiseContrastInput.value = e.target.value;
      this.controlSettings.noiseContrast.value = parseFloat(e.target.value);
      this.updateSketch();
    });
    
    noiseContrastInput.addEventListener('input', (e) => {
      noiseContrastSlider.value = e.target.value;
      this.controlSettings.noiseContrast.value = parseFloat(e.target.value);
      this.updateSketch();
    });

    // Sync lock state with internal state
    noiseContrastLock.addEventListener('change', (e) => {
      this.controlSettings.noiseContrast.locked = e.target.checked;
    });

          // Noise lacunarity control
    const noiseLacunarityControl = document.createElement('li');
    const noiseLacunarityRange = this.controlSettings.noiseLacunarity;
    noiseLacunarityControl.innerHTML = `
      <label for="noiseLacunarity-slider">Noise lacunarity: </label>
      <div class="control-row">
        <div class="control-input-group">
          <input type="range" id="noiseLacunarity-slider" min="${noiseLacunarityRange.min}" max="${noiseLacunarityRange.max}" step="${noiseLacunarityRange.step}" value="${noiseLacunarityRange.value}" class="control-slider">
          <input type="number" id="noiseLacunarity-input" min="${noiseLacunarityRange.min}" max="${noiseLacunarityRange.max}" step="${noiseLacunarityRange.step}" value="${noiseLacunarityRange.value}" class="control-number">
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="noiseLacunarity-lock" ${noiseLacunarityRange.locked ? 'checked' : ''} class="control-checkbox">
        </label>
      </div>
    `;
    values.append(noiseLacunarityControl);

    const noiseLacunaritySlider = noiseLacunarityControl.querySelector('#noiseLacunarity-slider');
    const noiseLacunarityInput = noiseLacunarityControl.querySelector('#noiseLacunarity-input');
    const noiseLacunarityLock = noiseLacunarityControl.querySelector('#noiseLacunarity-lock');
    
    noiseLacunaritySlider.addEventListener('input', (e) => {
      noiseLacunarityInput.value = e.target.value;
      this.controlSettings.noiseLacunarity.value = parseFloat(e.target.value);
      this.updateSketch();
    });
    
    noiseLacunarityInput.addEventListener('input', (e) => {
      noiseLacunaritySlider.value = e.target.value;
      this.controlSettings.noiseLacunarity.value = parseFloat(e.target.value);
      this.updateSketch();
    });

    // Sync lock state with internal state
    noiseLacunarityLock.addEventListener('change', (e) => {
      this.controlSettings.noiseLacunarity.locked = e.target.checked;
    });

    // Color controls

    // Background color control
    const backgroundColorControl = document.createElement('li');
    backgroundColorControl.innerHTML = `
      <label for="colBG-input">Background color: </label>
      <div class="control-row">
        <div class="control-input-group">
          <input type="color" id="colBG-input" value="${this.controlSettings.colBG.value}" class="control-color-input">
          <input type="text" id="colBG-text" value="${this.controlSettings.colBG.value}" class="control-color-text">
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="colBG-lock" ${this.controlSettings.colBG.locked ? 'checked' : ''} class="control-checkbox">
        </label>
      </div>
    `;
    values.append(backgroundColorControl);

    const backgroundColorInput = backgroundColorControl.querySelector('#colBG-input');
    const backgroundColorText = backgroundColorControl.querySelector('#colBG-text');
    const backgroundColorLock = backgroundColorControl.querySelector('#colBG-lock');
    
    backgroundColorInput.addEventListener('input', (e) => {
      backgroundColorText.value = e.target.value;
      this.controlSettings.colBG.value = e.target.value;
      this.updateSketch();
      if (!this.isInitializing) this.saveSettings(); // Auto-save when value changes
    });
    
    backgroundColorText.addEventListener('input', (e) => {
      backgroundColorInput.value = e.target.value;
      this.controlSettings.colBG.value = e.target.value;
      this.updateSketch();
      this.saveSettings(); // Auto-save when value changes
    });

    // Sync lock state with internal state
    backgroundColorLock.addEventListener('change', (e) => {
      this.controlSettings.colBG.locked = e.target.checked;
    });

    // Foreground color control
    const foregroundColorControl = document.createElement('li');
    foregroundColorControl.innerHTML = `
      <label for="colFG-input">Text color: </label>
      <div class="control-row">
        <div class="control-input-group">
          <input type="color" id="colFG-input" value="${this.controlSettings.colFG.value}" class="control-color-input">
          <input type="text" id="colFG-text" value="${this.controlSettings.colFG.value}" class="control-color-text">
        </div>
        <label class="control-lock-container">
          <span class="control-lock-icon">🔒</span>
          <input type="checkbox" id="colFG-lock" ${this.controlSettings.colFG.locked ? 'checked' : ''} class="control-checkbox">
        </label>
      </div>
    `;
    values.append(foregroundColorControl);

    const foregroundColorInput = foregroundColorControl.querySelector('#colFG-input');
    const foregroundColorText = foregroundColorControl.querySelector('#colFG-text');
    const foregroundColorLock = foregroundColorControl.querySelector('#colFG-lock');
    
    foregroundColorInput.addEventListener('input', (e) => {
      foregroundColorText.value = e.target.value;
      this.controlSettings.colFG.value = e.target.value;
      this.updateSketch();
      if (!this.isInitializing) this.saveSettings(); // Auto-save when value changes
    });
    
    foregroundColorText.addEventListener('input', (e) => {
      foregroundColorInput.value = e.target.value;
      this.controlSettings.colFG.value = e.target.value;
      this.updateSketch();
      this.saveSettings(); // Auto-save when value changes
    });

    // Sync lock state with internal state
    foregroundColorLock.addEventListener('change', (e) => {
      this.controlSettings.colFG.locked = e.target.checked;
    });

    // Settings randomizer control
    const settingsRandomizerControl = document.createElement('li');
    settingsRandomizerControl.innerHTML = `
      <button id="randomize-settings-btn" class="btn">Randomize Settings</button>
    `;
    values.append(settingsRandomizerControl);

    const randomizeNoiseBtn = settingsRandomizerControl.querySelector('#randomize-settings-btn');
    randomizeNoiseBtn.addEventListener('click', () => {
      // Use the internal lock states instead of DOM queries
      const nRowsLocked = this.controlSettings.nRows.locked;
      const lineSpacingLocked = this.controlSettings.lineSpacing.locked;
      const shiftTextPatternLocked = this.controlSettings.shiftTextPattern.locked;
      const useBlanksLocked = this.controlSettings.useBlanks.locked;
      const blanksProbLocked = this.controlSettings.blanksProb.locked;
      const useNoiseLocked = this.controlSettings.useNoise.locked;
      const angularNoiseLocked = this.controlSettings.angularNoise.locked;
      const angularResolutionLocked = this.controlSettings.angularResolution.locked;
      const yScaleFactorLocked = this.controlSettings.yScaleFactor.locked;
      const inverseWidthMappingLocked = this.controlSettings.inverseWidthMapping.locked;
      const noiseScaleLocked = this.controlSettings.noiseScale.locked;
      const noiseOctavesLocked = this.controlSettings.noiseOctaves.locked;
      const noisePersistenceLocked = this.controlSettings.noisePersistence.locked;
      const noiseContrastLocked = this.controlSettings.noiseContrast.locked;
      const noiseLacunarityLocked = this.controlSettings.noiseLacunarity.locked;
      const colBGLocked = this.controlSettings.colBG.locked;
      const colFGLocked = this.controlSettings.colFG.locked;
      
      // Generate random values only for unlocked parameters
      if (!nRowsLocked) {
        const range = this.controlSettings.nRows;
        this.controlSettings.nRows.value = rndInt(range.min, range.max);
      }
      
      if (!lineSpacingLocked) {
        const range = this.controlSettings.lineSpacing;
        this.controlSettings.lineSpacing.value = rndInt(range.min * 10, range.max * 10) / 10;
      }
      
      if (!shiftTextPatternLocked) {
        // Ensure options array exists
        if (!this.controlSettings.shiftTextPattern.options) {
          this.controlSettings.shiftTextPattern.options = ['none', 'forward', 'backward', 'random'];
        }
        this.controlSettings.shiftTextPattern.value = this.controlSettings.shiftTextPattern.options[rndInt(0, this.controlSettings.shiftTextPattern.options.length - 1)];
      }
      
      if (!useBlanksLocked) {
        this.controlSettings.useBlanks.value = Math.random() > 0.6; // 40% chance to use blanks
      }
      
      if (!blanksProbLocked) {
        const range = this.controlSettings.blanksProb;
        this.controlSettings.blanksProb.value = rndInt(range.min, range.max);
      }
      
      if (!useNoiseLocked) {
        this.controlSettings.useNoise.value = Math.random() > 0.2; // 80% chance to use noise
      }
      
      if (!angularNoiseLocked) {
        this.controlSettings.angularNoise.value = Math.random() > 0.5; // 50% chance to use angular noise
      }
      
      if (!angularResolutionLocked) {
        const range = this.controlSettings.angularResolution;
        this.controlSettings.angularResolution.value = rndInt(range.min * 10, range.max * 10) / 10;
      }
      
      if (!yScaleFactorLocked) {
        const range = this.controlSettings.yScaleFactor;
        this.controlSettings.yScaleFactor.value = rndInt(range.min * 10, range.max * 10) / 10;
      }
      
      if (!inverseWidthMappingLocked) {
        this.controlSettings.inverseWidthMapping.value = Math.random() > 0.5; // 50% chance to inverse width mapping
      }
      
      if (!noiseScaleLocked) {
        const range = this.controlSettings.noiseScale;
        this.controlSettings.noiseScale.value = rndInt(range.min * 1000, range.max * 1000) / 1000;
      }
      
      if (!noiseOctavesLocked) {
        const range = this.controlSettings.noiseOctaves;
        this.controlSettings.noiseOctaves.value = rndInt(range.min, range.max);
      }
      
      if (!noisePersistenceLocked) {
        const range = this.controlSettings.noisePersistence;
        this.controlSettings.noisePersistence.value = rndInt(range.min * 10, range.max * 10) / 10;
      }
      
      if (!noiseContrastLocked) {
        const range = this.controlSettings.noiseContrast;
        this.controlSettings.noiseContrast.value = rndInt(range.min * 10, range.max * 10) / 10;
      }
      
      if (!noiseLacunarityLocked) {
        const range = this.controlSettings.noiseLacunarity;
        this.controlSettings.noiseLacunarity.value = rndInt(range.min * 10, range.max * 10) / 10;
      }
      
      // Generate random colors
      if (!colBGLocked) {
        // Generate random dark color for background
        const r = rndInt(0, 80);  // Keep it dark
        const g = rndInt(0, 80);
        const b = rndInt(0, 80);
        this.controlSettings.colBG.value = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
      
      if (!colFGLocked) {
        // Generate random light color for foreground
        const r = rndInt(180, 255);  // Keep it light
        const g = rndInt(180, 255);
        const b = rndInt(180, 255);
        this.controlSettings.colFG.value = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
      
      // Update all the control inputs to reflect new values
      if (!nRowsLocked) {
        slider.value = this.controlSettings.nRows.value;
        input.value = this.controlSettings.nRows.value;
      }
      
      if (!lineSpacingLocked) {
        lineSpacingSlider.value = this.controlSettings.lineSpacing.value;
        lineSpacingInput.value = this.controlSettings.lineSpacing.value;
      }
      
      if (!shiftTextPatternLocked) {
        textPatternShiftSelect.value = this.controlSettings.shiftTextPattern.value;
      }
      
      if (!useBlanksLocked) {
        useBlanksCheckbox.checked = this.controlSettings.useBlanks.value;
      }
      
      if (!blanksProbLocked) {
        blanksProbSlider.value = this.controlSettings.blanksProb.value;
        blanksProbInput.value = this.controlSettings.blanksProb.value;
      }
      
      if (!useNoiseLocked) {
        noiseCheckbox.checked = this.controlSettings.useNoise.value;
      }
      
      if (!angularNoiseLocked) {
        const angularNoiseCheckbox = document.getElementById('angularNoise-checkbox');
        if (angularNoiseCheckbox) {
          angularNoiseCheckbox.checked = this.controlSettings.angularNoise.value;
        }
      }
      
      if (!angularResolutionLocked) {
        const angularResolutionSlider = document.getElementById('angularResolution-slider');
        const angularResolutionInput = document.getElementById('angularResolution-input');
        if (angularResolutionSlider && angularResolutionInput) {
          angularResolutionSlider.value = this.controlSettings.angularResolution.value;
          angularResolutionInput.value = this.controlSettings.angularResolution.value;
        }
      }
      
      if (!yScaleFactorLocked) {
        const yScaleFactorSlider = document.getElementById('yScaleFactor-slider');
        const yScaleFactorInput = document.getElementById('yScaleFactor-input');
        if (yScaleFactorSlider && yScaleFactorInput) {
          yScaleFactorSlider.value = this.controlSettings.yScaleFactor.value;
          yScaleFactorInput.value = this.controlSettings.yScaleFactor.value;
        }
      }
      
      if (!inverseWidthMappingLocked) {
        const inverseWidthMappingCheckbox = document.getElementById('inverseWidthMapping-checkbox');
        if (inverseWidthMappingCheckbox) {
          inverseWidthMappingCheckbox.checked = this.controlSettings.inverseWidthMapping.value;
        }
      }
      
      if (!noiseScaleLocked) {
        noiseScaleSlider.value = this.controlSettings.noiseScale.value;
        noiseScaleInput.value = this.controlSettings.noiseScale.value;
      }
      
      if (!noiseOctavesLocked) {
        noiseOctavesSlider.value = this.controlSettings.noiseOctaves.value;
        noiseOctavesInput.value = this.controlSettings.noiseOctaves.value;
      }
      
      if (!noisePersistenceLocked) {
        noisePersistenceSlider.value = this.controlSettings.noisePersistence.value;
        noisePersistenceInput.value = this.controlSettings.noisePersistence.value;
      }
      
      if (!noiseContrastLocked) {
        noiseContrastSlider.value = this.controlSettings.noiseContrast.value;
        noiseContrastInput.value = this.controlSettings.noiseContrast.value;
      }
      
      if (!noiseLacunarityLocked) {
        noiseLacunaritySlider.value = this.controlSettings.noiseLacunarity.value;
        noiseLacunarityInput.value = this.controlSettings.noiseLacunarity.value;
      }
      
      // Update color controls
      if (!colBGLocked) {
        const backgroundColorInput = document.getElementById('colBG-input');
        const backgroundColorText = document.getElementById('colBG-text');
        if (backgroundColorInput && backgroundColorText) {
          backgroundColorInput.value = this.controlSettings.colBG.value;
          backgroundColorText.value = this.controlSettings.colBG.value;
        }
      }
      
      if (!colFGLocked) {
        const foregroundColorInput = document.getElementById('colFG-input');
        const foregroundColorText = document.getElementById('colFG-text');
        if (foregroundColorInput && foregroundColorText) {
          foregroundColorInput.value = this.controlSettings.colFG.value;
          foregroundColorText.value = this.controlSettings.colFG.value;
        }
      }
      
      // Update sketch with new noise settings
      this.updateSketch();
      
      // Show feedback
      randomizeNoiseBtn.textContent = 'Randomized!';
      setTimeout(() => {
        randomizeNoiseBtn.textContent = 'Randomize Settings';
      }, 1000);
    });

    // Load from SVG control
    const loadFromSvgControl = document.createElement('li');
    loadFromSvgControl.innerHTML = `
      <div class="control-button-group">
        <button id="load-from-svg-btn" class="btn secondary">Load from SVG</button>
      </div>
    `;
    values.append(loadFromSvgControl);

    const loadFromSvgBtn = loadFromSvgControl.querySelector('#load-from-svg-btn');
    
    loadFromSvgBtn.addEventListener('click', () => {
      this.loadSettingsFromFile();
    });

    const btnLi = document.createElement('li');
    btnLi.append(reloadBtn);
    values.append(btnLi);

    this.controlsContainer.append(values);

    reloadBtn.addEventListener('click', () => this.newSketch());
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
      localStorage.setItem('arcSketchSettings', JSON.stringify(settingsData));
      console.log('Settings saved successfully (values and locks only)');
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
    // This is more reliable than embedding in the SVG structure
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
        staticSettings: this.staticSettings
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
              
              // Reinitialize noise if needed
              if (this.controlSettings.useNoise.value) {
                const noiseSeed = this.seed ? Math.floor(this.seed.rnd() * 10000) : Math.floor(Math.random() * 10000);
                this.noise = new SimplexNoise(noiseSeed);
              }
              
              this.updateSketch();
              console.log('Settings loaded from SVG file (values and locks only, preserved ranges)');
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

  getCurrentLockStates() {
    // Sync the internal state with the DOM and return current lock states
    // Update internal state from DOM
    this.controlSettings.nRows.locked = document.getElementById('nRows-lock')?.checked || false;
    this.controlSettings.lineSpacing.locked = document.getElementById('lineSpacing-lock')?.checked || false;
    this.controlSettings.shiftTextPattern.locked = document.getElementById('shiftTextPattern-lock')?.checked || false;
    this.controlSettings.useBlanks.locked = document.getElementById('useBlanks-lock')?.checked || false;
    this.controlSettings.blanksProb.locked = document.getElementById('blanksProb-lock')?.checked || false;
    this.controlSettings.useNoise.locked = document.getElementById('useNoise-lock')?.checked || false;
    this.controlSettings.angularNoise.locked = document.getElementById('angularNoise-lock')?.checked || false;
    this.controlSettings.angularResolution.locked = document.getElementById('angularResolution-lock')?.checked || false;
    this.controlSettings.yScaleFactor.locked = document.getElementById('yScaleFactor-lock')?.checked || false;
    this.controlSettings.inverseWidthMapping.locked = document.getElementById('inverseWidthMapping-lock')?.checked || false;
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
      useBlanks: this.controlSettings.useBlanks.locked,
      blanksProb: this.controlSettings.blanksProb.locked,
      useNoise: this.controlSettings.useNoise.locked,
      angularNoise: this.controlSettings.angularNoise.locked,
      angularResolution: this.controlSettings.angularResolution.locked,
      yScaleFactor: this.controlSettings.yScaleFactor.locked,
      inverseWidthMapping: this.controlSettings.inverseWidthMapping.locked,
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
    
    // Update number of lines controls
    const nRowsSlider = document.getElementById('nRows-slider');
    const nRowsInput = document.getElementById('nRows-input');
    if (nRowsSlider && nRowsInput) {
      nRowsSlider.value = this.controlSettings.nRows.value;
      nRowsInput.value = this.controlSettings.nRows.value;
    }
    
    // Update line spacing controls
    const lineSpacingSlider = document.getElementById('lineSpacing-slider');
    const lineSpacingInput = document.getElementById('lineSpacing-input');
    if (lineSpacingSlider && lineSpacingInput) {
      lineSpacingSlider.value = this.controlSettings.lineSpacing.value;
      lineSpacingInput.value = this.controlSettings.lineSpacing.value;
    }
    
    // Update text pattern shift toggle
    const textPatternShiftSelect = document.getElementById('shiftTextPattern-select');
    if (textPatternShiftSelect) {
      textPatternShiftSelect.value = this.controlSettings.shiftTextPattern.value;
    }
    
    // Update use blanks toggle
    const useBlanksCheckbox = document.getElementById('useBlanks-checkbox');
    if (useBlanksCheckbox) {
      useBlanksCheckbox.checked = this.controlSettings.useBlanks.value;
    }
    
    // Update blanks probability controls
    const blanksProbSlider = document.getElementById('blanksProb-slider');
    const blanksProbInput = document.getElementById('blanksProb-input');
    if (blanksProbSlider && blanksProbInput) {
      blanksProbSlider.value = this.controlSettings.blanksProb.value;
      blanksProbInput.value = this.controlSettings.blanksProb.value;
    }
    
    // Update noise toggle
    const noiseCheckbox = document.getElementById('useNoise-checkbox');
    if (noiseCheckbox) {
      noiseCheckbox.checked = this.controlSettings.useNoise.value;
    }
    
    // Update angular noise toggle
    const angularNoiseCheckbox = document.getElementById('angularNoise-checkbox');
    if (angularNoiseCheckbox) {
      angularNoiseCheckbox.checked = this.controlSettings.angularNoise.value;
    }
    
    // Update angular resolution controls
    const angularResolutionSlider = document.getElementById('angularResolution-slider');
    const angularResolutionInput = document.getElementById('angularResolution-input');
    if (angularResolutionSlider && angularResolutionInput) {
      angularResolutionSlider.value = this.controlSettings.angularResolution.value;
      angularResolutionInput.value = this.controlSettings.angularResolution.value;
    }
    
    // Update Y-scale factor controls
    const yScaleFactorSlider = document.getElementById('yScaleFactor-slider');
    const yScaleFactorInput = document.getElementById('yScaleFactor-input');
    if (yScaleFactorSlider && yScaleFactorInput) {
      yScaleFactorSlider.value = this.controlSettings.yScaleFactor.value;
      yScaleFactorInput.value = this.controlSettings.yScaleFactor.value;
    }
    
    // Update inverse width mapping toggle
    const inverseWidthMappingCheckbox = document.getElementById('inverseWidthMapping-checkbox');
    if (inverseWidthMappingCheckbox) {
      inverseWidthMappingCheckbox.checked = this.controlSettings.inverseWidthMapping.value;
    }
    
    // Update noise scale controls
    const noiseScaleSlider = document.getElementById('noiseScale-slider');
    const noiseScaleInput = document.getElementById('noiseScale-input');
    if (noiseScaleSlider && noiseScaleInput) {
      noiseScaleSlider.value = this.controlSettings.noiseScale.value;
      noiseScaleInput.value = this.controlSettings.noiseScale.value;
    }
    
    // Update noise octaves controls
    const noiseOctavesSlider = document.getElementById('noiseOctaves-slider');
    const noiseOctavesInput = document.getElementById('noiseOctaves-input');
    if (noiseOctavesSlider && noiseOctavesInput) {
      noiseOctavesSlider.value = this.controlSettings.noiseOctaves.value;
      noiseOctavesInput.value = this.controlSettings.noiseOctaves.value;
    }
    
    // Update noise persistence controls
    const noisePersistenceSlider = document.getElementById('noisePersistence-slider');
    const noisePersistenceInput = document.getElementById('noisePersistence-input');
    if (noisePersistenceSlider && noisePersistenceInput) {
      noisePersistenceSlider.value = this.controlSettings.noisePersistence.value;
      noisePersistenceInput.value = this.controlSettings.noisePersistence.value;
    }
    
    // Update noise contrast controls
    const noiseContrastSlider = document.getElementById('noiseContrast-slider');
    const noiseContrastInput = document.getElementById('noiseContrast-input');
    if (noiseContrastSlider && noiseContrastInput) {
      noiseContrastSlider.value = this.controlSettings.noiseContrast.value;
      noiseContrastInput.value = this.controlSettings.noiseContrast.value;
    }
    
    // Update noise lacunarity controls
    const noiseLacunaritySlider = document.getElementById('noiseLacunarity-slider');
    const noiseLacunarityInput = document.getElementById('noiseLacunarity-input');
    if (noiseLacunaritySlider && noiseLacunarityInput) {
      noiseLacunaritySlider.value = this.controlSettings.noiseLacunarity.value;
      noiseLacunarityInput.value = this.controlSettings.noiseLacunarity.value;
    }

    // Update color controls
    const backgroundColorInput = document.getElementById('colBG-input');
    const backgroundColorText = document.getElementById('colBG-text');
    if (backgroundColorInput && backgroundColorText) {
      backgroundColorInput.value = this.controlSettings.colBG.value;
      backgroundColorText.value = this.controlSettings.colBG.value;
    }

    const foregroundColorInput = document.getElementById('colFG-input');
    const foregroundColorText = document.getElementById('colFG-text');
    if (foregroundColorInput && foregroundColorText) {
      foregroundColorInput.value = this.controlSettings.colFG.value;
      foregroundColorText.value = this.controlSettings.colFG.value;
    }
    
    // Restore lock states - either from parameter or from internal state
    let lockStates = locks;
    
    if (!lockStates) {
      // Use internal lock states if not provided as parameter
      lockStates = {
        nRows: this.controlSettings.nRows.locked,
        lineSpacing: this.controlSettings.lineSpacing.locked,
        shiftTextPattern: this.controlSettings.shiftTextPattern.locked,
        useBlanks: this.controlSettings.useBlanks.locked,
        blanksProb: this.controlSettings.blanksProb.locked,
        useNoise: this.controlSettings.useNoise.locked,
        angularNoise: this.controlSettings.angularNoise.locked,
        angularResolution: this.controlSettings.angularResolution.locked,
        yScaleFactor: this.controlSettings.yScaleFactor.locked,
        inverseWidthMapping: this.controlSettings.inverseWidthMapping.locked,
        noiseScale: this.controlSettings.noiseScale.locked,
        noiseOctaves: this.controlSettings.noiseOctaves.locked,
        noisePersistence: this.controlSettings.noisePersistence.locked,
        noiseContrast: this.controlSettings.noiseContrast.locked,
        noiseLacunarity: this.controlSettings.noiseLacunarity.locked,
        colBG: this.controlSettings.colBG.locked,
        colFG: this.controlSettings.colFG.locked
      };
    }
    
    // Apply lock states if available
    if (lockStates) {
      const nRowsLock = document.getElementById('nRows-lock');
      const lineSpacingLock = document.getElementById('lineSpacing-lock');
      const shiftTextPatternLock = document.getElementById('shiftTextPattern-lock');
      const useBlanksLock = document.getElementById('useBlanks-lock');
      const blanksProbLock = document.getElementById('blanksProb-lock');
      const useNoiseLock = document.getElementById('useNoise-lock');
      const angularNoiseLock = document.getElementById('angularNoise-lock');
      const angularResolutionLock = document.getElementById('angularResolution-lock');
      const yScaleFactorLock = document.getElementById('yScaleFactor-lock');
      const inverseWidthMappingLock = document.getElementById('inverseWidthMapping-lock');
      const noiseScaleLock = document.getElementById('noiseScale-lock');
      const noiseOctavesLock = document.getElementById('noiseOctaves-lock');
      const noisePersistenceLock = document.getElementById('noisePersistence-lock');
      const noiseContrastLock = document.getElementById('noiseContrast-lock');
      const noiseLacunarityLock = document.getElementById('noiseLacunarity-lock');
      const colBGLock = document.getElementById('colBG-lock');
      const colFGLock = document.getElementById('colFG-lock');
      
      if (nRowsLock) nRowsLock.checked = lockStates.nRows || false;
      if (lineSpacingLock) lineSpacingLock.checked = lockStates.lineSpacing || false;
      if (shiftTextPatternLock) shiftTextPatternLock.checked = lockStates.shiftTextPattern || false;
      if (useBlanksLock) useBlanksLock.checked = lockStates.useBlanks || false;
      if (blanksProbLock) blanksProbLock.checked = lockStates.blanksProb || false;
      if (useNoiseLock) useNoiseLock.checked = lockStates.useNoise || false;
      if (angularNoiseLock) angularNoiseLock.checked = lockStates.angularNoise || false;
      if (angularResolutionLock) angularResolutionLock.checked = lockStates.angularResolution || false;
      if (yScaleFactorLock) yScaleFactorLock.checked = lockStates.yScaleFactor || false;
      if (inverseWidthMappingLock) inverseWidthMappingLock.checked = lockStates.inverseWidthMapping || false;
      if (noiseScaleLock) noiseScaleLock.checked = lockStates.noiseScale || false;
      if (noiseOctavesLock) noiseOctavesLock.checked = lockStates.noiseOctaves || false;
      if (noisePersistenceLock) noisePersistenceLock.checked = lockStates.noisePersistence || false;
      if (noiseContrastLock) noiseContrastLock.checked = lockStates.noiseContrast || false;
      if (noiseLacunarityLock) noiseLacunarityLock.checked = lockStates.noiseLacunarity || false;
      if (colBGLock) colBGLock.checked = lockStates.colBG || false;
      if (colFGLock) colFGLock.checked = lockStates.colFG || false;
      
      // Update internal state to match
      this.controlSettings.nRows.locked = lockStates.nRows || false;
      this.controlSettings.lineSpacing.locked = lockStates.lineSpacing || false;
      this.controlSettings.shiftTextPattern.locked = lockStates.shiftTextPattern || false;
      this.controlSettings.useBlanks.locked = lockStates.useBlanks || false;
      this.controlSettings.blanksProb.locked = lockStates.blanksProb || false;
      this.controlSettings.useNoise.locked = lockStates.useNoise || false;
      this.controlSettings.angularNoise.locked = lockStates.angularNoise || false;
      this.controlSettings.angularResolution.locked = lockStates.angularResolution || false;
      this.controlSettings.yScaleFactor.locked = lockStates.yScaleFactor || false;
      this.controlSettings.inverseWidthMapping.locked = lockStates.inverseWidthMapping || false;
      this.controlSettings.noiseScale.locked = lockStates.noiseScale || false;
      this.controlSettings.noiseOctaves.locked = lockStates.noiseOctaves || false;
      this.controlSettings.noisePersistence.locked = lockStates.noisePersistence || false;
      this.controlSettings.noiseContrast.locked = lockStates.noiseContrast || false;
      this.controlSettings.noiseLacunarity.locked = lockStates.noiseLacunarity || false;
      this.controlSettings.colBG.locked = lockStates.colBG || false;
      this.controlSettings.colFG.locked = lockStates.colFG || false;
    }
  }
} 