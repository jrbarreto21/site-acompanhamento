// ===============================
// RESTAURAÇÃO E SALVAMENTO AUTOMÁTICO
// ===============================
const formEl = document.getElementById("formulario");
const progressBar = document.getElementById("progressBar");
const STORAGE_KEY = "formAcompanhamento2025";

// Carrega dados salvos no localStorage
window.addEventListener("DOMContentLoaded", () => {
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (savedData) {
    try {
      const dataObj = JSON.parse(savedData);
      for (const [key, value] of Object.entries(dataObj)) {
        const field = formEl.elements[key];
        if (field) {
          if (field.type === "checkbox" || field.type === "radio") {
            field.checked = value === true || value === "true";
          } else {
            field.value = value;
          }
        }
      }
    } catch (e) {
      console.warn("Erro ao restaurar dados:", e);
    }
  }
  updateProgress();
});

// Salva dados sempre que um campo muda
formEl.addEventListener("input", () => {
  const dataToSave = {};
  Array.from(formEl.elements).forEach(el => {
    if (el.name) {
      if (el.type === "checkbox" || el.type === "radio") {
        dataToSave[el.name] = el.checked;
      } else {
        dataToSave[el.name] = el.value;
      }
    }
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  updateProgress();
});

// Atualiza barra de progresso
function updateProgress() {
  const fields = Array.from(formEl.elements).filter(el =>
    el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT"
  );
  const total = fields.length;
  const filled = fields.filter(el => {
    if (el.type === "checkbox" || el.type === "radio") {
      return el.checked;
    }
    return el.value && el.value.trim() !== "";
  }).length;

  const percent = Math.round((filled / total) * 100) || 0;
  progressBar.style.width = `${percent}%`;
  progressBar.textContent = `${percent}%`;
}

// Botão "Novo Formulário" - limpa localStorage e formulário
document.getElementById("btnResetTop").addEventListener("click", () => {
  if (confirm("Tem certeza que deseja iniciar um novo formulário? Todos os dados serão apagados.")) {
    localStorage.removeItem(STORAGE_KEY);
    formEl.reset();
    updateProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

// ===============================
// LÓGICA ORIGINAL DE GERAÇÃO DE PDF
// ===============================
formEl.addEventListener("submit", async function (e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {};
  formData.forEach((value, key) => data[key] = value);

  const existingPdfBytes = await fetch("Acompanhamentobase.pdf").then(res => {
    if (!res.ok) throw new Error("Falha ao carregar Acompanhamentobase.pdf: " + res.status);
    return res.arrayBuffer();
  });
  const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();

  function trySetField(fieldName, value) {
    try {
      if (form.getTextField(fieldName)) {
        form.getTextField(fieldName).setText(String(value || ""));
        return;
      }
    } catch {}
    try {
      if (form.getCheckBox(fieldName)) {
        if (value === "on" || value === true || value === "true" || value === "1" || String(value).toLowerCase()==="sim") {
          form.getCheckBox(fieldName).check();
        } else {
          form.getCheckBox(fieldName).uncheck();
        }
        return;
      }
    } catch {}
    try {
      if (form.getRadioGroup(fieldName)) {
        form.getRadioGroup(fieldName).select(String(value));
        return;
      }
    } catch {}
    try {
      if (form.getDropdown(fieldName)) {
        form.getDropdown(fieldName).select(String(value));
        return;
      }
    } catch {}
    console.warn(`Campo não encontrado no PDF: ${fieldName}`);
  }

  Object.keys(data).forEach(key => {
    trySetField(key, data[key]);
  });

  const helv = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  form.updateFieldAppearances(helv);

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const crecheRaw = data.creche || data['Nome da Creche'] || '';
  const turmaRaw  = data.turma  || data['Turma'] ||  '';
  const turnoRaw  = data.turno  || data['Turno'] || '';

  function sanitizeFilename(str) {
    return String(str || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 _-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      || 'SemValor';
  }

  const nomeArquivo = `Acompanhamento_${sanitizeFilename(crecheRaw)}_${sanitizeFilename(turmaRaw)}_${sanitizeFilename(turnoRaw)}.pdf`;

  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  console.log("PDF gerado:", nomeArquivo);
});
