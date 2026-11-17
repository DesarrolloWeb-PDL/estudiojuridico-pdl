/* Estudio Jurídico Ferreyra & Asociados — interacciones de la landing */

// ---------------------------------------------------------------
// ASISTENTE WHATSAPP
// WA_NUMBER: número del estudio en formato internacional sin + ni
// espacios (ej: "5493772XXXXXXX"). Mientras esté vacío, cada consulta
// se copia al portapapeles en lugar de abrir WhatsApp.
// ---------------------------------------------------------------
const WA_NUMBER = "";

const waFab = document.getElementById("waFab");
const waPanel = document.getElementById("waPanel");
const waClose = document.getElementById("waClose");
const waBody = document.getElementById("waBody");
const waChips = document.getElementById("waChips");
const waToast = document.getElementById("waToast");
let waPending = false;

function setWaPanel(open) {
  waPanel.classList.toggle("is-open", open);
  waFab.setAttribute("aria-expanded", String(open));
  if (open) waBody.scrollTop = waBody.scrollHeight;
}

waFab?.addEventListener("click", () =>
  setWaPanel(!waPanel.classList.contains("is-open"))
);
waClose?.addEventListener("click", () => setWaPanel(false));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setWaPanel(false);
});

function addWaBubble(text, who) {
  const div = document.createElement("div");
  div.className = `wa-bubble wa-bubble--${who}`;
  div.textContent = text;
  waBody.appendChild(div);
  waBody.scrollTop = waBody.scrollHeight;
}

function showWaToast(text) {
  waToast.textContent = text;
  waToast.classList.add("is-on");
  clearTimeout(showWaToast._t);
  showWaToast._t = setTimeout(() => waToast.classList.remove("is-on"), 3400);
}

