// https://redstapler.co/realistic-water-effect-svg-turbulence-filter/
// https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/


// INIT

const useSeed = true
let seed
if (useSeed) {
  seed = new Hash()
} else {
  seed = false
}


// MEASUREMENTS FOR PRINT

const docWidth = 306
const docHeight = 275
const aspect = docWidth / docHeight

// Calculate dimensions to fit the browser window while maintaining aspect ratio
const maxWidth = window.innerWidth * 0.9 // 90% of window width
const maxHeight = window.innerHeight * 0.9 // 90% of window height

let scaledWidth, scaledHeight
if (maxWidth / maxHeight > aspect) {
  // Height is the limiting factor
  scaledHeight = maxHeight
  scaledWidth = scaledHeight * aspect
} else {
  // Width is the limiting factor
  scaledWidth = maxWidth
  scaledHeight = scaledWidth / aspect
}

console.log(aspect, docWidth / aspect)

// SETUP SVG

const setup = {
      id: 'mySVG',
      parent: document.body,
      width: scaledWidth,
      height: scaledHeight,
      presAspect: 'xMidYMid meet', // Changed to better handle aspect ratio
}

let svg = new SVG(setup)



// SETUP SKETCH

let defs = document.createElementNS(svg.ns, 'defs')
svg.stage.prepend(defs)

// Firework settings
const useFilter = true // Make filter optional again
const useBlanks = true
const useCircles = false

const blanksProb = rndInt(10, 50) // Probability of blank elements

const nRays = rndInt(5, 15) // Number of rays in the firework
const nElements = rndInt(2, 10) // Number of elements per ray
const centerX = scaledWidth / 2
const centerY = scaledHeight / 2
const maxRadius = Math.min(scaledWidth, scaledHeight) * 0.4 // Maximum radius of the firework

// Calculate base font size
const baseFontSize = rndInt(10, 30) // Starting font size
const fontSizeScale = 1.5 // How much to increase font size per element

const colBG = '#ffffff'
const colFG = '#000000'

svg.stage.style['font-family'] = 'LLAL-linear'
svg.stage.style['background-color'] = colBG

let letters = document.createElementNS(svg.ns, 'g')
letters.setAttribute('id', 'letters')
svg.stage.append(letters)

// FILTER STUFF

let fSet = {
  seed: Math.round(rnd()*100),
  freqX: Math.round((rndInt(40, 100)/10000)*100000)/100000,
  freqY: Math.round((rndInt(40, 100)/10000)*100000)/100000,
  nOct: rndInt(5,20),
  scale: rndInt(75,120)
}

if (useFilter) {
  // Create turbulence filter
  let swirl = document.createElementNS(svg.ns, 'filter')
  swirl.setAttribute('id', 'swirl')
  swirl.setAttribute('width', svg.w)
  swirl.setAttribute('height', svg.h)

  let turb = document.createElementNS(svg.ns, 'feTurbulence')
  turb.setAttribute('type', 'turbulence')
  turb.setAttribute('seed', fSet.seed)
  turb.setAttribute('baseFrequency', `${fSet.freqX} ${fSet.freqY}`)
  turb.setAttribute('numOctaves', fSet.nOct)
  turb.setAttribute('color-interpolation-filters', 'sRGB')
  turb.setAttribute('result', 'turbulence')

  let disp = document.createElementNS(svg.ns, 'feDisplacementMap')
  disp.setAttribute('in', 'SourceGraphic')
  disp.setAttribute('in2', 'turbulence')
  disp.setAttribute('scale', fSet.scale)
  disp.setAttribute('color-interpolation-filters', 'sRGB')

  swirl.append(turb, disp)
  defs.append(swirl)

  letters.setAttribute('style', 'filter: url(#swirl)')
}

// Create firework pattern
for (let ray = 0; ray < nRays; ray++) {
  const angle = (ray / nRays) * Math.PI * 2
  let currentRadius = 0
  
  for (let element = 0; element < nElements; element++) {
    const x = centerX + Math.cos(angle) * currentRadius
    const y = centerY + Math.sin(angle) * currentRadius
    
    // Calculate font size based on element position
    const elementFontSize = baseFontSize * Math.pow(fontSizeScale, element)
    
    let text = document.createElementNS(svg.ns, 'text')
    text.setAttribute('x', x)
    text.setAttribute('y', y)
    text.setAttribute('style', `font-size: ${elementFontSize}px; transform-origin: ${x}px ${y}px; transform: rotate(${angle}rad)`)
    
    let span = document.createElementNS(svg.ns, 'tspan')
    let fill = colFG
    if(useBlanks) {
      if(coinToss(blanksProb)) {
        fill = colBG
      }
    }
    span.setAttribute('style', `font-variation-settings: 'wdth' ${rndInt(50, 200)}; fill: ${fill}`)
    span.innerHTML = 'LLAL'
    text.append(span)
    letters.append(text)
    
    // Calculate the width of this element and add it to the radius for the next element
    const bbox = text.getBBox()
    currentRadius += bbox.width
  }
}



/////// INTERACTION, KEYS & FILEHANDLING

const controls = document.getElementById('controls')
const values = document.createElement('ul')

const reloadBtn = document.createElement('a')
reloadBtn.classList.add('btn')
reloadBtn.setAttribute('id', 'btnreload')
reloadBtn.append('new')

for (const property in fSet) {
  const prop = document.createElement('li')
  prop.append(`${property}: ${fSet[property]}`)
  values.append(prop)
  // console.log(`${property}: ${fSet[property]}`)
}

const btnLi = document.createElement('li')
btnLi.append(reloadBtn)
values.append(btnLi)

controls.append(values)


reloadBtn.addEventListener('click', newSketch)

function newSketch() {
  const myURL = new URL(window.location.href)
  const newHash = seed.new()
  myURL.searchParams.set('seed', newHash)
  window.location.href = myURL.href
}




// SVG-TEXT-TO-PATH

let session = new SvgTextToPath(document.querySelector('svg'), {
  useFontFace: true,
});
let stat = session.replaceAll();







// My Only Friend, The End.