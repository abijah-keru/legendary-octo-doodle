pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let pdfDoc = null,
    currentId = null,
    currentPageNum = 1,
    totalPageCount = 0;

// Target the window/body for desktop scrolling
const scrollContainer = window; 
const pageIndicatorNum = document.getElementById('current-page');
const totalPageSpan = document.getElementById('total-pages');
const issueTitleHeader = document.getElementById('issue-title');

const urlParams = new URLSearchParams(window.location.search);
const magId = urlParams.get('id');

fetch('assets/data/magazines.json')
    .then(res => res.json())
    .then(magazines => {
        const activeMag = magazines.find(m => m.id === magId);
        if (!activeMag) return alert("Profile mismatch error.");
        
        currentId = activeMag.id;
        issueTitleHeader.textContent = activeMag.title;
        
        // The image-loading lines that caused the flash have been completely removed from here!
        
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
    const scrollViewDiv = document.getElementById('scroll-view');
    if (!scrollViewDiv) return;
    
    scrollViewDiv.innerHTML = '';
    const isMobile = window.innerWidth < 768;
    
    // 1. Build structural canvas frame layout blocks
    for (let pageNum = 1; pageNum <= totalPageCount; pageNum++) {
        const pageContainer = document.createElement('div');
        pageContainer.id = `scroll-page-wrapper-${pageNum}`;
        pageContainer.className = 'page-container';

        const canvas = document.createElement('canvas');
        pageContainer.appendChild(canvas);
        
        scrollViewDiv.appendChild(pageContainer);
    }

    // 2. Load Page 1 cleanly without structural layout popping
    renderSinglePage(1).then(() => {
        // Remove loading overlay safely now that layout sizing is real
        const loadingScreen = document.getElementById('reader-loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.remove(), 400);
        }
        
        // Handle scroll position restoration smoothly
        if (currentPageNum > 1) {
            const savedEl = document.getElementById(`scroll-page-wrapper-${currentPageNum}`);
            if (savedEl) {
                // Request animation frame gives the browser a breathing microsecond to map canvas bounds
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        savedEl.scrollIntoView({ block: 'start', behavior: 'auto' });
                    }, 50);
                });
            }
        } else {
            if (pageIndicatorNum) pageIndicatorNum.textContent = "1";
        }

        // Render remaining canvas rows incrementally down the background track
        renderRemainingPagesSequentially(2);
    });

    function renderSinglePage(pageNum) {
        const wrapper = document.getElementById(`scroll-page-wrapper-${pageNum}`);
        if (!wrapper) return Promise.resolve();
        
        const canvas = wrapper.querySelector('canvas');

        return pdfDoc.getPage(pageNum).then(page => {
            const viewport = page.getViewport({ scale: 2.0 });
            const context = canvas.getContext('2d');
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            return page.render({ canvasContext: context, viewport: viewport }).promise;
        }).catch(err => console.error(err));
    }

    function renderRemainingPagesSequentially(nextPage) {
        if (nextPage > totalPageCount) return;
        renderSinglePage(nextPage).then(() => {
            renderRemainingPagesSequentially(nextPage + 1);
        });
    }

    // Monitor position tracking matrices on view track transition updates
    scrollContainer.addEventListener('scroll', () => {
        const navHeight = 55; // Offset logic matches global header navigation bounds
        
        for (let pageNum = 1; pageNum <= totalPageCount; pageNum++) {
            const pageEl = document.getElementById(`scroll-page-wrapper-${pageNum}`);
            if (pageEl) {
                const rect = pageEl.getBoundingClientRect();
                let isCurrent = false;

                if (isMobile) {
                    const midPoint = window.innerWidth / 2;
                    isCurrent = (rect.left <= midPoint && rect.right >= midPoint);
                } else {
                    // Optimized positioning metrics utilizing top nav offset calculations
                    isCurrent = (rect.top <= navHeight + 150 && rect.bottom >= navHeight + 150);
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
}