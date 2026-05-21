# What Happens When You Type a URL in the Browser?

A step-by-step guide to the background process, with focus on DNS, TCP, TLS, and what happens when someone overrides the IP.

---

## The Big Picture (High-Level Flow)

When you type `https://www.example.com/page` and press Enter, many steps happen behind the scenes:

```
┌─────────────┐    1. Parse URL      ┌─────────────┐
│   Browser   │ ──────────────────► │  Protocol   │  (https)
│             │                     │  Host       │  (www.example.com)
│             │                     │  Path       │  (/page)
└─────────────┘                     └─────────────┘
       │
       │  2. DNS Lookup: "What is the IP of www.example.com?"
       ▼
┌─────────────┐    3. TCP Connect    ┌─────────────┐
│   Your PC   │ ◄──────────────────► │   Server    │
│             │    4. TLS Handshake  │  (Web Host) │
│             │    5. HTTP Request   │             │
│             │    6. HTTP Response  │             │
└─────────────┘                     └─────────────┘
       │
       │  7. Parse HTML, load CSS/JS, render page
       ▼
   Page on screen
```

---

## Step 1: You Enter the URL

The browser breaks the URL into parts:

| Part        | Example           | Meaning                          |
|-------------|-------------------|----------------------------------|
| **Scheme**  | `https://`        | Use HTTPS (encrypted)            |
| **Host**    | `www.example.com` | Domain name – needs to become IP |
| **Path**    | `/page`           | Which resource to ask for        |

The host is a **name**, but the internet uses **IP addresses** (like `93.184.216.34`). So the first real "network" step is: **resolve the name to an IP**. That's DNS.

---

## Step 2: DNS Lookup (Domain Name → IP Address)

### Why DNS?

Computers talk using **IP addresses**. Humans remember **domain names**. DNS is the "phone book" that maps names to IPs.

### How DNS Lookup Works (Simplified)

```
  You type: https://www.example.com

  ┌──────────┐                    ┌──────────────┐
  │  Browser │  "What is IP of    │  Resolver    │  (e.g. your ISP
  │          │   www.example.com?"│  (Recursive  │   or 8.8.8.8)
  │          │ ─────────────────► │   DNS)       │
  └──────────┘                    └──────┬───────┘
                                         │
         "I don't know, let me ask the root and then .com"
                                         │
  ┌──────────────────────────────────────▼─────────────────────────────────────┐
  │  Root DNS (.)  →  TLD DNS (.com)  →  Authoritative DNS (example.com)       │
  │  "Ask .com"         "Ask example.com"    "www.example.com = 93.184.216.34"  │
  └──────────────────────────────────────┬─────────────────────────────────────┘
                                         │
  ┌──────────┐                    ┌──────▼───────┐
  │  Browser │  "93.184.216.34"   │  Resolver    │
  │          │ ◄───────────────── │              │
  └──────────┘                    └──────────────┘
```

Steps in words:

1. **Browser** asks the **resolver** (your ISP or configured DNS like 8.8.8.8): "What is the IP for `www.example.com`?"
2. **Resolver** may have it **cached**. If not, it asks:
   - **Root DNS**: "Who knows about .com?" → gets .com servers
   - **TLD DNS (.com)**: "Who knows about example.com?" → gets example.com servers
   - **Authoritative DNS (example.com)**: "What is the IP for www.example.com?" → gets **93.184.216.34**
3. Resolver caches the answer and returns **93.184.216.34** to the browser.

Now the browser knows: "To reach www.example.com, I must connect to **93.184.216.34**."

---

### What If Someone Overrides the IP? (DNS and IP Spoofing)

The "correct" IP comes from DNS. If an attacker can **change what DNS returns** or **change which server you actually reach**, they can redirect you to a fake site or intercept traffic.

#### 1. DNS Spoofing / DNS Cache Poisoning

**Idea:** Attacker makes your resolver (or your machine) believe that `www.example.com` = **attacker's IP** instead of the real one.

```
  Normal:   www.example.com  →  93.184.216.34 (real server)
  Attack:   www.example.com  →  192.168.1.100 (attacker's server)
```

