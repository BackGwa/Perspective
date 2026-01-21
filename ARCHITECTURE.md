# Architecture
Perspective is a P2P screen sharing web application.
The Host shares screen or camera, and Participants receive the stream in real-time.

## Data Flow

### Host to Participant Streaming
```mermaid
sequenceDiagram
    participant HostLP as LandingPage (Host)
    participant MS as MediaService
    participant SC as StreamContext
    participant HostPage as HostPage
    participant PS as PeerService (Host)
    participant Server as PeerJS Server
    participant PartLP as LandingPage (Participant)
    participant PPeer as Temp Peer
    participant PartPage as ParticipantPage

    HostLP->>MS: startCapture(camera|screen)
    MS->>MS: getUserMedia/getDisplayMedia
    MS->>MS: applyVideoContentHint(motion|detail)
    MS->>MS: addMicrophoneTrackIfScreen()
    MS-->>HostLP: MediaStream
    HostLP->>SC: setStream(stream), setSessionSecret(password|empty), setSessionDomainPolicy(same-domain|all-domains)
    HostLP->>HostPage: navigate(/host)

    HostPage->>PS: initializePeer('host')
    PS->>Server: connect
    Server-->>PS: peerId
    PS-->>HostPage: peerId (for QR/Link)

    PartLP->>PPeer: new Peer(config from env)
    PPeer->>Server: open
    PPeer->>PS: connect(hostPeerId) (data channel)
    PartLP->>PS: SESSION_JOIN_REQUEST(origin)
    PS->>PS: check domain policy

    alt Domain mismatch
        PS-->>PartLP: SESSION_JOIN_REJECTED
    else Domain ok
        alt Password protected
            PS-->>PartLP: PASSWORD_REQUEST(nonce, algorithm)
            PartLP->>PartLP: HMAC(password, nonce)
            PartLP->>PS: PASSWORD_RESPONSE(proof)
            PS-->>PartLP: PASSWORD_APPROVED
        else Public room
            PS-->>PartLP: PASSWORD_APPROVED
        end
    end

    PartLP->>SC: setParticipantPeer(tempPeer), setParticipantHostConnection(dataConn)
    PartLP->>PartPage: navigate(/share?peer=...)
    PS->>PS: callPeer(stream) + applyVideoDegradationPreference
    PS-->>PPeer: MediaStream
    PPeer-->>PartPage: call(stream)
    PartPage->>SC: setRemoteStream(stream)
```

### Chat Messaging (Data Channel)
```mermaid
sequenceDiagram
    participant HostPage as HostPage
    participant PartPage as ParticipantPage
    participant ChatCtx as ChatContext
    participant ChatHook as useChatMessaging
    participant Crypto as passwordCrypto
    participant PS as PeerService

    HostPage->>ChatCtx: setConnectionTimestamp(now)
    PartPage->>ChatCtx: setConnectionTimestamp(now)

    alt Participant sends message
        PartPage->>ChatHook: sendMessage(text)
        ChatHook->>ChatHook: validate length <= 128
        ChatHook->>Crypto: encryptMessage(text, sessionSecret?)
        ChatHook->>PS: sendDataMessage(hostPeerId, CHAT_MESSAGE)
    else Host sends message
        HostPage->>ChatHook: sendMessage(text)
        ChatHook->>ChatHook: validate length <= 128
        ChatHook->>Crypto: encryptMessage(text, sessionSecret?)
        ChatHook->>PS: broadcastDataMessage(CHAT_MESSAGE)
    end

    PS-->>HostPage: data(CHAT_MESSAGE)
    HostPage->>ChatHook: handleIncomingMessage
    alt Encrypted payload + sessionSecret
        ChatHook->>Crypto: decryptMessage(ciphertext, iv, sessionSecret)
    else Plaintext
        ChatHook->>ChatHook: use payload text as-is
    end
    ChatHook->>ChatHook: ignore if payload.timestamp < connectionTimestamp
    ChatHook->>PS: forward to other participants (host only)
    ChatHook->>ChatCtx: addMessage + update unreadCount (if chat closed)
```

### Password Authentication Flow
```mermaid
sequenceDiagram
    participant Host as LandingPage/HostPage
    participant SC as StreamContext
    participant PwdH as usePasswordProtection
    participant Part as LandingPage (Participant)
    participant PwdV as usePasswordVerification

    Host->>SC: setSessionSecret(password|empty), setSessionDomainPolicy(same-domain|all-domains)
    Part->>PwdH: data connection opened
    Part->>PwdH: SESSION_JOIN_REQUEST(origin)
    PwdH->>PwdH: check domain policy

    alt Domain mismatch
        PwdH-->>Part: SESSION_JOIN_REJECTED
    else Domain ok
        PwdH->>PwdH: check max participants + isPasswordProtected
        alt Max participants
            PwdH-->>Part: MAX_PARTICIPANTS_EXCEEDED
            PwdH-->>Part: close data connection
        else Public room
            PwdH-->>Part: PASSWORD_APPROVED
        else Password protected
            PwdH-->>Part: PASSWORD_REQUEST(nonce, algorithm)
            Part->>PwdV: submitPassword()
            PwdV->>PwdV: validate length (4-32)
            PwdV->>PwdV: hmacSha256(password, nonce)
            PwdV-->>PwdH: PASSWORD_RESPONSE(proof)
            PwdH->>PwdH: verifyProof(proof, nonce)
            alt Valid
                PwdH-->>Part: PASSWORD_APPROVED
            else Invalid
                PwdH-->>Part: PASSWORD_REJECTED(remainingRetries)
                opt remainingRetries == 0
                    PwdH-->>Part: close data connection
                end
            end
        end
    end
```

