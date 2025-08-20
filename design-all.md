# **MVP Product Design — “Describe & See” English Learning App**

## 🎯 **Goal**

Help users improve their English descriptive skills by having them describe a scene in English, then receive **AI-generated visual feedback** (image based on their description) and **language feedback** (accuracy, detail, and suggestions).

---

**Design Principles**

1. **Tight Feedback Loop** — Scene → User Description → AI Feedback → Iterate or Move On.
2. **Instant Results** — Feedback and new image in seconds.
3. **Low Entry Barrier** — First round playable without sign-up.

---

## 🧩 **MVP Scope**

### 0 Target Platforms
- iOS (iOS 15+, tested on iPhone SE/13/14)
- Android (Android 10+, tested on Pixel/三星主流机型)
- No Web/Desktop support in MVP


### 1. Scene Tasks

* **Image Library**: Fixed 15 images.
* **Image Specs**:

  * Size: 1024×576 px, JPG format
  * Style: Photorealistic, daytime, consistent color tone
* **Task Prompt**: Always display:

  ```
  Describe this scene in English in 2–3 sentences.
  ```

---

### 2. User Input

* **Method**: Text input only (single-line text area, expandable on Enter).
* **Validation**:

  * Must have ≥ 10 words.
  * Reject and show inline error message if shorter.

---

### 3. AI Feedback Logic

**Process** (parallel execution):

1. **Language Evaluation**

   * System prompt:

     ```
     You are an English language evaluator.  
     Given the user's description and the actual scene's reference metadata,  
     score the detail richness (1–5), identify any missing or incorrect details,  
     suggest a more accurate/natural revision, and extract key vocabulary.  
     ```
   * Output JSON format:

     ```json
     {
       "accuracyNote": "Missing the red umbrella.",
       "detailScore": 4,
       "suggestedRevision": "A young woman is walking in the park, holding a red umbrella.",
       "keywords": ["umbrella", "park", "walking"]
     }
     ```

2. **Image Generation**

   * Prompt = User description + fixed style suffix:

     ```
     [USER_DESCRIPTION]. Highly realistic, photorealistic style, 16:9 aspect ratio, daytime lighting, ultra-clear focus.
     ```
   * Image size: 1024×576 px
   * Return as public URL.

3. **Parallel Behavior**:

   * Both language evaluation and image generation are triggered in parallel.
   * Text feedback is returned to the client immediately when ready, even if the image is still generating.
   * The image is pushed to the UI as soon as it is ready; if it fails within 15s, the UI falls back to text-only feedback with a placeholder image.

4. **Progressive Response Protocol**:

   * `/submit` returns a JSON object immediately with `"imageUrl": null` if the image is not yet ready.
   * The client then polls `/attempts/{id}` every 2s until:

     * An `imageUrl` is available (status=`ok`)
     * Or `status=text_only` is set (timeout or failure)
   * Polling stops after a maximum of 15s from the original request.

---

### 4. User Actions

* **Try Again**:

  * Keep original input in text box for editing.
  * Send revised description through same process.
* **Next Image**:

  * Randomly select a new image from the library, avoiding repeats until all are shown once.

---

### 5. Interface Prototype

`./yuanxing.png`

---

## 🔄 **User Flow**

```mermaid
flowchart TD
    A[Enter Practice Page] --> B[Show Scene Image + Task Prompt]
    B --> C{≥10 words entered?}
    C -- No --> H[Error: Please use at least 10 words] --> C
    C -- Yes --> D[Send to Backend /submit]
    D --> E[Parallel: Language Evaluation + Image Generation]
    E --> F[Display Feedback: Accuracy + Score + Suggestion + Keywords (image may still load)]
    F --> G{Image Ready?}
    G -- Yes --> J[Update UI with New Image]
    G -- No --> K[Show Placeholder / Retry Option]
    J --> I{User Choice}
    K --> I
    I -- Try Again --> D
    I -- Next Image --> B
```

---

## 📜 **API Contract**

### **POST /submit**

**Request**:

