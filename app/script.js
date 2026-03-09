// Jeffyz_Solutions interactions

const hamburger = document.getElementById("hamburger");
const menu = document.getElementById("menu");

hamburger?.addEventListener("click", () => {
  menu.classList.toggle("open");
});

document.querySelectorAll(".menu a").forEach(a => {
  a.addEventListener("click", () => menu.classList.remove("open"));
});

document.getElementById("year").textContent = new Date().getFullYear();

const reveals = document.querySelectorAll(".reveal");
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) e.target.classList.add("visible");
  });
}, { threshold: 0.12 });

reveals.forEach(el => io.observe(el));

function handleSubmit(event){
  event.preventDefault();
  const toast = document.getElementById("toast");
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
  event.target.reset();
  return false;
}
window.handleSubmit = handleSubmit;
