// Arc Text sketch - based on vul2
// Cone arc text layout with SVG path generation

class ArcSketch {
  constructor(controlsContainer) {
    this.controlsContainer = controlsContainer;
    this.svg = null;
    this.letters = null;
    this.circles = null;
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
    this.setupTextToPath();
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
      useCircles: false,
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
      widthMin: 50,
      widthMax: 200,
      // Additional noise parameters for more varied patterns
      noiseOctaves: 3,
      noisePersistence: 0.5,
      noiseLacunarity: 2.0,
      noiseContrast: 1.0
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

    document.body.style['background-color'] = '#eee';
    this.svg.stage.style['font-family'] = 'LLAL-linear';
    this.svg.stage.style['background-color'] = this.settings.colBG;

    let a = nVec(0, 0);
    let txt = this.settings.txt;
    let cols = [];

    this.letters = document.createElementNS(this.svg.ns, 'g');
    this.letters.setAttribute('id', 'letters');
    this.svg.stage.append(this.letters);

    this.circles = document.createElementNS(this.svg.ns, 'g');
    this.circles.setAttribute('id', 'circles');
  }

  updateFontSize() {
    // Calculate font size based on available space and number of rows
    const availableHeight = this.svg.h - this.settings.borderTop;
    const lineSpacing = 1.5; // This was the original 1.5 multiplier
    this.settings.fSize = (availableHeight / this.settings.nRows) * lineSpacing + 'px';
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

      this.letters.setAttribute('style', 'filter: url(#swirl)');
      this.circles.setAttribute('style', 'filter: url(#swirl)');
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
    this.svg.makeCircle({ x: cx, y: cy }, rOuter, 'none', '#0f0');

    this.makeArc(cx, cy, rOuter, arcStart, arcEnd);
    this.makeArc(cx, cy, rInner, arcStart, arcEnd);

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
      
      // Create text element that follows the path
      const text = document.createElementNS(this.svg.ns, 'text');
      text.setAttribute('style', `font-size: ${fSize}; fill: ${colFG}; font-family: LLAL-linear;`);
      
      // Create textPath element
      const textPath = document.createElementNS(this.svg.ns, 'textPath');
      textPath.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${pathId}`);
      textPath.setAttribute('startOffset', '0%');
      textPath.setAttribute('spacing', 'auto');
      
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
            const noiseX = i * this.settings.noiseScale * frequency;
            const noiseY = row * this.settings.noiseScale * frequency;
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
          width = Math.round(this.settings.widthMin + (normalizedNoise * (this.settings.widthMax - this.settings.widthMin)));
        } else {
          width = rndInt(this.settings.widthMin, this.settings.widthMax);
        }
        
        span.setAttribute('style', `font-variation-settings: 'wdth' ${width};`);
        span.textContent = fullText[i];
        textPath.appendChild(span);
      }
      
      text.appendChild(textPath);
      this.letters.appendChild(text);
    }
  }

  setupControls() {
    const values = document.createElement('ul');

    const reloadBtn = document.createElement('a');
    reloadBtn.classList.add('btn');
    reloadBtn.setAttribute('id', 'btnreload');
    reloadBtn.append('new seed');

    // Number of lines control
    const linesControl = document.createElement('li');
    linesControl.innerHTML = `
      <label for="nRows-slider">Number of lines: </label>
      <div style="display: flex; align-items: center; gap: 10px;">
        <input type="range" id="nRows-slider" min="5" max="100" value="${this.settings.nRows}" style="width: 150px;">
        <input type="number" id="nRows-input" min="5" max="100" value="${this.settings.nRows}" style="width: 60px;">
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

    // Noise toggle control
    const noiseToggleControl = document.createElement('li');
    noiseToggleControl.innerHTML = `
      <label for="useNoise-checkbox">Use noise for width variations: </label>
      <input type="checkbox" id="useNoise-checkbox" ${this.settings.useNoise ? 'checked' : ''}>
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

    // Noise scale control
    const noiseScaleControl = document.createElement('li');
    noiseScaleControl.innerHTML = `
      <label for="noiseScale-slider">Noise scale: </label>
      <div style="display: flex; align-items: center; gap: 10px;">
        <input type="range" id="noiseScale-slider" min="0.01" max="0.5" step="0.01" value="${this.settings.noiseScale}" style="width: 150px;">
        <input type="number" id="noiseScale-input" min="0.01" max="0.5" step="0.01" value="${this.settings.noiseScale}" style="width: 60px;">
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
    noiseOctavesControl.innerHTML = `
      <label for="noiseOctaves-slider">Noise octaves: </label>
      <div style="display: flex; align-items: center; gap: 10px;">
        <input type="range" id="noiseOctaves-slider" min="1" max="6" step="1" value="${this.settings.noiseOctaves}" style="width: 150px;">
        <input type="number" id="noiseOctaves-input" min="1" max="6" step="1" value="${this.settings.noiseOctaves}" style="width: 60px;">
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
    noisePersistenceControl.innerHTML = `
      <label for="noisePersistence-slider">Noise persistence: </label>
      <div style="display: flex; align-items: center; gap: 10px;">
        <input type="range" id="noisePersistence-slider" min="0.1" max="1.0" step="0.1" value="${this.settings.noisePersistence}" style="width: 150px;">
        <input type="number" id="noisePersistence-input" min="0.1" max="1.0" step="0.1" value="${this.settings.noisePersistence}" style="width: 60px;">
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
    noiseContrastControl.innerHTML = `
      <label for="noiseContrast-slider">Noise contrast: </label>
      <div style="display: flex; align-items: center; gap: 10px;">
        <input type="range" id="noiseContrast-slider" min="0.1" max="3.0" step="0.1" value="${this.settings.noiseContrast}" style="width: 150px;">
        <input type="number" id="noiseContrast-input" min="0.1" max="3.0" step="0.1" value="${this.settings.noiseContrast}" style="width: 60px;">
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

    // Save/Load controls
    const saveLoadControl = document.createElement('li');
    saveLoadControl.innerHTML = `
      <div style="display: flex; gap: 10px;">
        <button id="save-settings-btn" style="padding: 5px 10px;">Save Settings</button>
        <button id="load-settings-btn" style="padding: 5px 10px;">Load Settings</button>
        <button id="load-from-svg-btn" style="padding: 5px 10px;">Load from SVG</button>
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

  setupTextToPath() {
    let session = new SvgTextToPath(document.querySelector('svg'), {
      useFontFace: true,
    });
    let stat = session.replaceAll();
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
    
    // Clear existing text
    if (this.letters) {
      this.letters.innerHTML = '';
    }
    
    // Clear existing arc paths from defs
    const existingPaths = this.defs.querySelectorAll('[id^="arc-path-"]');
    existingPaths.forEach(path => path.remove());
    
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
      localStorage.setItem('arcSketchSettings', JSON.stringify(this.settings));
      console.log('Settings saved successfully');
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('arcSketchSettings');
      if (saved) {
        const loadedSettings = JSON.parse(saved);
        // Merge loaded settings with defaults (preserve any new settings)
        this.settings = { ...this.settings, ...loadedSettings };
        console.log('Settings loaded successfully');
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }

  injectSettingsIntoSVG() {
    // Create metadata element with settings
    const metadata = document.createElementNS(this.svg.ns, 'metadata');
    metadata.setAttribute('id', 'sketch-settings');
    
    // Create a JSON element with the settings
    const settingsJson = document.createElementNS(this.svg.ns, 'text');
    settingsJson.setAttribute('id', 'settings-data');
    settingsJson.style.display = 'none';
    settingsJson.textContent = JSON.stringify(this.settings, null, 2);
    
    metadata.appendChild(settingsJson);
    
    // Add to SVG defs
    this.defs.appendChild(metadata);
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
            
            // Find settings metadata
            const settingsElement = svgDoc.querySelector('#settings-data');
            if (settingsElement) {
              const settings = JSON.parse(settingsElement.textContent);
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
} 