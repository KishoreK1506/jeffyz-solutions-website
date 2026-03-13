require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require("path");
const fs = require("fs/promises");

const app = express();
const PORT = process.env.PORT || 5000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    aiProvider: process.env.AI_PROVIDER || "mock",
    time: new Date().toISOString(),
    mode: "full-stack"
  });
});

app.post("/send-email", handleContact);
app.post("/api/contact", handleContact);

app.post("/api/ai-support", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  const history = normalizeHistory(req.body?.history);
  const issueType = detectIssueType(message, req.body?.issueType);

  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const provider = (process.env.AI_PROVIDER || "mock").toLowerCase();
    let reply = "";

    if (provider === "openai") {
      reply = await getOpenAIReply({ message, history, issueType });
    } else if (provider === "ollama") {
      reply = await getOllamaReply({ message, history, issueType });
    } else {
      reply = getMockReply({ message, issueType });
    }

    return res.json({ provider, issueType, reply });
  } catch (error) {
    console.error("ai-support error:", error);
    return res.status(500).json({
      error: "Unable to generate an AI response right now.",
      detail: error.message
    });
  }
});

app.get("*", (req, res) => {
  const target = req.path === "/" ? "index.html" : req.path.replace(/^\//, "");
  res.sendFile(path.join(PUBLIC_DIR, target), (error) => {
    if (error) {
      res.status(404).sendFile(path.join(PUBLIC_DIR, "index.html"));
    }
  });
});

app.listen(PORT, () => {
  console.log(`Jeffyz Solutions server running on port ${PORT}`);
});

async function handleContact(req, res) {
  const { name, email, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: "Name, email, and message are required." });
  }

  try {
    const emailEnabled = process.env.EMAIL_ENABLED === "true";

    if (emailEnabled) {
      const transporter = createMailTransport();

      await transporter.sendMail({
        from: formatFrom(),
        replyTo: email,
        to: process.env.EMAIL_TO || process.env.EMAIL_USER,
        subject: "New query from Jeffyz Solutions website",
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          "",
          "Query:",
          message
        ].join("\n")
      });

      await transporter.sendMail({
        from: formatFrom(),
        to: email,
        subject: "We received your enquiry | Jeffyz Solutions",
        text: [
          `Hi ${name},`,
          "",
          "Thank you for contacting Jeffyz Solutions.",
          "We have received your query and will review it shortly.",
          "",
          "Your message:",
          message,
          "",
          "Best regards,",
          "Jeffyz Solutions"
        ].join("\n")
      });

      return res.json({ success: true, message: "Your query has been sent successfully." });
    }

    await fs.mkdir(DATA_DIR, { recursive: true });
    const filePath = path.join(DATA_DIR, "contact-submissions.json");
    let items = [];

    try {
      const existing = await fs.readFile(filePath, "utf8");
      items = JSON.parse(existing);
      if (!Array.isArray(items)) items = [];
    } catch (_error) {
      items = [];
    }

    items.push({
      name,
      email,
      message,
      createdAt: new Date().toISOString()
    });

    await fs.writeFile(filePath, JSON.stringify(items, null, 2), "utf8");

    return res.json({
      success: true,
      message: "Saved locally. Enable email settings to receive queries in your inbox."
    });
  } catch (error) {
    console.error("contact error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to process your request right now."
    });
  }
}

function createMailTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

function formatFrom() {
  const fromName = process.env.EMAIL_FROM_NAME || "Jeffyz Solutions";
  const fromEmail = process.env.EMAIL_USER;
  return fromEmail ? `${fromName} <${fromEmail}>` : fromName;
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item) => item && (item.role === "user" || item.role === "assistant"))
    .map((item) => ({
      role: item.role,
      content: String(item.content || "").trim().slice(0, 4000)
    }))
    .filter((item) => item.content)
    .slice(-8);
}

function detectIssueType(message, requestedType = "") {
  const explicit = String(requestedType || "").toLowerCase();
  const allowed = new Set(["pc", "wifi", "router", "switch", "os", "recovery", "general"]);
  if (allowed.has(explicit)) return explicit;

  const normalized = String(message || "").toLowerCase();

  if (/(wifi|wi-fi|internet|signal|dead zone|latency|packet loss|mesh)/.test(normalized)) return "wifi";
  if (/(router|wan|lan|dhcp|gateway|nat|port forward|isp)/.test(normalized)) return "router";
  if (/(switch|vlan|trunk|access port|managed switch|poe)/.test(normalized)) return "switch";
  if (/(windows|linux|ubuntu|macos|reinstall|install|boot|recovery media|bios|uefi)/.test(normalized)) return "os";
  if (/(password|login|account|locked out|recovery|2fa|mfa|backup code)/.test(normalized)) return "recovery";
  if (/(slow|startup|lag|freeze|fan|ram|storage|disk|blue screen|bsod|pc|laptop|desktop)/.test(normalized)) return "pc";

  return "general";
}

