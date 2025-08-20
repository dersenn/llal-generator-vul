settings.js


    this.controlSettings = {
      // Layout controls
      nRows: {
        type: 'range',
        label: 'Number of lines',
        min: 60,
        max: 180,
        step: 1,
        default: 144,
        value: 72,
        locked: true,
        hidden: false
      },
      lineSpacing: {
        type: 'range',
        label: 'Line spacing (font size)',
        min: 0.5,
        max: 3.0,
        step: 0.1,
        default: 1.5,
        value: 1.5,
        locked: true,
        hidden: true
      },
      
      // Text controls
      shiftTextPattern: {
        type: 'select',
        label: 'Shift text',
        options: ['none', 'forward', 'backward', 'random'],
        default: 'forward',
        value: 'forward',
        locked: true,
        hidden: true
      },
      centerText: {
        type: 'toggle',
        label: 'Center text on paths',
        default: true,
        value: false,
        locked: true,
        hidden: false
      },
      
      // Noise controls
      angularNoise: {
        type: 'toggle',
        label: 'Angular noise',
        default: false,
        value: true,
        locked: true,
        hidden: false
      },
      angularResolution: {
        type: 'range',
        label: 'Angular grid resolution (°)',
        min: 0.05,
        max: 0.9,
        step: 0.05,
        default: 0.15,
        value: 0.15,
        locked: true,
        hidden: true
      },
      yScaleFactor: {
        type: 'range',
        label: 'Y-axis pattern scale',
        min: 0.05,
        max: 5.0,
        step: 0.05,
        default: 0.45,
        value: 0.45,
        locked: true,
        hidden: true
      },
      noiseScale: {
        type: 'range',
        label: 'Noise scale',
        min: 0.001,
        max: 0.1,
        step: 0.001,
        default: 0.06,
        value: 0.06,
        locked: true,
        hidden: false
      },
      noiseOctaves: {
        type: 'range',
        label: 'Noise octaves',
        min: 1,
        max: 6,
        step: 1,
        default: 3,
        value: 4,
        locked: true,
        hidden: false
      },
      noisePersistence: {
        type: 'range',
        label: 'Noise persistence',
        min: 0.1,
        max: 1.0,
        step: 0.1,
        default: 0.6,
        value: 0.2,
        locked: true,
        hidden: false
      },
      noiseContrast: {
        type: 'range',
        label: 'Noise contrast',
        min: 0.1,
        max: 3.0,
        step: 0.1,
        default: 0.9,
        value: 0.9,
        locked: true,
        hidden: false
      },
      noiseLacunarity: {
        type: 'range',
        label: 'Noise lacunarity',
        min: 0.05,
        max: 1.5,
        step: 0.05,
        default: 0.75,
        value: 1.0,
        locked: true,
        hidden: false
      },
      inverseWidthMapping: {
        type: 'toggle',
        label: 'Inverse width mapping',
        default: false,
        value: false,
        locked: true,
        hidden: true
      },

      // Font size variation controls
      fontSizeVariation: {
        type: 'toggle',
        label: 'Font size variation',
        default: false,
        value: false,
        locked: true,
        hidden: true
      },
      fontSizeVariationAmount: {
        type: 'range',
        label: 'Font size variation amount',
        min: 0.1,
        max: 2.0,
        step: 0.1,
        default: 0.3,
        value: 0.3,
        locked: true,
        hidden: true
      },
      fontSizeNoiseScale: {
        type: 'range',
        label: 'Font size noise scale',
        min: 0.005,
        max: 0.1,
        step: 0.005,
        default: 0.05,
        value: 0.05,
        locked: true,
        hidden: true
      },
      adaptiveSpacing: {
        type: 'toggle',
        label: 'Adaptive row spacing',
        default: true,
        value: true,
        locked: true,
        hidden: true
      },

      // Transparency controls
      useTransparency: {
        type: 'toggle',
        label: 'Use transparency',
        default: true,
        value: true,
        locked: true,
        hidden: false
      },

      // Color controls
      colBG: {
        type: 'color',
        label: 'Background color',
        default: '#ffffff',
        value: '#ffffff',
        locked: true,
        hidden: false
      },
      colFG: {
        type: 'color',
        label: 'Text color',
        default: '#000000',
        value: '#000000',
        locked: true,
        hidden: false
      },

      // Control visibility
      showAdvancedControls: {
        type: 'toggle',
        label: 'Show advanced controls',
        default: false,
        value: false,
        locked: true,
        hidden: false
      }
    };
