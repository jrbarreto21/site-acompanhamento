// ============================
// SCRIPT PRINCIPAL DO FORMULÁRIO
// ============================

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("formulario");
  const whatsappBtn = document.getElementById("whatsapp-share");
  const accordions = document.querySelectorAll(".accordion");
  const progressBar = document.createElement("div");

  // ===== CRIAÇÃO DA BARRA DE PROGRESSO =====
  progressBar.id = "progress-bar";
  progressBar.style.height = "6px";
  progressBar.style.background = "#4CAF50";
  progressBar.style.width = "0%";
  progressBar.style.transition = "width 0.3s ease";
  document.body.insertBefore(progressBar, document.body.firstChild);

  // ===== ATUALIZA A BARRA DE PROGRESSO =====
  function updateProgress() {
    const inputs = form.querySelectorAll("input, select, textarea");
    const total = inputs.length;
    let filled = 0;
    inputs.forEach(input => {
      if (input.type === "checkbox" || input.type === "radio") {
        if (input.checked) filled++;
      } else if (input.value.trim() !== "") {
        filled++;
      }
    });
    const percent = Math.round((filled / total) * 100);
    progressBar.style.width = percent + "%";
  }

  // ===== FEEDBACK VISUAL NOS CAMPOS =====
  form.querySelectorAll("input, select, textarea").forEach(field => {
    field.addEventListener("input", function () {
      if (this.required && this.value.trim() === "") {
        this.style.border = "2px solid red";
      } else if (this.value.trim() !== "") {
        this.style.border = "2px solid green";
      } else {
        this.style.border = "1px solid #ccc";
      }
      updateProgress();
    });
  });

  // ===== ACCORDION INTELIGENTE =====
  accordions.forEach((acc, index) => {
    acc.addEventListener("click", function () {
      this.classList.toggle("active");
      const panel = this.nextElementSibling;
      if (panel.style.display === "block") {
        panel.style.display = "none";
      } else {
        document.querySelectorAll(".panel").forEach(p => p.style.display = "none");
        panel.style.display = "block";
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    if (index === 0) {
      acc.classList.add("active");
      acc.nextElementSibling.style.display = "block";
    }
  });

  // ===== BOTÃO "NOVO FORMULÁRIO" =====
  document.getElementById("novo-form").addEventListener("click", function () {
    form.reset();
    form.querySelectorAll("input, select, textarea").forEach(f => f.style.border = "1px solid #ccc");
    progressBar.style.width = "0%";
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.querySelector("header").classList.add("highlight");
    setTimeout(() => document.querySelector("header").classList.remove("highlight"), 1000);
  });

  // ===== LÓGICA PARA PREENCHER O PDF =====
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => data[key] = value);

    // Carregar PDF base
    const existingPdfBytes = await fetch("Acompanhamentobase.pdf").then(res => res.arrayBuffer());
    const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes, { updateMetadata: false });
    const pdfForm = pdfDoc.getForm();

    // Função para preencher qualquer tipo de campo
    function trySetField(fieldName, value) {
      try {
        if (pdfForm.getTextField(fieldName)) {
          pdfForm.getTextField(fieldName).setText(String(value || ""));
          return;
        }
      } catch {}
      try {
        if (pdfForm.getCheckBox(fieldName)) {
          if (["on", "true", "1", "sim"].includes(String(value).toLowerCase())) {
            pdfForm.getCheckBox(fieldName).check();
          } else {
            pdfForm.getCheckBox(fieldName).uncheck();
          }
          return;
        }
      } catch {}
      try {
        if (pdfForm.getRadioGroup(fieldName)) {
          pdfForm.getRadioGroup(fieldName).select(String(value));
          return;
        }
      } catch {}
      try {
        if (pdfForm.getDropdown(fieldName)) {
          pdfForm.getDropdown(fieldName).select(String(value));
          return;
        }
      } catch {}
      console.warn(`Campo não encontrado no PDF: ${fieldName}`);
    }

    // Preencher campos
    Object.keys(data).forEach(key => {
      trySetField(key, data[key]);
    });

    // Atualizar aparência dos campos no PDF
    const helv = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    pdfForm.updateFieldAppearances(helv);

    // Nome do arquivo
    function sanitize(str) {
      return String(str || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9 _-]/g, "")
        .trim()
        .replace(/\s+/g, "_") || "SemValor";
    }

    const nomeArquivo = `Acompanhamento_${sanitize(data.creche)}_${sanitize(data.turma)}_${sanitize(data.turno)}.pdf`;

    // Salvar PDF mantendo editável
    const pdfBytes = await pdfDoc.save({ updateFieldAppearances: false });
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    // Download automático
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    // Atualizar botão WhatsApp
    whatsappBtn.href = "https://wa.me/?text=" + encodeURIComponent(`PDF gerado: ${nomeArquivo}`);
  });

  // Iniciar progresso
  updateProgress();
});
