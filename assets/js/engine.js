// 20-02-2023
// Preset 01 — ex v3 in svg-engine..

// To Do:
// — nice to have: working defaults.
// — nice to have: add shortcuts to setAttribute... e.g. strokeCap(5)
// — nice to have: color object or methods. and gradients.
// — nice to have: modularize???
// — maybe get rid of z-coordinates... it's 2d after all. but maybe useful for noise etc. (?)
// — <g> (group). but needs a bit of thinking re: parent.


// — do something with it :-)



// THE MAIN THING

class SVG {
  constructor(setup) {
    this.ns = 'http://www.w3.org/2000/svg'
    this.xl = 'http://www.w3.org/1999/xlink'
    this.mime = { type: 'image/svg+xml' }
    this.parent = setup.parent
    this.id = setup.id
    this.w = (setup.width) ? setup.width : this.parent.clientWidth
    this.h = (setup.height) ? setup.height : this.parent.clientHeight
    this.c = new Vec(this.w/2, this.h/2)
    this.els = []

    // Find a Way to make those easily adjustable???
    // But maybe this doesn't make sense.
    this.def = {
      fill: 'transparent',
      stroke: '#000',
      strokeW: 1
    }

    // initialize and push to dom on creation.
    this.init()
  }

  init() {
    this.stage = document.createElementNS(this.ns, 'svg')
    this.stage.setAttribute('id', this.id)
    this.stage.setAttribute('xmlns', this.ns)
    this.stage.setAttribute('xmlns:xlink', this.xl)
    this.stage.setAttribute('width', this.w)
    this.stage.setAttribute('height', this.h)
    this.stage.setAttribute('viewBox', `0 0 ${this.w} ${this.h}`)
    // this.stage.setAttribute('preserveAspectRatio', setup.presAspect)
    this.parent.append(this.stage)
  }

  save() {
    const str = new XMLSerializer().serializeToString(this.stage)
    const blob = new Blob([str], this.mime)

    const link = document.createElement("a")
    let   hashStr = ''
    let   sketchStr = ''
    
    if (seed) { hashStr += '&seed='+ seed.hash }
    if (window.sketchManager && window.sketchManager.currentSketchName) { 
      sketchStr += 'sketch='+ window.sketchManager.currentSketchName 
    }
    
    // Format timestamp as readable date string
    const now = new Date()
    const timestamp = now.toLocaleString('sv-SE', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/[:.]/g, '-').replace(/\s/g, '_') // YYYY-MM-DD_HH-MM-SS in local timezone
    
    link.download = `${sketchStr}${hashStr}_${timestamp}.svg`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }

  makeLine(a, b, stroke = this.def.stroke, strokeW = this.def.strokeW) {
    let line = document.createElementNS(this.ns, 'line')
    line.setAttribute('x1', a.x)
    line.setAttribute('y1', a.y)
    line.setAttribute('x2', b.x)
    line.setAttribute('y2', b.y)
    line.setAttribute('stroke', stroke)
    line.setAttribute('stroke-width', strokeW)
    this.stage.append(line)
    return line
  }

  makeCircle(c, r = 5, fill = this.def.fill, stroke = this.def.stroke, strokeW = this.def.strokeW) {
    let circle = document.createElementNS(this.ns, 'circle')
    circle.setAttribute('cx', c.x)
    circle.setAttribute('cy', c.y)
    circle.setAttribute('r', r)
    circle.setAttribute('fill', fill)
    circle.setAttribute('stroke', stroke)
    circle.setAttribute('stroke-width', strokeW)
    this.stage.append(circle)
    return circle
  }

  makeCircles(iA, r = 5, fill = '#f00', stroke = 'transparent', strokeW = this.def.strokeW) {
    let oA = []
    for (let c = 0; c < iA.length; c++) {
      let circle = document.createElementNS(this.ns, 'circle')
      circle.setAttribute('cx', iA[c].x)
      circle.setAttribute('cy', iA[c].y)
      circle.setAttribute('r', r)
      circle.setAttribute('fill', fill)
      circle.setAttribute('stroke', stroke)
      circle.setAttribute('stroke-width', strokeW)
      this.stage.append(circle)
      oA.push(circle)
    }
    return oA
  }

