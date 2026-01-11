# Architecture
Perspective is a P2P screen sharing web application.
The Host shares screen and camera, and Participants can receive streams in real-time.

## Data Flow

### Host → Participant Streaming
```mermaid
sequenceDiagram
    participant Host as HostPage
    participant MS as MediaService
    participant PS as PeerService
    participant SC as StreamContext
    participant Server as PeerJS Server
    participant Part as ParticipantPage

    Host->>MS: startScreenShare()
    MS->>MS: getDisplayMedia()
    MS-->>Host: MediaStream
    Host->>SC: setStream(stream)

    Host->>PS: initializePeer('host')
    PS->>Server: Connect
    Server-->>PS: PeerId
    PS-->>Host: PeerId (for QR/Link)

    Part->>PS: connectToPeer(hostPeerId)
    PS->>Server: Request Connection
    Server->>PS: Establish P2P
    PS->>PS: callPeer(stream)

    PS-->>Part: MediaStream
    Part->>SC: setRemoteStream(stream)
```

### Password Authentication Flow
```mermaid
sequenceDiagram
    participant Host as HostPage
    participant PwdS as PasswordService
    participant SC as StreamContext
    participant Part as ParticipantPage
    participant PwdV as usePasswordVerification

    Host->>PwdS: generatePassword()
    PwdS->>PwdS: hashPassword()
    PwdS-->>Host: hashedPassword
    Host->>SC: setSessionPassword(hash)

    Part->>Part: Enter Password
    Part->>PwdV: verifyPassword(input, hash)
    PwdV->>PwdV: hashPassword(input)
    PwdV->>PwdV: compare hashes
    PwdV-->>Part: isValid

    alt Password Valid
        Part->>Part: Allow Connection
    else Password Invalid
        Part->>Part: Show Error
    end
```

## Main Feature Flows

### 1. Start Host Screen Share
```mermaid
flowchart TD
    A[Host clicks Share Screen] --> B{Media Type?}
    B -->|Screen| C[getDisplayMedia]
    B -->|Camera| D[getUserMedia]

    C --> E[MediaStream obtained]
    D --> E

    E --> F[Set stream in StreamContext]
    F --> G[Initialize Peer]
    G --> H[Get Peer ID]
    H --> I[Generate QR Code & Link]
    I --> J[Display to Host]
    J --> K[Wait for Participants]
```

### 2. Participant Connection
```mermaid
flowchart TD
    A[Participant scans QR or enters link] --> B[Extract Peer ID]
    B --> C{Password Protected?}

    C -->|Yes| D[Enter Password]
    C -->|No| E[Connect to Host]

    D --> F{Password Valid?}
    F -->|No| G[Show Error]
    F -->|Yes| E

    G --> D

    E --> H[Initialize Peer]
    H --> I[Establish Data Connection]
    I --> J[Receive Media Stream]
    J --> K[Display Remote Stream]
```
