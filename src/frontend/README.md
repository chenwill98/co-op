This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

### First-Time Deployment

1. **Sign up for Vercel**: Create an account at [vercel.com](https://vercel.com) if you don't have one.

2. **Install Vercel CLI**: (Optional)
   ```bash
   npm i -g vercel
   ```

3. **Connect with GitHub**:
   - In your Vercel dashboard, click "Import Project"
   - Choose "Import Git Repository"
   - Connect your GitHub account and select this repository
   - Vercel will automatically detect it's a Next.js project

4. **Environment Variables**:
   - In your Vercel project settings, add all environment variables from your `.env` file
   - At minimum, make sure you add:
     - `MAPBOX_TOKEN`
     - Any other keys used by your application

5. **Deploy**:
   - Vercel will automatically deploy your main branch
   - Additionally, it will create preview deployments for pull requests

### Troubleshooting Deployment Issues

If you encounter deployment failures:

1. **Check build logs in Vercel dashboard** for specific errors

2. **Common issues and solutions**:
   - **ESLint/TypeScript errors**: Fixed by our `next.config.ts` setup
   - **Missing Environment Variables**: Ensure all needed variables are added in Vercel
   - **Dependency issues**: Make sure package.json dependencies are correctly defined

3. **Test locally before pushing**:
   ```bash
   npm run build
   ```

### Continuous Deployment

Vercel automatically deploys:
- Every push to the main branch
- Preview deployments for all pull requests

## Project Structure

- `app/` - Next.js pages and components
- `public/` - Static assets
- `app/components/` - Shared React components
- `app/ui/` - UI components

## Technology Stack

- **Framework**: Next.js 15
- **Styling**: Tailwind CSS 4 with DaisyUI 5
- **Icons**: Heroicons 2
- **Maps**: Mapbox GL