  makeEllipse(c, rx, ry, fill = this.def.fill, stroke = this.def.stroke, strokeW = this.def.strokeW) {
    let ellipse = document.createElementNS(this.ns, 'ellipse')
    ellipse.setAttribute('cx', c.x)
    ellipse.setAttribute('cy', c.y)
    ellipse.setAttribute('rx', rx)
    ellipse.setAttribute('ry', ry)
    ellipse.setAttribute('fill', fill)
    ellipse.setAttribute('stroke', stroke)
    ellipse.setAttribute('stroke-width', strokeW)
    this.stage.append(ellipse)
    return ellipse
  }

  makeRect(pt, w, h, fill = 'transparent', stroke = this.def.stroke, strokeW = this.def.strokeW) {
    let rect = document.createElementNS(this.ns, 'rect')
    rect.setAttribute('x', pt.x)
    rect.setAttribute('y', pt.y)
    rect.setAttribute('width', w)
    rect.setAttribute('height', h)
    rect.setAttribute('fill', fill)
    rect.setAttribute('stroke', stroke)
    rect.setAttribute('stroke-width', strokeW)
    this.stage.append(rect)
    return rect
  }

  makeRectAB(a, b, fill = 'transparent', stroke = this.def.stroke, strokeW = this.def.strokeW) {
    let rect = document.createElementNS(this.ns, 'rect')
    rect.setAttribute('x', a.x)
    rect.setAttribute('y', a.y)
    rect.setAttribute('width', b.x - a.x)
    rect.setAttribute('height', b.y - a.y)
    rect.setAttribute('fill', fill)
    rect.setAttribute('stroke', stroke)
    rect.setAttribute('stroke-width', strokeW)
    this.stage.append(rect)
    return rect
  }

  makePath(d = 'M 0,0 ', fill = this.def.fill, stroke = this.def.stroke, strokeW = this.def.strokeW) {
    let path = document.createElementNS(this.ns, 'path')
    path.setAttribute('d', d)
    path.setAttribute('fill', fill)
    path.setAttribute('stroke', stroke)
    path.setAttribute('stroke-width', strokeW)
    this.stage.append(path)
    return path
  }
}



/////// PATHPOINT.
/////// Helper class to construct paths programmatically etc.
/////// Might be included in path directly.
/////// Might also just be a Vector().

class pPt {
  constructor(pt, type = 'LINE', t = 0.5, d = 0.5) {
    this.b = pt
    this.type = type
    this.t = t // not sure if this makes sense here.
    this.d = d // not sure if this makes sense here.
    this.cp
  }
}




/////// PATH.
/////// Helper class to make those d-strings etc.

class Path {
  constructor(pts = [], close = false) {
    this.pts = pts
    this.close = close
  }

  // addPt(pt, type, t, d) {
  //   this.pts.push(new pPt(pt, type, t, d))
  // }

  // Path from pathPoints with individual properties.

  buildPath(close = this.close) {
    let str = 'M '
    for (let i = 0; i < this.pts.length; i++) {
      let pt = this.pts[i]
      switch(i) {
        case(0):
          str += `${pt.x} ${pt.y}`
          break
      }
    }
  }

  // Polygon

  buildPolygon(close = this.close) {
    let str = 'M '
    for (let i = 0; i < this.pts.length; i++) {
      let pt = this.pts[i]
      switch(i) {
        case(0):
          str += `${pt.x} ${pt.y}`
          break
        default:
          str += ` L ${pt.x} ${pt.y}`
          break
      }
    }
    if (close) {str += ' Z'}
    return str
  }

  // Quadratic Bezier

