(function(){
  const elTiers = document.getElementById("tiers");
  const elChips = document.getElementById("chips");
  const elTitle = document.getElementById("title");

  const money = (n) => "€" + Number(n).toLocaleString("en-IE");
  const cap = (s) => s ? (s[0].toUpperCase()+s.slice(1)) : s;

  const saved = localStorage.getItem("pcConsultation");
  const prefs = saved ? JSON.parse(saved) : null;

  if(!prefs){
    elTitle.textContent = "No consultation data found";
    elTiers.innerHTML = `<div class="muted">Go back and fill the consultation form.</div>`;
    return;
  }

  // Chips header
  const chips = [
    `Use: ${cap(prefs.useCase)}`,
    `Budget: ${money(prefs.budget)}`,
    `Device: ${prefs.formFactor === "any" ? "Any" : prefs.formFactor.toUpperCase()}`,
    `OS: ${prefs.osPref === "any" ? "Any" : prefs.osPref.toUpperCase()}`,
    `Portability: ${cap(prefs.portability)}`,
    `Noise: ${cap(prefs.noise)}`
  ];
  elChips.innerHTML = chips.map(c => `<span class="chip">${c}</span>`).join("");

  // A small tiering engine (low → high)
  const tierBudgets = {
    low: Math.max(300, Math.round(prefs.budget * 0.7 / 50) * 50),
    mid: Math.round(prefs.budget / 50) * 50,
    high: Math.min(6000, Math.round(prefs.budget * 1.35 / 50) * 50)
  };

  // Convert priorities to “targets”
  function targetSpecs(tier){
    const cpu = prefs.cpuLevel;
    const gpu = prefs.gpuLevel;

    // boost GPU for gaming, boost CPU/RAM for work
    const cpuBoost = (prefs.useCase === "work") ? 1 : 0;
    const gpuBoost = (prefs.useCase === "gaming") ? 1 : 0;

    const tierDelta = tier === "low" ? -1 : tier === "high" ? 1 : 0;

    const cpuScore = clamp(cpu + cpuBoost + tierDelta, 1, 5);
    const gpuScore = clamp(gpu + gpuBoost + tierDelta, 1, 5);

    const ram = clampToChoices(prefs.ramGB + (tier === "high" ? 16 : tier === "low" ? -8 : 0), [8,16,24,32,48,64]);
    const storage = clampToChoices(prefs.storageGB + (tier === "high" ? 512 : tier === "low" ? -256 : 0), [256,512,1024,2048,3072,4096]);

    return { cpuScore, gpuScore, ram, storage };
  }

  function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }
  function clampToChoices(val, choices){
    let best = choices[0];
    let bestDiff = Infinity;
    for(const c of choices){
      const d = Math.abs(c - val);
      if(d < bestDiff){ best = c; bestDiff = d; }
    }
    return best;
  }

  function cpuText(score){
    const map = {
      1: "Entry CPU (efficient)",
      2: "Value CPU (good daily use)",
      3: "Balanced CPU (strong productivity)",
      4: "High CPU (creator / heavy multitask)",
      5: "Top CPU (workstation level)"
    };
    return map[score];
  }
  function gpuText(score){
    const map = {
      1: "Integrated graphics (basic)",
      2: "Entry GPU (light gaming)",
      3: "Mid GPU (1080p gaming / accel)",
      4: "High GPU (1440p / heavy)",
      5: "Top GPU (AAA / creator)"
    };
    return map[score];
  }

  function barPct(score){ return (score/5)*100; }

  // Suggested example models (not “live inventory” – used as examples)
  // You can edit these anytime.
  const exampleModels = {
    study: {
      laptop: ["Acer Aspire Go 15", "Lenovo IdeaPad series", "ASUS Vivobook series"],
      desktop: ["Compact mini PC (value)", "Entry desktop tower (value)"],
      aio: ["Lenovo Yoga AIO line (value)"]
    },
    work: {
      laptop: ["MacBook Air (M4)", "Dell XPS line", "Lenovo Yoga 9i line"],
      desktop: ["Mac mini (M4)", "Small form factor business desktop"],
      aio: ["Apple iMac (M4)", "Lenovo Yoga AIO 27"]
    },
    gaming: {
      laptop: ["HP Omen Max 16", "ASUS ROG Zephyrus G14", "Lenovo Legion series"],
      desktop: ["Gaming desktop (balanced)", "Gaming desktop (high-end)"],
      aio: ["AIO is not ideal for gaming (thermal limits)"]
    }
  };

  function shouldShow(type){
    if(prefs.formFactor === "any") return true;
    return prefs.formFactor === type;
  }

  function searchUrl(query){
    // Irish-friendly: user can change to preferred retailer searches
    const q = encodeURIComponent(query + " price Ireland");
    return `https://www.google.com/search?q=${q}`;
  }

  function recCardHTML({label, deviceType, budget, specs, notes, models}){
    const ramLabel = specs.ram >= 1024 ? `${(specs.ram/1024).toFixed(1)} TB` : `${specs.ram} GB`;
    const storageLabel = specs.storage >= 1024 ? `${(specs.storage/1024).toFixed(specs.storage % 1024 ? 1 : 0)} TB` : `${specs.storage} GB`;

    const modelLine = (models && models.length)
      ? `<div class="kv"><div>Models</div><div>${models.slice(0,3).join(" • ")}</div></div>`
      : "";

    const query = `${deviceType} ${cap(prefs.useCase)} ${money(budget)} ${models?.[0] || ""}`.trim();

    return `
      <div class="recCard">
        <div class="recTitle">${label} — ${deviceType.toUpperCase()}</div>

        <div class="kv"><div>Budget</div><div>${money(budget)}</div></div>
        <div class="kv"><div>CPU</div><div>${cpuText(specs.cpuScore)}</div></div>
        <div class="kv"><div>GPU</div><div>${gpuText(specs.gpuScore)}</div></div>
        <div class="kv"><div>RAM</div><div>${specs.ram} GB</div></div>
        <div class="kv"><div>Storage</div><div>${storageLabel}</div></div>
        ${modelLine}

        <div>
          <div class="barLabel"><span>CPU</span><span>${specs.cpuScore}/5</span></div>
          <div class="progress"><div style="width:${barPct(specs.cpuScore)}%"></div></div>

          <div class="barLabel"><span>GPU</span><span>${specs.gpuScore}/5</span></div>
          <div class="progress"><div style="width:${barPct(specs.gpuScore)}%"></div></div>
        </div>

        <div class="muted small">${notes || ""}</div>

        <div class="rowBtns">
          <a class="btn small" href="${searchUrl(query)}" target="_blank" rel="noreferrer">Search prices</a>
          <a class="btn small primary" href="${searchUrl((models?.[0] || deviceType) + " " + prefs.useCase)}" target="_blank" rel="noreferrer">Search model</a>
        </div>
      </div>
    `;
  }

  function buildTier(tierKey, title, badgeText){
    const specs = targetSpecs(tierKey);
    const budget = tierBudgets[tierKey];

    const modelsBase = exampleModels[prefs.useCase] || exampleModels.work;

    const recs = [];

    if(shouldShow("laptop")){
      recs.push(recCardHTML({
        label: title,
        deviceType: "laptop",
        budget,
        specs,
        notes: (prefs.useCase === "gaming")
          ? "Gaming laptops need stronger cooling and GPU; prioritize GPU score."
          : "For laptops, battery + portability matters; prioritize CPU/RAM balance.",
        models: modelsBase.laptop
      }));
    }

    if(shouldShow("desktop")){
      recs.push(recCardHTML({
        label: title,
        deviceType: "desktop",
        budget,
        specs: { ...specs, gpuScore: clamp(specs.gpuScore + (prefs.useCase === "gaming" ? 1 : 0), 1, 5) },
        notes: "Desktops usually give best performance per euro and easier upgrades.",
        models: modelsBase.desktop
      }));
    }

    if(shouldShow("aio")){
      recs.push(recCardHTML({
        label: title,
        deviceType: "all-in-one",
        budget,
        specs: { ...specs, gpuScore: clamp(specs.gpuScore - (prefs.useCase === "gaming" ? 1 : 0), 1, 5) },
        notes: (prefs.useCase === "gaming")
          ? "AIOs are not ideal for heavy gaming due to thermals. Consider desktop."
          : "AIOs save space; great for study/work when desk setup matters.",
        models: modelsBase.aio
      }));
    }

    return `
      <div class="tier">
        <div class="tierTop">
          <div class="tierName">${title}</div>
          <div class="badge">${badgeText}</div>
        </div>
        <div class="recGrid">${recs.join("")}</div>
      </div>
    `;
  }

  // Render tiers (low → high)
  elTiers.innerHTML =
    buildTier("low", "Low (Best Value)", "Low → entry/budget") +
    buildTier("mid", "Mid (Balanced)", "Mid → sweet spot") +
    buildTier("high", "High (Performance)", "High → premium");

  document.getElementById("reset").addEventListener("click", () => {
    localStorage.removeItem("pcConsultation");
    window.location.href = "pc-consultation.html";
  });

  document.getElementById("print").addEventListener("click", () => window.print());
})();
