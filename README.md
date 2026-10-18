# Stoikliem Graphica — Advanced Mathematical Graphing Explorer

Stoikliem Graphica is a mathematical graphing explorer supporting Cartesian, parametric, polar, and implicit 3D manifold rendering with real-time slicing, calculus tools, theorem verification, and academic typography.

---

## Deploying to GitHub Pages (https://<username>.github.io/<repo>/)

This repository is pre-configured with **relative asset paths (`./`)** and **Node.js runtime polyfills**, ensuring clean operation on GitHub Pages subpaths.

### Option A: Automatic Deployment with GitHub Actions (Recommended)

1. Push your repository to GitHub (e.g. `main` or `master`).
2. Go to your repository on GitHub: **Settings** → **Pages**.
3. Under **Build and deployment** → **Source**, select **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` will automatically build and deploy your app. Every subsequent push will deploy automatically!

### Option B: Deploy from the `/docs` Folder

If you prefer deploying directly from a branch:

1. Run `npm run build` locally. This generates both `dist/` and `docs/`.
2. Commit and push the `docs/` folder to GitHub:
   ```bash
   git add docs
   git commit -m "Build for GitHub Pages"
   git push origin main
   ```
3. In your GitHub repository: **Settings** → **Pages**.
4. Under **Build and deployment** → **Source**, select **Deploy from a branch**.
5. Select branch **main** (or **master**) and folder **/docs**, then click **Save**.

---

## Local Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run production build
npm run build
```