- **How:** Fake DNS responses, poisoning the cache of the resolver or your machine.
- **Result:** Browser connects to attacker's IP. You think you're on example.com but you're on the attacker's site (phishing, malware).
- **Mitigation:** Use **DNSSEC** (signed DNS answers), use trusted DNS (e.g. 8.8.8.8, 1.1.1.1), and use **HTTPS** so even if IP is wrong, you'll get a certificate error if the server is fake.

#### 2. Local Override: Hosts File

On your own machine, the **hosts file** overrides DNS:

- **Windows:** `C:\Windows\System32\drivers\etc\hosts`
- **Mac/Linux:** `/etc/hosts`

Example:

```
93.184.216.34   www.example.com    ← Normal (optional)
192.168.1.100   www.example.com    ← Override: now "example.com" goes to 192.168.1.100
```

- **Who can do it:** Someone with admin access, or malware.
- **Effect:** Same as DNS spoofing for that machine: "example.com" points to the IP in the file.

#### 3. BGP Hijacking (ISP / Backbone Level)

**Idea:** Attacker (or misconfiguration) announces: "Traffic for IP range X should go through **my** network."

- **How:** BGP (Border Gateway Protocol) is how networks tell each other "how to reach these IPs." A bad or malicious BGP announcement can redirect traffic for whole IP ranges.
- **Result:** Your packets to the "real" IP might go to another country/attacker. Again, **HTTPS** helps: if the server doesn't have the right certificate for example.com, the browser will warn you.

#### 4. Man-in-the-Middle (MITM)

**Idea:** Attacker sits between you and the server (e.g. on your Wi‑Fi, or via DNS/BGP). They can:

- Read and modify traffic if it's **HTTP** (no encryption).
- With **HTTPS**, they can't decrypt without breaking TLS or tricking you into accepting a bad certificate.

So: **overriding the IP** (via DNS, hosts file, or BGP) sends your connection to a different machine. **TLS/HTTPS** is what protects you when that happens, by verifying the server's identity and encrypting data.

---

## Step 3: TCP Connection (Reliable Delivery)

Once the browser has the IP (e.g. 93.184.216.34) and port (443 for HTTPS), it opens a **TCP** connection. TCP ensures bytes are delivered in order and without loss.

### TCP Three-Way Handshake

```
  Your PC (Client)                    Server

       │  SYN (synchronize)              │
       │ ──────────────────────────────► │  "I want to connect"
       │                                 │
       │  SYN-ACK (sync + acknowledge)   │
       │ ◄────────────────────────────── │  "OK, let's connect"
       │                                 │
       │  ACK (acknowledge)              │
       │ ──────────────────────────────► │  "Got it, connection open"
       │                                 │
       │  ★ Connection ESTABLISHED ★     │
```

- **SYN:** Client sends a sequence number.
- **SYN-ACK:** Server agrees and sends its own sequence number.
- **ACK:** Client confirms. After this, both sides can send data.

All further HTTP/HTTPS data (including TLS) travels over this TCP connection.

---

## Step 4: TLS Handshake (Encryption and Identity)

For **HTTPS**, the next step is **TLS** (Transport Layer Security). It does two things:

1. **Verify the server** (so "override IP" attacks are harder).
2. **Agree on keys** and **encrypt** all application data.

### TLS Handshake (Simplified)

```
  Client (Browser)                         Server

       │  Client Hello                      │
       │  (supported ciphers, TLS version)   │
       │ ─────────────────────────────────► │
       │                                    │
       │  Server Hello                      │
       │  (chosen cipher, certificate)      │
       │ ◄───────────────────────────────── │
       │                                    │
       │  Certificate = "I am example.com"   │
       │  signed by a trusted CA             │
       │  Browser checks: hostname + CA      │
       │                                    │
       │  Key exchange (e.g. key share)     │
       │ ─────────────────────────────────► │
       │ ◄───────────────────────────────── │  Both compute same secret
       │                                    │
       │  ★ Encrypted channel READY ★       │
       │  All HTTP data is now encrypted     │
       │                                    │
```

Important for "override IP":

