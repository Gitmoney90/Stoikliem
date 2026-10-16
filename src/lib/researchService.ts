import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { GraphExpression, Viewport, GridMode, ThemeId } from '../types/graph';

export type TheoremCategory = 'theorem' | 'conjecture' | 'lemma' | 'proof' | 'vlog_discovery' | 'note';

export interface MediaAttachment {
  id: string;
  name: string;
  type: 'image' | 'file';
  dataUrl: string; // base64 or URL
  sizeKb?: number;
}

export interface VlogStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  formula?: string;
  mediaUrl?: string;
}

export interface ResearchComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorTitle?: string;
  authorAvatarEmoji?: string;
  content: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface ResearchPost {
  id: string;
  title: string;
  category: TheoremCategory;
  authorId: string;
  authorName: string;
  authorTitle?: string;
  authorAvatarEmoji?: string;
  latexStatement: string;
  body: string;
  attachedExpressionsJson?: string;
  attachedExpressions?: GraphExpression[];
  mediaAttachments?: MediaAttachment[];
  mediaAttachmentsJson?: string;
  vlogVideoUrl?: string;
  vlogSteps?: VlogStep[];
  vlogStepsJson?: string;
  tags: string[];
  endorsementsCount: number;
  commentsCount?: number;
  isPublic: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// Curated Initial Classical & Modern Mathematical Dispatches
export const INITIAL_RESEARCH_DISPATCHES: ResearchPost[] = [
  {
    id: 'seed_fourier_gibbs',
    title: 'On the Asymptotic Overshoot of Gibbs in Truncated Fourier Loci',
    category: 'theorem',
    authorId: 'system_annals',
    authorName: 'Leonhard Euler & Josiah Gibbs',
    authorTitle: 'Master of Analysis & Thermodynamics',
    authorAvatarEmoji: '📐',
    latexStatement: '\\lim_{N \\to \\infty} \\left| S_N\\left(\\frac{\\pi}{N}\\right) - \\frac{\\pi}{2} \\right| = \\int_0^{\\pi} \\frac{\\sin(t)}{t}\\,dt - \\frac{\\pi}{2} \\approx 0.08949\\pi',
    body: 'The truncated Fourier partial sum of a discontinuous square wave locus exhibits an irreducible overshoot of approximately 8.95% at the point of discontinuity. The graph attached demonstrates the convergence locus f(x) = sin(x) + sin(3x)/3 + sin(5x)/5 + sin(7x)/7 against the continuous baseline.',
    attachedExpressionsJson: JSON.stringify([
      { id: 'th1_1', rawText: 'y = sin(x) + (1/3)*sin(3*x) + (1/5)*sin(5*x) + (1/7)*sin(7*x) + (1/9)*sin(9*x)', color: '#4F46E5', visible: true, type: 'explicit' },
      { id: 'th1_2', rawText: 'y = (pi/4)*sign(sin(x))', color: '#E11D48', visible: true, type: 'explicit' },
    ]),
    vlogStepsJson: JSON.stringify([
      { id: 'vs1', stepNumber: 1, title: 'Harmonic Decomposition', description: 'Deconstruct odd harmonic sinusoidal modes up to n=9.', formula: 'S_N(x) = \\frac{4}{\\pi} \\sum_{k=1}^N \\frac{\\sin((2k-1)x)}{2k-1}' },
      { id: 'vs2', stepNumber: 2, title: 'Discontinuity Point Boundary', description: 'Evaluate partial sums as x approaches 0 from the positive half.', formula: 'x_N = \\frac{\\pi}{2N}' },
      { id: 'vs3', stepNumber: 3, title: 'Wilbraham-Gibbs Constant Q.E.D.', description: 'The overshoot integral converges to approx 1.17898 * (pi/2) as N -> infty.', formula: 'G = \\frac{2}{\\pi}\\int_0^\\pi \\frac{\\sin(t)}{t}\\,dt' },
    ]),
    tags: ['calculus', 'fourier', 'harmonic-analysis', 'series'],
    endorsementsCount: 42,
    commentsCount: 3,
    isPublic: true,
  },
  {
    id: 'seed_poincare_bendixson',
    title: 'Limit Cycles & Invariant Tori in Nonlinear Damped Oscillators',
    category: 'vlog_discovery',
    authorId: 'system_annals',
    authorName: 'Henri Poincaré',
    authorTitle: 'Academician of Topology & Dynamical Systems',
    authorAvatarEmoji: '🌀',
    latexStatement: '\\ddot{x} - \\mu (1 - x^2)\\dot{x} + x = 0 \\implies \\exists ! \\; \\Gamma \\subset \\mathbb{R}^2 \\text{ (stable isolated limit cycle)}',
    body: 'Under the Van der Pol nonlinear damping parameter μ > 0, all trajectories in the phase plane tend toward an isolated closed orbit Γ. In the cartesian locus, the phase portrait creates closed loops whose energy dissipation is balanced by non-linear self-excitation.',
    attachedExpressionsJson: JSON.stringify([
      { id: 'th2_1', rawText: 'y = x^3 - 3*x', color: '#0D9488', visible: true, type: 'explicit' },
      { id: 'th2_2', rawText: 'y = -x + 2*sin(x)', color: '#D97706', visible: true, type: 'explicit' },
    ]),
    vlogStepsJson: JSON.stringify([
      { id: 'vs2_1', stepNumber: 1, title: 'Phase Vector Mapping', description: 'Convert second order ODE to first order system in (x, y).' },
      { id: 'vs2_2', stepNumber: 2, title: 'Liénard Transformation', description: 'Plot non-linear cubic locus y = x^3/3 - x to pinpoint relaxation oscillation.' },
    ]),
    tags: ['differential-equations', 'dynamics', 'topology', 'limit-cycles'],
    endorsementsCount: 38,
    commentsCount: 2,
    isPublic: true,
  },
  {
    id: 'seed_cardioid_caustic',
    title: 'The Nephroid & Cardioid as Envelope of Light Reflection Caustics',
    category: 'lemma',
    authorId: 'system_annals',
    authorName: 'Christiaan Huygens',
    authorTitle: 'Fellow of the Royal Society, Optics & Geometry',
    authorAvatarEmoji: '☀️',
    latexStatement: 'r(\\theta) = 2a(1 - \\cos(\\theta)) \\iff \\nabla \\left( (x^2 + y^2 - 2ax)^2 - 4a^2(x^2 + y^2) \\right) = 0',
    body: 'Parallel rays of light reflected inside a circular mirror form an epicycloid caustic envelope. When the luminous source resides on the circle circumference itself, the envelope is rigorously congruent to the cardioid curve.',
    attachedExpressionsJson: JSON.stringify([
      { id: 'th3_1', rawText: 'r = 3*(1 - cos(theta))', color: '#9333EA', visible: true, type: 'polar' },
      { id: 'th3_2', rawText: 'x^2 + y^2 = 9', color: '#2563EB', visible: true, type: 'implicit' },
    ]),
    tags: ['optics', 'caustics', 'geometry', 'polar-curves'],
    endorsementsCount: 29,
    commentsCount: 1,
    isPublic: true,
  },
  {
    id: 'seed_gaussian_integral',
    title: 'Exact Closed-Form Solution of Gaussian Probability Density Loci',
    category: 'proof',
    authorId: 'system_annals',
    authorName: 'Carl Friedrich Gauss',
    authorTitle: 'Princeps Mathematicorum',
    authorAvatarEmoji: '🏛️',
    latexStatement: '\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi} \\quad \\text{and} \\quad \\frac{d^2}{dx^2}\\left(e^{-x^2}\\right) = (4x^2 - 2)e^{-x^2}',
    body: 'The exact inflection points of the normal distribution curve reside at x = ±1/√2 ≈ ±0.7071. This demonstration bridges polar double integration in R² with symbolic second derivatives to identify inflection boundaries.',
    attachedExpressionsJson: JSON.stringify([
      { id: 'th4_1', rawText: 'y = exp(-x^2)', color: '#059669', visible: true, type: 'explicit' },
      { id: 'th4_2', rawText: 'y = (4*x^2 - 2)*exp(-x^2)', color: '#DC2626', visible: true, type: 'explicit' },
    ]),
    tags: ['calculus', 'probability', 'inflection-points', 'gauss'],
    endorsementsCount: 51,
    commentsCount: 4,
    isPublic: true,
  },
];

/**
 * Fetches all public research dispatches from Firestore, falling back to curated posts if empty
 */
export async function fetchResearchPosts(): Promise<ResearchPost[]> {
  try {
    const q = query(
      collection(db, 'research_posts'),
      where('isPublic', '==', true),
      limit(50)
    );

    const snapshot = await getDocs(q);
    const remotePosts: ResearchPost[] = [];

    snapshot.forEach((d) => {
      const data = d.data();
      let attached: GraphExpression[] | undefined = undefined;
      if (data.attachedExpressionsJson) {
        try {
          attached = JSON.parse(data.attachedExpressionsJson);
        } catch {}
      }

      let media: MediaAttachment[] | undefined = undefined;
      if (data.mediaAttachmentsJson) {
        try {
          media = JSON.parse(data.mediaAttachmentsJson);
        } catch {}
      }

      let steps: VlogStep[] | undefined = undefined;
      if (data.vlogStepsJson) {
        try {
          steps = JSON.parse(data.vlogStepsJson);
        } catch {}
      }

      remotePosts.push({
        id: d.id,
        title: data.title,
        category: (data.category as TheoremCategory) || 'theorem',
        authorId: data.authorId,
        authorName: data.authorName || 'Anonymous Scholar',
        authorTitle: data.authorTitle,
        authorAvatarEmoji: data.authorAvatarEmoji || '📐',
        latexStatement: data.latexStatement,
        body: data.body,
        attachedExpressionsJson: data.attachedExpressionsJson,
        attachedExpressions: attached,
        mediaAttachments: media,
        mediaAttachmentsJson: data.mediaAttachmentsJson,
        vlogVideoUrl: data.vlogVideoUrl,
        vlogSteps: steps,
        vlogStepsJson: data.vlogStepsJson,
        tags: Array.isArray(data.tags) ? data.tags : [],
        endorsementsCount: data.endorsementsCount || 0,
        commentsCount: data.commentsCount || 0,
        isPublic: Boolean(data.isPublic),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });

    // Merge remote posts with initial dispatches (ensuring uniqueness by ID)
    const remoteIds = new Set(remotePosts.map((p) => p.id));
    const merged = [...remotePosts];
    for (const seed of INITIAL_RESEARCH_DISPATCHES) {
      if (!remoteIds.has(seed.id)) {
        let attached: GraphExpression[] | undefined = undefined;
        if (seed.attachedExpressionsJson) {
          try {
            attached = JSON.parse(seed.attachedExpressionsJson);
          } catch {}
        }
        let steps: VlogStep[] | undefined = undefined;
        if (seed.vlogStepsJson) {
          try {
            steps = JSON.parse(seed.vlogStepsJson);
          } catch {}
        }
        merged.push({ ...seed, attachedExpressions: attached, vlogSteps: steps });
      }
    }

    return merged;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'research_posts');
    return INITIAL_RESEARCH_DISPATCHES.map((s) => ({
      ...s,
      attachedExpressions: s.attachedExpressionsJson ? JSON.parse(s.attachedExpressionsJson) : undefined,
      vlogSteps: s.vlogStepsJson ? JSON.parse(s.vlogStepsJson) : undefined,
    }));
  }
}

/**
 * Publishes a new theorem/vlog research post to Firestore
 */
export async function createResearchPost(params: {
  title: string;
  category: TheoremCategory;
  authorId: string;
  authorName: string;
  authorTitle?: string;
  authorAvatarEmoji?: string;
  latexStatement: string;
  body: string;
  attachedExpressions?: GraphExpression[];
  mediaAttachments?: MediaAttachment[];
  vlogVideoUrl?: string;
  vlogSteps?: VlogStep[];
  tags: string[];
}): Promise<ResearchPost> {
  const postId = `th_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const attachedExpressionsJson = params.attachedExpressions
    ? JSON.stringify(params.attachedExpressions)
    : '';
  const mediaAttachmentsJson = params.mediaAttachments
    ? JSON.stringify(params.mediaAttachments)
    : '';
  const vlogStepsJson = params.vlogSteps
    ? JSON.stringify(params.vlogSteps)
    : '';

  const docRef = doc(db, 'research_posts', postId);

  const newPostData = {
    title: params.title.trim(),
    category: params.category,
    authorId: params.authorId,
    authorName: params.authorName,
    authorTitle: params.authorTitle || 'Independent Scholar',
    authorAvatarEmoji: params.authorAvatarEmoji || '📐',
    latexStatement: params.latexStatement.trim(),
    body: params.body.trim(),
    attachedExpressionsJson,
    mediaAttachmentsJson,
    vlogVideoUrl: params.vlogVideoUrl?.trim() || '',
    vlogStepsJson,
    tags: params.tags.filter((t) => t.trim().length > 0).slice(0, 10),
    endorsementsCount: 1,
    commentsCount: 0,
    isPublic: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(docRef, newPostData);
    return {
      id: postId,
      ...newPostData,
      attachedExpressions: params.attachedExpressions,
      mediaAttachments: params.mediaAttachments,
      vlogSteps: params.vlogSteps,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `research_posts/${postId}`);
    throw err;
  }
}

/**
 * Endorses / Likes a research post (+1 peer endorsement)
 */
export async function endorseResearchPost(postId: string): Promise<void> {
  if (postId.startsWith('seed_')) return;
  const docRef = doc(db, 'research_posts', postId);
  try {
    await updateDoc(docRef, {
      endorsementsCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `research_posts/${postId}`);
  }
}

/**
 * Deletes a research post
 */
export async function deleteResearchPost(postId: string): Promise<void> {
  if (postId.startsWith('seed_')) return;
  const docRef = doc(db, 'research_posts', postId);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `research_posts/${postId}`);
    throw err;
  }
}

// Seed Comments for Curated Posts
const SEED_COMMENTS: Record<string, ResearchComment[]> = {
  seed_fourier_gibbs: [
    {
      id: 'sc1',
      postId: 'seed_fourier_gibbs',
      authorId: 'scholar_dirichlet',
      authorName: 'Peter Dirichlet',
      authorTitle: 'Professor of Convergence',
      authorAvatarEmoji: '✨',
      content: 'Remarkable demonstration. Notice that the overshoot location shrinks toward 0 at rate pi/(2N), verifying uniform convergence fails at the jump boundary.',
      createdAt: '2 days ago',
    },
    {
      id: 'sc2',
      postId: 'seed_fourier_gibbs',
      authorId: 'scholar_fejer',
      authorName: 'Lipót Fejér',
      authorTitle: 'Cesàro Summation Pioneer',
      authorAvatarEmoji: '📜',
      content: 'Employing Fejér arithmetic mean sums eliminates this Gibbs overshoot entirely, yielding positive kernel convergence!',
      createdAt: '1 day ago',
    },
  ],
  seed_poincare_bendixson: [
    {
      id: 'sc3',
      postId: 'seed_poincare_bendixson',
      authorId: 'scholar_bendixson',
      authorName: 'Ivar Bendixson',
      authorTitle: 'Dynamical Topologist',
      authorAvatarEmoji: '🔄',
      content: 'Because the divergence of the vector field changes sign across x = ±1, the Poincaré index theorem guarantees exactly one limit cycle.',
      createdAt: '3 days ago',
    },
  ],
};

/**
 * Fetches all comments for a research post
 */
export async function fetchPostComments(postId: string): Promise<ResearchComment[]> {
  const seedComments = SEED_COMMENTS[postId] || [];
  if (postId.startsWith('seed_')) {
    return seedComments;
  }

  try {
    const commentsRef = collection(db, 'research_posts', postId, 'comments');
    const q = query(commentsRef, limit(100));
    const snap = await getDocs(q);
    const comments: ResearchComment[] = [];

    snap.forEach((d) => {
      const data = d.data();
      comments.push({
        id: d.id,
        postId: data.postId || postId,
        authorId: data.authorId,
        authorName: data.authorName || 'Peer Scholar',
        authorTitle: data.authorTitle,
        authorAvatarEmoji: data.authorAvatarEmoji || '💬',
        content: data.content,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });

    return [...comments, ...seedComments];
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `research_posts/${postId}/comments`);
    return seedComments;
  }
}

/**
 * Adds a new comment to a research post
 */
export async function addPostComment(
  postId: string,
  comment: {
    authorId: string;
    authorName: string;
    authorTitle?: string;
    authorAvatarEmoji?: string;
    content: string;
  }
): Promise<ResearchComment> {
  const commentId = `cm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const commentDocRef = doc(db, 'research_posts', postId, 'comments', commentId);

  const commentData = {
    postId,
    authorId: comment.authorId,
    authorName: comment.authorName,
    authorTitle: comment.authorTitle || 'Mathematical Scholar',
    authorAvatarEmoji: comment.authorAvatarEmoji || '💬',
    content: comment.content.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(commentDocRef, commentData);
    // Increment post commentsCount
    if (!postId.startsWith('seed_')) {
      const postRef = doc(db, 'research_posts', postId);
      await updateDoc(postRef, {
        commentsCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    }

    return {
      id: commentId,
      ...commentData,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `research_posts/${postId}/comments/${commentId}`);
    throw err;
  }
}

/**
 * Deletes a comment from a research post
 */
export async function deletePostComment(postId: string, commentId: string): Promise<void> {
  if (postId.startsWith('seed_')) return;
  const commentDocRef = doc(db, 'research_posts', postId, 'comments', commentId);
  try {
    await deleteDoc(commentDocRef);
    const postRef = doc(db, 'research_posts', postId);
    await updateDoc(postRef, {
      commentsCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `research_posts/${postId}/comments/${commentId}`);
    throw err;
  }
}
