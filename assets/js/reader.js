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
        totalPageSpan.textContent = totalPageCount;
        renderHighResReadingView();
    });
}

function renderHighResReadingView() {
    scrollContainer.innerHTML = '';
    let coverRendered = false;

    for (let pageNum = 1; pageNum <= totalPageCount; pageNum++) {
        const pageContainer = document.createElement('div');
        pageContainer.id = `scroll-page-wrapper-${pageNum}`;
        pageContainer.className = 'page-container';

        const canvas = document.createElement('canvas');
        pageContainer.appendChild(canvas);
        
        let textLayerDiv = null;
        if (pageNum > 1) {
            textLayerDiv = document.createElement('div');
            textLayerDiv.className = 'textLayer';
            pageContainer.appendChild(textLayerDiv);
        }

        scrollContainer.appendChild(pageContainer);

        pdfDoc.getPage(pageNum).then(page => {
            const viewport = page.getViewport({ scale: 2.0 });
            const context = canvas.getContext('2d');
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            return page.render({ canvasContext: context, viewport: viewport }).promise.then(() => {
                if (pageNum === 1 && !coverRendered) {
                    coverRendered = true;
                    const loadingScreen = document.getElementById('reader-loading-screen');
                    if (loadingScreen) {
                        loadingScreen.style.opacity = '0';
                        setTimeout(() => loadingScreen.remove(), 400);
                    }
                    setTimeout(() => {
                        const savedEl = document.getElementById(`scroll-page-wrapper-${currentPageNum}`);
                        if (savedEl && currentPageNum > 1) savedEl.scrollIntoView({ block: 'start' });
                    }, 50);
                }

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
        }).catch(err => console.error(err));
    }

    scrollContainer.addEventListener('scroll', () => {
        const containerTop = scrollContainer.getBoundingClientRect().top;
        for (let pageNum = 1; pageNum <= totalPageCount; pageNum++) {
            const pageEl = document.getElementById(`scroll-page-wrapper-${pageNum}`);
            if (pageEl) {
                const rect = pageEl.getBoundingClientRect();
                if (rect.top <= containerTop + 200 && rect.bottom >= containerTop + 200) {
                    currentPageNum = pageNum;
                    pageIndicatorNum.textContent = currentPageNum;
                    localStorage.setItem(`read_progress_${currentId}`, currentPageNum);
                    break;
                }
            }
        }
    });
}