(function () {
  const form = document.getElementById("builderForm");
  const steps = Array.from(document.querySelectorAll(".stepPanel"));
  const stepper = Array.from(document.querySelectorAll(".stepper .step"));

  const budget = document.getElementById("budget");
  const budgetOut = document.getElementById("budgetOut");

  const cpuLevel = document.getElementById("cpuLevel");
  const gpuLevel = document.getElementById("gpuLevel");
  const ramGB = document.getElementById("ramGB");
  const storageGB = document.getElementById("storageGB");

  const cpuOut = document.getElementById("cpuOut");
  const gpuOut = document.getElementById("gpuOut");
  const ramOut = document.getElementById("ramOut");
  const storageOut = document.getElementById("storageOut");

  const chipUse = document.getElementById("chipUse");
  const chipBudget = document.getElementById("chipBudget");
  const chipType = document.getElementById("chipType");
  const chipOS = document.getElementById("chipOS");

  let currentStep = 1;

  const levelText = (v) => {
    const map = { 1:"Entry", 2:"Value", 3:"Balanced", 4:"Strong", 5:"High" };
    return map[String(v)] || "Balanced";
  };

  const money = (n) => "€" + Number(n).toLocaleString("en-IE");

  function showStep(n){
    currentStep = n;
    steps.forEach(p => p.classList.toggle("hidden", Number(p.dataset.step) !== n));
    stepper.forEach((s,i) => s.classList.toggle("active", i === (n-1)));
  }

  function updateUI(){
    budgetOut.textContent = money(budget.value);
    cpuOut.textContent = levelText(cpuLevel.value);
    gpuOut.textContent = levelText(gpuLevel.value);
    ramOut.textContent = `${ramGB.value} GB`;
    storageOut.textContent = storageGB.value >= 1024
      ? `${(storageGB.value/1024).toFixed(storageGB.value % 1024 ? 1 : 0)} TB`
      : `${storageGB.value} GB`;

    const useCase = form.querySelector('input[name="useCase"]:checked')?.value || "work";
    const formFactor = document.getElementById("formFactor").value;
    const osPref = document.getElementById("osPref").value;

    chipUse.textContent = `Use: ${useCase[0].toUpperCase()+useCase.slice(1)}`;
    chipBudget.textContent = `Budget: ${money(budget.value)}`;
    chipType.textContent = `Device: ${formFactor === "any" ? "Any" : formFactor.toUpperCase()}`;
    chipOS.textContent = `OS: ${osPref === "any" ? "Any" : osPref.toUpperCase()}`;
  }

  // Step navigation
  document.addEventListener("click", (e) => {
    const next = e.target.closest("[data-next]");
    const prev = e.target.closest("[data-prev]");
    if (next){
      showStep(Math.min(4, currentStep + 1));
      updateUI();
    }
    if (prev){
      showStep(Math.max(1, currentStep - 1));
      updateUI();
    }
  });

  // Live outputs
  [budget, cpuLevel, gpuLevel, ramGB, storageGB].forEach(el => {
    el.addEventListener("input", updateUI);
  });
  form.addEventListener("change", updateUI);

  // Submit → save + redirect
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const payload = {
      useCase: form.querySelector('input[name="useCase"]:checked')?.value || "work",
      budget: Number(budget.value),
      formFactor: document.getElementById("formFactor").value,
      osPref: document.getElementById("osPref").value,
      portability: document.getElementById("portability").value,
      noise: document.getElementById("noise").value,
      cpuLevel: Number(cpuLevel.value),
      gpuLevel: Number(gpuLevel.value),
      ramGB: Number(ramGB.value),
      storageGB: Number(storageGB.value),
      createdAt: Date.now()
    };
    localStorage.setItem("pcConsultation", JSON.stringify(payload));
    window.location.href = "pc-results.html";
  });

  // initial
  showStep(1);
  updateUI();
})();
