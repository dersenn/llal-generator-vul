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
    const aspect = docWidth / docHeight;

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

    // Create settings object directly
    this.settings = {
      useFilter: false,
      useBlanks: false,
      blanksProb: rndInt(40, 75),
      borderTop: 0,
      wdths: [50, 100, 150, 200],
      nCols: 20,
      nRows: 60,
      leftAngle: 24,
      rightAngle: 24,
      colBG: '#ffffff',
      colFG: '#000000',
      txt: 'LLAL',
      // Noise settings for width variations
      useNoise: true,
      noiseScale: 0.1,
      noiseOctaves: 3,
      noisePersistence: 0.5,
      noiseLacunarity: 2.0,
      noiseContrast: 1.0,
      normalizeNoise: true,
      // Text pattern options
      shiftTextPattern: true,
      // Line spacing (affects font size)
      lineSpacing: 1.5
    };

    // Control ranges configuration
    this.controlRanges = {
      nRows: { min: 10, max: 300, step: 1 },
      lineSpacing: { min: 0.5, max: 3.0, step: 0.1 },
      blanksProb: { min: 10, max: 90, step: 5 },
      noiseScale: { min: 0.01, max: 0.5, step: 0.01 },
      noiseOctaves: { min: 1, max: 6, step: 1 },
      noisePersistence: { min: 0.1, max: 1.0, step: 0.1 },
      noiseContrast: { min: 0.1, max: 3.0, step: 0.1 },
      noiseLacunarity: { min: 1.0, max: 4.0, step: 0.1 }
    };

    // Load saved settings if available
    this.loadSettings();

    // Initialize noise generator using the main seed system
    if (this.settings.useNoise) {
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
    this.svg.stage.style['background-color'] = this.settings.colBG;
  }

  createWidthStyles() {
    // Create style element following Illustrator SVG pattern
    const style = document.createElementNS(this.svg.ns, 'style');
    style.setAttribute('type', 'text/css');
    
    // Define CSS classes for each width variation using distinct font files
    const cssRules = `
      .st0 { font-size: ${this.settings.fSize}; fill: ${this.settings.colFG}; }
      .width-50 { font-family: 'LLALLogoLinear-Condensed'; }
      .width-100 { font-family: 'LLALLogoLinear-Regular'; }
      .width-150 { font-family: 'LLALLogoLinear-Extended'; }
      .width-200 { font-family: 'LLALLogoLinear-Expanded'; }
    `;
    
    style.textContent = cssRules;
    this.defs.appendChild(style);
  }

  updateFontSize() {
    // Calculate font size based on available space and number of rows
    const availableHeight = this.svg.h - this.settings.borderTop;
    this.settings.fSize = (availableHeight / this.settings.nRows) * this.settings.lineSpacing + 'px';
  }

  createFilter() {
    this.fSet = {
      rows: this.settings.nRows,
      blnkProb: this.settings.blanksProb,
      seed: Math.round(rnd() * 100),
      freqX: Math.round((rndInt(40, 100) / 10000) * 100000) / 100000,
      freqY: Math.round((rndInt(40, 100) / 10000) * 100000) / 100000,
      nOct: rndInt(5, 20),
      scale: rndInt(75, 120)
    };

    if (this.settings.useFilter) {
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
    path.setAttribute('stroke', '#f00');
    path.setAttribute('stroke-width', 5);
    
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

  createArcText() {
    const rOuter = 376 * this.mmToPx;
    const rInner = 100 * this.mmToPx;
    const cx = this.svg.w / 2;
    const cy = this.svg.h - rOuter; // center above SVG, arc at bottom

    const arcStart = 90 + this.settings.leftAngle;   // bottom-right of circle
    const arcEnd = 90 - this.settings.rightAngle;      // bottom-left of circle

    this.drawControlPoints = true;

    // Draw reference circle
    // this.svg.makeCircle({ x: cx, y: cy }, rOuter, 'none', '#0f0');

    // this.makeArc(cx, cy, rOuter, arcStart, arcEnd);
    // this.makeArc(cx, cy, rInner, arcStart, arcEnd);

    // Generate multiple lines of text along the arcs
    this.createArcTextLines(cx, cy, rOuter, rInner, arcStart, arcEnd);
  }

  createArcTextLines(cx, cy, rOuter, rInner, arcStart, arcEnd) {
    const { nRows, fSize, txt, colFG } = this.settings;
    
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
      
      // Apply text pattern shifting if enabled
      if (this.settings.shiftTextPattern) {
        // Shift the starting position by row number
        const shiftAmount = row % txt.length;
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
        if (this.settings.useNoise && this.noise) {
          // Create multi-octave noise for more varied patterns
          let noiseValue = 0;
          let amplitude = 1.0;
          let frequency = 1.0;
          
          for (let octave = 0; octave < this.settings.noiseOctaves; octave++) {
            let noiseX, noiseY;
            if (this.settings.normalizeNoise) {
              // Calculate the widest row's arc length and character count (last row)
              const widestRadius = rInner + ((nRows - 1) * radiusStep);
              const widestArcLength = widestRadius * Math.abs(rad(arcEnd - arcStart));
              const widestCharCount = Math.ceil(widestArcLength / (parseFloat(fSize) * 0.4 * txt.length)) * txt.length;
              
              // Map current character to the widest row's grid
              const currentArcLength = radius * Math.abs(rad(arcEnd - arcStart));
              const relativePosition = i / fullText.length; // 0 to 1 along current row
              const mappedCharIndex = relativePosition * widestCharCount; // Map to widest row scale
              
              // Use mapped position for consistent noise sampling
              noiseX = mappedCharIndex * this.settings.noiseScale * frequency;
              noiseY = row * this.settings.noiseScale * frequency;
            } else {
              // Use character index directly (creates skewed pattern)
              noiseX = i * this.settings.noiseScale * frequency;
              noiseY = row * this.settings.noiseScale * frequency;
            }
            noiseValue += this.noise.noise2D(noiseX, noiseY) * amplitude;
            
            amplitude *= this.settings.noisePersistence;
            frequency *= this.settings.noiseLacunarity;
          }
          
          // Apply contrast to create sharper transitions
          const contrast = this.settings.noiseContrast;
          if (contrast !== 1.0) {
            noiseValue = Math.sign(noiseValue) * Math.pow(Math.abs(noiseValue), contrast);
          }
          
          // Map noise value (-1 to 1) to width range
          const normalizedNoise = (noiseValue + 1) / 2; // 0 to 1
          
          // Use predefined width steps for CSS classes
          const widthIndex = Math.floor(normalizedNoise * (this.settings.wdths.length - 1));
          width = this.settings.wdths[widthIndex];
        } else {
          // Random predefined width
          width = this.settings.wdths[rndInt(0, this.settings.wdths.length - 1)];
        }
        
        // Set the width variation using CSS class
        span.setAttribute('class', `st0 width-${width}`);
        
        // Apply transparent fill if useBlanks is enabled
        if (this.settings.useBlanks && Math.random() * 100 < this.settings.blanksProb) {
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
    const nRowsRange = this.controlRanges.nRows;
    linesControl.innerHTML = `
      <label for="nRows-slider">Number of lines: </label>
      <div style="display: flex; align-items: center; gap: 10px;">
        <input type="range" id="nRows-slider" min="${nRowsRange.min}" max="${nRowsRange.max}" step="${nRowsRange.step}" value="${this.settings.nRows}" style="width: 150px;">
        <input type="number" id="nRows-input" min="${nRowsRange.min}" max="${nRowsRange.max}" step="${nRowsRange.step}" value="${this.settings.nRows}" style="width: 60px;">
        <label style="display: flex; align-items: center; gap: 5px; margin-left: 10px;">
          <input type="checkbox" id="nRows-lock" style="margin: 0;">
          <span style="font-size: 0.9em;">🔒</span>
        </label>
      </div>
    `;
    values.append(linesControl);

    // Link slider and input
    const slider = linesControl.querySelector('#nRows-slider');
    const input = linesControl.querySelector('#nRows-input');
    
    slider.addEventListener('input', (e) => {
      input.value = e.target.value;
      this.settings.nRows = parseInt(e.target.value);
      this.updateSketch();
    });
    
    input.addEventListener('input', (e) => {
      slider.value = e.target.value;
      this.settings.nRows = parseInt(e.target.value);
      this.updateSketch();
    });

    // Line spacing control (affects font size)
    const lineSpacingControl = document.createElement('li');
    const lineSpacingRange = this.controlRanges.lineSpacing;
    lineSpacingControl.innerHTML = `
      <label for="lineSpacing-slider">Line spacing (font size): </label>
      <div style="display: flex; align-items: center; gap: 10px;">
        <input type="range" id="lineSpacing-slider" min="${lineSpacingRange.min}" max="${lineSpacingRange.max}" step="${lineSpacingRange.step}" value="${this.settings.lineSpacing}" style="width: 150px;">
        <input type="number" id="lineSpacing-input" min="${lineSpacingRange.min}" max="${lineSpacingRange.max}" step="${lineSpacingRange.step}" value="${this.settings.lineSpacing}" style="width: 60px;">
        <label style="display: flex; align-items: center; gap: 5px; margin-left: 10px;">
          <input type="checkbox" id="lineSpacing-lock" checked style="margin: 0;">
          <span style="font-size: 0.9em;">🔒</span>
        </label>
      </div>
    `;
    values.append(lineSpacingControl);

    const lineSpacingSlider = lineSpacingControl.querySelector('#lineSpacing-slider');
    const lineSpacingInput = lineSpacingControl.querySelector('#lineSpacing-input');
    
    lineSpacingSlider.addEventListener('input', (e) => {
      lineSpacingInput.value = e.target.value;
      this.settings.lineSpacing = parseFloat(e.target.value);
      this.updateSketch();
    });
    
    lineSpacingInput.addEventListener('input', (e) => {
      lineSpacingSlider.value = e.target.value;
      this.settings.lineSpacing = parseFloat(e.target.value);
      this.updateSketch();
    });

    // Text pattern shifting control
    const textPatternShiftControl = document.createElement('li');
    textPatternShiftControl.innerHTML = `
      <label for="shiftTextPattern-checkbox">Shift text pattern per row: </label>
      <div style="display: flex; align-items: center; gap: 10px;">
        <input type="checkbox" id="shiftTextPattern-checkbox" ${this.settings.shiftTextPattern ? 'checked' : ''}>
        <label style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" id="shiftTextPattern-lock" checked style="margin: 0;">
          <span style="font-size: 0.9em;">🔒</span>
        </label>
      </div>
    `;
    values.append(textPatternShiftControl);

    const textPatternShiftCheckbox = textPatternShiftControl.querySelector('#shiftTextPattern-checkbox');
    textPatternShiftCheckbox.addEventListener('change', (e) => {
      this.settings.shiftTextPattern = e.target.checked;
      this.updateSketch();
    });

    // Use blanks control
    const useBlanksControl = document.createElement('li');
    useBlanksControl.innerHTML = `
      <label for="useBlanks-checkbox">Use transparent letters: </label>
      <div style="display: flex; align-items: center; gap: 10px;">
        <input type="checkbox" id="useBlanks-checkbox" ${this.settings.useBlanks ? 'checked' : ''}>
        <label style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" id="useBlanks-lock" checked style="margin: 0;">
          <span style="font-size: 0.9em;">🔒</span>
        </label>
      </div>
    `;
    values.append(useBlanksControl);

    const useBlanksCheckbox = useBlanksControl.querySelector('#useBlanks-checkbox');
    useBlanksCheckbox.addEventListener('change', (e) => {
      this.settings.useBlanks = e.target.checked;
      this.updateSketch();
    });

    // Blanks probability control
    const blanksProbControl = document.createElement('li');
    const blanksProbRange = this.controlRanges.blanksProb;
    blanksProbControl.innerHTML = `
      <label for="blanksProb-slider">Transparent letters probability (%): </label>
      <div style="display: flex; align-items: center; gap: 10px;">
        <input type="range" id="blanksProb-slider" min="${blanksProbRange.min}" max="${blanksProbRange.max}" step="${blanksProbRange.step}" value="${this.settings.blanksProb}" style="width: 150px;">
        <input type="number" id="blanksProb-input" min="${blanksProbRange.min}" max="${blanksProbRange.max}" step="${blanksProbRange.step}" value="${this.settings.blanksProb}" style="width: 60px;">
        <label style="display: flex; align-items: center; gap: 5px; margin-left: 10px;">
          <input type="checkbox" id="blanksProb-lock" style="margin: 0;">
          <span style="font-size: 0.9em;">🔒</span>
        </label>
      </div>
    `;
    values.append(blanksProbControl);

    const blanksProbSlider = blanksProbControl.querySelector('#blanksProb-slider');
    const blanksProbInput = blanksProbControl.querySelector('#blanksProb-input');
    
    blanksProbSlider.addEventListener('input', (e) => {
      blanksProbInput.value = e.target.value;
      this.settings.blanksProb = parseInt(e.target.value);
      this.updateSketch();
    });
    
    blanksProbInput.addEventListener('input', (e) => {
      blanksProbSlider.value = e.target.value;
      this.settings.blanksProb = parseInt(e.target.value);
      this.updateSketch();
    });

    // Noise toggle control
    const noiseToggleControl = document.createElement('li');
    noiseToggleControl.innerHTML = `
      <label for="useNoise-checkbox">Use noise: </label>
      <div style="display: flex; align-items: center; gap: 10px;">
        <input type="checkbox" id="useNoise-checkbox" ${this.settings.useNoise ? 'checked' : ''}>
        <label style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" id="useNoise-lock" checked style="margin: 0;">
          <span style="font-size: 0.9em;">🔒</span>
        </label>
      </div>
    `;
    values.append(noiseToggleControl);

    const noiseCheckbox = noiseToggleControl.querySelector('#useNoise-checkbox');
    noiseCheckbox.addEventListener('change', (e) => {
      this.settings.useNoise = e.target.checked;
      if (this.settings.useNoise && !this.noise) {
        // Use the main seed for noise consistency
        const noiseSeed = this.seed ? Math.floor(this.seed.rnd() * 10000) : Math.floor(Math.random() * 10000);
        this.noise = new SimplexNoise(noiseSeed);
      }
      this.updateSketch();
    });

    // Normalize noise control
    const normalizeNoiseControl = document.createElement('li');
    normalizeNoiseControl.innerHTML = `
      <label for="normalizeNoise-checkbox">Normalize noise across rows: </label>
      <div style="display: flex; align-items: center; gap: 10px;">
        <input type="checkbox" id="normalizeNoise-checkbox" ${this.settings.normalizeNoise ? 'checked' : ''}>
        <label style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" id="normalizeNoise-lock" checked style="margin: 0;">
          <span style="font-size: 0.9em;">🔒</span>
        </label>
      </div>
    `;
    values.append(normalizeNoiseControl);

    const normalizeNoiseCheckbox = normalizeNoiseControl.querySelector('#normalizeNoise-checkbox');
    normalizeNoiseCheckbox.addEventListener('change', (e) => {
      this.settings.normalizeNoise = e.target.checked;
      this.updateSketch();
    });

    // Noise scale control
    const noiseScaleControl = document.createElement('li');
    const noiseScaleRange = this.controlRanges.noiseScale;
    noiseScaleControl.innerHTML = `
      <label for="noiseScale-slider">Noise scale: </label>
      <div style="display: flex; align-items: center; gap: 10px;">
        <input type="range" id="noiseScale-slider" min="${noiseScaleRange.min}" max="${noiseScaleRange.max}" step="${noiseScaleRange.step}" value="${this.settings.noiseScale}" style="width: 150px;">
        <input type="number" id="noiseScale-input" min="${noiseScaleRange.min}" max="${noiseScaleRange.max}" step="${noiseScaleRange.step}" value="${this.settings.noiseScale}" style="width: 60px;">
        <label style="display: flex; align-items: center; gap: 5px; margin-left: 10px;">
          <input type="checkbox" id="noiseScale-lock" style="margin: 0;">
          <span style="font-size: 0.9em;">🔒</span>
        </label>
      </div>
    `;
    values.append(noiseScaleControl);

    const noiseScaleSlider = noiseScaleControl.querySelector('#noiseScale-slider');
    const noiseScaleInput = noiseScaleControl.querySelector('#noiseScale-input');
    
    noiseScaleSlider.addEventListener('input', (e) => {
      noiseScaleInput.value = e.target.value;
      this.settings.noiseScale = parseFloat(e.target.value);
      this.updateSketch();
    });
    
    noiseScaleInput.addEventListener('input', (e) => {
      noiseScaleSlider.value = e.target.value;
      this.settings.noiseScale = parseFloat(e.target.value);
      this.updateSketch();
    });

    // Noise octaves control
    const noiseOctavesControl = document.createElement('li');
    const noiseOctavesRange = this.controlRanges.noiseOctaves;
    noiseOctavesControl.innerHTML = `
      <label for="noiseOctaves-slider">Noise octaves: </label>
      <div style="display: flex; align-items: center; gap: 10px;">
        <input type="range" id="noiseOctaves-slider" min="${noiseOctavesRange.min}" max="${noiseOctavesRange.max}" step="${noiseOctavesRange.step}" value="${this.settings.noiseOctaves}" style="width: 150px;">
        <input type="number" id="noiseOctaves-input" min="${noiseOctavesRange.min}" max="${noiseOctavesRange.max}" step="${noiseOctavesRange.step}" value="${this.settings.noiseOctaves}" style="width: 60px;">
        <label style="display: flex; align-items: center; gap: 5px; margin-left: 10px;">
          <input type="checkbox" id="noiseOctaves-lock" style="margin: 0;">
          <span style="font-size: 0.9em;">🔒</span>
        </label>
      </div>
    `;
    values.append(noiseOctavesControl);

    const noiseOctavesSlider = noiseOctavesControl.querySelector('#noiseOctaves-slider');
    const noiseOctavesInput = noiseOctavesControl.querySelector('#noiseOctaves-input');
    
    noiseOctavesSlider.addEventListener('input', (e) => {
      noiseOctavesInput.value = e.target.value;
      this.settings.noiseOctaves = parseInt(e.target.value);
      this.updateSketch();
    });
    
    noiseOctavesInput.addEventListener('input', (e) => {
      noiseOctavesSlider.value = e.target.value;
      this.settings.noiseOctaves = parseInt(e.target.value);
      this.updateSketch();
    });

    // Noise persistence control
    const noisePersistenceControl = document.createElement('li');
    const noisePersistenceRange = this.controlRanges.noisePersistence;
    noisePersistenceControl.innerHTML = `
      <label for="noisePersistence-slider">Noise persistence: </label>
      <div style="display: flex; align-items: center; gap: 10px;">
        <input type="range" id="noisePersistence-slider" min="${noisePersistenceRange.min}" max="${noisePersistenceRange.max}" step="${noisePersistenceRange.step}" value="${this.settings.noisePersistence}" style="width: 150px;">
        <input type="number" id="noisePersistence-input" min="${noisePersistenceRange.min}" max="${noisePersistenceRange.max}" step="${noisePersistenceRange.step}" value="${this.settings.noisePersistence}" style="width: 60px;">
        <label style="display: flex; align-items: center; gap: 5px; margin-left: 10px;">
          <input type="checkbox" id="noisePersistence-lock" style="margin: 0;">
          <span style="font-size: 0.9em;">🔒</span>
        </label>
      </div>
    `;
    values.append(noisePersistenceControl);

    const noisePersistenceSlider = noisePersistenceControl.querySelector('#noisePersistence-slider');
    const noisePersistenceInput = noisePersistenceControl.querySelector('#noisePersistence-input');
    
    noisePersistenceSlider.addEventListener('input', (e) => {
      noisePersistenceInput.value = e.target.value;
      this.settings.noisePersistence = parseFloat(e.target.value);
      this.updateSketch();
    });
    
    noisePersistenceInput.addEventListener('input', (e) => {
      noisePersistenceSlider.value = e.target.value;
      this.settings.noisePersistence = parseFloat(e.target.value);
      this.updateSketch();
    });

    // Noise contrast control
    const noiseContrastControl = document.createElement('li');
    const noiseContrastRange = this.controlRanges.noiseContrast;
    noiseContrastControl.innerHTML = `
      <label for="noiseContrast-slider">Noise contrast: </label>
      <div style="display: flex; align-items: center; gap: 10px;">
        <input type="range" id="noiseContrast-slider" min="${noiseContrastRange.min}" max="${noiseContrastRange.max}" step="${noiseContrastRange.step}" value="${this.settings.noiseContrast}" style="width: 150px;">
        <input type="number" id="noiseContrast-input" min="${noiseContrastRange.min}" max="${noiseContrastRange.max}" step="${noiseContrastRange.step}" value="${this.settings.noiseContrast}" style="width: 60px;">
        <label style="display: flex; align-items: center; gap: 5px; margin-left: 10px;">
          <input type="checkbox" id="noiseContrast-lock" style="margin: 0;">
          <span style="font-size: 0.9em;">🔒</span>
        </label>
      </div>
    `;
    values.append(noiseContrastControl);

    const noiseContrastSlider = noiseContrastControl.querySelector('#noiseContrast-slider');
    const noiseContrastInput = noiseContrastControl.querySelector('#noiseContrast-input');
    
    noiseContrastSlider.addEventListener('input', (e) => {
      noiseContrastInput.value = e.target.value;
      this.settings.noiseContrast = parseFloat(e.target.value);
      this.updateSketch();
    });
    
    noiseContrastInput.addEventListener('input', (e) => {
      noiseContrastSlider.value = e.target.value;
      this.settings.noiseContrast = parseFloat(e.target.value);
      this.updateSketch();
    });

    // Noise lacunarity control
    const noiseLacunarityControl = document.createElement('li');
    const noiseLacunarityRange = this.controlRanges.noiseLacunarity;
    noiseLacunarityControl.innerHTML = `
      <label for="noiseLacunarity-slider">Noise lacunarity: </label>
      <div style="display: flex; align-items: center; gap: 10px;">
        <input type="range" id="noiseLacunarity-slider" min="${noiseLacunarityRange.min}" max="${noiseLacunarityRange.max}" step="${noiseLacunarityRange.step}" value="${this.settings.noiseLacunarity}" style="width: 150px;">
        <input type="number" id="noiseLacunarity-input" min="${noiseLacunarityRange.min}" max="${noiseLacunarityRange.max}" step="${noiseLacunarityRange.step}" value="${this.settings.noiseLacunarity}" style="width: 60px;">
        <label style="display: flex; align-items: center; gap: 5px; margin-left: 10px;">
          <input type="checkbox" id="noiseLacunarity-lock" style="margin: 0;">
          <span style="font-size: 0.9em;">🔒</span>
        </label>
      </div>
    `;
    values.append(noiseLacunarityControl);

    const noiseLacunaritySlider = noiseLacunarityControl.querySelector('#noiseLacunarity-slider');
    const noiseLacunarityInput = noiseLacunarityControl.querySelector('#noiseLacunarity-input');
    
    noiseLacunaritySlider.addEventListener('input', (e) => {
      noiseLacunarityInput.value = e.target.value;
      this.settings.noiseLacunarity = parseFloat(e.target.value);
      this.updateSketch();
    });
    
    noiseLacunarityInput.addEventListener('input', (e) => {
      noiseLacunaritySlider.value = e.target.value;
      this.settings.noiseLacunarity = parseFloat(e.target.value);
      this.updateSketch();
    });

    // Noise randomizer control
    const noiseRandomizerControl = document.createElement('li');
    noiseRandomizerControl.innerHTML = `
      <button id="randomize-noise-btn" class="btn">Randomize Settings</button>
    `;
    values.append(noiseRandomizerControl);

    const randomizeNoiseBtn = noiseRandomizerControl.querySelector('#randomize-noise-btn');
    randomizeNoiseBtn.addEventListener('click', () => {
      // Check lock states before randomizing
      const nRowsLocked = document.getElementById('nRows-lock').checked;
      const lineSpacingLocked = document.getElementById('lineSpacing-lock').checked;
      const shiftTextPatternLocked = document.getElementById('shiftTextPattern-lock').checked;
      const useBlanksLocked = document.getElementById('useBlanks-lock').checked;
      const blanksProbLocked = document.getElementById('blanksProb-lock').checked;
      const useNoiseLocked = document.getElementById('useNoise-lock').checked;
      const normalizeNoiseLocked = document.getElementById('normalizeNoise-lock').checked;
      const noiseScaleLocked = document.getElementById('noiseScale-lock').checked;
      const noiseOctavesLocked = document.getElementById('noiseOctaves-lock').checked;
      const noisePersistenceLocked = document.getElementById('noisePersistence-lock').checked;
      const noiseContrastLocked = document.getElementById('noiseContrast-lock').checked;
      const noiseLacunarityLocked = document.getElementById('noiseLacunarity-lock').checked;
      
      // Generate random values only for unlocked parameters using centralized ranges
      if (!nRowsLocked) {
        const range = this.controlRanges.nRows;
        this.settings.nRows = rndInt(range.min, range.max);
      }
      
      if (!lineSpacingLocked) {
        const range = this.controlRanges.lineSpacing;
        this.settings.lineSpacing = rndInt(range.min * 10, range.max * 10) / 10;
      }
      
      if (!shiftTextPatternLocked) {
        this.settings.shiftTextPattern = Math.random() > 0.5;
      }
      
      if (!useBlanksLocked) {
        this.settings.useBlanks = Math.random() > 0.6; // 40% chance to use blanks
      }
      
      if (!blanksProbLocked) {
        const range = this.controlRanges.blanksProb;
        this.settings.blanksProb = rndInt(range.min, range.max);
      }
      
      if (!useNoiseLocked) {
        this.settings.useNoise = Math.random() > 0.2; // 80% chance to use noise
      }
      
      if (!normalizeNoiseLocked) {
        this.settings.normalizeNoise = Math.random() > 0.5; // 50% chance to normalize noise
      }
      
      if (!noiseScaleLocked) {
        const range = this.controlRanges.noiseScale;
        this.settings.noiseScale = rndInt(range.min * 100, range.max * 100) / 100;
      }
      
      if (!noiseOctavesLocked) {
        const range = this.controlRanges.noiseOctaves;
        this.settings.noiseOctaves = rndInt(range.min, range.max);
      }
      
      if (!noisePersistenceLocked) {
        const range = this.controlRanges.noisePersistence;
        this.settings.noisePersistence = rndInt(range.min * 10, range.max * 10) / 10;
      }
      
      if (!noiseContrastLocked) {
        const range = this.controlRanges.noiseContrast;
        this.settings.noiseContrast = rndInt(range.min * 10, range.max * 10) / 10;
      }
      
      if (!noiseLacunarityLocked) {
        const range = this.controlRanges.noiseLacunarity;
        this.settings.noiseLacunarity = rndInt(range.min * 10, range.max * 10) / 10;
      }
      
      // Update all the control inputs to reflect new values
      if (!nRowsLocked) {
        slider.value = this.settings.nRows;
        input.value = this.settings.nRows;
      }
      
      if (!lineSpacingLocked) {
        lineSpacingSlider.value = this.settings.lineSpacing;
        lineSpacingInput.value = this.settings.lineSpacing;
      }
      
      if (!shiftTextPatternLocked) {
        textPatternShiftCheckbox.checked = this.settings.shiftTextPattern;
      }
      
      if (!useBlanksLocked) {
        useBlanksCheckbox.checked = this.settings.useBlanks;
      }
      
      if (!blanksProbLocked) {
        blanksProbSlider.value = this.settings.blanksProb;
        blanksProbInput.value = this.settings.blanksProb;
      }
      
      if (!useNoiseLocked) {
        noiseCheckbox.checked = this.settings.useNoise;
      }
      
      if (!normalizeNoiseLocked) {
        normalizeNoiseCheckbox.checked = this.settings.normalizeNoise;
      }
      
      if (!noiseScaleLocked) {
        noiseScaleSlider.value = this.settings.noiseScale;
        noiseScaleInput.value = this.settings.noiseScale;
      }
      
      if (!noiseOctavesLocked) {
        noiseOctavesSlider.value = this.settings.noiseOctaves;
        noiseOctavesInput.value = this.settings.noiseOctaves;
      }
      
      if (!noisePersistenceLocked) {
        noisePersistenceSlider.value = this.settings.noisePersistence;
        noisePersistenceInput.value = this.settings.noisePersistence;
      }
      
      if (!noiseContrastLocked) {
        noiseContrastSlider.value = this.settings.noiseContrast;
        noiseContrastInput.value = this.settings.noiseContrast;
      }
      
      if (!noiseLacunarityLocked) {
        noiseLacunaritySlider.value = this.settings.noiseLacunarity;
        noiseLacunarityInput.value = this.settings.noiseLacunarity;
      }
      
      // Update sketch with new noise settings
      this.updateSketch();
      
      // Show feedback
      randomizeNoiseBtn.textContent = 'Randomized!';
      setTimeout(() => {
        randomizeNoiseBtn.textContent = 'Randomize Noise Settings';
      }, 1000);
    });

    // Save/Load controls
    const saveLoadControl = document.createElement('li');
    saveLoadControl.innerHTML = `
      <div style="display: flex; gap: 10px;">
        <button id="save-settings-btn" class="btn secondary">Save Settings</button>
        <button id="load-settings-btn" class="btn secondary">Load Settings</button>
        <button id="load-from-svg-btn" class="btn secondary">Load from SVG</button>
      </div>
    `;
    values.append(saveLoadControl);

    const saveBtn = saveLoadControl.querySelector('#save-settings-btn');
    const loadBtn = saveLoadControl.querySelector('#load-settings-btn');
    const loadFromSvgBtn = saveLoadControl.querySelector('#load-from-svg-btn');
    
    saveBtn.addEventListener('click', () => {
      this.saveSettings();
      // Show feedback
      saveBtn.textContent = 'Saved!';
      setTimeout(() => {
        saveBtn.textContent = 'Save Settings';
      }, 1000);
    });
    
    loadBtn.addEventListener('click', () => {
      this.loadSettings();
      this.updateSketch();
      // Show feedback
      loadBtn.textContent = 'Loaded!';
      setTimeout(() => {
        loadBtn.textContent = 'Load Settings';
      }, 1000);
    });

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
    
    // Clear existing text elements
    const existingTexts = this.svg.stage.querySelectorAll('text');
    existingTexts.forEach(text => text.remove());
    
    // Clear existing arc paths and styles from defs
    const existingPaths = this.defs.querySelectorAll('[id^="arc-path-"]');
    existingPaths.forEach(path => path.remove());
    const existingStyles = this.defs.querySelectorAll('style');
    existingStyles.forEach(style => style.remove());
    
    // Recreate styles with updated font size
    this.createWidthStyles();
    
    // Regenerate arc text with new settings
    const rOuter = 376 * this.mmToPx;
    const rInner = 100 * this.mmToPx;
    const cx = this.svg.w / 2;
    const cy = this.svg.h - rOuter;
    const arcStart = 90 + this.settings.leftAngle;
    const arcEnd = 90 - this.settings.rightAngle;
    
    this.createArcTextLines(cx, cy, rOuter, rInner, arcStart, arcEnd);
  }

  cleanup() {
    // Cleanup any resources if needed
    if (this.svg && this.svg.stage) {
      // Remove any event listeners or timers if they exist
    }
  }

  saveSettings() {
    try {
      // Save both settings and lock states
      const settingsData = {
        settings: this.settings,
        locks: {
          nRows: document.getElementById('nRows-lock')?.checked || false,
          lineSpacing: document.getElementById('lineSpacing-lock')?.checked || false,
          shiftTextPattern: document.getElementById('shiftTextPattern-lock')?.checked || false,
          useBlanks: document.getElementById('useBlanks-lock')?.checked || false,
          blanksProb: document.getElementById('blanksProb-lock')?.checked || false,
          useNoise: document.getElementById('useNoise-lock')?.checked || false,
          normalizeNoise: document.getElementById('normalizeNoise-lock')?.checked || false,
          noiseScale: document.getElementById('noiseScale-lock')?.checked || false,
          noiseOctaves: document.getElementById('noiseOctaves-lock')?.checked || false,
          noisePersistence: document.getElementById('noisePersistence-lock')?.checked || false,
          noiseContrast: document.getElementById('noiseContrast-lock')?.checked || false,
          noiseLacunarity: document.getElementById('noiseLacunarity-lock')?.checked || false
        }
      };
      localStorage.setItem('arcSketchSettings', JSON.stringify(settingsData));
      console.log('Settings saved successfully');
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('arcSketchSettings');
      if (saved) {
        const settingsData = JSON.parse(saved);
        
        // Handle both old format (just settings) and new format (settings + locks)
        if (settingsData.settings) {
          // New format with locks
          this.settings = { ...this.settings, ...settingsData.settings };
          
          // Restore lock states
          if (settingsData.locks) {
            setTimeout(() => {
              // Use setTimeout to ensure DOM elements are ready
              const nRowsLock = document.getElementById('nRows-lock');
              const lineSpacingLock = document.getElementById('lineSpacing-lock');
              const shiftTextPatternLock = document.getElementById('shiftTextPattern-lock');
              const useBlanksLock = document.getElementById('useBlanks-lock');
              const blanksProbLock = document.getElementById('blanksProb-lock');
              const useNoiseLock = document.getElementById('useNoise-lock');
              const normalizeNoiseLock = document.getElementById('normalizeNoise-lock');
              const noiseScaleLock = document.getElementById('noiseScale-lock');
              const noiseOctavesLock = document.getElementById('noiseOctaves-lock');
              const noisePersistenceLock = document.getElementById('noisePersistence-lock');
              const noiseContrastLock = document.getElementById('noiseContrast-lock');
              const noiseLacunarityLock = document.getElementById('noiseLacunarity-lock');
              
              if (nRowsLock) nRowsLock.checked = settingsData.locks.nRows || false;
              if (lineSpacingLock) lineSpacingLock.checked = settingsData.locks.lineSpacing || false;
              if (shiftTextPatternLock) shiftTextPatternLock.checked = settingsData.locks.shiftTextPattern || false;
              if (useBlanksLock) useBlanksLock.checked = settingsData.locks.useBlanks || false;
              if (blanksProbLock) blanksProbLock.checked = settingsData.locks.blanksProb || false;
              if (useNoiseLock) useNoiseLock.checked = settingsData.locks.useNoise || false;
              if (normalizeNoiseLock) normalizeNoiseLock.checked = settingsData.locks.normalizeNoise || false;
              if (noiseScaleLock) noiseScaleLock.checked = settingsData.locks.noiseScale || false;
              if (noiseOctavesLock) noiseOctavesLock.checked = settingsData.locks.noiseOctaves || false;
              if (noisePersistenceLock) noisePersistenceLock.checked = settingsData.locks.noisePersistence || false;
              if (noiseContrastLock) noiseContrastLock.checked = settingsData.locks.noiseContrast || false;
              if (noiseLacunarityLock) noiseLacunarityLock.checked = settingsData.locks.noiseLacunarity || false;
            }, 100);
          }
        } else {
          // Old format (just settings)
          this.settings = { ...this.settings, ...settingsData };
        }
        
        console.log('Settings loaded successfully');
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
      svgElement.setAttribute('data-sketch-settings', JSON.stringify(this.settings));
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
              const settings = JSON.parse(svgElement.getAttribute('data-sketch-settings'));
              // Merge with current settings
              this.settings = { ...this.settings, ...settings };
              
              // Reinitialize noise if needed
              if (this.settings.useNoise) {
                const noiseSeed = this.seed ? Math.floor(this.seed.rnd() * 10000) : Math.floor(Math.random() * 10000);
                this.noise = new SimplexNoise(noiseSeed);
              }
              
              this.updateSketch();
              console.log('Settings loaded from SVG file');
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

  restoreControlsFromSettings() {
    // This method is called by the sketch manager when reloading with preserved settings
    // It updates all control inputs to reflect the current settings
    if (!this.settings) return;
    
    const settings = this.settings;
    
    // Update number of lines controls
    const nRowsSlider = document.getElementById('nRows-slider');
    const nRowsInput = document.getElementById('nRows-input');
    if (nRowsSlider && nRowsInput && settings.nRows !== undefined) {
      nRowsSlider.value = settings.nRows;
      nRowsInput.value = settings.nRows;
    }
    
    // Update line spacing controls
    const lineSpacingSlider = document.getElementById('lineSpacing-slider');
    const lineSpacingInput = document.getElementById('lineSpacing-input');
    if (lineSpacingSlider && lineSpacingInput && settings.lineSpacing !== undefined) {
      lineSpacingSlider.value = settings.lineSpacing;
      lineSpacingInput.value = settings.lineSpacing;
    }
    
    // Update text pattern shift toggle
    const textPatternShiftCheckbox = document.getElementById('shiftTextPattern-checkbox');
    if (textPatternShiftCheckbox && settings.shiftTextPattern !== undefined) {
      textPatternShiftCheckbox.checked = settings.shiftTextPattern;
    }
    
    // Update use blanks toggle
    const useBlanksCheckbox = document.getElementById('useBlanks-checkbox');
    if (useBlanksCheckbox && settings.useBlanks !== undefined) {
      useBlanksCheckbox.checked = settings.useBlanks;
    }
    
    // Update blanks probability controls
    const blanksProbSlider = document.getElementById('blanksProb-slider');
    const blanksProbInput = document.getElementById('blanksProb-input');
    if (blanksProbSlider && blanksProbInput && settings.blanksProb !== undefined) {
      blanksProbSlider.value = settings.blanksProb;
      blanksProbInput.value = settings.blanksProb;
    }
    
    // Update noise toggle
    const noiseCheckbox = document.getElementById('useNoise-checkbox');
    if (noiseCheckbox && settings.useNoise !== undefined) {
      noiseCheckbox.checked = settings.useNoise;
    }
    
    // Update normalize noise toggle
    const normalizeNoiseCheckbox = document.getElementById('normalizeNoise-checkbox');
    if (normalizeNoiseCheckbox && settings.normalizeNoise !== undefined) {
      normalizeNoiseCheckbox.checked = settings.normalizeNoise;
    }
    
    // Update noise scale controls
    const noiseScaleSlider = document.getElementById('noiseScale-slider');
    const noiseScaleInput = document.getElementById('noiseScale-input');
    if (noiseScaleSlider && noiseScaleInput && settings.noiseScale !== undefined) {
      noiseScaleSlider.value = settings.noiseScale;
      noiseScaleInput.value = settings.noiseScale;
    }
    
    // Update noise octaves controls
    const noiseOctavesSlider = document.getElementById('noiseOctaves-slider');
    const noiseOctavesInput = document.getElementById('noiseOctaves-input');
    if (noiseOctavesSlider && noiseOctavesInput && settings.noiseOctaves !== undefined) {
      noiseOctavesSlider.value = settings.noiseOctaves;
      noiseOctavesInput.value = settings.noiseOctaves;
    }
    
    // Update noise persistence controls
    const noisePersistenceSlider = document.getElementById('noisePersistence-slider');
    const noisePersistenceInput = document.getElementById('noisePersistence-input');
    if (noisePersistenceSlider && noisePersistenceInput && settings.noisePersistence !== undefined) {
      noisePersistenceSlider.value = settings.noisePersistence;
      noisePersistenceInput.value = settings.noisePersistence;
    }
    
    // Update noise contrast controls
    const noiseContrastSlider = document.getElementById('noiseContrast-slider');
    const noiseContrastInput = document.getElementById('noiseContrast-input');
    if (noiseContrastSlider && noiseContrastInput && settings.noiseContrast !== undefined) {
      noiseContrastSlider.value = settings.noiseContrast;
      noiseContrastInput.value = settings.noiseContrast;
    }
    
    // Update noise lacunarity controls
    const noiseLacunaritySlider = document.getElementById('noiseLacunarity-slider');
    const noiseLacunarityInput = document.getElementById('noiseLacunarity-input');
    if (noiseLacunaritySlider && noiseLacunarityInput && settings.noiseLacunarity !== undefined) {
      noiseLacunaritySlider.value = settings.noiseLacunarity;
      noiseLacunarityInput.value = settings.noiseLacunarity;
    }
    
    // Load lock states from localStorage if available
    try {
      const saved = localStorage.getItem('arcSketchSettings');
      if (saved) {
        const settingsData = JSON.parse(saved);
        if (settingsData.locks) {
          const nRowsLock = document.getElementById('nRows-lock');
          const lineSpacingLock = document.getElementById('lineSpacing-lock');
          const shiftTextPatternLock = document.getElementById('shiftTextPattern-lock');
          const useBlanksLock = document.getElementById('useBlanks-lock');
          const blanksProbLock = document.getElementById('blanksProb-lock');
          const useNoiseLock = document.getElementById('useNoise-lock');
          const normalizeNoiseLock = document.getElementById('normalizeNoise-lock');
          const noiseScaleLock = document.getElementById('noiseScale-lock');
          const noiseOctavesLock = document.getElementById('noiseOctaves-lock');
          const noisePersistenceLock = document.getElementById('noisePersistence-lock');
          const noiseContrastLock = document.getElementById('noiseContrast-lock');
          const noiseLacunarityLock = document.getElementById('noiseLacunarity-lock');
          
          if (nRowsLock) nRowsLock.checked = settingsData.locks.nRows || false;
          if (lineSpacingLock) lineSpacingLock.checked = settingsData.locks.lineSpacing || false;
          if (shiftTextPatternLock) shiftTextPatternLock.checked = settingsData.locks.shiftTextPattern || false;
          if (useBlanksLock) useBlanksLock.checked = settingsData.locks.useBlanks || false;
          if (blanksProbLock) blanksProbLock.checked = settingsData.locks.blanksProb || false;
          if (useNoiseLock) useNoiseLock.checked = settingsData.locks.useNoise || false;
          if (normalizeNoiseLock) normalizeNoiseLock.checked = settingsData.locks.normalizeNoise || false;
          if (noiseScaleLock) noiseScaleLock.checked = settingsData.locks.noiseScale || false;
          if (noiseOctavesLock) noiseOctavesLock.checked = settingsData.locks.noiseOctaves || false;
          if (noisePersistenceLock) noisePersistenceLock.checked = settingsData.locks.noisePersistence || false;
          if (noiseContrastLock) noiseContrastLock.checked = settingsData.locks.noiseContrast || false;
          if (noiseLacunarityLock) noiseLacunarityLock.checked = settingsData.locks.noiseLacunarity || false;
        }
      }
    } catch (e) {
      console.error('Failed to restore lock states:', e);
    }
  }
} 