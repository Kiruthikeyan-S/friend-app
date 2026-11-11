# Aura – Personal AI Voice Assistant (Phase 1)

A modern, Android-first **Personal AI Voice Assistant** built with **React Native (Expo + TypeScript + Expo Router)** and a **Python FastAPI** backend foundation.

Designed with a warm, human-centric **Light Theme** and strict **Consent-First Personal Memory** controls.

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
  VoiceButton.tsx
  MemoryCard.tsx
  LoadingIndicator.tsx

services/
  api.ts
  appStore.ts
  auth.ts
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
```

---

## 2. Setup & Running Instructions

### A. Start the FastAPI Backend

```powershell
cd backend
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Verify the backend endpoints:
- `GET http://localhost:8000/` – Basic API status & Phase 1–10 service readiness
- `GET http://localhost:8000/health` – Health check endpoint
- `GET http://localhost:8000/docs` – Interactive OpenAPI / Swagger UI

### B. Start the Mobile Application (Expo)

From the root directory (`f:\Ai -fri`):

```powershell
npm install
npm run typecheck
npx expo start
```

---

## 3. Testing on a Physical Android Phone

1. Install **Expo Go** from the Google Play Store on your Android phone.
2. Connect your Android phone and your development computer to the **same Wi-Fi network**.
3. Find your computer's local LAN IPv4 address (`ipconfig` on Windows, e.g., `192.168.1.105`) and set it in `.env`:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.105:8000
   ```
4. Start the FastAPI server bound to `0.0.0.0`:
   ```powershell
   cd backend
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
5. Start Expo in the project root:
   ```powershell
   npx expo start
   ```
6. Open **Expo Go** on your Android phone and scan the QR code displayed in the terminal.
   *(If your Wi-Fi blocks local peer connections, run `npx expo start --tunnel`.)*

# friend-app
