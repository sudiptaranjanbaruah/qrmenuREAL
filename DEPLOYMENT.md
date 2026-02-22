# Deploying QR Menu Quick to Render 🚀

This guide will walk you through deploying your full-stack Node.js & PostgreSQL application to Render.com for free.

## Prerequisites
1. Your code is already pushed to your GitHub repository (`sudiptaranjanbaruah/qrmenuREAL`).
2. You have a free account on [Render.com](https://render.com).
3. You have your Supabase PostgreSQL Database URL (the same one in your `.env` file).

## Step 1: Create a New Web Service
1. Log in to Render.com.
2. Click the **"New"** button in the top right corner and select **"Web Service"**.
3. Choose **"Build and deploy from a Git repository"**.
4. Connect your GitHub account and select your `qrmenuREAL` repository.

## Step 2: Configure the Web Service
Fill out the configuration details as follows:

- **Name:** `qrmenuquick` (or any name you prefer)
- **Region:** Choose the region closest to your users.
- **Branch:** `main`
- **Root Directory:** (leave blank)
- **Runtime:** `Node`
- **Build Command:** 
  ```bash
  npm install && npx prisma generate
  ```
- **Start Command:**
  ```bash
  npm start
  ```
- **Instance Type:** Select the **Free** tier.

## Step 3: Add Environment Variables
Scroll down and click on **"Environment Variables"**, then add the exact exact variables from your local `.env` file:

| Key | Value |
| :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres:Sudiptaaa1%40@db.xgawettshbfvulpnivno.supabase.co:5432/postgres` (from your `.env`) |
| `JWT_SECRET` | `849c62f93f43612fa2dcd65d31b5cc6b07f69460a327e3cfb2348206f6e1e275` (or any random string) |
| `WHATSAPP_NUMBER` | `+919366143590` (your WhatsApp number) |
| `PORT` | `3000` |

*(Note: Render automatically creates the `PORT` variable, but explicitly adding it ensures it matches your app.)*

## Step 4: Deploy
1. Click the **"Create Web Service"** button at the bottom.
2. Render will now clone your repo, run the build command (`npm install && npx prisma generate`), and then start your server.
3. This process usually takes 1-3 minutes. You can watch the progress in the logs on the screen.

## Step 5: Verify Deployment
Once the logs say **"Your service is live 🎉"**:
1. Click the URL provided by Render at the top left of the dashboard (e.g., `https://qrmenuquick-xxxx.onrender.com`).
2. Your customer menu should load perfectly!
3. Go to `/admin` to log in (`admin` / `admin123`) and verify that your menu items and orders load from Supabase.

## Updating the App
Because you connected GitHub to Render, **any time you run `git push`** to your `main` branch, Render will automatically rebuild and deploy your changes. You don't need to do anything else!