function buildSystemPrompt(issueType = "general") {
  const focusMap = {
    pc: "Prioritize performance, storage, thermal, startup, malware, and hardware checks.",
    wifi: "Prioritize signal strength, interference, placement, firmware, ISP isolation, and room-by-room testing.",
    router: "Prioritize WAN/LAN, DHCP, gateway, DNS, topology, firmware, and one-change-at-a-time validation.",
    switch: "Prioritize topology, VLANs, trunks, access ports, link lights, PoE, and port-by-port verification.",
    os: "Prioritize backup planning, licensing, install media, boot mode, updates, and restore order.",
    recovery: "Only provide legitimate recovery guidance for systems and accounts the user owns. Never suggest bypasses.",
    general: "Provide a calm first-pass triage approach and make reasonable assumptions when details are limited."
  };

  return [
    "You are Jeffyz Solutions AI Support, a professional frontline IT and network troubleshooting assistant.",
    "The user expects concise, practical, trustworthy guidance that sounds polished and client-facing.",
    focusMap[issueType] || focusMap.general,
    "Never help with bypassing passwords, evading security, accessing devices without authorization, malware, or abuse.",
    "When the user owns the system, give legitimate recovery routes using official methods only.",
    "Do not overwhelm the user. Prefer the smallest useful set of checks.",
    "Use this exact structure in markdown:",
    "## What this looks like",
    "1-2 sentences summarizing the likely situation.",
    "## What to check now",
    "3-5 numbered action steps.",
    "## Recommended next step",
    "1 short paragraph.",
    "Optionally add ## Escalate if with 2-3 bullet points when the issue may require a technician.",
    "Keep the answer roughly 120 to 220 words unless the user asks for more detail.",
    "Avoid tables, avoid filler, and avoid more than one brief clarifying question."
  ].join(" ");
}

async function getOpenAIReply({ message, history, issueType }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const input = [
    {
      role: "system",
      content: [{ type: "input_text", text: buildSystemPrompt(issueType) }]
    },
    ...history.map((item) => ({
      role: item.role,
      content: [{ type: "input_text", text: item.content }]
    })),
    {
      role: "user",
      content: [{ type: "input_text", text: message }]
    }
  ];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.4",
      input
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI request failed: ${detail}`);
  }

  const data = await response.json();
  return data.output_text || "I could not generate a response.";
}

async function getOllamaReply({ message, history, issueType }) {
  const baseUrl = (process.env.OLLAMA_BASE_URL || "http://localhost:11434/api").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || "llama3.2",
      stream: false,
      messages: [
        { role: "system", content: buildSystemPrompt(issueType) },
        ...history.map((item) => ({ role: item.role, content: item.content })),
        { role: "user", content: message }
      ]
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Ollama request failed: ${detail}`);
  }

  const data = await response.json();
  return data.message?.content || "I could not generate a response.";
}

