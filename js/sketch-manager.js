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
    
    // Load sketch from URL or default
    const urlParams = new URLSearchParams(window.location.search);
    const sketchFromUrl = urlParams.get('sketch');
    const defaultSketch = this.sketches[sketchFromUrl] ? sketchFromUrl : 'firework';
    
    this.loadSketch(defaultSketch);
  }

  loadSketches() {
    // Register available sketches
    this.sketches = {
      firework: {
        name: 'Firework',
        class: FireworkSketch,
        description: 'Firework pattern with LLAL text'
      },
      arc: {
        name: 'Arc Text',
        class: ArcSketch,
        description: 'Arc text layout with cone pattern'
      }
    };
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
      this.loadSketch(this.currentSketchName, true);
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