// Make sketchManager globally available immediately
window.sketchManager = null;

class SketchManager {
  constructor() {
    this.currentSketch = null;
    this.currentSketchName = null;
    this.sketches = {};
    this.svg = null;
    this.controls = document.getElementById('sketch-controls');
    this.sketchSelect = document.getElementById('sketch-select');
    
    // Set global reference
    window.sketchManager = this;
    
    this.init();
  }

  init() {
    // Load all available sketches
    this.loadSketches();
    
    // Set up event listeners
    this.sketchSelect.addEventListener('change', (e) => {
      this.loadSketch(e.target.value);
    });
    
    // Load sketch from URL or default to first sketch
    const urlParams = new URLSearchParams(window.location.search);
    const sketchFromUrl = urlParams.get('sketch');
    const defaultSketch = this.sketches[sketchFromUrl] ? sketchFromUrl : Object.keys(this.sketches)[0];
    
    this.loadSketch(defaultSketch);
  }

  loadSketches() {
    // Automatically discover and register sketches
    // This is the only place you need to modify to add a new sketch
    const sketchDefinitions = [
      {
        name: 'firework-01',
        displayName: 'Firework 01',
        class: FireworkSketch,
        description: 'Firework pattern with LLAL text'
      },
      {
        name: 'arc-01',
        displayName: 'Arc Text 01',
        class: ArcSketch,
        description: 'Arc text layout with cone pattern'
      }
      // To add a new sketch, just add an entry here:
      // {
      //   name: 'my-new-sketch',
      //   displayName: 'My New Sketch',
      //   class: MyNewSketch,
      //   description: 'Description of my new sketch'
      // }
    ];

    // Register sketches
    this.sketches = {};
    sketchDefinitions.forEach(sketch => {
      this.sketches[sketch.name] = {
        name: sketch.displayName,
        class: sketch.class,
        description: sketch.description
      };
    });

    // Update the dropdown options
    this.updateSketchDropdown();
  }

  updateSketchDropdown() {
    // Clear existing options
    this.sketchSelect.innerHTML = '';
    
    // Add options for each sketch
    Object.entries(this.sketches).forEach(([key, sketch]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = sketch.name;
      this.sketchSelect.appendChild(option);
    });
  }

  loadSketch(sketchName, useNewSeed = false) {
    if (this.currentSketch && this.currentSketch.cleanup) {
      this.currentSketch.cleanup();
    }

    // Clear existing SVG
    if (this.svg && this.svg.stage) {
      this.svg.stage.remove();
    }

    // Clear controls
    this.controls.innerHTML = '';

    try {
      // Get the sketch class
      const SketchClass = this.sketches[sketchName].class;
      
      if (!SketchClass) {
        throw new Error(`Sketch class not found for: ${sketchName}`);
      }
      
      // Initialize the new sketch
      this.currentSketch = new SketchClass(this.controls);
      
      // If we want a new seed, generate it and regenerate the random number generator
      if (useNewSeed && this.currentSketch.seed) {
        this.currentSketch.seed.update();
        // Regenerate the random number generator with the new hash
        this.currentSketch.seed.hashTrunc = this.currentSketch.seed.hash.slice(2);
        this.currentSketch.seed.regex = new RegExp('.{' + ((this.currentSketch.seed.hashTrunc.length / 4) | 0) + '}', 'g');
        this.currentSketch.seed.hashes = this.currentSketch.seed.hashTrunc.match(this.currentSketch.seed.regex).map((h) => this.currentSketch.seed.b58dec(h));
        this.currentSketch.seed.rnd = this.currentSketch.seed.sfc32(...this.currentSketch.seed.hashes);
      }
      
      // Set global seed for engine functions to access
      if (this.currentSketch.seed) {
        window.seed = this.currentSketch.seed;
      }
      
      this.currentSketch.init();
      this.currentSketchName = sketchName;
      
      // Update URL with current sketch and seed
      this.updateURL();
      
      // Update dropdown to match current sketch
      this.sketchSelect.value = sketchName;
      
      console.log(`Loaded sketch: ${sketchName}${useNewSeed ? ' with new seed' : ''}`);
    } catch (error) {
      console.error(`Failed to load sketch ${sketchName}:`, error);
      this.controls.innerHTML = `<p>Error loading sketch: ${error.message}</p>`;
    }
  }

  updateURL() {
    const url = new URL(window.location.href);
    
    // Update sketch parameter
    if (this.currentSketchName) {
      url.searchParams.set('sketch', this.currentSketchName);
    }
    
    // Update seed parameter
    if (this.currentSketch && this.currentSketch.seed) {
      url.searchParams.set('seed', this.currentSketch.seed.hash);
    }
    
    // Update URL without reloading the page
    window.history.replaceState({}, '', url);
  }

  reloadCurrentSketch() {
    if (this.currentSketchName) {
      // Preserve current settings if the sketch has them
      let preservedSettings = null;
      if (this.currentSketch && this.currentSketch.settings) {
        preservedSettings = { ...this.currentSketch.settings };
      }
      
      this.loadSketch(this.currentSketchName, true);
      
      // Restore settings if we had them
      if (preservedSettings && this.currentSketch && this.currentSketch.settings) {
        this.currentSketch.settings = { ...this.currentSketch.settings, ...preservedSettings };
        
        // Update all control inputs to reflect the restored settings
        this.updateControlsFromSettings();
        
        // Update the sketch with restored settings
        if (this.currentSketch.updateSketch) {
          this.currentSketch.updateSketch();
        }
      }
    }
  }

  updateControlsFromSettings() {
    if (!this.currentSketch || !this.currentSketch.settings) return;
    
    const settings = this.currentSketch.settings;
    
    // Update number of lines controls
    const nRowsSlider = document.getElementById('nRows-slider');
    const nRowsInput = document.getElementById('nRows-input');
    if (nRowsSlider && nRowsInput && settings.nRows) {
      nRowsSlider.value = settings.nRows;
      nRowsInput.value = settings.nRows;
    }
    
    // Update noise toggle
    const noiseCheckbox = document.getElementById('useNoise-checkbox');
    if (noiseCheckbox && settings.useNoise !== undefined) {
      noiseCheckbox.checked = settings.useNoise;
    }
    
    // Update predefined widths toggle
    const predefinedWidthsCheckbox = document.getElementById('usePredefinedWidths-checkbox');
    if (predefinedWidthsCheckbox && settings.usePredefinedWidths !== undefined) {
      predefinedWidthsCheckbox.checked = settings.usePredefinedWidths;
    }
    
    // Update text pattern shift toggle
    const textPatternShiftCheckbox = document.getElementById('shiftTextPattern-checkbox');
    if (textPatternShiftCheckbox && settings.shiftTextPattern !== undefined) {
      textPatternShiftCheckbox.checked = settings.shiftTextPattern;
    }
    
    // Update text-to-path toggle
    const textToPathCheckbox = document.getElementById('enableTextToPath-checkbox');
    if (textToPathCheckbox && settings.enableTextToPath !== undefined) {
      textToPathCheckbox.checked = settings.enableTextToPath;
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
  }

  getCurrentSketch() {
    return this.currentSketch;
  }

  getSvg() {
    return this.svg;
  }

  setSvg(svg) {
    this.svg = svg;
  }
} 