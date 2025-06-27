# LLAL Generator - Vul

A generative artwork system for creating variations of LLAL text-based designs.

## New Unified System

This project now uses a unified system that allows you to switch between different sketch variations without duplicating code. Instead of creating separate folders for each version, all sketches are organized as modules that can be loaded dynamically.

### Structure

```
llal-generator-vul/
├── index.html              # Main entry point with sketch selector
├── style.css               # Unified styles
├── js/
│   ├── sketch-manager.js   # Manages loading and switching between sketches
│   └── main.js            # Main entry point
├── sketches/
│   ├── firework.js        # Firework pattern (based on vul1)
│   └── arc.js             # Arc text layout (based on vul2)
└── assets/                # Shared assets (fonts, engine, etc.)
```

### How to Use

1. **Open `index.html`** in your browser
2. **Select a sketch** from the dropdown in the controls panel
3. **Use the "new" button** to generate new variations with different seeds
4. **Switch between sketches** at any time using the dropdown

### Adding New Sketches

To add a new sketch variation:

1. Create a new file in the `sketches/` directory (e.g., `sketches/my-new-sketch.js`)
2. Create a class that follows this pattern:

```javascript
class MyNewSketch {
  constructor(controlsContainer) {
    this.controlsContainer = controlsContainer;
    this.svg = null;
    // ... other properties
  }

  init() {
    // Initialize your sketch
    this.setupSVG();
    this.setupSketch();
    this.createArtwork();
    this.setupControls();
    this.setupTextToPath();
  }

  setupSVG() {
    // Set up SVG with your dimensions
    const setup = {
      id: 'mySVG',
      parent: document.body,
      width: yourWidth,
      height: yourHeight,
      presAspect: 'xMidYMid meet',
    };
    this.svg = new SVG(setup);
    sketchManager.setSvg(this.svg);
  }

  setupSketch() {
    // Initialize your sketch settings
  }

  createArtwork() {
    // Create your artwork
  }

  setupControls() {
    // Set up your controls
  }

  setupTextToPath() {
    // Convert text to paths
    let session = new SvgTextToPath(document.querySelector('svg'), {
      useFontFace: true,
    });
    let stat = session.replaceAll();
  }

  cleanup() {
    // Clean up resources if needed
  }
}
```

3. Add the script to `index.html`:
```html
<script src="sketches/my-new-sketch.js"></script>
```

4. Register it in `js/sketch-manager.js`:
```javascript
this.sketches = {
  // ... existing sketches
  'my-new-sketch': {
    name: 'My New Sketch',
    class: MyNewSketch,
    description: 'Description of my new sketch'
  }
};
```

5. Add it to the dropdown in `index.html`:
```html
<option value="my-new-sketch">My New Sketch</option>
```

### Legacy Folders

The `vul1/` and `vul2/` folders are kept for reference but are no longer needed for the main system. The sketches have been converted to modules in the `sketches/` directory.

### Features

- **Dynamic sketch switching** without page reload
- **Shared assets** (fonts, engine, etc.) to avoid duplication
- **Consistent control interface** across all sketches
- **Easy to extend** with new sketch variations
- **Seed-based randomization** for reproducible variations

### Technical Details

- Uses vanilla JavaScript (no frameworks)
- SVG-based artwork generation
- Modular architecture for easy maintenance
- Responsive design that adapts to window size
- Font variation support for dynamic typography

## Features

### Radial Pattern Generation
- Creates a pattern of text elements ("LLAL") arranged in rays
- Number of rays: Random between 5-15 (`nRays`)
- Elements per ray: Random between 2-10 (`nElements`)
- Elements grow larger as they extend from the center

### Dynamic Sizing
- Base font size: Random between 10-30px
- Font size scaling: 1.5x per element (elements get 50% larger as they extend outward)
- Spacing automatically adjusts based on actual text width

### Randomization Features
- Random blank elements (10-50% probability)
- Random width variations for each text element (50-200)
- Optional turbulence filter for distortion effects

### Responsive Design
- Canvas automatically scales to fit browser window
- Maintains aspect ratio
- Uses 90% of available window space

## Usage

### Basic Setup
```javascript
const useFilter = true/false  // Toggle distortion effect
const useBlanks = true/false  // Toggle random blank elements
const blanksProb = rndInt(10, 50)  // Adjust blank probability
```

### Pattern Configuration
```javascript
const nRays = rndInt(5, 15)  // Number of rays
const nElements = rndInt(2, 10)  // Elements per ray
const baseFontSize = rndInt(10, 30)  // Starting font size
const fontSizeScale = 1.5  // Size increase per element
```

### Visual Settings
```javascript
const colBG = '#ffffff'  // Background color
const colFG = '#000000'  // Text color
```

## Implementation Details

### Key Functions
- The pattern is created by iterating through rays and elements
- Each element's position is calculated using polar coordinates
- Spacing is automatically calculated based on actual text width
- The turbulence filter (when enabled) creates a distorted, explosive effect

### Dependencies
- Requires an SVG library (referenced as `SVG` in the code)
- Uses custom functions like `rndInt()`, `coinToss()`, and `nVec()`
- Requires the 'LLAL-linear' font family

## Customization Tips

1. Adjust `fontSizeScale` to change how quickly elements grow
2. Modify `blanksProb` range to change the density of blank elements
3. Adjust `nRays` and `nElements` ranges to change the pattern density
4. The turbulence filter settings can be modified in the `fSet` object

## License
[Add your license information here] 