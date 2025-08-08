document.getElementById("formulario").addEventListener("submit", async function (e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {};
  formData.forEach((value, key) => data[key] = value);

  const existingPdfBytes = await fetch("Acompanhamentobase.pdf").then(res => res.arrayBuffer());
  const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();

  form.getTextField("SEC_I_1").setText(data.SEC_I_1 || "");

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "acompanhamento_preenchido.pdf";
  link.click();

  document.getElementById("whatsapp-share").href =
    "https://wa.me/?text=Formulário preenchido disponível: " + encodeURIComponent(url);
});
