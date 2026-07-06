// Initialize high-res worker tracking pipeline
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let pdfDoc = null,
    currentId = null,
    currentPageNum = 1,
    totalPageCount = 0;

const scrollContainer = document.getElementById('scroll-view');
const pageIndicatorNum = document.getElementById('current-page');
const totalPageSpan = document.getElementById('total-pages');
const issueTitleHeader = document.getElementById('issue-title');

const urlParams = new URLSearchParams(window.location.search);
const magId = urlParams.get('id');

// Fetch clean catalog profile manifest coordinates
fetch('assets/data/magazines.json')
    .then(res => res.json())
    .then(magazines => {
        const activeMag = magazines.find(m => m.id === magId);
        if (!activeMag) return alert("Profile mismatch error.");
        
        currentId = activeMag.id;
        issueTitleHeader.textContent = activeMag.title;
        
        const instantCover = document.getElementById('instant-cover-backdrop');
        if (instantCover) instantCover.src = activeMag.coverImage;
        
        const savedPage = localStorage.getItem(`read_progress_${currentId}`);
        if (savedPage) currentPageNum = parseInt(savedPage, 10);

        loadPDFDocument(activeMag.pdfUrl);
    });

function loadPDFDocument(url) {
    pdfjsLib.getDocument(url).promise.then(pdf => {
        pdfDoc = pdf;
        totalPageCount = pdf.numPages;
        if (totalPageSpan) totalPageSpan.textContent = totalPageCount;
        renderHighResReadingView();
    });
}

function renderHighResReadingView() {
    scrollContainer.innerHTML = '';
    
    // 1. Pre-generate all layout wrapper elements so scrolling height is immediate
    for (let pageNum = 1; pageNum <= totalPageCount; pageNum++) {
        const pageContainer = document.createElement('div');
        pageContainer.id = `scroll-page-wrapper-${pageNum}`;
        pageContainer.className = 'page-container';

        const canvas = document.createElement('canvas');
        pageContainer.appendChild(canvas);
        
        if (pageNum > 1) {
            const textLayerDiv = document.createElement('div');
            textLayerDiv.className = 'textLayer';
            pageContainer.appendChild(textLayerDiv);
        }
        scrollContainer.appendChild(pageContainer);
    }

    // 2. PRIORITIZE COVER PAGE: Render Page 1 solo to eliminate screen freeze entirely
    renderSinglePage(1).then(() => {
        // Drop the loading panel instantly the moment page 1 completes rendering
        const loadingScreen = document.getElementById('reader-loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.remove(), 400);
        }
        
        // Restore page progress logs seamlessly without delaying visual presentation
        setTimeout(() => {
            const savedEl = document.getElementById(`scroll-page-wrapper-${currentPageNum}`);
            if (savedEl && currentPageNum > 1) savedEl.scrollIntoView({ block: 'start' });
        }, 50);

        // 3. LAZY PIPELINE LAUNCH: Stream structural spreads one after another in background thread
        renderRemainingPagesSequentially(2);
    });

    // Isolated render pipeline worker
    function renderSinglePage(pageNum) {
        const wrapper = document.getElementById(`scroll-page-wrapper-${pageNum}`);
        if (!wrapper) return Promise.resolve();
        
        const canvas = wrapper.querySelector('canvas');
        const textLayerDiv = wrapper.querySelector('.textLayer');

        return pdfDoc.getPage(pageNum).then(page => {
            const viewport = page.getViewport({ scale: 2.0 });
            const context = canvas.getContext('2d');
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            return page.render({ canvasContext: context, viewport: viewport }).promise.then(() => {
                if (pageNum > 1 && textLayerDiv) {
                    return page.getTextContent().then(textContent => {
                        return pdfjsLib.renderTextLayer({
                            textContent: textContent,
                            container: textLayerDiv,
                            viewport: viewport,
                            textDivs: []
                        }).promise;
                    });
                }
            });
        }).catch(err => console.error(`Error processing spread segment ${pageNum}:`, err));
    }

    // Non-blocking sequential processor loop
    function renderRemainingPagesSequentially(nextPage) {
        if (nextPage > totalPageCount) return;
        renderSinglePage(nextPage).then(() => {
            renderRemainingPagesSequentially(nextPage + 1);
        });
    }

  // Tracking active scroll timeline indicators dynamically
    scrollContainer.addEventListener('scroll', () => {
        const isMobile = window.innerWidth < 768;
        
        for (let pageNum = 1; pageNum <= totalPageCount; pageNum++) {
            const pageEl = document.getElementById(`scroll-page-wrapper-${pageNum}`);
            if (pageEl) {
                const rect = pageEl.getBoundingClientRect();
                
                let isCurrent = false;
                if (isMobile) {
                    // Mobile Check: Looks at the horizontal midpoint match
                    const midPoint = window.innerWidth / 2;
                    isCurrent = (rect.left <= midPoint && rect.right >= midPoint);
                } else {
                    // Desktop Check: Keeps the vertical intersection baseline
                    const containerTop = scrollContainer.getBoundingClientRect().top;
                    isCurrent = (rect.top <= containerTop + 200 && rect.bottom >= containerTop + 200);
                }

                if (isCurrent) {
                    currentPageNum = pageNum;
                    if (pageIndicatorNum) pageIndicatorNum.textContent = currentPageNum;
                    localStorage.setItem(`read_progress_${currentId}`, currentPageNum);
                    break;
                }
            }
        }
    });

// ==========================================================================
// DIRECT ZOOM MECHANICS (SCALES INDIVIDUAL PAGES / KEEPS SCROLL ACTIVE)
// ==========================================================================
let currentZoomScale = 1.0;
let lastTapTime = 0;

if (scrollContainer) {
    // Touch tracking configurations for mobile devices
    scrollContainer.addEventListener('touchstart', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;
        if (tapLength < 300 && tapLength > 0) {
            e.preventDefault();
            togglePageZoom();
        }
        lastTapTime = currentTime;
    });

    // Double click actions for desktop mice mapping tracks
    scrollContainer.addEventListener('dblclick', () => {
        togglePageZoom();
    });
}

function togglePageZoom() {
    const allPages = document.querySelectorAll('.page-container');
    
    if (currentZoomScale === 1.0) {
        currentZoomScale = 1.4; // Magnify layout smoothly for clean column inspection
        allPages.forEach(page => {
            page.style.transform = `scale(${currentZoomScale})`;
        });
    } else {
        currentZoomScale = 1.0; // Snap cleanly back to default edge margins
        allPages.forEach(page => {
            page.style.transform = 'scale(1)';
        });
    }
}}