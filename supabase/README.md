# Supabase Setup

## What you need to do (one-time setup)

1. Create a free Supabase account at https://supabase.com
2. Create a new project (e.g. named "nextgem-volunteers")
3. Open the **SQL Editor** in the left sidebar
4. Copy the entire contents of `schema.sql` and paste it in
5. Click **"Run"** – this creates all tables, indexes, policies, and a sample orphanage

## Storage bucket

After running the schema:

1. Open **Storage** in the left sidebar
2. Click **"New bucket"**
3. Name: `certificates`
4. Toggle **"Public bucket"** to ON
5. Click **"Create bucket"**

## Get your API keys

1. Open **Project Settings** (gear icon at bottom of left sidebar)
2. Click **"API"**
3. Copy these values – you'll paste them into Vercel:
   - **Project URL** (e.g. `https://abcdefghijk.supabase.co`)
   - **anon / public** key (starts with `eyJ...`)
   - **service_role / secret** key (starts with `eyJ...` – keep this secret)

## Test the seed data

After running the schema, your database has a sample orphanage:

| Field | Value |
|---|---|
| Name | Sample Orphanage - Lagos |
| State | Lagos |
| QR Code | `NGSAMPLE-LAGOS-001` |

Use this QR code to test scanning.
