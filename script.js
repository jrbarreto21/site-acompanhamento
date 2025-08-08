document.getElementById("formulario").addEventListener("submit", async function (e) {
  e.preventDefault();

  // Coleta os dados do formulário
  const formData = new FormData(e.target);
  const data = {};
  formData.forEach((value, key) => data[key] = value);

  // Carrega o PDF base
  const existingPdfBytes = await fetch("Acompanhamentobase.pdf").then(res => res.arrayBuffer());
  const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();

  // Função auxiliar para preencher texto
  function setTextIfExists(fieldName, text) {
    try {
      form.getTextField(fieldName).setText(text || "");
    } catch (e) {
      console.warn(`Campo de texto não encontrado: ${fieldName}`);
    }
  }

  // Função auxiliar para marcar checkbox
  function checkIfExists(fieldName, checked) {
    try {
      const cb = form.getCheckBox(fieldName);
      if (checked) {
        cb.check();
      } else {
        cb.uncheck();
      }
    } catch (e) {
      console.warn(`Campo checkbox não encontrado: ${fieldName}`);
    }
  }

  // Percorre todos os campos enviados
  for (const key in data) {
    if (key.toLowerCase().includes("checkbox")) {
      // Campos checkbox no HTML: valor "on" significa marcado
      checkIfExists(key, data[key] === "on" || data[key] === true || data[key] === "true");
    } else {
      // Campos de texto ou select
      setTextIfExists(key, data[key]);
    }
  }

  // Mantém o PDF editável (não usar flatten)
  const pdfBytes = await pdfDoc.save();

  // Gera o arquivo para download
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  // Baixa o PDF
  const link = document.createElement("a");
  link.href = url;
  link.download = "acompanhamento_preenchido.pdf";
  link.click();

  // Link para WhatsApp
  document.getElementById("whatsapp-share").href =
    "https://wa.me/?text=" + encodeURIComponent("Segue o PDF preenchido: " + url);
});
