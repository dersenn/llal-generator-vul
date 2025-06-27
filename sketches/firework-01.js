// Firework sketch - based on vul1
// https://redstapler.co/realistic-water-effect-svg-turbulence-filter/
// https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/

class FireworkSketch {
  constructor(controlsContainer) {
    this.controlsContainer = controlsContainer;
    this.svg = null;
    this.letters = null;
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
    this.createFirework();
    this.setupControls();
    this.setupTextToPath();
    this.updateHashDisplay();
  }

  setupSVG() {
    // MEASUREMENTS FOR PRINT
    const docWidth = 306;
    const docHeight = 275;
    const aspect = docWidth / docHeight;

    // Calculate dimensions to fit the browser window while maintaining aspect ratio
    const maxWidth = window.innerWidth * 0.9; // 90% of window width
    const maxHeight = window.innerHeight * 0.9; // 90% of window height

    let scaledWidth, scaledHeight;
    if (maxWidth / maxHeight > aspect) {
      // Height is the limiting factor
      scaledHeight = maxHeight;
      scaledWidth = scaledHeight * aspect;
    } else {
      // Width is the limiting factor
      scaledWidth = maxWidth;
      scaledHeight = scaledWidth / aspect;
    }

    const setup = {
      id: 'mySVG',
      parent: document.body,
      width: scaledWidth,
      height: scaledHeight,
      presAspect: 'xMidYMid meet',
    };

    this.svg = new SVG(setup);
    if (window.sketchManager) {
      window.sketchManager.setSvg(this.svg);
    }
  }

  setupSketch() {
    this.defs = document.createElementNS(this.svg.ns, 'defs');
    this.svg.stage.prepend(this.defs);

    // Firework settings
    const useFilter = true;
    const useBlanks = true;
    const useCircles = false;

    const blanksProb = rndInt(10, 50); // Probability of blank elements
    const nRays = rndInt(5, 15); // Number of rays in the firework
    const nElements = rndInt(2, 10); // Number of elements per ray
    const centerX = this.svg.w / 2;
    const centerY = this.svg.h / 2;
    const maxRadius = Math.min(this.svg.w, this.svg.h) * 0.4; // Maximum radius of the firework

    // Calculate base font size
    const baseFontSize = rndInt(10, 30); // Starting font size
    const fontSizeScale = 1.5; // How much to increase font size per element

    const colBG = '#ffffff';
    const colFG = '#000000';

    this.svg.stage.style['font-family'] = 'LLAL-linear';
    this.svg.stage.style['background-color'] = colBG;

    this.letters = document.createElementNS(this.svg.ns, 'g');
    this.letters.setAttribute('id', 'letters');
    this.svg.stage.append(this.letters);

    // Store settings for later use
    this.settings = {
      useFilter,
      useBlanks,
      useCircles,
      blanksProb,
      nRays,
      nElements,
      centerX,
      centerY,
      maxRadius,
      baseFontSize,
      fontSizeScale,
      colBG,
      colFG
    };
  }

  createFilter() {
    this.fSet = {
      seed: Math.round(rnd() * 100),
      freqX: Math.round((rndInt(40, 100) / 10000) * 100000) / 100000,
      freqY: Math.round((rndInt(40, 100) / 10000) * 100000) / 100000,
      nOct: rndInt(5, 20),
      scale: rndInt(75, 120)
    };

    if (this.settings.useFilter) {
      // Create turbulence filter
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
    }
  }

  createFirework() {
    const { nRays, nElements, centerX, centerY, baseFontSize, fontSizeScale, colBG, colFG, blanksProb, useBlanks } = this.settings;

    // Create firework pattern
    for (let ray = 0; ray < nRays; ray++) {
      const angle = (ray / nRays) * Math.PI * 2;
      let currentRadius = 0;

      for (let element = 0; element < nElements; element++) {
        const x = centerX + Math.cos(angle) * currentRadius;
        const y = centerY + Math.sin(angle) * currentRadius;

        // Calculate font size based on element position
        const elementFontSize = baseFontSize * Math.pow(fontSizeScale, element);

        let text = document.createElementNS(this.svg.ns, 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('style', `font-size: ${elementFontSize}px; transform-origin: ${x}px ${y}px; transform: rotate(${angle}rad)`);

        let span = document.createElementNS(this.svg.ns, 'tspan');
        let fill = colFG;
        if (useBlanks) {
          if (coinToss(blanksProb)) {
            fill = colBG;
          }
        }
        span.setAttribute('style', `font-variation-settings: 'wdth' ${rndInt(50, 200)}; fill: ${fill}`);
        span.innerHTML = 'LLAL';
        text.append(span);
        this.letters.append(text);

        // Calculate the width of this element and add it to the radius for the next element
        const bbox = text.getBBox();
        currentRadius += bbox.width;
      }
    }
  }

  setupControls() {
    const values = document.createElement('ul');

    const reloadBtn = document.createElement('a');
    reloadBtn.classList.add('btn');
    reloadBtn.setAttribute('id', 'btnreload');
    reloadBtn.append('new seed');

    for (const property in this.fSet) {
      const prop = document.createElement('li');
      prop.append(`${property}: ${this.fSet[property]}`);
      values.append(prop);
    }

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

  cleanup() {
    // Cleanup any resources if needed
    if (this.svg && this.svg.stage) {
      // Remove any event listeners or timers if they exist
    }
  }
} 