  getControlPointQuad(a, b, t = 0.5, d = 0.5) {
    let m = b.sub(a)
    let p = lerp(a, b, d)
    let perp = nVec(-m.norm().y, m.norm().x)
    let amp = t * ( dist(a, b) / 2 )
  
    let cp = nVec(
      p.x + amp * perp.x,
      p.y + amp * perp.y
    )
    return cp
  }

  buildQuadBez(t = .5, d = .5, close = false) {
    let str = 'M '
    for (let i = 0; i < this.pts.length; i++) {
      let pt = this.pts[i]
      let cp
      switch(i) {
        case 0:
          str += `${pt.x} ${pt.y}`
          break
        case this.pts.length-1:
          cp = this.getControlPointQuad(pts[i-1], pt, t, d)
          str += ` S ${cp.x} ${cp.y} ${pt.x} ${pt.y}`
          if (close) {
            let tt = t * -1
            let ccp = this.getControlPointQuad(pt, pts[0], tt, d)
            str += ` S ${cp.x} ${cp.y} ${pts[0].x} ${pts[0].y}`
          }
          break
        default:
          cp = this.getControlPointQuad(pts[i-1], pt, t, d)
          str += ` S ${cp.x} ${cp.y} ${pt.x} ${pt.y}`
          break
      }
    }
    if (close) {str += ' Z'}
    return str
  }

  // Cubic Bezier / Spline

  getControlPointsSpline(p0, p1, p2, t) {
    // adapted from this: http://scaledinnovation.com/analytics/splines/aboutSplines.html
    // Builds Control Points for p1!!
    let d01 = Math.sqrt(Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2)); // distance between pt1 and pt2
    let d12 = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)); // distance between pt2 and pt3
    let fa = t * d01 / (d01+d12);   // scaling factor for triangle Ta
    let fb = t * d12 / (d01+d12);   // ditto for Tb, simplifies to fb=t-fa
    let cp1x = p1.x - fa * (p2.x - p0.x);    // x2-x0 is the width of triangle T
    let cp1y = p1.y - fa * (p2.y - p0.y);    // y2-y0 is the height of T
    let cp2x = p1.x + fb * (p2.x - p0.x);
    let cp2y = p1.y + fb * (p2.y - p0.y);  
    return [new Vec(cp1x, cp1y), new Vec(cp2x, cp2y)]
  }

  buildSpline(t = .4, close = this.close) {
    // doesn't work if pts.length < 3 
    // could be avoided with case 1 && !pts.length-1 (somehow)
    let pts = this.pts
    let str = 'M '
    for (let i = 0; i < pts.length; i++) {
      let p0, p1, p2, cPts
      switch(i) {
        case 0:
          p0 = pts[pts.length-1]
          p1 = pts[i]
          p2 = pts[i+1]
          p1.cPts = this.getControlPointsSpline(p0, p1, p2, t)
          str += `${p1.x} ${p1.y}`
          break
        case 1:
          p0 = pts[i-1]
          p1 = pts[i]
          p2 = pts[i+1]
          p1.cPts = this.getControlPointsSpline(p0, p1, p2, t)
          if (close) {
            str += `C ${p0.cPts[1].x} ${p0.cPts[1].y} ${p1.cPts[0].x} ${p1.cPts[0].y} ${p1.x} ${p1.y} `
          } else {
            str += `Q ${p1.cPts[0].x} ${p1.cPts[0].y} ${p1.x} ${p1.y} `
          }
          break
        case pts.length-1:
          p0 = pts[i-1]
          p1 = pts[i]
          p2 = pts[0]
          p1.cPts = this.getControlPointsSpline(p0, p1, p2, t)
          if (close) {
            str += `C ${p0.cPts[1].x} ${p0.cPts[1].y} ${p1.cPts[0].x} ${p1.cPts[0].y} ${p1.x} ${p1.y} `
            str += `C ${p1.cPts[1].x} ${p1.cPts[1].y} ${p2.cPts[0].x} ${p2.cPts[0].y} ${p2.x} ${p2.y} Z`
          } else {
            str += `Q ${p0.cPts[1].x} ${p0.cPts[1].y} ${p1.x} ${p1.y} `
          }
          break
        default:
          p0 = pts[i-1]
          p1 = pts[i]
          p2 = pts[i+1]
          cPts = this.getControlPointsSpline(p0, p1, p2, t)
          p1.cPts = cPts
          str += `C ${p0.cPts[1].x} ${p0.cPts[1].y} ${p1.cPts[0].x} ${p1.cPts[0].y} ${p1.x} ${p1.y} `
          break
      }
    }
    return str
  }
}



