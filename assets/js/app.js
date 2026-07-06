
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Stuff PWA Service Worker active.'))
            .catch(err => console.error('PWA initialization halted:', err));
    });
}
document.addEventListener('DOMContentLoaded', () => {
    const bookshelf = document.getElementById('bookshelf');

    fetch('assets/data/magazines.json')
        .then(res => {
            if (!res.ok) throw new Error('Catalog asset track unreachable.');
            return res.json();
        })
        .then(data => {
            renderEditorialShowcase(data);
        })
        .catch(err => {
            console.error(err);
            bookshelf.innerHTML = `<p style="text-align: center; font-family: var(--font-serif); margin-top: 3rem;">Unable to load your collection.</p>`;
        });

    function renderEditorialShowcase(magazines) {
        bookshelf.innerHTML = ''; 

        const showcaseGrid = document.createElement('div');
        showcaseGrid.className = 'horizontal-showcase-row';

        magazines.forEach(mag => {
            showcaseGrid.innerHTML += `
                <a href="reader.html?id=${mag.id}" class="premium-editorial-card">
                    <div class="showcase-cover-frame">
                        <img src="${mag.coverImage}" alt="${mag.title} Cover" class="showcase-img" loading="lazy">
                    </div>
                    <div class="showcase-meta-block">
                        <span class="issue-tag">Issue No. ${mag.number}</span>
                        <h2 class="issue-title">${mag.title}</h2>
                        <p class="issue-date">${mag.date}</p>
                    </div>
                </a>
            `;
        });

        bookshelf.appendChild(showcaseGrid);
    }
});