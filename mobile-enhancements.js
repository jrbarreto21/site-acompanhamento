// Melhorias específicas para dispositivos móveis
class MobileEnhancements {
    constructor() {
        this.touchStartY = 0;
        this.touchEndY = 0;
        this.isScrolling = false;
        this.lastScrollTop = 0;
        this.scrollDirection = 'down';
        
        this.init();
    }

    init() {
        if (this.isMobileDevice()) {
            this.setupTouchGestures();
            this.setupVirtualKeyboardHandling();
            this.setupScrollOptimizations();
            this.setupOrientationHandling();
            this.setupHapticFeedback();
            this.setupAccessibilityFeatures();
        }
    }

    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               ('ontouchstart' in window) ||
               (navigator.maxTouchPoints > 0);
    }

    // Gestos de toque
    setupTouchGestures() {
        // Swipe para navegar entre seções
        document.addEventListener('touchstart', (e) => {
            this.touchStartY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            this.touchEndY = e.changedTouches[0].clientY;
            this.handleSwipeGesture();
        }, { passive: true });

        // Tap duplo para expandir/colapsar seções
        let lastTap = 0;
        document.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            if (tapLength < 500 && tapLength > 0) {
                const target = e.target.closest('.accordion-header');
                if (target) {
                    e.preventDefault();
                    this.handleDoubleTap(target);
                }
            }
            lastTap = currentTime;
        });

        // Pinch to zoom para campos de texto longos
        this.setupPinchZoom();
    }

    handleSwipeGesture() {
        const swipeThreshold = 50;
        const swipeDistance = this.touchStartY - this.touchEndY;

        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance > 0) {
                // Swipe up - próxima seção
                this.navigateToNextSection();
            } else {
                // Swipe down - seção anterior
                this.navigateToPreviousSection();
            }
        }
    }

    handleDoubleTap(accordionHeader) {
        // Adicionar feedback visual
        accordionHeader.style.transform = 'scale(0.95)';
        setTimeout(() => {
            accordionHeader.style.transform = '';
        }, 150);

        // Trigger accordion
        accordionHeader.click();
        
        // Haptic feedback
        this.triggerHapticFeedback('light');
    }

    navigateToNextSection() {
        const activeSection = document.querySelector('.accordion-header.active');
        if (activeSection) {
            const nextSection = activeSection.parentElement.nextElementSibling?.querySelector('.accordion-header');
            if (nextSection) {
                nextSection.click();
                this.smoothScrollToElement(nextSection);
                this.triggerHapticFeedback('medium');
            }
        }
    }

    navigateToPreviousSection() {
        const activeSection = document.querySelector('.accordion-header.active');
        if (activeSection) {
            const prevSection = activeSection.parentElement.previousElementSibling?.querySelector('.accordion-header');
            if (prevSection) {
                prevSection.click();
                this.smoothScrollToElement(prevSection);
                this.triggerHapticFeedback('medium');
            }
        }
    }

    // Teclado virtual
    setupVirtualKeyboardHandling() {
        let initialViewportHeight = window.innerHeight;
        
        window.addEventListener('resize', () => {
            const currentHeight = window.innerHeight;
            const heightDifference = initialViewportHeight - currentHeight;
            
            // Se a altura diminuiu significativamente, provavelmente o teclado apareceu
            if (heightDifference > 150) {
                document.body.classList.add('keyboard-open');
                this.handleKeyboardOpen();
            } else {
                document.body.classList.remove('keyboard-open');
                this.handleKeyboardClose();
            }
        });

        // Scroll automático para campo focado
        document.addEventListener('focusin', (e) => {
            if (e.target.matches('input, select, textarea')) {
                setTimeout(() => {
                    this.scrollToFocusedElement(e.target);
                }, 300); // Aguardar teclado aparecer
            }
        });
    }

    handleKeyboardOpen() {
        // Ajustar layout quando teclado abre
        const header = document.querySelector('.header');
        const progressContainer = document.querySelector('.progress-container');
        
        if (header) header.style.display = 'none';
        if (progressContainer) progressContainer.style.display = 'none';
        
        // Adicionar estilos específicos
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    }

    handleKeyboardClose() {
        // Restaurar layout quando teclado fecha
        const header = document.querySelector('.header');
        const progressContainer = document.querySelector('.progress-container');
        
        if (header) header.style.display = '';
        if (progressContainer) progressContainer.style.display = '';
        
        document.documentElement.style.removeProperty('--vh');
    }

    scrollToFocusedElement(element) {
        const elementRect = element.getBoundingClientRect();
        const absoluteElementTop = elementRect.top + window.pageYOffset;
        const middle = absoluteElementTop - (window.innerHeight / 3);
        
        window.scrollTo({
            top: middle,
            behavior: 'smooth'
        });
    }

    // Otimizações de scroll
    setupScrollOptimizations() {
        let ticking = false;
        
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    handleScroll() {
        const currentScrollTop = window.pageYOffset;
        
        // Determinar direção do scroll
        if (currentScrollTop > this.lastScrollTop) {
            this.scrollDirection = 'down';
        } else {
            this.scrollDirection = 'up';
        }
        
        this.lastScrollTop = currentScrollTop;
        
        // Auto-hide header em scroll down
        this.handleHeaderAutoHide();
        
        // Lazy loading de seções
        this.handleLazyLoading();
    }

    handleHeaderAutoHide() {
        const header = document.querySelector('.header');
        if (!header || document.body.classList.contains('keyboard-open')) return;
        
        if (this.scrollDirection === 'down' && this.lastScrollTop > 100) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }
    }

    handleLazyLoading() {
        // Implementar lazy loading para seções não visíveis
        const sections = document.querySelectorAll('.form-section');
        
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
            
            if (isVisible) {
                section.classList.add('visible');
            }
        });
    }

    // Orientação da tela
    setupOrientationHandling() {
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
    }

    handleOrientationChange() {
        // Reajustar layout após mudança de orientação
        const isLandscape = window.innerWidth > window.innerHeight;
        
        document.body.classList.toggle('landscape', isLandscape);
        document.body.classList.toggle('portrait', !isLandscape);
        
        // Recalcular alturas
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        
        // Trigger resize event para outros componentes
        window.dispatchEvent(new Event('resize'));
    }

    // Feedback háptico
    setupHapticFeedback() {
        // Verificar suporte a vibração
        this.hasVibration = 'vibrate' in navigator;
    }

    triggerHapticFeedback(intensity = 'light') {
        if (!this.hasVibration) return;
        
        const patterns = {
            light: [10],
            medium: [20],
            heavy: [30],
            success: [10, 50, 10],
            error: [50, 50, 50]
        };
        
        navigator.vibrate(patterns[intensity] || patterns.light);
    }

    // Pinch to zoom
    setupPinchZoom() {
        let initialDistance = 0;
        let currentScale = 1;
        
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                initialDistance = this.getDistance(e.touches[0], e.touches[1]);
            }
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                
                const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
                const scale = currentDistance / initialDistance;
                
                // Aplicar zoom apenas em campos de texto longos
                const target = e.target.closest('textarea, .question-label');
                if (target) {
                    currentScale = Math.min(Math.max(scale, 0.8), 2);
                    target.style.transform = `scale(${currentScale})`;
                    target.style.transformOrigin = 'center';
                }
            }
        }, { passive: false });
        
        document.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) {
                // Reset zoom
                const scaledElements = document.querySelectorAll('[style*="scale"]');
                scaledElements.forEach(el => {
                    el.style.transform = '';
                    el.style.transformOrigin = '';
                });
            }
        }, { passive: true });
    }

    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Recursos de acessibilidade
    setupAccessibilityFeatures() {
        // Aumentar área de toque para elementos pequenos
        this.enhanceTouchTargets();
        
        // Melhorar navegação por teclado
        this.enhanceKeyboardNavigation();
        
        // Suporte a leitores de tela
        this.enhanceScreenReaderSupport();
    }

    enhanceTouchTargets() {
        const smallTargets = document.querySelectorAll('button, a, input, select');
        
        smallTargets.forEach(target => {
            const rect = target.getBoundingClientRect();
            if (rect.height < 44 || rect.width < 44) {
                target.style.minHeight = '44px';
                target.style.minWidth = '44px';
                target.style.display = 'inline-flex';
                target.style.alignItems = 'center';
                target.style.justifyContent = 'center';
            }
        });
    }

    enhanceKeyboardNavigation() {
        // Adicionar indicadores visuais para navegação por teclado
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });
        
        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
    }

    enhanceScreenReaderSupport() {
        // Adicionar landmarks ARIA
        const main = document.querySelector('.main');
        if (main) main.setAttribute('role', 'main');
        
        const form = document.querySelector('#formulario');
        if (form) {
            form.setAttribute('aria-label', 'Formulário de Acompanhamento Pedagógico');
        }
        
        // Adicionar descrições para campos complexos
        const selects = document.querySelectorAll('select[name^="SEC_I"]');
        selects.forEach(select => {
            select.setAttribute('aria-describedby', 'secao-1-desc');
        });
        
        // Criar descrição para seção I
        if (!document.getElementById('secao-1-desc')) {
            const desc = document.createElement('div');
            desc.id = 'secao-1-desc';
            desc.className = 'sr-only';
            desc.textContent = 'Seção sobre apropriação do currículo. Selecione a opção que melhor descreve a situação observada.';
            document.body.appendChild(desc);
        }
    }

    smoothScrollToElement(element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

// Performance Monitor para dispositivos móveis
class MobilePerformanceMonitor {
    constructor() {
        this.metrics = {
            loadTime: 0,
            renderTime: 0,
            interactionTime: 0
        };
        
        this.init();
    }

    init() {
        this.measureLoadTime();
        this.measureRenderTime();
        this.measureInteractionTime();
        this.setupMemoryMonitoring();
    }

    measureLoadTime() {
        window.addEventListener('load', () => {
            this.metrics.loadTime = performance.now();
            console.log(`Tempo de carregamento: ${this.metrics.loadTime.toFixed(2)}ms`);
        });
    }

    measureRenderTime() {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
                if (entry.entryType === 'paint') {
                    console.log(`${entry.name}: ${entry.startTime.toFixed(2)}ms`);
                }
            });
        });
        
        observer.observe({ entryTypes: ['paint'] });
    }

    measureInteractionTime() {
        document.addEventListener('click', (e) => {
            const startTime = performance.now();
            
            requestAnimationFrame(() => {
                const endTime = performance.now();
                const interactionTime = endTime - startTime;
                
                if (interactionTime > 100) {
                    console.warn(`Interação lenta detectada: ${interactionTime.toFixed(2)}ms`);
                }
            });
        });
    }

    setupMemoryMonitoring() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                const usedMB = (memory.usedJSHeapSize / 1048576).toFixed(2);
                const totalMB = (memory.totalJSHeapSize / 1048576).toFixed(2);
                
                console.log(`Memória: ${usedMB}MB / ${totalMB}MB`);
                
                // Alertar se uso de memória for muito alto
                if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.9) {
                    console.warn('Alto uso de memória detectado');
                }
            }, 30000); // Check a cada 30 segundos
        }
    }
}