- The server sends a **certificate** saying "I am www.example.com."
- The certificate is **signed** by a **Certificate Authority (CA)** that your browser trusts.
- The browser checks:
  - Does the **hostname** (www.example.com) match the certificate?
  - Is the certificate **valid** and signed by a trusted CA?
- If you were sent to an **attacker's IP** (via DNS/hosts/BGP), the attacker usually **doesn't** have a valid certificate for "www.example.com," so the browser shows a **certificate error** and you should stop.

So: **TCP** gets the bytes to the right machine; **TLS** ensures you're really talking to the right *identity* and that no one in the middle can read or alter the content.

---

## Step 5: HTTP Request and Response

After TLS is done, the browser sends an **HTTP request** over the encrypted channel:

```
  GET /page HTTP/1.1
  Host: www.example.com
  User-Agent: Mozilla/5.0 ...
  Accept: text/html, ...
  [other headers]
```

The server responds with:

- **Status** (e.g. 200 OK)
- **Headers** (content type, cookies, etc.)
- **Body** (HTML, JSON, etc.)

The browser then **parses the HTML**, loads linked resources (CSS, JS, images) — each may trigger more DNS, TCP, and TLS steps — and **renders** the page.

---

## End-to-End Flow Diagram

```
  URL entered
       │
       ▼
  ┌─────────────┐
  │ 1. Parse URL │
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐     "www.example.com" → "93.184.216.34"
  │ 2. DNS Lookup │   (If someone overrides: wrong IP → wrong server;
  └──────┬──────┘     HTTPS + certificate check can detect fake server)
         │
         ▼
  ┌─────────────┐     SYN → SYN-ACK → ACK
  │ 3. TCP       │     Reliable, ordered byte stream
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐     Certificate check, key exchange, encryption
  │ 4. TLS       │     Protects against IP override / MITM if cert is valid
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐     GET /page, then HTML/CSS/JS
  │ 5. HTTP      │
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │ 6. Render    │     Page on screen
  └─────────────┘
```

---

## Summary Table

| Step    | What happens               | If someone overrides / attacks                    |
|---------|----------------------------|---------------------------------------------------|
| **DNS** | Name → IP                  | DNS spoofing, hosts file → wrong IP; you may hit attacker. |
| **TCP** | Reliable connection to IP  | BGP hijack can send packets to another network.   |
| **TLS** | Encrypt + verify server    | Attacker without valid cert → certificate error.  |
| **HTTP**| Request/response           | Safe if TLS is OK; otherwise visible in the path. |

**Takeaway:**  
**Overriding the IP** (via DNS, hosts, or BGP) only sends your connection to a different machine. **TCP** follows that IP. **TLS** is what protects you by checking the server's certificate and encrypting data — so always pay attention to certificate errors and use HTTPS.

---

## Where to Get Images and Deeper Explanations

This doc uses **ASCII diagrams** so it works in any text viewer. For images and videos:

1. **Search:** "What happens when you type a URL in browser" — many articles include flow diagrams.
2. **DNS:** Search "DNS lookup diagram" or see [Cloudflare Learning – What is DNS?](https://www.cloudflare.com/learning/dns/what-is-dns/).
3. **TCP handshake:** Search "TCP three-way handshake diagram".
4. **TLS:** Search "TLS handshake diagram" or [Cloudflare – What happens in a TLS handshake?](https://www.cloudflare.com/learning/ssl/what-happens-in-a-tls-handshake/).
5. **YouTube:** "DNS explained", "TCP handshake", "TLS handshake" — short videos with visuals.

---

## Further Reading

- **DNS:** [How DNS works (Cloudflare)](https://www.cloudflare.com/learning/dns/what-is-dns/)
- **TCP:** [Transmission Control Protocol (Wikipedia)](https://en.wikipedia.org/wiki/Transmission_Control_Protocol)
- **TLS:** [What happens in a TLS handshake (Cloudflare)](https://www.cloudflare.com/learning/ssl/what-happens-in-a-tls-handshake/)
- **DNSSEC:** DNS with cryptographic signatures to prevent spoofing.
- **Certificate errors:** Do not click "proceed anyway" unless you understand the risk.
