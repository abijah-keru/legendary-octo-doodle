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
    const isMobile = window.innerWidth < 768;
    
    // 1. Build structural tracking containers
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

    // 2. Load Page 1 instantly
    renderSinglePage(1).then(() => {
        const loadingScreen = document.getElementById('reader-loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.remove(), 400);
        }
        
        setTimeout(() => {
            const savedEl = document.getElementById(`scroll-page-wrapper-${currentPageNum}`);
            if (savedEl) {
                if (isMobile) {
                    scrollContainer.scrollLeft = savedEl.offsetLeft;
                } else {
                    savedEl.scrollIntoView({ block: 'start' });
                }
            }
        }, 150);

        renderRemainingPagesSequentially(2);
    });

    function renderSinglePage(pageNum) {
        const wrapper = document.getElementById(`scroll-page-wrapper-${pageNum}`);
        if (!wrapper) return Promise.resolve();
        
        const canvas = wrapper.querySelector('canvas');
        const textLayerDiv = wrapper.querySelector('.textLayer');

        return pdfDoc.getPage(pageNum).then(page => {
            // Standard crisp baseline 2.0 scale for everything—no layout shifting math
            const viewport = page.getViewport({ scale: 2.0 });
            const context = canvas.getContext('2d');
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            return page.render({ canvasContext: context, viewport: viewport }).promise.then(() => {
                if (pageNum > 1 && textLayerDiv) {
                    textLayerDiv.style.width = `${viewport.width}px`;
                    textLayerDiv.style.height = `${viewport.height}px`;
                    
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
        }).catch(err => console.error(err));
    }

    function renderRemainingPagesSequentially(nextPage) {
        if (nextPage > totalPageCount) return;
        renderSinglePage(nextPage).then(() => {
            renderRemainingPagesSequentially(nextPage + 1);
        });
    }

    // Monitor position tracking metrics on scroll
    scrollContainer.addEventListener('scroll', () => {
        for (let pageNum = 1; pageNum <= totalPageCount; pageNum++) {
            const pageEl = document.getElementById(`scroll-page-wrapper-${pageNum}`);
            if (pageEl) {
                const rect = pageEl.getBoundingClientRect();
                let isCurrent = false;

                if (isMobile) {
                    const midPoint = window.innerWidth / 2;
                    isCurrent = (rect.left <= midPoint && rect.right >= midPoint);
                } else {
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
}