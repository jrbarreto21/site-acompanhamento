// ===============================
// RESTAURAÇÃO E SALVAMENTO AUTOMÁTICO
// ===============================
const formEl = document.getElementById("formulario");
const progressBar = document.getElementById("progressBar");
const STORAGE_KEY = "formAcompanhamento2025";

// Função para salvar todos os campos
function saveFormData() {
  const dataToSave = [];
  Array.from(formEl.elements).forEach(el => {
    if (el.name) {
      if (el.type === "checkbox" || el.type === "radio") {
        dataToSave.push({ name: el.name, value: el.value, checked: el.checked, type: el.type });
      } else {
        dataToSave.push({ name: el.name, value: el.value, type: el.type });
      }
    }
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
}

// Função para restaurar todos os campos
function restoreFormData() {
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (!savedData) return;

  try {
    const dataArray = JSON.parse(savedData);
    dataArray.forEach(item => {
      const fields = Array.from(formEl.querySelectorAll(`[name="${item.name}"]`));
      fields.forEach(field => {
        if (item.type === "checkbox" || item.type === "radio") {
          if (field.value === item.value) {
            field.checked = item.checked;
          }
        } else {
          field.value = item.value;
        }
      });
    });
  } catch (e) {
    console.warn("Erro ao restaurar dados:", e);
  }
}

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

// Restaurar no carregamento
window.addEventListener("DOMContentLoaded", () => {
  restoreFormData();
  updateProgress();
});

// Salvar e atualizar progresso a cada mudança
formEl.addEventListener("input", () => {
  saveFormData();
  updateProgress();
});
formEl.addEventListener("change", () => {
  saveFormData();
  updateProgress();
});

// Botão "Novo Formulário"
document.getElementById("btnResetTop").addEventListener("click", () => {
  if (confirm("Tem certeza que deseja iniciar um novo formulário? Todos os dados serão apagados.")) {
    localStorage.removeItem(STORAGE_KEY);
    formEl.reset();
    updateProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

// Botão "Limpar Formulário" (mesma mensagem do novo formulário)
const btnLimpar = document.getElementById("btnLimparForm");
if (btnLimpar) {
  btnLimpar.addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("Tem certeza que deseja limpar o formulário? Todos os dados serão apagados.")) {
      localStorage.removeItem(STORAGE_KEY);
      formEl.reset();
      updateProgress();
    }
  });
}

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
