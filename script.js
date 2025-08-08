document.getElementById("formulario").addEventListener("submit", async function (e) {
  e.preventDefault();

  // Coleta os dados do formulário
  const formData = new FormData(e.target);
  const data = {};
  formData.forEach((value, key) => {
    // checkbox não marcado não aparece no FormData — ajustamos depois
    data[key] = value;
  });

  // Carrega o PDF base
  const existingPdfBytes = await fetch("Acompanhamentobase.pdf").then(res => res.arrayBuffer());
  const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();

  // --- 1) Logue todos os campos do PDF para conferência ---
  try {
    const pdfFields = form.getFields().map(f => {
      try { return f.getName(); } catch { return "(sem nome)"; }
    });
    console.log("Campos do PDF:", pdfFields);
  } catch (err) {
    console.warn("Não foi possível listar campos via pdf-lib:", err);
  }

  // Função robusta para tentar definir um campo
  function trySetField(fieldName, value) {
    // Normalize null/undefined
    if (value === undefined || value === null) value = "";

    // tentativa por tipo: text -> checkbox -> radiogroup -> dropdown
    // cada tentativa em try/catch para não quebrar tudo
    // 1) TextField
    try {
      const tf = form.getTextField(fieldName);
      if (tf) {
        tf.setText(String(value));
        console.log(`Texto definido em ${fieldName} = "${value}"`);
        return true;
      }
    } catch (e) {/* não é TextField */}
    // 2) CheckBox
    try {
      const cb = form.getCheckBox(fieldName);
      if (cb) {
        // valor comum para checkbox vindo do HTML: "on" quando marcado
        const checked = (value === "on" || value === true || value === "true" || value === "Sim" || value === "Yes" || value === "1");
        if (checked) { cb.check(); console.log(`Checkbox marcado: ${fieldName}`); }
        else { cb.uncheck(); console.log(`Checkbox desmarcado: ${fieldName}`); }
        return true;
      }
    } catch (e) {/* não é CheckBox */}
    // 3) RadioGroup
    try {
      const rg = form.getRadioGroup(fieldName);
      if (rg) {
        // Montar candidatos: o valor direto e algumas variações comuns
        const candidates = [String(value), String(value).trim(), String(Number(value || 0)), "Sim", "Não", "Yes", "No", "On", "Off"];
        let selected = false;
        for (const c of candidates) {
          try { rg.select(c); console.log(`RadioGroup ${fieldName} selecionado -> ${c}`); selected = true; break; } catch (err) { /* tentou, não funcionou */ }
        }
        if (!selected) {
          // ultima tentativa: selecionar o primeiro option visível (se houver)
          try {
            const opts = rg.getOptions ? rg.getOptions() : null;
            if (opts && opts.length) { rg.select(opts[0]); console.log(`RadioGroup ${fieldName} selecionado -> ${opts[0]} (fallback)`); selected = true; }
          } catch(e){}
        }
        return true;
      }
    } catch (e) {/* não é RadioGroup */}
    // 4) Dropdown
    try {
      const dd = form.getDropdown(fieldName);
      if (dd) {
        const candidates = [String(value), String(value).trim(), "Sim", "Não", "Yes", "No", "1", "2", "3", "4"];
        let sel = false;
        for (const c of candidates) {
          try { dd.select(c); console.log(`Dropdown ${fieldName} selecionado -> ${c}`); sel = true; break; } catch (err) {}
        }
        return true;
      }
    } catch (e) {/* não é Dropdown */}
    // Se não encontrou nenhum tipo conhecido:
    console.warn(`Campo não alterado (não encontrado tipo compatível): ${fieldName}`);
    return false;
  }

  // --- Preencher campos conhecidos da Seção I explicitamente (caso queira garantir) ---
  // Se os nomes existirem, serão definidos; se não existirem, trySetField só emitirá warning.
  ["SEC_I_1","SEC_I_2","SEC_I_3","SEC_I_4","SEC_I_5"].forEach(k => {
    if (k in data) trySetField(k, data[k]);
  });

  // --- Preencha o restante dos campos do formulário dinamicamente ---
  // (Se você tiver checkboxes não incluídos no FormData quando desmarcados, considere colocar hidden inputs)
  Object.keys(data).forEach(key => {
    // já tratamos SEC_I_*
    if (["SEC_I_1","SEC_I_2","SEC_I_3","SEC_I_4","SEC_I_5"].includes(key)) return;
    trySetField(key, data[key]);
  });

  // --- 2) Atualizar aparências para que as marcações apareçam em todos os leitores ---
  try {
    // Usa fonte padrão embarcada para gerar a aparência
    const helv = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    form.updateFieldAppearances(helv);
    console.log("Aparências atualizadas com Helvetica.");
  } catch (err) {
    console.warn("Falha ao atualizar aparências:", err);
  }

  // Mantém o PDF editável (não chama flatten())
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

  console.log("Processo concluído. Verifique o download e abra o PDF no leitor (recomendo Adobe Reader para confirmação).");
});