/////// VECTORS.
/////// Basically x/y-Points, with some extras.

class Vec {
  constructor(x, y, z = 0) {
    this.x = x
    this.y = y
    this.z = z
    this.m = Math.sqrt(this.x**2 + this.y**2 + this.z**2) // Magnitude
  }
  norm() {
    let xn = this.x / this.m,
        yn = this.y / this.m,
        zn = this.z / this.m
    return new Vec(xn, yn, zn)
  }
  // ov = other Vec
  add(ov) {
    let xn = this.x + ov.x,
        yn = this.y + ov.y,
        zn = this.z + ov.z
    return new Vec(xn, yn, zn)
  }
  sub(ov) {
    let xn = this.x - ov.x, 
        yn = this.y - ov.y,
        zn = this.z - ov.z
    return new Vec(xn, yn, zn)
  }
  cross(ov) {
    let xn = this.y * ov.z - this.z * ov.y,
        yn = this.z * ov.x - this.x * ov.z,
        zn = this.x * ov.y - this.y * ov.x
    return new Vec(xn, yn, zn)
  }
  dot(ov) {
    return this.x * ov.x + this.y * ov.y + this.z * ov.z
  }
  ang(ov) {
    return Math.acos( this.norm().dot(ov.norm()) / (this.norm().m * ov.norm().m) )
  }
  lerp(ov, t) {
    let xn = (1 - t) * this.x + ov.x * t,
        yn = (1 - t) * this.y + ov.y * t,
        zn = (1 - t) * this.z + ov.z * t
    return new Vec(xn, yn, zn)
  }
  mid(ov) {
    let xn = (this.x + ov.x) / 2,
        yn = (this.y + ov.y) / 2,
        zn = (this.z + ov.z) / 2
    return new Vec(xn, yn, zn)
  }
}

/////// VECTORS. 
/////// Shorthands & Utility.

function nVec(x, y, z) { 
  return new Vec(x, y, z) 
}

function dist(a, b) {
  let xx = a.x - b.x,
      yy = a.y - b.y,
      zz = a.z - b.z
  return Math.sqrt(xx**2 + yy**2 + zz**2)
}

function lerp(a, b, t) {
  let xn = (1 - t) * a.x + b.x * t,
      yn = (1 - t) * a.y + b.y * t,
      zn = (1 - t) * a.z + b.z * t
  return new Vec(xn, yn, zn)
}