async function deliverWaMessage(msg) {
  if (WA_NUMBER) {
    window.open(
      `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener"
    );
    return;
  }
  try {
    await navigator.clipboard.writeText(msg);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = msg;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  showWaToast("Mensaje copiado. Abrí WhatsApp y pegalo para enviarlo al estudio.");
}

waChips?.addEventListener("click", (e) => {
  const chip = e.target.closest(".wa-chip");
  if (!chip || waPending) return;
  waPending = true;

  addWaBubble(chip.textContent.trim(), "user");

  const typing = document.createElement("div");
  typing.className = "wa-bubble wa-bubble--bot wa-typing";
  typing.innerHTML = "<span></span><span></span><span></span>";
  waBody.appendChild(typing);
  waBody.scrollTop = waBody.scrollHeight;

  setTimeout(() => {
    typing.remove();
    addWaBubble(chip.dataset.reply, "bot");
    waPending = false;
    deliverWaMessage(chip.dataset.msg);
  }, 900);
});

// ---------- Menú móvil ----------
const navToggle = document.getElementById("navToggle");
const nav = document.getElementById("nav");

navToggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
});

nav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

// ---------- Reveal on scroll ----------
const revealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
}

// ---------- Formulario: abre el cliente de correo con la consulta ----------
const form = document.getElementById("contactForm");
const formError = document.getElementById("formError");

form?.addEventListener("submit", (event) => {
  event.preventDefault();

  const nombre = form.nombre.value.trim();
  const contacto = form.contacto.value.trim();
  const motivo = form.motivo.value;

  if (!nombre || !contacto || !motivo) {
    formError.hidden = false;
    return;
  }
  formError.hidden = true;

  const subject = encodeURIComponent(`Consulta jurídica — ${motivo}`);
  const body = encodeURIComponent(
    `Nombre: ${nombre}\nContacto: ${contacto}\nMotivo: ${motivo}\n\nConsulta:\n`
  );
  window.location.href = `mailto:consultas@estudioferreyra.com.ar?subject=${subject}&body=${body}`;
});

// ---------- Año del footer ----------
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// ---------------------------------------------------------------
// CONSULTA DE EXPEDIENTES — archivo público expedientes-publicos.json
// Solo se listan expedientes marcados como public: true. Cualquier
// expediente ausente del archivo no muestra información alguna.
// ---------------------------------------------------------------
const caseOpenBtn = document.getElementById("caseOpen");
const caseOpenMobile = document.getElementById("caseOpenMobile");
const caseModal = document.getElementById("caseModal");
const caseClose = document.getElementById("caseClose");
const caseForm = document.getElementById("caseForm");
const caseQuery = document.getElementById("caseQuery");
const caseResult = document.getElementById("caseResult");
const caseFreshness = document.getElementById("caseFreshness");
const caseToWa = document.getElementById("caseToWa");

let publicCases = null;

function normCase(s) {
  return (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function formatCaseDate(iso) {
  const [y, m, d] = String(iso).split("-");
  return y && m && d ? `${d}/${m}/${y}` : String(iso);
}

async function loadPublicCases() {
  if (publicCases) return publicCases;
  const res = await fetch("expedientes-publicos.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("load-failed");
  const data = await res.json();
  const list = Array.isArray(data.cases) ? data.cases : [];
  publicCases = list.filter((c) => c && c.public === true);
  if (caseFreshness && data.updated_at) {
    caseFreshness.textContent = `Datos publicados al ${formatCaseDate(data.updated_at)}.`;
  }
  return publicCases;
}

function caseEl(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

function showCaseResult(node) {
  caseResult.hidden = false;
  caseResult.replaceChildren(node);
}

function caseNotFound() {
  const box = caseEl("div", "case-empty");
  box.appendChild(caseEl("strong", null, "No encontramos ese expediente publicado."));
  box.appendChild(
    caseEl(
      "p",
      null,
      "Puede que no esté publicado o que el número esté mal escrito. Si es tu caso, comunicate con el estudio y te ayudamos a consultar el estado."
    )
  );
  const actions = caseEl("div", "case-empty__actions");
  const mail = caseEl("a", "btn btn--solid", "Escribir al estudio");
  mail.href = `mailto:consultas@estudioferreyra.com.ar?subject=${encodeURIComponent(
    "Consulta por expediente"
  )}`;
  actions.appendChild(mail);
  const wa = caseEl("button", "btn btn--accent", "WhatsApp");
  wa.type = "button";
  wa.addEventListener("click", () => {
    caseModal.close();
    setWaPanel(true);
  });
  actions.appendChild(wa);
  box.appendChild(actions);
  return box;
}

function caseCard(c) {
  const card = caseEl("div", "case-card");
  card.appendChild(caseEl("span", "case-card__badge", c.etapa || "Estado"));
  card.appendChild(caseEl("h3", null, c.caratula || "Expediente"));
  card.appendChild(caseEl("p", "case-card__meta", `Expediente ${c.numero || "—"}`));
  if (c.juzgado) card.appendChild(caseEl("p", "case-card__meta", c.juzgado));
  if (c.fuero) card.appendChild(caseEl("p", "case-card__meta", c.fuero));

  const estado = caseEl("div", "case-card__estado");
  estado.appendChild(caseEl("strong", null, "Estado actual"));
  estado.appendChild(document.createTextNode(c.estado || "Sin novedades."));
  card.appendChild(estado);

  if (c.updated_at) {
    card.appendChild(
      caseEl("p", "case-card__date", `Actualizado el ${formatCaseDate(c.updated_at)}`)
    );
  }

  const ask = caseEl("a", "btn btn--solid", "Consultar con el estudio");
  ask.href = `mailto:consultas@estudioferreyra.com.ar?subject=${encodeURIComponent(
    `Consulta expediente ${c.numero || ""}`
  )}`;
  card.appendChild(ask);
  return card;
}

function openCaseModal() {
  if (!caseModal.open) caseModal.showModal();
  caseQuery?.focus();
  loadPublicCases().catch(() => {
    // El error se muestra si el usuario intenta buscar.
  });
}

caseOpenBtn?.addEventListener("click", openCaseModal);
caseOpenMobile?.addEventListener("click", openCaseModal);
caseClose?.addEventListener("click", () => caseModal.close());
caseModal?.addEventListener("click", (e) => {
  const rect = caseModal.getBoundingClientRect();
  const inside =
    e.clientX >= rect.left &&
    e.clientX <= rect.right &&
    e.clientY >= rect.top &&
    e.clientY <= rect.bottom;
  if (!inside) caseModal.close();
});
caseToWa?.addEventListener("click", () => {
  caseModal.close();
  setWaPanel(true);
});

caseForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = normCase(caseQuery.value);
  if (!q) return;

  showCaseResult(caseEl("p", "case-loading", "Consultando el estado publicado…"));

  let cases;
  try {
    cases = await loadPublicCases();
  } catch {
    const err = caseEl("div", "case-empty");
    err.appendChild(
      caseEl("strong", null, "No pudimos consultar el estado en este momento.")
    );
    err.appendChild(
      caseEl(
        "p",
        null,
        "Intentá nuevamente en unos minutos o comunicate con el estudio."
      )
    );
    showCaseResult(err);
    return;
  }

  const qNum = q.replace(/[^a-z0-9]/g, "");
  const hit =
    (qNum
      ? cases.find(
          (c) => normCase(c.numero).replace(/[^a-z0-9]/g, "") === qNum
        )
      : undefined) || cases.find((c) => normCase(c.caratula).includes(q));

  showCaseResult(hit ? caseCard(hit) : caseNotFound());
});
