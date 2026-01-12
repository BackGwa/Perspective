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
    MS-->>HostLP: MediaStream
    HostLP->>SC: setStream(stream), setSessionPassword(hash|empty)
    HostLP->>HostPage: navigate(/host)

    HostPage->>PS: initializePeer('host')
    PS->>Server: connect
    Server-->>PS: peerId
    PS-->>HostPage: peerId (for QR/Link)

    PartLP->>PS: validateConnection(peerId)
    PS->>Server: temp connect
    PS-->>PartLP: ok

    PartLP->>PPeer: new Peer()
    PPeer->>Server: open
    PPeer->>PS: connect(hostPeerId) (data channel)

    alt Password protected
        PS-->>PartLP: PASSWORD_REQUEST
        PartLP->>PartLP: hashPassword + PASSWORD_RESPONSE
        PS-->>PartLP: PASSWORD_APPROVED
    else Public room
        PS-->>PartLP: PASSWORD_APPROVED
    end

    PartLP->>SC: setParticipantPeer(tempPeer)
    PartLP->>PartPage: navigate(/share?peer=...)
    PS->>PS: callPeer(stream) + applyVideoDegradationPreference
    PS-->>PPeer: MediaStream
    PPeer-->>PartPage: call(stream)
    PartPage->>SC: setRemoteStream(stream)
```

### Password Authentication Flow
```mermaid
sequenceDiagram
    participant Host as LandingPage/HostPage
    participant SC as StreamContext
    participant PwdH as usePasswordProtection
    participant Part as LandingPage (Participant)
    participant PwdV as usePasswordVerification

    Host->>SC: setSessionPassword(hash|empty)
    Part->>PwdH: data connection opened
    PwdH->>PwdH: check max participants + isPasswordProtected

    alt Max participants
        PwdH-->>Part: MAX_PARTICIPANTS_EXCEEDED
    else Public room
        PwdH-->>Part: PASSWORD_APPROVED
    else Password protected
        PwdH-->>Part: PASSWORD_REQUEST
        Part->>PwdV: submitPassword()
        PwdV->>PwdV: hashPassword(input)
        PwdV-->>PwdH: PASSWORD_RESPONSE(hash)
        PwdH->>PwdH: verifyPassword(hash)
        alt Valid
            PwdH-->>Part: PASSWORD_APPROVED
        else Invalid
            PwdH-->>Part: PASSWORD_REJECTED(remainingRetries)
            opt remainingRetries == 0
                PwdH-->>Part: close data connection
            end
        end
    end
```

## Main Feature Flows

### 1. Start Host Share
```mermaid
flowchart TD
    A[Host selects Share Camera/Screen] --> B["setSessionPassword(hash or empty)"]
    B --> C["startCapture(camera or screen)"]
    C --> D{Source type?}
    D -->|Screen| E[getDisplayMedia]
    D -->|Camera| F[getUserMedia]

    E --> G["applyVideoContentHint(detail)"]
    F --> H["applyVideoContentHint(motion)"]
    G --> I[MediaStream obtained]
    H --> I

    I --> J[StreamContext: setStream]
    J --> K[Navigate to HostPage]
    K --> L[Initialize Peer]
    L --> M[Get Peer ID]
    M --> N[Generate QR Code & Link]
    N --> O[Wait for Participants]
```

### 2. Participant Connection
```mermaid
flowchart TD
    A[Participant scans QR or enters link] --> B[Extract Peer ID]
    B --> C["validateConnection(peerId)"]
    C --> D[Create temp Peer + data connection]
    D --> E{Max participants?}

    E -->|Exceeded| F[Show error and stop]
    E -->|Available| G{Password protected?}

    G -->|No| H[Receive PASSWORD_APPROVED]
    G -->|Yes| I[Show password input]
    I --> J[hashPassword + PASSWORD_RESPONSE]
    J --> K{Approved?}
    K -->|No| L[Show error / retry]
    K -->|Yes| H

    H --> M["StreamContext: setParticipantPeer(tempPeer)"]
    M --> N[Navigate to ParticipantPage]
    N --> O[Wait for host call]
    O --> P[Receive MediaStream]
    P --> Q[StreamContext: setRemoteStream]
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

    B -->|Screen share ended| L[Video track ended event]
    L --> D
```
