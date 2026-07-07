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
            if (bookshelf) {
                bookshelf.innerHTML = `<p style="text-align: center; font-family: var(--font-serif); margin-top: 3rem;">Unable to load your collection.</p>`;
            }
        });
});

function renderEditorialShowcase(magazines) {
    const bookshelf = document.getElementById('bookshelf');
    if (!bookshelf) return;
    
    bookshelf.innerHTML = ''; 

    magazines.forEach(mag => {
        bookshelf.innerHTML += `
            <a href="reader.html?id=${mag.id}" class="premium-editorial-card">
                <div class="showcase-cover-frame">
                    <img src="${mag.coverImage}" alt="Issue ${mag.number} Cover" class="showcase-img" loading="lazy">
                </div>
                
                <!-- FORCED VERTICAL STACK (Bypasses Browser Cache) -->
                <div style="margin-top: 1.25rem; display: block; width: 100%; text-align: left;">
                    
                    <div class="issue-tag" style="display: block; margin-bottom: 0.8rem;">
                        ISSUE NO. ${mag.number}
                    </div>
                    
                    <div class="editorial-read-btn">
                        <span class="btn-menu-lines">
                            <span></span>
                            <span></span>
                            <span></span>
                        </span>
                        READ
                    </div>
                    
                </div>
            </a>
        `;
    });
}