// Inicializar melhorias móveis quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new MobileEnhancements();
    new MobilePerformanceMonitor();
});

// CSS adicional para dispositivos móveis
const mobileStyles = `
    /* Estilos específicos para teclado virtual */
    .keyboard-open .header {
        display: none !important;
    }
    
    .keyboard-open .progress-container {
        display: none !important;
    }
    
    .keyboard-open .main {
        padding-top: 1rem !important;
    }
    
    /* Navegação por teclado */
    .keyboard-navigation *:focus {
        outline: 3px solid #3b82f6 !important;
        outline-offset: 2px !important;
    }
    
    /* Orientação landscape */
    .landscape .form-grid {
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)) !important;
    }
    
    .landscape .accordion-content.active {
        max-height: 60vh !important;
        overflow-y: auto !important;
    }
    
    /* Melhorias de toque */
    @media (hover: none) and (pointer: coarse) {
        .accordion-header {
            min-height: 60px;
        }
        
        .btn {
            min-height: 48px;
            padding: 12px 24px;
        }
        
        .form-input,
        .form-select {
            min-height: 48px;
            font-size: 16px; /* Previne zoom no iOS */
        }
        
        .question-label {
            line-height: 1.6;
            padding: 8px 0;
        }
    }
    
    /* Animações reduzidas para performance */
    @media (prefers-reduced-motion: reduce) {
        .accordion-content {
            transition: none !important;
        }
        
        .btn::before {
            display: none !important;
        }
        
        .spinner {
            animation: none !important;
        }
    }
    
    /* Alto contraste */
    @media (prefers-contrast: high) {
        .form-input,
        .form-select {
            border-width: 3px !important;
        }
        
        .btn {
            border: 2px solid currentColor !important;
        }
    }
    
    /* Modo escuro */
    @media (prefers-color-scheme: dark) {
        :root {
            --bg-primary: #1e293b;
            --bg-secondary: #0f172a;
            --text-primary: #f1f5f9;
            --text-secondary: #cbd5e1;
            --border-color: #334155;
        }
    }
`;

// Adicionar estilos móveis
const styleSheet = document.createElement('style');
styleSheet.textContent = mobileStyles;
document.head.appendChild(styleSheet);

