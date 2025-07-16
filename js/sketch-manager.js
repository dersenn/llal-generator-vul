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
        name: 'arc-01',
        displayName: 'Vulkanmuster',
        class: ArcSketch,
        description: 'Arc text layout with cone pattern'
      },
      {
        name: 'rect-01',
        displayName: 'Flächenmuster',
        class: RectSketch,
        description: 'Rectangular text layout with horizontal paths'
      },
      {
        name: 'firework-01',
        displayName: 'Firework 01 (alt)',
        class: FireworkSketch,
        description: 'Firework pattern with LLAL text'
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
      let preservedLocks = null;
      
      if (this.currentSketch && this.currentSketch.controlSettings) {
        preservedSettings = { ...this.currentSketch.controlSettings };
      }
      
      // Preserve lock states using the sketch's own method
      if (this.currentSketch && typeof this.currentSketch.getCurrentLockStates === 'function') {
        preservedLocks = this.currentSketch.getCurrentLockStates();
      }
      
      this.loadSketch(this.currentSketchName, true);
      
      // If we had preserved settings and the sketch can restore controls, let it handle that
      if (preservedSettings && this.currentSketch) {
        console.log('Restoring preserved settings...');
        console.log('Preserved shiftTextPattern:', preservedSettings.shiftTextPattern);
        
        // Restore settings with deep merge to preserve structure like options arrays
        if (this.currentSketch.controlSettings) {
          Object.keys(preservedSettings).forEach(key => {
            if (this.currentSketch.controlSettings[key]) {
              // For shiftTextPattern, preserve the options array while restoring value and locked state
              if (key === 'shiftTextPattern') {
                this.currentSketch.controlSettings[key] = {
                  ...this.currentSketch.controlSettings[key],
                  ...preservedSettings[key],
                  options: this.currentSketch.controlSettings[key].options || ['none', 'forward', 'backward', 'random']
                };
                console.log('Restored shiftTextPattern:', this.currentSketch.controlSettings[key]);
              } else {
                this.currentSketch.controlSettings[key] = { ...this.currentSketch.controlSettings[key], ...preservedSettings[key] };
              }
            }
          });
        }
        
        // Let the sketch restore its own controls if it has this capability
        if (typeof this.currentSketch.restoreControlsFromSettings === 'function') {
          this.currentSketch.restoreControlsFromSettings(preservedLocks);
        }
        
        // Update the sketch with restored settings
        if (typeof this.currentSketch.updateSketch === 'function') {
          this.currentSketch.updateSketch();
        }
      }
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