function getMockReply({ message, issueType }) {
  const normalized = message.toLowerCase();
  const type = issueType || detectIssueType(message);

  const templates = {
    wifi: {
      looksLike: "This sounds like a coverage or interference problem rather than a total internet outage, especially if the connection works better near the router.",
      checks: [
        "Test the weak room beside the router and then in the problem room to compare signal strength and speed.",
        "Move the router higher and more centrally, away from thick walls, TVs, metal cabinets, and microwaves.",
        "Split 2.4 GHz and 5 GHz temporarily so you can see whether range or speed is the real problem.",
        "Restart the router, then check for firmware updates and less crowded Wi‑Fi channels.",
        "If only distant rooms are affected, plan for a mesh node or wired access point instead of repeating random settings changes."
      ],
      next: "Start by proving whether the issue is placement, interference, or ISP-related. Once you know that, the fix becomes much more predictable.",
      escalate: ["Multiple rooms drop at the same time after a firmware update.", "The router reboots on its own or gets unusually hot.", "A wired speed test is also unstable, which points beyond Wi‑Fi."]
    },
    pc: {
      looksLike: "This looks like a local performance issue caused by startup load, storage pressure, thermal throttling, or background activity rather than one single app alone.",
      checks: [
        "Open Task Manager and review Startup apps, then disable the non-essential ones with the highest impact.",
        "Check free storage space and disk health, because a nearly full or failing drive can slow everything down.",
        "Look at CPU, memory, and disk usage while the slowdown is happening to find the real bottleneck.",
        "Run Windows Update or your OS updates, then complete a malware scan with a trusted built-in or reputable tool.",
        "Listen for constant fan noise or heat buildup, which often signals dust, thermal issues, or sustained background load."
      ],
      next: "Capture one clean symptom first, such as slow boot, slow browser, or slow file opens. That makes it much easier to isolate whether this is software, storage, or hardware related.",
      escalate: ["You hear clicking from the drive.", "The machine blue-screens, freezes, or powers off.", "Performance stays poor even after updates and startup cleanup."]
    },
    router: {
      looksLike: "This sounds like a configuration or topology issue, where one setting in the router path is affecting the whole network or a specific segment.",
      checks: [
        "Map the connection path first: ISP device, router WAN, router LAN, switches, and endpoint devices.",
        "Confirm WAN status, DHCP scope, gateway address, and DNS settings before changing advanced options.",
        "Check whether the problem affects wired and wireless devices equally, because that narrows the fault quickly.",
        "Review firmware version, recent resets, and whether double NAT or ISP modem-router mode is involved.",
        "Change one setting at a time and retest after each change so the root cause stays visible."
      ],
      next: "Treat the router as the control point. Once WAN, DHCP, and LAN basics are verified, most downstream problems become easier to trace.",
      escalate: ["The WAN link never comes up.", "Devices keep getting incorrect IP addresses.", "The issue began right after a factory reset and core access is now lost."]
    },
    switch: {
      looksLike: "This feels like a switching or VLAN mismatch issue, especially if some devices work normally while others are isolated.",
      checks: [
        "Document which device is plugged into which port before making changes.",
        "Check link lights, negotiated speed, and whether PoE-powered devices are actually receiving power.",
        "Verify access ports versus trunk ports so tagged and untagged traffic is handled correctly.",
        "Confirm VLAN IDs on the switch match the router or firewall side of the network.",
        "Test one known-good device on the suspect port to separate cabling problems from config problems."
      ],
      next: "A clean port map usually reveals the fault faster than jumping straight into advanced configuration changes.",
      escalate: ["The switch is unreachable for management.", "Several ports failed at once.", "There may be a loop, broadcast storm, or power issue."]
    },
    os: {
      looksLike: "This sounds like an operating system recovery or reinstall workflow, so the most important part is protecting data and planning the rebuild order.",
      checks: [
        "Back up documents, browser data, application keys, and anything stored outside obvious folders.",
        "Confirm whether you need a repair install, reset, or a completely clean reinstall.",
        "Verify the exact OS edition, activation state, and whether the system uses BIOS or UEFI boot mode.",
        "Prepare official installation media before touching the current drive.",
        "Disconnect unnecessary peripherals during installation so the process stays simple and predictable."
      ],
      next: "Before reinstalling, decide what success looks like: quick repair, clean start, or full recovery after failure. That determines the safest path.",
      escalate: ["The drive is not detected.", "You see repeated boot errors after reinstall attempts.", "There are signs of hardware failure rather than software corruption."]
    },
    recovery: {
      looksLike: "This appears to be a legitimate account or device recovery case. The safe path is to use the official recovery route for the platform you own.",
      checks: [
        "Identify the account type first: local account, Microsoft account, Apple ID, Google account, or Linux user.",
        "Use the platform's official reset or recovery flow instead of third-party bypass tools.",
        "Check whether you still have recovery email access, backup codes, recovery keys, or another trusted device.",
        "After recovery, rotate the password and review MFA, recovery contacts, and backup methods.",
        "If the device stores business data, document what changed before the lockout so future recovery is easier."
      ],
      next: "Do not try unofficial shortcuts. They create more risk and can make proper recovery harder afterward.",
      escalate: ["Recovery options are outdated or inaccessible.", "A business-managed device may require the original administrator.", "The issue may involve account compromise rather than a forgotten password."]
    },
    general: {
      looksLike: "This needs a quick triage pass first. The fastest route is to separate whether the problem is device-specific, network-wide, or account-related.",
      checks: [
        "Describe the exact symptom, when it started, and what changed just before it began.",
        "Test whether the issue happens on one device only or across several devices.",
        "Check the simplest baseline items first: power, cables, updates, free storage, and login status.",
        "Make one change at a time so the cause stays visible.",
        "Capture any error message exactly as shown."
      ],
      next: "Once the fault is grouped into device, network, or access, the troubleshooting path becomes much shorter and more reliable.",
      escalate: ["You suspect hardware failure.", "There is data-loss risk.", "The environment is business-critical and downtime is costly."]
    }
  };

  const selected = templates[type] || templates.general;
  const extraHint = /(urgent|asap|immediately|down|offline)/.test(normalized)
    ? "\n\n## Escalate if\n- The issue is affecting business operations right now.\n- You have already completed the basic checks once.\n- There is risk of data loss or account lockout."
    : `\n\n## Escalate if\n${selected.escalate.map((item) => `- ${item}`).join("\n")}`;

  return [
    "## What this looks like",
    selected.looksLike,
    "",
    "## What to check now",
    ...selected.checks.map((item, index) => `${index + 1}. ${item}`),
    "",
    "## Recommended next step",
    selected.next,
    extraHint
  ].join("\n");
}