```json
{
  "sceneId": "scene_003",
  "text": "A young woman is walking in a park holding an umbrella."
}
```

**Response** (progressive capability):

```json
{
  "accuracyNote": "Missing the fact that the umbrella is red.",
  "detailScore": 4,
  "suggestedRevision": "A young woman is walking in the park, holding a red umbrella.",
  "keywords": ["umbrella", "park", "walking"],
  "imageUrl": null
}
```

* `"imageUrl"` may be `null` initially. The client polls `/attempts/{id}` for the final URL or timeout status.

---

## 🖥 **UI State Table**

| State                        | Image Area                   | Input Area                        | Feedback Panel                                                | Actions                        |
| ---------------------------- | ---------------------------- | --------------------------------- | ------------------------------------------------------------- | ------------------------------ |
| Initial                      | Scene image from library     | Empty text box                    | Hidden                                                        | Send button (disabled)         |
| Input <10 words              | Scene image from library     | Text box with user input          | Error message: “Please use at least 10 words”                 | Send button (disabled)         |
| Submitting                   | Scene image (dimmed overlay) | Disabled                          | Loading spinner                                               | None                           |
| Feedback (text-only initial) | Scene image (original)       | Text box (filled with last input) | Accuracy note, score, suggestion, keywords; image placeholder | Try Again / Wait for Image     |
| Feedback (ok)                | Scene image (original)       | Text box (filled with last input) | Full feedback with generated image                            | Try Again / Next Image buttons |
| Feedback (text\_only final)  | Scene image (original)       | Text box (filled with last input) | Feedback + placeholder + “Image unavailable” note             | Try Again / Next Image buttons |
| Next Image                   | New scene image from library | Empty text box                    | Hidden                                                        | Send button (disabled)         |

**UI Placeholder Rules**:

* Image placeholder is a blurred or greyed-out rectangle (same aspect ratio).
* A small spinner overlay appears until the image is ready or timeout is reached.

---

## ⏱ **Performance Requirements**

* **Language evaluation**: ≤ 2s average latency
* **Image generation**: ≤ 6s average latency
* **Timeout handling**:

  * If image generation fails after 15s → return feedback text only.
  * Show placeholder image with note: “Image unavailable”.

---

# Describe & See — **MVP Technical Design**

## 1) Tech Stack (lean & opinionated)

**Frontend (primary)**

* **Runtime:** Expo SDK 53 · React **19** · React Native **0.79** · TypeScript 5 · **Node ≥ 20**
* **Routing:** **expo-router v3** (single screen `/practice` for MVP)
* **State:** **Zustand** (UI state) + **React Query 5** (requests/cache/retries)
* **Storage:** **AsyncStorage** for `installId`, `lastResult`, and `seenSceneIds` (array of scene IDs as JSON string, reset when all scenes viewed) to prevent repeats until all are shown once (optional: **expo-secure-store** for hardened `installId`)
* **Network:** `fetch` → **Supabase Edge Function** `/submit` (HTTPS)
* **Images:** **expo-image** (`cachePolicy="disk"`, `Image.prefetch` for next-scene warmup)
* **Styles:** RN **StyleSheet** (no UI kit for MVP)
* **Utils:** **expo-crypto** (if a local unique identifier is needed)

**Backend (Supabase-based, thin)**

* **Edge Function: `/submit`** (TypeScript / Deno)

  * Input validation (≥10 words, moderation, rate limit)
  * Triggers **both** GPT evaluation and image generation **in parallel**
  * Writes single `attempts` record with `status=partial` → updated to `ok` or `text_only`
  * Polling endpoint `/attempts/{id}` returns latest state and `imageUrl`

* **Postgres (Supabase)**

  * **Required:** `attempts` table only (MVP).
  * Duplicate submissions prevented by **frontend button disabling** and minimal backend checks.

* **Storage (Supabase + CDN)**

  * Buckets: `scenes` (15 preloaded images), `generated` (temporary public URLs for generated images).

**Third-party**

* **OpenAI**: GPT for text evaluation (JSON response), Images API for 1024×576 generation (prefer WebP/JPEG if available).
* API keys stored **only** in Edge Functions (never exposed to the client).

