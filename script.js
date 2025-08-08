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

  // Função para lidar com campos de escolha (radio, combo, etc.)
  function setChoiceIfExists(fieldName, value) {
    try {
      const field = form.getField(fieldName);
      if (field.constructor.name === "PDFCheckBox") {
        if (value && value !== "0") field.check();
      } else if (field.constructor.name === "PDFRadioGroup") {
        field.select(value);
      } else {
        field.setText(value || "");
      }
    } catch (e) {
      console.warn(`Campo de escolha não encontrado: ${fieldName}`);
    }
  }

  // Campos de escolha da Seção I
  setChoiceIfExists("SEC_I_1", data.SEC_I_1);
  setChoiceIfExists("SEC_I_2", data.SEC_I_2);
  setChoiceIfExists("SEC_I_3", data.SEC_I_3);
  setChoiceIfExists("SEC_I_4", data.SEC_I_4);
  setChoiceIfExists("SEC_I_5", data.SEC_I_5);

  // Agora percorre o resto dos campos do formulário
  for (const key in data) {
    if (key.startsWith("SEC_I_")) continue; // já tratados
    if (key.toLowerCase().includes("checkbox")) {
      checkIfExists(key, data[key] === "on" || data[key] === true || data[key] === "true");
    } else {
      setTextIfExists(key, data[key]);
    }
  }

  // Mantém o PDF editável
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
