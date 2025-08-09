document.getElementById("formulario").addEventListener("submit", async function (e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {};
  formData.forEach((value, key) => data[key] = value);

  const existingPdfBytes = await fetch("Acompanhamentobase.pdf").then(res => res.arrayBuffer());
  const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();

  // Função robusta para tentar preencher qualquer tipo de campo
  function trySetField(fieldName, value) {
    try {
      if (form.getTextField(fieldName)) {
        form.getTextField(fieldName).setText(String(value || ""));
        return;
      }
    } catch {}
    try {
      if (form.getCheckBox(fieldName)) {
        if (value === "on" || value === true || value === "true" || value === "1") {
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

  // Percorre todos os campos enviados e tenta preencher
  Object.keys(data).forEach(key => {
    trySetField(key, data[key]);
  });

  // Atualiza as aparências para garantir que fique visível
  const helv = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  form.updateFieldAppearances(helv);

  // Salva o PDF mantendo editável
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  // Baixa o PDF
  const link = document.createElement("a");
  link.href = url;
  link.download = "acompanhamento_2025.pdf";
  link.click();

  // Link para WhatsApp
  document.getElementById("whatsapp-share").href =
    "https://wa.me/?text=" + encodeURIComponent("Segue o PDF preenchido: " + url);
});
´´´´´´´´´´