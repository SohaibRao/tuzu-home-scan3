# Deploying Tuzu Home Scan to Vercel

This guide will help you deploy your Next.js application to Vercel.

## Prerequisites

1. A GitHub account
2. A Vercel account (sign up at https://vercel.com)
3. Your Azure API credentials ready

## Step 1: Push Your Code to GitHub

First, commit all your changes and push to GitHub:

```bash
# Navigate to your project directory
cd "C:\Users\Sohaib\Documents\GitHub\Azure AI Project\tuzu-home-scan"

# Add all files to git
git add .

# Commit the changes
git commit -m "Prepare for Vercel deployment"

# If you haven't created a GitHub repository yet, create one at https://github.com/new
# Then add it as a remote and push:
git remote add origin https://github.com/YOUR_USERNAME/tuzu-home-scan.git
git branch -M main
git push -u origin main
```

## Step 2: Import Project to Vercel

1. Go to https://vercel.com/new
2. Sign in with your GitHub account
3. Click "Import Project"
4. Select the `tuzu-home-scan` repository
5. Vercel will automatically detect it's a Next.js project

## Step 3: Configure Environment Variables

Before deploying, you MUST add your environment variables:

1. In the Vercel import screen, scroll down to "Environment Variables"
2. Add the following variables (one by one):

### Required Environment Variables:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `AZURE_VISION_ENDPOINT` | `https://your-vision.cognitiveservices.azure.com/` | Your Azure Vision API endpoint |
| `AZURE_VISION_KEY` | `your-azure-vision-key` | Your Azure Vision API key |
| `AZURE_OPENAI_ENDPOINT` | `https://your-resource.openai.azure.com/` | Your Azure OpenAI endpoint |
| `AZURE_OPENAI_KEY` | `your-azure-openai-key` | Your Azure OpenAI API key |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | `gpt-4o` | Your GPT-4 deployment name |
| `AZURE_OPENAI_API_VERSION` | `2024-08-01-preview` | Azure OpenAI API version |
| `NEXT_PUBLIC_APP_URL` | `https://your-vercel-app.vercel.app` | Your Vercel app URL (update after first deployment) |
| `SESSION_EXPIRY_HOURS` | `24` | Session expiry time |
| `MAX_IMAGES_PER_SESSION` | `30` | Max images per session |
| `MAX_IMAGE_SIZE_MB` | `10` | Max image size in MB |

**Important:**
- For all environment variables, select "Production", "Preview", and "Development" checkboxes
- You can get your actual Vercel URL after the first deployment, then update `NEXT_PUBLIC_APP_URL`

## Step 4: Deploy

1. Click "Deploy"
2. Wait for the build to complete (usually 2-5 minutes)
3. Once deployed, you'll get a URL like: `https://tuzu-home-scan.vercel.app`

## Step 5: Update Environment Variables (Post-Deployment)

After your first deployment:

1. Go to your Vercel dashboard
2. Select your project
3. Go to "Settings" > "Environment Variables"
4. Update `NEXT_PUBLIC_APP_URL` with your actual Vercel URL
5. Redeploy (go to "Deployments" tab, click the three dots on the latest deployment, and select "Redeploy")

## Step 6: Verify Deployment

1. Visit your Vercel URL
2. Test the complete flow:
   - Start a new scan
   - Set location
   - Upload photos
   - Run analysis
   - View results

## Troubleshooting

### Build Fails

- Check the build logs in Vercel dashboard
- Ensure all environment variables are set correctly
- Make sure `npm run build` works locally first

### API Errors

- Verify all Azure API credentials are correct
- Check that API keys have the necessary permissions
- Ensure API endpoints are accessible from Vercel's servers

### Images Not Loading

- Check that the `/api/images` routes are working
- Verify that file uploads are processed correctly
- Check Vercel function logs for errors

## Automatic Deployments

Once set up, Vercel will automatically deploy your app when you push to GitHub:

- Push to `main` branch = Production deployment
- Push to other branches = Preview deployment

## Custom Domain (Optional)

To add a custom domain:

1. Go to your project in Vercel
2. Click "Settings" > "Domains"
3. Add your domain and follow the DNS configuration instructions

## Monitoring

Vercel provides:
- Real-time logs in the dashboard
- Analytics (if you upgrade to a paid plan)
- Performance metrics

## Cost Considerations

- Vercel Free tier includes:
  - 100GB bandwidth per month
  - 6,000 build minutes per month
  - Unlimited serverless function invocations (with limits)

- Monitor your usage in the Vercel dashboard
- Azure API calls will be billed separately by Microsoft

## Support

If you encounter issues:
- Check Vercel documentation: https://vercel.com/docs
- Vercel Discord: https://vercel.com/discord
- GitHub Issues: Create an issue in your repository