function mid(a, b) {
  let xn = (a.x + b.x) / 2,
      yn = (a.y + b.y) / 2,
      zn = (a.z + b.z) / 2
  return new Vec(xn, yn, zn)
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function ang(a, b) {
  return Math.acos( dot(a.norm(), b.norm()) / (a.norm().m * b.norm().m) )
}



/////// RANDOM & SEED.

class Hash {
  constructor() {
    this.alphabet = '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
    this.init()
    this.hashTrunc = this.hash.slice(2);
    this.regex = new RegExp('.{' + ((this.hashTrunc.length / 4) | 0) + '}', 'g');
    this.hashes = this.hashTrunc.match(this.regex).map((h) => this.b58dec(h));
    this.rnd = this.sfc32(...this.hashes)
  }
  init() {
    const params = new URLSearchParams(location.search);
    if (params.has('seed')) {
      this.hash = params.get('seed');
    } else {
      this.hash = this.new()
    }
    console.log("Seed: ?seed=" + this.hash);
  }
  new() {
    let str =
      'oo' +
      Array(49)
        .fill(0)
        .map((_) => this.alphabet[(Math.random() * this.alphabet.length) | 0])
        .join("")
    return str
  }
  update() {
    let nStr = this.new()
    this.hash = nStr
    return nStr
  }
  b58dec = (str) =>
  [...str].reduce(
    (p, c) => (p * this.alphabet.length + this.alphabet.indexOf(c)) | 0,
    0
  )
  sfc32 = (a, b, c, d) => {
    return () => {
      a |= 0;
      b |= 0;
      c |= 0;
      d |= 0;
      var t = (((a + b) | 0) + d) | 0;
      d = (d + 1) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
  };
}

// Make this a bit more foolproof? If seed ist not defined (not undefined), it breaks...
// maybe some global defaults would help after all.
function rnd() {
  if (seed) {
    return seed.rnd()
  } else {
    return Math.random()
  }
}

function rndInt(min, max) {
  return Math.floor(rnd() * (max - min + 1)) + min
}

function coinToss(chance = 50) {
  if (rnd() <= chance / 100) {
    return true
  } else {
    return false
  }
}



/////// UTILITY FUNCTIONS.

function map(val, minIn, maxIn, minOut, maxOut) {
  val = (val - minIn) / (maxIn - minIn)
  return minOut + val * (maxOut - minOut)
}

function rad(deg) {
  return deg * (Math.PI / 180)
}

function deg(rad) {
  return rad / (Math.PI / 180)
}

// Divide length between to points. Returns intermediary Points.
// Random looks very end-heavy to me. not really random.
function divLength(a, b, nSeg, incStartEnd = false, t = 1/nSeg, oA = []) {
  if (incStartEnd) { oA.push(a) }

  if (t === 'RND') {
    let rndVals = []

    for (let i = 0; i < nSeg; i++) {
      rndVals.push(rnd())
    }
    let rndSum = rndVals.reduce((acc, cur) => acc + cur, 0)

    let tRnd = 0
    for (let i = 0; i < nSeg-1; i++) {
      tRnd += rndVals[i]
      // t = map(tRnd, 0, rndSum, 0, 1)
      t = map(tRnd, 0, nSeg, 0, 1)
      a = a.lerp(b, t)
      oA.push(a)
    }
  } else {
    for (let i = 0; i < nSeg-1; i++) {
      oA.push(a.lerp(b, (i+1)*t))
    }
  }

  if (incStartEnd) { oA.push(b) } 
  return oA
}

function shuffle(iA) {
  oA = Array.from(iA) // Copy Array. Only one dimensional arrays!
  for (let i = oA.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [oA[i], oA[j]] = [oA[j], oA[i]];
  }
  return oA;
}




/////// INTERACTION, KEYS & FILEHANDLING

const keyHandlers = (event) => {
  switch (event.key) {
    case 'd':
      console.log('d pressed')
      if (window.sketchManager && window.sketchManager.getSvg()) {
        window.sketchManager.getSvg().save()
      } else {
        console.error('No SVG available for saving')
      }
      break
    case 'n': {
      const myURL = new URL(window.location.href)
      const newHash = seed.new()
      myURL.searchParams.set('seed', newHash)
      window.location.href = myURL.href
      break
    }
    case 'ArrowLeft':
      history.back()
      break
    case 'ArrowRight':
      history.forward()
      break
    }
}
document.addEventListener('keydown', keyHandlers)


// Set Current Folder as Filename/Title
function getDirName() {
  const location = window.location.pathname
  const path = location.substring(0, location.lastIndexOf("/"))
  const dirName = path.substring(path.lastIndexOf("/")+1)
  return dirName
}
document.title = getDirName()







// My Only Friend, The End.