## Main Feature Flows

### 1. Start Host Share
```mermaid
flowchart TD
    A[Host selects Share Camera/Screen] --> B["setSessionSecret(password or empty)"]
    B --> C["setSessionDomainPolicy(same-domain|all-domains)"]
    C --> D["startCapture(camera or screen)"]
    D --> E{Source type?}
    E -->|Screen| F[getDisplayMedia]
    E -->|Camera| G[getUserMedia]

    F --> H["applyVideoContentHint(detail)"]
    G --> I["applyVideoContentHint(motion)"]
    H --> J[MediaStream obtained]
    I --> J
    J --> K["If screen: add microphone track when available"]

    K --> L[StreamContext: setStream]
    L --> M[Navigate to HostPage]
    M --> N[Initialize Peer]
    N --> O[Get Peer ID]
    O --> P["Generate QR Code & Link (#/share?peer=...)"]
    P --> Q[Wait for Participants]
```

### 2. Participant Connection
```mermaid
flowchart TD
    A[Participant scans QR or enters link] --> B[Extract Peer ID]
    B --> C["Create temp Peer (configured server) + data connection"]
    C --> D["Send SESSION_JOIN_REQUEST(origin)"]
    D --> F{Domain allowed?}

    F -->|No| G[Show error and stop]
    F -->|Yes| H{Max participants?}

    H -->|Exceeded| I[Show error and stop]
    H -->|Available| J{Password protected?}

    J -->|No| K[Receive PASSWORD_APPROVED]
    J -->|Yes| L["Show password input (nonce)"]
    L --> M["HMAC(password, nonce) -> PASSWORD_RESPONSE(proof)"]
    M --> N{Approved?}
    N -->|No| O[Show error / retry]
    N -->|Yes| K

    K --> P["StreamContext: setParticipantPeer(tempPeer)"]
    P --> Q[Navigate to ParticipantPage]
    Q --> R[Wait for host call]
    R --> S[Receive MediaStream]
    S --> T[StreamContext: setRemoteStream]
```

### 3. QR Scan and URL Validation
```mermaid
flowchart TD
    A[User selects Join with QR] --> B["startQRCamera()"]
    B --> C["getUserMedia(facingMode)"]
    C --> D[Attach stream to QR video element]
    D --> E[useQRScanner enabled]
    E --> F[startContinuousScanning]
    F --> G["scanVideoFrame + jsQR"]
    G --> H{Valid URL?}
    H -->|No| I[Show error message]
    I --> F
    H -->|Yes| J[Stop scanning + stop camera]
    J --> K[Set sessionId + switch to input mode]
    K --> L["startJoinFlow(peerId)"]
```

### 4. In-Session Chat
```mermaid
flowchart TD
    A[User opens chat] --> B["setChatOpen(true) + unreadCount reset"]
    B --> C[Compose message]
    C --> D[useChatMessaging.sendMessage]
    D --> E{Length <= 128?}
    E -->|No| F[Drop + warn]
    E -->|Yes| G{sessionSecret present?}
    G -->|Yes| H[encryptMessage AES-GCM]
    G -->|No| I[Send plaintext]
    H --> J[PeerService send/broadcast CHAT_MESSAGE]
    I --> J
    J --> K[Receiver handleIncomingMessage]
    K --> L{Encrypted?}
    L -->|Yes| M[decryptMessage AES-GCM]
    L -->|No| N[Use text as-is]
    M --> O[ChatContext addMessage]
    N --> O
    O --> P{Chat open?}
    P -->|No| Q[Increment unreadCount]
    P -->|Yes| R[Keep unreadCount at 0]
```

## Media Control Flows

### 1. Host Toggle Video
```mermaid
flowchart TD
    A[Host clicks Video toggle] --> B[useMediaStream.toggleVideo]
    B --> C[MediaService.toggleVideo]
    C --> D[Set video track enabled/disabled]
    D --> E{Source type is screen?}
    E -->|Yes| F[Toggle system audio track]
    E -->|No| G[No extra audio toggle]
    C --> H[StreamContext: setPaused]
```

### 2. Host Toggle Audio
```mermaid
flowchart TD
    A[Host clicks Audio toggle] --> B[useMediaStream.toggleAudio]
    B --> C[MediaService.toggleAudio]
    C --> D[Toggle microphone track]
    C --> E[StreamContext: setMuted]
```

### 3. Host Switch Camera
```mermaid
flowchart TD
    A[Host clicks Switch Camera] --> B[useMediaStream.switchCamera]
    B --> C{sourceType == camera?}
    C -->|No| D[Show error]
    C -->|Yes| E[Stop current video track]
    E --> F["getCameraStream(opposite facingMode)"]
    F --> G[Replace video track on stream]
    G --> H[Stop new stream audio tracks]
```

## Cleanup and Exit
```mermaid
flowchart TD
    A[Exit event] --> B{Scenario}
    B -->|Host clicks Stop| C[useMediaStream.stopCapture]
    C --> D["MediaService.stopStream - stop tracks"]
    D --> E[StreamContext: clearStream]
    E --> F[peerService.destroyPeer]
    F --> G[Navigate to LandingPage]

    B -->|Participant clicks Leave| H[cleanupParticipantPeer]
    H --> I["StreamContext: setRemoteStream(null)"]
    I --> J["ConnectionStatus: idle"]
    J --> K[Redirect to LandingPage]

    B -->|Screen or camera share ended| L[Video track ended event]
    L --> D
```
