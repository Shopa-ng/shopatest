# Deploying Shopa API to Render

This guide outlines how to deploy the Shopa backend to [Render.com](https://render.com).

## Prerequisites
- A GitHub repository with your code.
- A Render account.
- A remote PostgreSQL database (you are using Neon).
- A remote Redis instance (you are using Redis Cloud).

## Deployment Steps (Blueprints)

The easiest way to deploy is using the `render.yaml` file I created.

1. **Push your changes** to GitHub:
   ```bash
   git add .
   git commit -m "chore: add render.yaml for deployment"
   git push origin develop
   ```

2. **Go to Render Dashboard**:
   - Click **New +** -> **Blueprint**.
   - Connect your GitHub repository.
   - Render will detect the `render.yaml` file.

3. **Configure Environment Variables**:
   Render will ask you to fill in the sensitive environment variables defined in `render.yaml` (marked with `sync: false`). Copy these values from your local `.env` file:

   - `DATABASE_URL`: Your Neon DB URL
   - `JWT_SECRET`: Generate a strong random string
   - `CLOUDINARY_*`: Your Cloudinary credentials
   - `REDIS_*`: Your Redis Cloud credentials
   - `SMTP_*`: Your Gmail SMTP credentials
   - `PAYSTACK_*`: Your Paystack keys
   - `FLUTTERWAVE_*`: Your Flutterwave keys
   - `FIREBASE_*`: Your Firebase admin credentials (ensure the private key handles newlines correctly if pasting via UI, or use the base64 encoded version if needed)

4. **Deploy**:
   - Click **Apply**. Render will start the build process.
   - It will run `npm install`, `npx prisma generate`, and `npm run build`.
   - Then it will start the app with `npm run start:prod`.

## Manual Deployment (Web Service)

If you prefer to set it up manually without `render.yaml`:

1. **New Web Service**:
   - Connect your repo.
   - **Runtime**: Node
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Region**: Choose closest to your DB (e.g., Ohio for Neon US-East).

2. **Environment Variables**:
   - Add all the variables from your `.env` file manually in the "Environment" tab.

## Database Migrations

Since `render.yaml` only runs the build command, you should apply migrations manually or add it to the build command.

**Option A: Manual (Recommended)**
Run `npx prisma db push` from your local machine (connected to the production DB URL) before deploying changes.

**Option B: Auto-Migrate in Build**
Update the build command in Render to:
`npm install && npx prisma generate && npx prisma db push && npm run build`
*(Note: `db push` is safer for rapid dev, but `migrate deploy` is better for strict production control).*

## Troubleshooting

- **Logs**: Check the "Logs" tab in Render if the deployment fails.
- **Port**: Render automatically sets `PORT` to 10000, and your app listens on `process.env.PORT`, so this should work automatically.
