# Firework Pattern Generator

A generative SVG pattern creator that produces firework-like patterns using text elements. Built on top of an existing pattern generator but modified to create radial, explosive patterns.

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