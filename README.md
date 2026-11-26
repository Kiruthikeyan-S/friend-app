# Anytime Anywhere Chat — Aura Personal AI Voice Assistant (`friend-app`)

A modern, Android-first **Personal AI Voice & Text Assistant** built with **React Native (Expo SDK 58 + TypeScript + Expo Router)**, **Supabase PostgreSQL**, and a **Python FastAPI** backend (with automatic **HTTPS Cloud AI** fallback so standalone `.apk` builds work anywhere).

### Key Highlights
- **Pastel Iridescent Glassmorphism UI**: Blush-lavender frosted glass interface featuring a 3D iridescent glass orb, Smart Hub dashboard, custom glassmorphic app icon, and embedded `Feather` icon font.
- **Separated Text & Voice Experiences**:
  - **Smart Chat (Text Only)**: Fast, silent text replies with a fresh conversation on every launch, a **History (`clock`)** menu for past chats, and a floating **Scroll-to-Bottom** button.
  - **AI Voice Recognition (Voice-to-Voice)**: Auto-listens on focus using `16 kHz` Android `voice_recognition` noise suppression, detects `0.75s` natural pauses, transcribes via `whisper-large-v3-turbo`, and speaks replies immediately.
- **5 Distinct Country-Neutral Agent Voices**: Switch between **Clara** (*Warm · Smooth*), **Julian** (*Deep · Clear*), **Maya** (*Soft · Calm*), **Arjun** (*Rich · Steady*), and **Nova** (*Bright · Lively*) using local device voices with distinct pitch/speed profiles and zero country/timezone bias.
- **Per-Device Private Database & Supabase Cloud Sync**: Each phone generates its own unique persistent `deviceId` (`services/device.ts`) and local private database snapshot, strictly isolating `memories` and `messages` per device in Supabase (`services/supabase.ts`).
- **Standalone APK Ready**: Direct `HTTPS` Groq AI (`openai/gpt-oss-20b` / `openai/gpt-oss-120b` / `qwen/qwen3.8-27b` + `whisper-large-v3-turbo`) works on any Wi-Fi or mobile data even when the local PC server is off.

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
      chat.py
      voice.py
      memory.py
      conversations.py
    services/
      llm_service.py
      voice_service.py
      memory_service.py
      conversation_service.py
  requirements.txt
  .env.example

supabase_setup.sql
eas.json
```

---

## 2. Setup & Running Instructions

### A. Supabase Database Setup
Run [`supabase_setup.sql`](supabase_setup.sql) in your Supabase **SQL Editor** to create `public.memories` and `public.messages` with Row Level Security policies.

### B. Start the FastAPI Backend (Optional for Local Dev)

```powershell
cd backend
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Verify the backend endpoints:
- `GET http://localhost:8000/` – Basic API status
- `GET http://localhost:8000/health` – Health check endpoint
- `GET http://localhost:8000/docs` – Interactive OpenAPI / Swagger UI

### C. Start the Mobile Application (Expo)

From the root directory (`f:\Ai -fri`):

```powershell
npm install
npm run typecheck
npx expo start -c
```

---

## 3. Testing on a Physical Android Phone

1. Install **Expo Go** from the Google Play Store on your Android phone.
2. Connect your Android phone and your development computer to the **same Wi-Fi network**.
3. Set your PC's local LAN IPv4 address (`ipconfig` on Windows) in `.env`:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.88.4:8000
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
   ```
4. Start Expo (`npx expo start -c`) and scan the QR code with **Expo Go**.

---

## 4. Building an Installable Android `.apk` (Expo EAS)

```powershell
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

# friend-app
