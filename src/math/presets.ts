import { EquationType } from '../types/graph';

export interface CurvePreset {
  id: string;
  name: string;
  category:
    | 'Implicit Curves'
    | 'Polar Classics'
    | 'Parametric Curves'
    | 'Calculus & Transcendental'
    | 'Complex Plane & Fractals';
  historicalPeriod: string;
  discoverer: string;
  description: string;
  expressions: {
    rawText: string;
    color: string;
    type?: EquationType;
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
    isPolya?: boolean;
    fractalType?: 'mandelbrot' | 'julia' | 'newton';
    juliaCr?: number;
    juliaCi?: number;
    maxIterations?: number;
    pointX?: number;
    pointY?: number;
    pointLabel?: string;
  }[];
  viewport: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  };
  gridMode?: 'cartesian' | 'polar' | 'trig' | 'complex' | 'complex_vector';
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
    id: 'degenerate_conic_crossing_lines',
    name: 'Degenerate Conic: x² = y²',
    category: 'Implicit Curves',
    historicalPeriod: 'Classical Geometry',
    discoverer: 'Apollonius of Perga',
    description: 'A canonical degenerate conic section factorizing as (x - y)(x + y) = 0, decomposing into the two orthogonal diagonal lines y = x and y = -x with a nodal saddle intersection at the origin.',
    expressions: [
      { rawText: 'x² = y²', color: '#2563EB' },
      { rawText: '(x - y)^2 = 0', color: '#DC2626' },
    ],
    viewport: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
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
  {
    id: 'mandelbrot_fractal',
    name: 'Mandelbrot Set & Main Cardioid',
    category: 'Complex Plane & Fractals',
    historicalPeriod: '1980',
    discoverer: 'Benoît Mandelbrot & Pierre Fatou',
    description: 'The monumental fractal boundary of connected Julia sets under z_{n+1} = z_n^2 + c. Plotted alongside its exact analytical main cardioid envelope and period-2 circular bulb.',
    expressions: [
      { rawText: 'fractal: mandelbrot', color: '#B45309', fractalType: 'mandelbrot' },
      { rawText: '( 0.5*cos(t) - 0.25*cos(2*t), 0.5*sin(t) - 0.25*sin(2*t) )', color: '#E11D48', tMin: 0, tMax: 6.2831853 },
      { rawText: '(x + 1)^2 + y^2 = 0.0625', color: '#0284C7' },
    ],
    viewport: { xMin: -2.2, xMax: 1.0, yMin: -1.2, yMax: 1.2 },
    gridMode: 'complex',
  },
  {
    id: 'julia_douady_rabbit',
    name: 'Julia Curve: Douady Rabbit',
    category: 'Complex Plane & Fractals',
    historicalPeriod: '1918 / 1982',
    discoverer: 'Gaston Julia & Adrien Douady',
    description: 'The famous "Douady Rabbit" quadratic Julia set at parameter c = -0.123 + 0.745i. Three primary connected lobes pinch at roots with infinite self-similar spiral ears.',
    expressions: [
      { rawText: 'cr = -0.123', color: '#B45309', sliderMin: -2, sliderMax: 2, sliderStep: 0.005 },
      { rawText: 'ci = 0.745', color: '#7E22CE', sliderMin: -2, sliderMax: 2, sliderStep: 0.005 },
      { rawText: 'fractal: julia', color: '#10B981', fractalType: 'julia' },
      { rawText: '(0, 0)', color: '#F59E0B', pointX: 0, pointY: 0, pointLabel: 'Origin z=0' },
    ],
    viewport: { xMin: -1.6, xMax: 1.6, yMin: -1.3, yMax: 1.3 },
    gridMode: 'complex',
  },
  {
    id: 'julia_dendrite_curve',
    name: 'Julia Curve: Tree Dendrite',
    category: 'Complex Plane & Fractals',
    historicalPeriod: '1906',
    discoverer: 'Pierre Fatou & Gaston Julia',
    description: 'A connected, dendritic Julia set with strictly empty topological interior at c = -0.4 + 0.6i. Shows infinite branching fractal filaments across the complex Argand plane.',
    expressions: [
      { rawText: 'cr = -0.4', color: '#B45309', sliderMin: -1.5, sliderMax: 1.5, sliderStep: 0.01 },
      { rawText: 'ci = 0.6', color: '#7E22CE', sliderMin: -1.5, sliderMax: 1.5, sliderStep: 0.01 },
      { rawText: 'fractal: julia', color: '#8B5CF6', fractalType: 'julia' },
    ],
    viewport: { xMin: -1.5, xMax: 1.5, yMin: -1.4, yMax: 1.4 },
    gridMode: 'complex',
  },
  {
    id: 'julia_san_marco',
    name: 'Julia Curve: San Marco Dragon',
    category: 'Complex Plane & Fractals',
    historicalPeriod: '1918',
    discoverer: 'Gaston Julia',
    description: 'Named for the Venetian basilica reflection silhouette along the Grand Canal. Occurs at parabolic boundary c = -0.75, connecting two symmetric pinch basins.',
    expressions: [
      { rawText: 'cr = -0.75', color: '#B45309', sliderMin: -1.2, sliderMax: 0.5, sliderStep: 0.01 },
      { rawText: 'ci = 0', color: '#7E22CE', sliderMin: -1, sliderMax: 1, sliderStep: 0.01 },
      { rawText: 'fractal: julia', color: '#059669', fractalType: 'julia' },
    ],
    viewport: { xMin: -1.6, xMax: 1.6, yMin: -1.2, yMax: 1.2 },
    gridMode: 'complex',
  },
  {
    id: 'polya_dipole_field',
    name: 'Complex Polya Dipole Vector Field',
    category: 'Complex Plane & Fractals',
    historicalPeriod: 'Classical Fluid Mechanics',
    discoverer: 'George Pólya & Hermann von Helmholtz',
    description: 'The Polya conjugate vector field V(z) = conj(f(z)) of a complex doublet f(z) = 1/(z - 1) - 1/(z + 1). Direction arrows and phase color map represent velocity and streamlines of irrotational, incompressible flow.',
    expressions: [
      {
        rawText: '( (x-1)/((x-1)^2+y^2) - (x+1)/((x+1)^2+y^2), -y/((x-1)^2+y^2) + y/((x+1)^2+y^2) )',
        color: '#0284C7',
      },
      { rawText: '(1, 0)', color: '#16A34A', pointX: 1, pointY: 0, pointLabel: 'Source (+1)' },
      { rawText: '(-1, 0)', color: '#DC2626', pointX: -1, pointY: 0, pointLabel: 'Sink (-1)' },
    ],
    viewport: { xMin: -3.2, xMax: 3.2, yMin: -2.2, yMax: 2.2 },
    gridMode: 'complex_vector',
  },
  {
    id: 'complex_stagnation_saddle',
    name: 'Complex Vector Field: Saddle Flow',
    category: 'Complex Plane & Fractals',
    historicalPeriod: 'Potential Theory',
    discoverer: 'Leonhard Euler & Carl Friedrich Gauss',
    description: 'Vector field of the complex polynomial mapping f(z) = z^2 - 1. Displays orthogonal hyperbolic streamlines, stagnation saddle points at roots z = ±1, and phase coloration.',
    expressions: [
      { rawText: '( x^2 - y^2 - 1, 2*x*y )', color: '#9333EA' },
      { rawText: '(1, 0)', color: '#E11D48', pointX: 1, pointY: 0, pointLabel: 'Stagnation z=1' },
      { rawText: '(-1, 0)', color: '#E11D48', pointX: -1, pointY: 0, pointLabel: 'Stagnation z=-1' },
    ],
    viewport: { xMin: -3.0, xMax: 3.0, yMin: -2.4, yMax: 2.4 },
    gridMode: 'complex_vector',
  },
  {
    id: 'complex_spiral_vortex',
    name: 'Complex Vector Field: Vortex Sink',
    category: 'Complex Plane & Fractals',
    historicalPeriod: 'Fluid Dynamics',
    discoverer: 'Lord Kelvin & William Rankine',
    description: 'Circulation and radial suction induced by the logarithmic complex potential w(z) = (-0.3 - 1.5*i)*ln(z). Velocity vectors rotate and spiral inward towards the central vortex.',
    expressions: [
      { rawText: '( (-0.3*x + 1.5*y)/(x^2 + y^2), (-0.3*y - 1.5*x)/(x^2 + y^2) )', color: '#0D9488' },
      { rawText: '(0, 0)', color: '#F59E0B', pointX: 0, pointY: 0, pointLabel: 'Vortex Eye (0, 0)' },
    ],
    viewport: { xMin: -3.5, xMax: 3.5, yMin: -2.5, yMax: 2.5 },
    gridMode: 'complex_vector',
  },
  {
    id: 'newton_roots_unity',
    name: 'Newton Fractal & Cube Roots of Unity',
    category: 'Complex Plane & Fractals',
    historicalPeriod: '1879',
    discoverer: 'Arthur Cayley & Sir Isaac Newton',
    description: 'Basins of attraction in the complex plane for Newton’s method on z^3 - 1 = 0. The three roots at 1, e^{i2π/3}, and e^{i4π/3} form chaotic fractal boundaries between attractors.',
    expressions: [
      { rawText: 'fractal: newton', color: '#E11D48', fractalType: 'newton' },
      { rawText: 'r = 1', color: '#F59E0B' }, // Unit circle
      { rawText: '(1, 0)', color: '#E11D48', pointX: 1, pointY: 0, pointLabel: 'Root 1' },
      { rawText: '(-0.5, 0.866)', color: '#16A34A', pointX: -0.5, pointY: 0.866, pointLabel: 'Root e^(i2π/3)' },
      { rawText: '(-0.5, -0.866)', color: '#2563EB', pointX: -0.5, pointY: -0.866, pointLabel: 'Root e^(i4π/3)' },
    ],
    viewport: { xMin: -2.3, xMax: 2.3, yMin: -1.8, yMax: 1.8 },
    gridMode: 'complex',
  },
  {
    id: 'cayley_conformal_disk',
    name: 'Cayley Conformal Map & Unit Disk',
    category: 'Complex Plane & Fractals',
    historicalPeriod: '1851',
    discoverer: 'Bernhard Riemann & Arthur Cayley',
    description: 'Möbius transformation w(z) = (z - i)/(z + i) conformally projecting the upper half complex plane into the open unit disk. Illustrated with orthogonal boundary circles.',
    expressions: [
      { rawText: 'x^2 + y^2 = 1', color: '#D97706' }, // Boundary circle
      { rawText: '(x - 0.5)^2 + y^2 = 0.25', color: '#2563EB' },
      { rawText: '(x + 0.5)^2 + y^2 = 0.25', color: '#2563EB' },
      { rawText: 'x^2 + (y - 0.5)^2 = 0.25', color: '#16A34A' },
      { rawText: 'x^2 + (y + 0.5)^2 = 0.25', color: '#16A34A' },
    ],
    viewport: { xMin: -2.2, xMax: 2.2, yMin: -1.8, yMax: 1.8 },
    gridMode: 'complex',
  },
];
