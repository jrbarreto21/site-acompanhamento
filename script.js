document.getElementById("formulario").addEventListener("submit", async function (e) {
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

  // --- Monta o nome do arquivo usando os campos do formulário ---
  // Tentamos pegar os nomes exatamente como no seu index.html: "creche", "turma", "turno".
  // Se no seu HTML os names forem diferentes, substitua aqui pelos nomes corretos.
  const crecheRaw = data.creche || data['Nome da Creche'] || '';
  const turmaRaw  = data.turma  || data['Turma'] ||  '';
  const turnoRaw  = data.turno  || data['Turno'] || '';

  function sanitizeFilename(str) {
    // remove diacríticos, caracteres inválidos e converte espaços para underscore
    return String(str || '')
      .normalize('NFKD')                     // separa diacríticos
      .replace(/[\u0300-\u036f]/g, '')       // remove acentos
      .replace(/[^a-zA-Z0-9 _-]/g, '')      // permite apenas letras, números, space, underscore e hífen
      .trim()
      .replace(/\s+/g, '_')                 // espaços -> _
      || 'SemValor';
  }

  const nomeArquivo = `Acompanhamento-${sanitizeFilename(crecheRaw)}-${sanitizeFilename(turmaRaw)}-${sanitizeFilename(turnoRaw)}.pdf`;

  // Baixa o PDF com o nome gerado
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  // Atualiza link WhatsApp (nota: blob URL não é útil para compartilhar fora do dispositivo; aqui só notificamos o nome)
  document.getElementById("whatsapp-share").href =
    "https://wa.me/?text=" + encodeURIComponent("PDF gerado: " + nomeArquivo + " (baixado localmente).");

  console.log("PDF gerado:", nomeArquivo);
});
