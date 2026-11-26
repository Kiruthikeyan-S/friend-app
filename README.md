# Anytime Anywhere Chat — Aura Personal AI Voice Assistant (`friend-app`)

A modern, Android-first **Personal AI Voice & Text Assistant** built with **React Native (Expo SDK 58 + TypeScript + Expo Router)**, **Supabase PostgreSQL (Auth + RLS + pg_cron)**, and a modular **Python FastAPI** backend (`v3.0.0`).

### Key Highlights
- **Pastel Iridescent Glassmorphism UI**: Blush-lavender frosted glass interface featuring a 3D iridescent glass orb, Smart Hub dashboard, custom glassmorphic app icon, and embedded `Feather` icon font.
- **Unified JWT-Authenticated AI Pipeline (`/api/v1/assistant/respond`)**:
  - **Smart Chat (Text)** & **AI Voice Recognition (Voice-to-Voice)** share one secure, privacy-guarded backend pipeline with zero AI provider keys stored in the mobile app.
  - **Versioned Prompt (`aura-v3.0`)**: Intent-aware, anti-repetition, context-preserving responses in both English and Tamil.
- **Consent-Based Personalization & Memory**:
  - Structured categories (`Communication preferences`, `Learning interests`, `Skills and experience`, `Ongoing projects`, `Frequently used preferences`, `User-approved personal context`).
  - Users can approve, reject, edit, and delete memories, backed by `memory_audit_logs`.
- **Deterministic Privacy Guard (`privacy_service.py`)**:
  - Scans both text and Whisper voice transcripts for passwords, API keys, access tokens, JWTs, emails, phone numbers, and Luhn-checked financial card numbers before memory extraction, logging, or LLM responses.
- **Automatic 7-Day UTC Data Retention (`pg_cron` + `retention_service.py`)**:
  - Automatically cleans up expired temporary conversations, temporary messages, expired candidate memories, and expired Storage audio files every 7 days while preserving explicitly approved long-term memories.
- **5 Distinct Country-Neutral Agent Voices**: Switch between **Clara**, **Julian**, **Maya**, **Arjun**, and **Nova** with distinct pitch/speed profiles.

---

## 1. Project Structure

```text
app/
  (auth)/
    _layout.tsx
    login.tsx
    register.tsx
  (tabs)/
    _layout.tsx
    chat.tsx
    voice.tsx
    memory.tsx
    settings.tsx
  _layout.tsx
  index.tsx

components/
  ChatBubble.tsx
  ChatInput.tsx
  GlassBackground.tsx
  LoadingIndicator.tsx
  MemoryCard.tsx
  VoiceButton.tsx

plugins/
  withCleartextTraffic.js

services/
  api.ts
  appStore.ts
  auth.ts
  device.ts
  supabase.ts
  voice.ts

hooks/
  useChat.ts
  useVoice.ts

types/
  chat.ts
  memory.ts
  user.ts

constants/
  colors.ts
  config.ts

backend/
  app/
    main.py
    routes/
      assistant.py
      chat.py
      voice.py
      memory.py
      conversations.py
      system_ops.py
    services/
      authentication_service.py
      conversation_service.py
      evaluation_service.py
      llm_service.py
      memory_service.py
      privacy_service.py
      retention_service.py
      voice_service.py
  tests/
    test_security_and_retention.py
  requirements.txt
  .env.example

supabase_setup.sql
eas.json
```

---

## 2. Setup & Running Instructions

### A. Supabase Database & Retention Setup
Run [`supabase_setup.sql`](supabase_setup.sql) in your Supabase **SQL Editor** to create:
- Tables: `profiles`, `conversations`, `messages`, `user_memories`, `memory_audit_logs`, `retention_logs`
- Strict Row Level Security (`auth.uid() = user_id`)
- `public.run_seven_day_retention_cleanup()` and the daily `03:00 UTC` `pg_cron` cleanup schedule

### B. Start the FastAPI Backend

Configure `backend/.env` with `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and (backend-only) `SUPABASE_SERVICE_ROLE_KEY`, then run:

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Verify the backend endpoints:
- `GET http://localhost:8000/` – Basic API status (`3.0.0`)
- `GET http://localhost:8000/health` – Health check endpoint
- `GET http://localhost:8000/docs` – Interactive OpenAPI / Swagger UI

### C. Run Automated Security, Retention & Evaluation Tests

```powershell
cd backend
python -m pytest -v tests/test_security_and_retention.py
```

### D. Start the Mobile Application (Expo)

From the root directory (`f:\Ai -fri`):

```powershell
npm install
npm run typecheck
npx expo start --clear
```

---

## 3. Testing on a Physical Android Phone

1. Install **Expo Go** from the Google Play Store on your Android phone.
2. Connect your Android phone and your development computer to the **same Wi-Fi network**.
3. Set your PC's local LAN IPv4 address (`ipconfig` on Windows) and public Supabase config in `.env` (never place `SUPABASE_SERVICE_ROLE_KEY` or `GROQ_API_KEY` in mobile `.env`):
   ```env
   EXPO_PUBLIC_API_URL=http://<YOUR_PC_LAN_IP>:8000
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
   ```
4. Start Expo (`npx expo start --clear`) and scan the QR code with **Expo Go**.

---

## 4. Building an Installable Android `.apk` (Expo EAS)

Set `EXPO_PUBLIC_API_URL` to your deployed HTTPS FastAPI backend, then run:

```powershell
npm install -g eas-cli
eas login
eas build -p android --profile preview
```
