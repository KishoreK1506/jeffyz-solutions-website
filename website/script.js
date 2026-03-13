const hamburger = document.getElementById("hamburger");
const menu = document.getElementById("menu");
const year = document.getElementById("year");
const currentPage = document.body.dataset.page || "";
const API_BASE = String(window.JEFFYZ_CONFIG?.apiBaseUrl || "").replace(/\/$/, "");

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

hamburger?.addEventListener("click", () => {
  menu.classList.toggle("open");
});

document.querySelectorAll(".menu a").forEach((link) => {
  const linkKey = link.dataset.link;
  if (linkKey && linkKey === currentPage) {
    link.classList.add("active-link");
  }

  link.addEventListener("click", () => {
    menu?.classList.remove("open");
  });
});

if (year) {
  year.textContent = new Date().getFullYear();
}

const reveals = document.querySelectorAll(".reveal");
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

reveals.forEach((el) => io.observe(el));

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.style.borderColor = isError ? "rgba(251,113,133,.35)" : "rgba(255,255,255,.12)";
  toast.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove("show"), 3200);
}

const contactForm = document.getElementById("contactForm");
contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitBtn = contactForm.querySelector('button[type="submit"]');
  const formData = new FormData(contactForm);
  const payload = Object.fromEntries(formData.entries());

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending...";

  try {
    const response = await fetch(apiUrl("/api/contact"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || "Unable to send your query right now.");
    }

    showToast(result.message || "Message sent successfully.");
    contactForm.reset();
  } catch (error) {
    const message = error.message || "Something went wrong.";
    const helpful = message.includes("Failed to fetch")
      ? "Unable to reach the backend. If the frontend and backend are hosted separately, set your backend URL in site-config.js."
      : message;
    showToast(helpful, true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Send Query";
  }
});

function animateCounters() {
  const items = document.querySelectorAll("[data-count]");
  if (!items.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const element = entry.target;
      const target = Number(element.dataset.count || 0);
      const duration = 1000;
      const start = performance.now();

      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        element.textContent = String(Math.round(target * progress));
        if (progress < 1) requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
      observer.unobserve(element);
    });
  }, { threshold: 0.6 });

  items.forEach((item) => observer.observe(item));
}

function initNetworkCanvas() {
  const canvas = document.getElementById("networkCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let animationFrame;
  let particles = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const count = Math.max(24, Math.floor(rect.width / 60));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25
    }));
  }

  function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;
    });

    for (let i = 0; i < particles.length; i += 1) {
      const a = particles[i];
      ctx.beginPath();
      ctx.arc(a.x, a.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,.4)";
      ctx.fill();

      for (let j = i + 1; j < particles.length; j += 1) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 120) {
          const alpha = 1 - distance / 120;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.14})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    animationFrame = requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener("resize", resize);

  window.addEventListener("beforeunload", () => {
    cancelAnimationFrame(animationFrame);
  });
}

animateCounters();
initNetworkCanvas();
