class AcompanhamentoPedagogico {
    constructor() {
        this.totalFields = 0;
        this.filledFields = 0;
        this.autoSaveInterval = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupAccordion();
        this.loadDraft();
        this.updateProgress();
        this.startAutoSave();
        this.countTotalFields();
    }

    countTotalFields() {
        // Contar todos os campos do formulário
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea, select');
        this.totalFields = inputs.length;
        console.log(`Total de campos: ${this.totalFields}`);
    }

    setupEventListeners() {
        // Event listeners para todos os campos
        document.addEventListener('input', (e) => {
            if (e.target.matches('input, select, textarea')) {
                this.updateProgress();
                this.markFieldAsChanged(e.target);
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.matches('input, select, textarea')) {
                this.updateProgress();
                this.markFieldAsChanged(e.target);
            }
        });

        // Botões de ação
        document.getElementById('salvarRascunho')?.addEventListener('click', () => {
            this.saveDraft();
            this.showToast('Rascunho salvo com sucesso!');
        });

        document.getElementById('gerarPDF')?.addEventListener('click', () => {
            this.generatePDF();
        });

        document.getElementById('compartilharWhatsApp')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.shareWhatsApp();
        });

        // Atalhos de teclado
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveDraft();
                this.showToast('Rascunho salvo!');
            }
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.generatePDF();
            }
        });
    }

    setupAccordion() {
        const accordionHeaders = document.querySelectorAll('.accordion-header');
        
        accordionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const sectionId = header.getAttribute('data-section');
                const content = document.getElementById(sectionId);
                const isActive = header.classList.contains('active');

                // Fechar todas as seções
                accordionHeaders.forEach(h => h.classList.remove('active'));
                document.querySelectorAll('.accordion-content').forEach(c => c.classList.remove('active'));

                // Abrir a seção clicada se não estava ativa
                if (!isActive) {
                    header.classList.add('active');
                    content.classList.add('active');
                }
            });
        });
    }

    markFieldAsChanged(field) {
        field.classList.add('field-changed');
        
        // Remover a classe após um tempo para efeito visual
        setTimeout(() => {
            field.classList.remove('field-changed');
        }, 300);
    }

    updateProgress() {
        const allFields = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea, select');
        let filled = 0;

        allFields.forEach(field => {
            if (field.value && field.value.trim() !== '') {
                filled++;
            }
        });

        this.filledFields = filled;
        const percentage = Math.round((filled / this.totalFields) * 100);

        // Atualizar barra de progresso
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }

        if (progressText) {
            progressText.textContent = `${percentage}% concluído (${filled}/${this.totalFields} campos)`;
        }
    }

    startAutoSave() {
        // Auto-save a cada 2 segundos
        this.autoSaveInterval = setInterval(() => {
            if (this.filledFields > 0) {
                this.saveDraft(true); // true = silent save
            }
        }, 2000);
    }

    saveDraft(silent = false) {
        const formData = new FormData(document.getElementById('formulario'));
        const data = {};

        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Adicionar timestamp
        data._timestamp = new Date().toISOString();
        data._progress = {
            filled: this.filledFields,
            total: this.totalFields,
            percentage: Math.round((this.filledFields / this.totalFields) * 100)
        };

        try {
            localStorage.setItem('acompanhamento_pedagogico_draft', JSON.stringify(data));
            
            if (!silent) {
                this.showToast('Rascunho salvo com sucesso!');
            } else {
                this.showToast('Rascunho salvo automaticamente', 'auto');
            }
        } catch (error) {
            console.error('Erro ao salvar rascunho:', error);
            if (!silent) {
                this.showToast('Erro ao salvar rascunho', 'error');
            }
        }
    }

    loadDraft() {
        try {
            const savedData = localStorage.getItem('acompanhamento_pedagogico_draft');
            if (savedData) {
                const data = JSON.parse(savedData);
                
                // Restaurar valores dos campos
                Object.keys(data).forEach(key => {
                    if (key.startsWith('_')) return; // Pular metadados
                    
                    const field = document.querySelector(`[name="${key}"]`);
                    if (field) {
                        field.value = data[key];
                    }
                });

                this.updateProgress();
                
                // Mostrar informação sobre o rascunho carregado
                if (data._timestamp) {
                    const date = new Date(data._timestamp);
                    this.showToast(`Rascunho carregado (${date.toLocaleString()})`, 'info');
                }
            }
        } catch (error) {
            console.error('Erro ao carregar rascunho:', error);
        }
    }

    async generatePDF() {
        try {
            this.showToast('Gerando PDF...', 'info');
            
            // Verificar se todos os campos obrigatórios estão preenchidos
            const requiredFields = document.querySelectorAll('[required]');
            const emptyRequired = Array.from(requiredFields).filter(field => !field.value.trim());
            
            if (emptyRequired.length > 0) {
                this.showToast('Por favor, preencha todos os campos obrigatórios', 'error');
                emptyRequired[0].focus();
                return;
            }

            // Coletar dados do formulário
            const formData = new FormData(document.getElementById('formulario'));
            const data = {};
            
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }

            // Carregar PDF base
            const pdfBytes = await fetch('./Acompanhamentobase.pdf').then(res => res.arrayBuffer());
            const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
            
            // Obter a primeira página
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];
            
            // Adicionar texto ao PDF
            const { width, height } = firstPage.getSize();
            
            // Informações básicas
            firstPage.drawText(`Creche: ${data.creche || ''}`, {
                x: 50,
                y: height - 100,
                size: 12,
            });
            
            firstPage.drawText(`Turma: ${data.turma || ''}`, {
                x: 50,
                y: height - 120,
                size: 12,
            });
            
            firstPage.drawText(`Turno: ${data.turno || ''}`, {
                x: 50,
                y: height - 140,
                size: 12,
            });

            // Adicionar data de geração
            firstPage.drawText(`Gerado em: ${new Date().toLocaleString()}`, {
                x: 50,
                y: height - 180,
                size: 10,
            });

            // Salvar PDF
            const pdfBytesModified = await pdfDoc.save();
            
            // Download
            const blob = new Blob([pdfBytesModified], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `Acompanhamento_Pedagogico_${data.creche || 'Formulario'}_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            this.showToast('PDF gerado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            this.showToast('Erro ao gerar PDF. Verifique se o arquivo base está disponível.', 'error');
        }
    }

    shareWhatsApp() {
        const creche = document.querySelector('[name="creche"]')?.value || 'Creche';
        const turma = document.querySelector('[name="turma"]')?.value || 'Turma';
        const progress = Math.round((this.filledFields / this.totalFields) * 100);
        
        const message = `📚 *Acompanhamento Pedagógico*\n\n` +
                       `🏫 Creche: ${creche}\n` +
                       `👥 Turma: ${turma}\n` +
                       `📊 Progresso: ${progress}% (${this.filledFields}/${this.totalFields} campos)\n\n` +
                       `Formulário em andamento...`;
        
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastText = toast.querySelector('.toast-text');
        
        // Remover classes anteriores
        toast.classList.remove('show', 'success', 'error', 'info', 'auto');
        
        // Adicionar nova classe
        toast.classList.add('show', type);
        toastText.textContent = message;
        
        // Auto-hide baseado no tipo
        const hideDelay = type === 'auto' ? 1500 : type === 'error' ? 5000 : 3000;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, hideDelay);
    }

    // Método para limpar rascunho
    clearDraft() {
        localStorage.removeItem('acompanhamento_pedagogico_draft');
        this.showToast('Rascunho removido', 'info');
    }

    // Método para exportar dados como JSON
    exportData() {
        const formData = new FormData(document.getElementById('formulario'));
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        data._exported = new Date().toISOString();
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `acompanhamento_pedagogico_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.showToast('Dados exportados com sucesso!');
    }

    // Método para validar seção
    validateSection(sectionId) {
        const section = document.getElementById(sectionId);
        const fields = section.querySelectorAll('input[required], select[required], textarea[required]');
        const emptyFields = Array.from(fields).filter(field => !field.value.trim());
        
        return {
            isValid: emptyFields.length === 0,
            emptyFields: emptyFields,
            totalFields: fields.length,
            filledFields: fields.length - emptyFields.length
        };
    }

    // Método para obter estatísticas
    getStats() {
        return {
            totalFields: this.totalFields,
            filledFields: this.filledFields,
            percentage: Math.round((this.filledFields / this.totalFields) * 100),
            sections: {
                section1: this.validateSection('section1'),
                section2: this.validateSection('section2'),
                section3: this.validateSection('section3'),
                section4: this.validateSection('section4'),
                section5: this.validateSection('section5')
            }
        };
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.acompanhamentoPedagogico = new AcompanhamentoPedagogico();
    
    // Limpar rascunhos antigos (mais de 7 dias)
    const savedData = localStorage.getItem('acompanhamento_pedagogico_draft');
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            if (data._timestamp) {
                const saveDate = new Date(data._timestamp);
                const now = new Date();
                const daysDiff = (now - saveDate) / (1000 * 60 * 60 * 24);
                
                if (daysDiff > 7) {
                    localStorage.removeItem('acompanhamento_pedagogico_draft');
                    console.log('Rascunho antigo removido automaticamente');
                }
            }
        } catch (error) {
            console.error('Erro ao verificar data do rascunho:', error);
        }
    }
});

// Prevenir perda de dados ao sair da página
window.addEventListener('beforeunload', (e) => {
    const app = window.acompanhamentoPedagogico;
    if (app && app.filledFields > 0) {
        app.saveDraft(true);
        e.preventDefault();
        e.returnValue = '';
    }
});

// Adicionar funcionalidades de console para debug
window.debugAcompanhamento = {
    getStats: () => window.acompanhamentoPedagogico?.getStats(),
    clearDraft: () => window.acompanhamentoPedagogico?.clearDraft(),
    exportData: () => window.acompanhamentoPedagogico?.exportData(),
    validateSection: (id) => window.acompanhamentoPedagogico?.validateSection(id)
};

