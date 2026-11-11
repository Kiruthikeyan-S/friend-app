# Aura – Personal AI Voice Assistant (`friend-app`)

A modern, Android-first **Personal AI Voice Assistant** built with **React Native (Expo + TypeScript + Expo Router)** and a **Python FastAPI** backend.

### Key Highlights
- **5 Distinct AI Agent Voices**: Switch instantly between **Clara** (*Warm · US*), **Julian** (*Upbeat · US*), **Maya** (*Soothing · UK*), **Arjun** (*Grounded · IN*), and **Nova** (*Playful · AU*) with live voice sample previews and custom pitch/speed/personality training.
- **Immediate Voice Response (`~0.5s`)**: Real-time microphone audio metering & silence detection (`0.7s` pause auto-send) paired with persistent `OpenAI` SDK connection pooling (`Ollama Cloud deepseek-v4.1-flash` + `Groq openai/gpt-oss-20b` & `whisper-large-v3-turbo`).
- **Continuous Hands-Free Conversation Loop**: Talk back and forth naturally without tapping after every sentence.
- **Consent-First Personal Memory**: Automatically extracts personal facts (`Profile`, `Preferences`, `Work`, `Interests`) from speech and chat with explicit user permission and category controls.
- **Clean Light-Mode UI**: Android keyboard-aware layout where input bars lift smoothly above the keyboard.

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
