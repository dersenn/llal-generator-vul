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
}

let svg = new SVG(setup)


// SETUP SKETCH

let defs = document.createElementNS(svg.ns, 'defs')
svg.stage.prepend(defs)


const useFilter = false
const useBlanks = false
const useCircles = false

const blanksProb = rndInt(40, 75)

const borderTop = 0

const wdths = [50, 100, 150, 200]
const nCols = 20
const nRows = 60
const fSize = ((setup.height - borderTop) / nRows) * 1.5 +'px'
// const fSize = (100 / nRows) * 1.5 +'vh'
const lOff = '.66em'

const colBG = '#ffffff'
const colFG = '#000000'

document.body.style['background-color'] = '#eee'
svg.stage.style['font-family'] = 'LLAL-linear'
svg.stage.style['background-color'] = colBG


let a = nVec(0, 0)
let txt = 'LLAL'

let cols = []


let letters = document.createElementNS(svg.ns, 'g')
letters.setAttribute('id', 'letters')
svg.stage.append(letters)

let circles = document.createElementNS(svg.ns, 'g')
circles.setAttribute('id', 'circles')



// FILTER STUFF

let fSet = {
  rows: nRows,
  blnkProb: blanksProb,
  seed: Math.round(rnd()*100),
  freqX: Math.round((rndInt(40, 100)/10000)*100000)/100000,
  freqY: Math.round((rndInt(40, 100)/10000)*100000)/100000,
  // bFreq: `${rnd()/100} ${rnd()/100}`,
  nOct: rndInt(5,20),
  scale: rndInt(75,120)
}


if (useFilter) {

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
  circles.setAttribute('style', 'filter: url(#swirl)')
}


// === CONE ARC TEXT MODULE ===

function arcPath(cx, cy, r, startAngle, endAngle, sweepFlag = 0) {
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

function makeArc(cx, cy, r, startAngle, endAngle, sweepFlag = 0) {
  const path = document.createElementNS(svg.ns, 'path');
  path.setAttribute('d', arcPath(cx, cy, r, startAngle, endAngle, sweepFlag));
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#f00');
  path.setAttribute('stroke-width', 5);
  if (drawControlPoints) {
    const start = {
      x: cx + r * Math.cos(rad(startAngle)),
      y: cy + r * Math.sin(rad(startAngle))
    };
    const end = {
      x: cx + r * Math.cos(rad(endAngle)),
      y: cy + r * Math.sin(rad(endAngle))
    };
    svg.makeCircle(start, 8, '#f00');
    svg.makeCircle(end, 8, '#00f');
  }
  svg.stage.append(path)
}


const rOuter = 376 * mmToPx;
const rInner = 100 * mmToPx;
const cx = setup.width / 2;
const cy = setup.height - rOuter; // center above SVG, arc at bottom

const arcStart = 114;   // bottom-right of circle
const arcEnd = 66;      // bottom-left of circle

const drawControlPoints = true

// Draw reference circle
svg.makeCircle({ x: cx, y: cy }, rOuter, 'none', '#0f0');

makeArc(cx, cy, rOuter, arcStart, arcEnd)
makeArc(cx, cy, rInner, arcStart, arcEnd)










/////// INTERACTION, KEYS & FILEHANDLING

const controls = document.getElementById('controls')
const values = document.createElement('ul')

const reloadBtn = document.createElement('a')
reloadBtn.classList.add('btn')
reloadBtn.setAttribute('id', 'btnreload')
reloadBtn.append('new')

// for (const property in fSet) {
//   const prop = document.createElement('li')
//   prop.append(`${property}: ${fSet[property]}`)
//   values.append(prop)
//   // console.log(`${property}: ${fSet[property]}`)
// }

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