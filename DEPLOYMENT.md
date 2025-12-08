# Deployment Guide

This guide covers deploying the COMMIT Journal application to production.

## Prerequisites

- Node.js 18+ installed
- A Supabase account with a configured project
- A Groq API key for AI features
- A hosting provider (Vercel, Netlify, AWS, etc.)

## Pre-Deployment Checklist

### 1. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GROQ_API_KEY=your_groq_api_key_here
```

**Important**: Never commit `.env` files to version control. The `.env.example` file is provided as a template.

### 2. Database Setup

Ensure all database migrations have been applied to your Supabase project:

1. Navigate to your Supabase project dashboard
2. Go to SQL Editor
3. Run all migration files from `supabase/migrations/` in order:
   - `20241124000000_add_target_date_to_objectives.sql`
   - `20251125000000_add_order_field.sql`
   - (and all other migration files)

### 3. Supabase Configuration

#### Row Level Security (RLS)

Ensure RLS policies are properly configured for all tables:
- `journal_entries`
- `ai_analysis`
- `visions`
- `goals`
- `objectives`
- `tasks`
- `task_completions`
- `ideas`
- `mind_maps`

#### Authentication

Configure Supabase Auth settings:
- Enable Email/Password authentication
- Set up email templates (optional)
- Configure redirect URLs for your production domain

### 4. Build the Application

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

The build output will be in the `dist/` directory.

### 5. Test the Build Locally

```bash
# Preview the production build
npm run preview
```

Test all major features:
- User authentication
- Journal entries
- Objectives management
- Mind maps
- Ideas
- Tracking dashboard
- AI features

## Deployment Options

### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory
3. Configure environment variables in Vercel dashboard
4. Deploy: `vercel --prod`

**Environment Variables in Vercel:**
- Go to Project Settings → Environment Variables
- Add all variables from `.env.example`

### Netlify

1. Install Netlify CLI: `npm i -g netlify-cli`
2. Run `netlify deploy --prod`
3. Configure environment variables in Netlify dashboard

**Build Settings:**
- Build command: `npm run build`
- Publish directory: `dist`

### AWS S3 + CloudFront

1. Build the application: `npm run build`
2. Upload `dist/` contents to S3 bucket
3. Configure CloudFront distribution
4. Set up environment variables (consider using AWS Systems Manager Parameter Store)

### Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Post-Deployment

### 1. Verify Environment Variables

Ensure all environment variables are correctly set in your hosting platform.

### 2. Update Supabase Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:
- Add your production URL to "Site URL"
- Add your production URL to "Redirect URLs"

### 3. Test Production Build

1. Test user registration and login
2. Verify all API endpoints are working
3. Test AI features (Groq API)
4. Check error handling and error boundaries
5. Verify responsive design on mobile devices

### 4. Monitor and Logging

- Set up error tracking (Sentry, LogRocket, etc.)
- Monitor API usage (Supabase, Groq)
- Set up analytics (optional)

### 5. Performance Optimization

- Enable CDN caching for static assets
- Configure proper cache headers
- Monitor bundle sizes
- Use lazy loading for routes (if not already implemented)

## Security Considerations

1. **Environment Variables**: Never expose API keys in client-side code
2. **RLS Policies**: Ensure all database tables have proper RLS policies
3. **CORS**: Configure CORS in Supabase for your production domain
4. **HTTPS**: Always use HTTPS in production
5. **Input Validation**: All user inputs are sanitized via `src/utils/security.ts`

## Troubleshooting

### Build Errors

- Ensure all dependencies are installed: `npm install`
- Check Node.js version (requires 18+)
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### Runtime Errors

- Check browser console for errors
- Verify environment variables are set correctly
- Check Supabase connection and RLS policies
- Verify Groq API key is valid

### Performance Issues

- Check bundle sizes in build output
- Enable code splitting if needed
- Optimize images and assets
- Use browser DevTools to identify bottlenecks

## Support

For issues or questions:
1. Check the README.md for setup instructions
2. Review TECHNICAL_SPECIFICATION.md for architecture details
3. Check Supabase and Groq API documentation