---

## 2) System Architecture and Sequence Diagram 

### System Architecture

```mermaid
flowchart LR
  subgraph Client[Expo App]
    UI[Practice UI & state]
  end

  subgraph Edge[Supabase Edge Function]
    SUB[/submit/]
  end

  subgraph DB[Postgres]
    AT[(attempts)]
  end

  OAI[OpenAI APIs]

  UI -->|sceneId, text| SUB
  SUB -->|Moderation + rate limit| OAI
  SUB -->|Parallel calls| OAI
  OAI -->|JSON (text feedback)| SUB
  OAI -->|Image URL| SUB
  SUB -->|status partial → ok/text_only| AT
  SUB -->|Text feedback immediately| UI
  SUB -->|Image URL when ready via polling| UI
```

### Sequence Diagram — /submit progressive flow

```mermaid
sequenceDiagram
    autonumber
    participant C as Client (Expo App)
    participant S as Edge Function /submit
    participant DB as Postgres (attempts)
    participant TE as OpenAI (Text Eval)
    participant IM as OpenAI (Image Gen)

    Note over C: User clicks Send (sceneId, text)

    C->>S: POST /submit {sceneId, text}
    S->>S: Validate (≥10 words, moderation, rate limit)
    S->>DB: INSERT attempts(status=partial, input_text,...)
    par Parallel tasks
        S->>TE: Eval request
        S->>IM: Image request (1024x576)
    end

    TE-->>S: Eval JSON {accuracyNote, detailScore, ...}
    S->>DB: UPDATE attempts (detail_score, accuracy_note, ...)
    S-->>C: 200 OK {text feedback, imageUrl: null, attemptId}

    Note over C: Render text feedback + placeholder; start polling

    loop every 2s until 15s
        C->>S: GET /attempts/{attemptId}
        alt image ready
            S->>DB: SELECT attempts
            DB-->>S: image_url, status=ok
            S-->>C: {imageUrl, status=ok}
            C->>C: Replace placeholder with image
            break
        else not ready
            S-->>C: {imageUrl: null, status=partial}
        end
    end

    alt image completes within 15s
        IM-->>S: Image URL
        S->>DB: UPDATE attempts (image_url, status=ok, latency_image_ms)
    else timeout or failure (≥15s)
        S->>DB: UPDATE attempts (status=text_only)
        C->>C: Show "Image unavailable" + retry button
    end
```
---

## 3) Guardrails & Defaults

* **Timeouts**:

  * Text evaluation: `EVAL_TIMEOUT_MS = 8000`
  * Image generation: `IMG_TIMEOUT_MS = 15000`
* **Rate limit (MVP)**: 6 requests/minute per `installId` (in-memory).
* **Duplicate prevention**: frontend disables submit button during requests; backend has lightweight checks.
* **Statuses**: `partial`, `ok`, `text_only`, `blocked`, `error`.
* **Images**: prefer **WebP/JPEG** (≈120–250 KB).
* **Security**: API keys remain server-side; no direct OpenAI calls from client.

**Error Handling Rules**:

| Failure Type              | UI Behavior                                              | Retry Path                 |
| ------------------------- | -------------------------------------------------------- | -------------------------- |
| `/submit` network error   | Show toast "Network error", keep input in text box       | Manual retry               |
| Text eval timeout/failure | Show generic error, allow retry                          | `/submit`                  |
| Image generation failure  | Switch to `text_only` state with placeholder + retry btn | Retry calls `/image_proxy` |

---

## 4) Minimal Database Schema

```sql
create table attempts(
  id uuid primary key default gen_random_uuid(),
  install_id text not null,
  user_id uuid null,
  scene_id text not null,
  input_text text not null,
  detail_score int null,
  accuracy_note text null,
  suggested_revision text null,
  keywords text[] null,
  image_url text null,
  status text not null check (status in ('partial','ok','text_only','blocked','error')),
  latency_eval_ms int null,
  latency_image_ms int null,
  created_at timestamptz default now()
);
```

---