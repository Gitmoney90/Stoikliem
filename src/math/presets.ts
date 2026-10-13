export interface CurvePreset {
  id: string;
  name: string;
  category: 'Implicit Curves' | 'Polar Classics' | 'Parametric Curves' | 'Calculus & Transcendental';
  historicalPeriod: string;
  discoverer: string;
  description: string;
  expressions: {
    rawText: string;
    color: string;
    sliderValue?: number;
    sliderMin?: number;
    sliderMax?: number;
    sliderStep?: number;
    tMin?: number;
    tMax?: number;
    thetaMin?: number;
    thetaMax?: number;
    showDerivative?: boolean;
    showIntegral?: boolean;
    integralA?: number;
    integralB?: number;
  }[];
  viewport: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  };
  gridMode?: 'cartesian' | 'polar' | 'trig';
}

export const CLASSIC_PRESETS: CurvePreset[] = [
  {
    id: 'folium_descartes',
    name: 'Folium of Descartes',
    category: 'Implicit Curves',
    historicalPeriod: '1638',
    discoverer: 'René Descartes',
    description: 'Posed by Descartes to Pierre de Fermat as a challenge for his tangent-finding method. Features a symmetric nodal loop and oblique asymptote.',
    expressions: [
      { rawText: 'a = 2', color: '#B45309', sliderMin: 0.5, sliderMax: 5, sliderStep: 0.1 },
      { rawText: 'x^3 + y^3 - 3*a*x*y = 0', color: '#1E3A8A' },
      { rawText: 'x + y + a = 0', color: '#94A3B8' }, // Asymptote
    ],
    viewport: { xMin: -6, xMax: 6, yMin: -6, yMax: 6 },
    gridMode: 'cartesian',
  },
  {
    id: 'lemniscate_bernoulli',
    name: 'Lemniscate of Bernoulli',
    category: 'Implicit Curves',
    historicalPeriod: '1694',
    discoverer: 'Jakob Bernoulli',
    description: 'An elegant figure-eight curve published in the Acta Eruditorum, pivotal in the development of elliptic integrals and the elastica.',
    expressions: [
      { rawText: 'a = 2.5', color: '#B45309', sliderMin: 1, sliderMax: 5, sliderStep: 0.1 },
      { rawText: '(x^2 + y^2)^2 - 2*a^2*(x^2 - y^2) = 0', color: '#B91C1C' },
    ],
    viewport: { xMin: -4.5, xMax: 4.5, yMin: -3, yMax: 3 },
    gridMode: 'cartesian',
  },
  {
    id: 'cassini_ovals',
    name: 'Ovals of Cassini',
    category: 'Implicit Curves',
    historicalPeriod: '1680',
    discoverer: 'Giovanni Domenico Cassini',
    description: 'Investigated by Cassini as a model for planetary orbits around the sun. Morphs between peanut shapes, two separate ovals, and figure-eights.',
    expressions: [
      { rawText: 'a = 2', color: '#B45309', sliderMin: 0.5, sliderMax: 4, sliderStep: 0.1 },
      { rawText: 'b = 2.1', color: '#7E22CE', sliderMin: 0.5, sliderMax: 4, sliderStep: 0.05 },
      { rawText: '((x - a)^2 + y^2) * ((x + a)^2 + y^2) - b^4 = 0', color: '#15803D' },
    ],
    viewport: { xMin: -5, xMax: 5, yMin: -3.5, yMax: 3.5 },
    gridMode: 'cartesian',
  },
  {
    id: 'heart_curve',
    name: 'Algebraic Heart of Euler',
    category: 'Implicit Curves',
    historicalPeriod: 'Classic 20th c.',
    discoverer: 'Classical Algebraic Geometry',
    description: 'A 6th-degree algebraic curve forming an exquisite mathematical heart with sharp bottom cusp and smooth bilobed curvature.',
    expressions: [
      { rawText: '(x^2 + y^2 - 1)^3 - x^2 * y^3 = 0', color: '#B91C1C' },
    ],
    viewport: { xMin: -2.2, xMax: 2.2, yMin: -1.8, yMax: 1.8 },
    gridMode: 'cartesian',
  },
  {
    id: 'elliptic_curve',
    name: 'Elliptic Curve (Weierstrass)',
    category: 'Implicit Curves',
    historicalPeriod: '19th Century',
    discoverer: 'Karl Weierstrass & Niels Abel',
    description: 'Cubic curves fundamental to number theory, the proof of Fermat’s Last Theorem by Andrew Wiles, and modern elliptic curve cryptography.',
    expressions: [
      { rawText: 'a = -3', color: '#B45309', sliderMin: -5, sliderMax: 2, sliderStep: 0.1 },
      { rawText: 'b = 1', color: '#7E22CE', sliderMin: -4, sliderMax: 4, sliderStep: 0.1 },
      { rawText: 'y^2 - x^3 - a*x - b = 0', color: '#0E7490' },
    ],
    viewport: { xMin: -4, xMax: 4, yMin: -4.5, yMax: 4.5 },
    gridMode: 'cartesian',
  },
  {
    id: 'cardioid',
    name: 'Cardioid of Castillon',
    category: 'Polar Classics',
    historicalPeriod: '1741',
    discoverer: 'Johann Castillon',
    description: 'The path traced by a point on the perimeter of a circle rolling around another circle of identical radius. Famous in acoustics and optical caustics.',
    expressions: [
      { rawText: 'a = 2', color: '#B45309', sliderMin: 0.5, sliderMax: 4, sliderStep: 0.1 },
      { rawText: 'r = a * (1 - cos(theta))', color: '#C2410C', thetaMin: 0, thetaMax: 6.2831853 },
    ],
    viewport: { xMin: -5, xMax: 3, yMin: -4, yMax: 4 },
    gridMode: 'polar',
  },
  {
    id: 'rhodonea_rose',
    name: 'Rhodonea Rose of Grandi',
    category: 'Polar Classics',
    historicalPeriod: '1728',
    discoverer: 'Luigi Guido Grandi',
    description: 'Named "rhodonea" (little rose) by Italian monk and mathematician Guido Grandi. Forms multi-petaled harmonic floral rosettes.',
    expressions: [
      { rawText: 'k = 4', color: '#B45309', sliderMin: 1, sliderMax: 8, sliderStep: 1 },
      { rawText: 'r = 3 * cos(k * theta)', color: '#BE185D', thetaMin: 0, thetaMax: 6.2831853 },
    ],
    viewport: { xMin: -4, xMax: 4, yMin: -4, yMax: 4 },
    gridMode: 'polar',
  },
  {
    id: 'archimedean_spiral',
    name: 'Archimedean Spiral',
    category: 'Polar Classics',
    historicalPeriod: '225 BC',
    discoverer: 'Archimedes of Syracuse',
    description: 'Described in Archimedes’ famous treatise "On Spirals". Represents uniform radial velocity combined with constant angular rotation.',
    expressions: [
      { rawText: 'a = 0.25', color: '#B45309', sliderMin: 0.05, sliderMax: 0.8, sliderStep: 0.05 },
      { rawText: 'r = a * theta', color: '#047857', thetaMin: 0, thetaMax: 31.415926 },
    ],
    viewport: { xMin: -9, xMax: 9, yMin: -9, yMax: 9 },
    gridMode: 'polar',
  },
  {
    id: 'lissajous_figures',
    name: 'Lissajous Harmonic Figures',
    category: 'Parametric Curves',
    historicalPeriod: '1857',
    discoverer: 'Jules Antoine Lissajous',
    description: 'Harmonic superposition of perpendicular sine waves. Used historically with tuning forks and light beams to measure frequency ratios and audio harmonics.',
    expressions: [
      { rawText: 'a = 3', color: '#B45309', sliderMin: 1, sliderMax: 8, sliderStep: 1 },
      { rawText: 'b = 4', color: '#7E22CE', sliderMin: 1, sliderMax: 8, sliderStep: 1 },
      { rawText: 'delta = 0.785', color: '#0E7490', sliderMin: 0, sliderMax: 3.14, sliderStep: 0.05 },
      { rawText: '( 3.5 * sin(a * t + delta), 3.5 * sin(b * t) )', color: '#1E3A8A', tMin: 0, tMax: 6.2831853 },
    ],
    viewport: { xMin: -4.5, xMax: 4.5, yMin: -4.5, yMax: 4.5 },
    gridMode: 'cartesian',
  },
  {
    id: 'butterfly_curve',
    name: 'Transcendental Butterfly',
    category: 'Parametric Curves',
    historicalPeriod: '1989',
    discoverer: 'Temple H. Fay',
    description: 'An intricate, organic parametric curve formed by combining exponential, trigonometric, and high-harmonic oscillations.',
    expressions: [
      {
        rawText: '( sin(t) * (exp(cos(t)) - 2*cos(4*t) - sin(t/12)^5), cos(t) * (exp(cos(t)) - 2*cos(4*t) - sin(t/12)^5) )',
        color: '#7E22CE',
        tMin: 0,
        tMax: 37.6991118, // 12 * pi
      },
    ],
    viewport: { xMin: -4, xMax: 4, yMin: -3.5, yMax: 4.5 },
    gridMode: 'cartesian',
  },
  {
    id: 'astroid',
    name: 'Astroid (Hypocycloid)',
    category: 'Parametric Curves',
    historicalPeriod: '1674',
    discoverer: 'Ole Rømer & Johann Bernoulli',
    description: 'The envelope of a family of line segments of constant length whose ends slide along two perpendicular coordinate axes.',
    expressions: [
      { rawText: 'a = 3', color: '#B45309', sliderMin: 1, sliderMax: 5, sliderStep: 0.1 },
      { rawText: '( a * cos(t)^3, a * sin(t)^3 )', color: '#B91C1C', tMin: 0, tMax: 6.2831853 },
    ],
    viewport: { xMin: -4.5, xMax: 4.5, yMin: -4.5, yMax: 4.5 },
    gridMode: 'cartesian',
  },
  {
    id: 'witch_of_agnesi',
    name: 'Witch of Maria Agnesi',
    category: 'Calculus & Transcendental',
    historicalPeriod: '1748',
    discoverer: 'Maria Gaetana Agnesi',
    description: 'Published in Agnesi’s landmark treatise "Analytical Institutions". Famous bell-shaped curve with finite area $4\pi a^2$ under the entire infinite curve.',
    expressions: [
      { rawText: 'a = 1.5', color: '#B45309', sliderMin: 0.5, sliderMax: 3, sliderStep: 0.1 },
      { rawText: 'y = (8 * a^3) / (x^2 + 4 * a^2)', color: '#0369A1', showIntegral: true, integralA: -3, integralB: 3 },
    ],
    viewport: { xMin: -7, xMax: 7, yMin: -1, yMax: 4.5 },
    gridMode: 'cartesian',
  },
  {
    id: 'damped_oscillator',
    name: 'Damped Harmonic Oscillator',
    category: 'Calculus & Transcendental',
    historicalPeriod: 'Classical Mechanics',
    discoverer: 'Leonhard Euler',
    description: 'The hallmark differential equation solution for physical oscillation with viscous dissipation, showing exponential amplitude decay envelopes.',
    expressions: [
      { rawText: 'k = 0.2', color: '#B45309', sliderMin: 0.05, sliderMax: 0.6, sliderStep: 0.01 },
      { rawText: 'y = exp(-k * x) * cos(3 * x)', color: '#15803D' },
      { rawText: 'y = exp(-k * x)', color: '#94A3B8' }, // Upper envelope
      { rawText: 'y = -exp(-k * x)', color: '#94A3B8' }, // Lower envelope
    ],
    viewport: { xMin: -1, xMax: 12, yMin: -1.5, yMax: 1.5 },
    gridMode: 'cartesian',
  },
  {
    id: 'fourier_series',
    name: 'Fourier Square Wave Synthesis',
    category: 'Calculus & Transcendental',
    historicalPeriod: '1822',
    discoverer: 'Joseph Fourier',
    description: 'The fundamental principle of frequency domain synthesis: approximating a discontinuous square wave through a sum of odd harmonic sinusoidal waves.',
    expressions: [
      {
        rawText: 'y = (4/pi) * (sin(x) + sin(3*x)/3 + sin(5*x)/5 + sin(7*x)/7)',
        color: '#BE185D',
        showDerivative: true,
      },
    ],
    viewport: { xMin: -6.5, xMax: 6.5, yMin: -2, yMax: 2 },
    gridMode: 'trig',
  },
];
