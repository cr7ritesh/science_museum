let searchTimeout = null;
let stopSearch = false;
let lastValid = null;
let searchStartTime = null;
let timerInterval = null;

function startSearch() {
    stopSearch = false;
    lastValid = null;
    searchStartTime = new Date().getTime();
    
    // Update UI
    const searchBtn = document.getElementById('searchBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const content = document.getElementById('content');
    
    searchBtn.disabled = true;
    loadingSpinner.style.display = 'block';
    content.innerHTML = '';
    
    // Start countdown timer
    startCountdown();
    
    // Start search with timeout
    searchForPhotograph();
    
    // Set timeout for 10 seconds
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() {
        stopSearch = true;
        handleSearchTimeout();
    }, 10000);
}

function startCountdown() {
    const timeoutCounter = document.getElementById('timeoutCounter');
    let remainingTime = 10;
    
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(function() {
        remainingTime--;
        timeoutCounter.innerHTML = `<small class="timeout-warning">Timeout in ${remainingTime} seconds...</small>`;
        
        if (remainingTime <= 0) {
            clearInterval(timerInterval);
            timeoutCounter.innerHTML = '';
        }
    }, 1000);
}

function searchForPhotograph() {
    if (stopSearch) return;
    
    fetch('https://collection.sciencemuseumgroup.org.uk/search/images/categories/photographs?random=1', {
        headers: {
            'accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (stopSearch) return;
        
        let found = false;
        
        if (data.data && Array.isArray(data.data)) {
            for (let item of data.data) {
                // Get title
                let title = '';
                if (item.attributes && item.attributes.summary && item.attributes.summary.title) {
                    title = item.attributes.summary.title;
                }
                
                // Get image URL from multimedia
                let imageUrl = null;
                if (item.attributes && item.attributes.multimedia && Array.isArray(item.attributes.multimedia)) {
                    for (let media of item.attributes.multimedia) {
                        if (media['@processed'] && media['@processed'].large_thumbnail && media['@processed'].large_thumbnail.location) {
                            imageUrl = media['@processed'].large_thumbnail.location;
                            // Prepend base URL if needed
                            if (!imageUrl.startsWith('http')) {
                                imageUrl = 'https://coimages.sciencemuseumgroup.org.uk/' + imageUrl;
                            }
                            break;
                        }
                    }
                }
                
                // Get description
                let description = '';
                if (item.attributes && item.attributes.description && Array.isArray(item.attributes.description) && 
                    item.attributes.description.length > 0 && item.attributes.description[0].value) {
                    description = item.attributes.description[0].value;
                }
                
                // Check if description is at least 30 words
                const wordCount = description.trim().split(/\s+/).length;
                if (title && imageUrl && description && wordCount >= 30) {
                    found = true;
                    const processedItem = {
                        title: title,
                        image_url: imageUrl,
                        description: description,
                        word_count: wordCount,
                        meets_criteria: true
                    };
                    lastValid = processedItem;
                    displayPhotograph(processedItem);
                    finishSearch();
                    return;
                } else if (title && imageUrl && description) {
                    // Save as last valid (even if word count < 30)
                    lastValid = {
                        title: title,
                        image_url: imageUrl,
                        description: description,
                        word_count: wordCount,
                        meets_criteria: false
                    };
                }
            }
        }
        
        // If not found, try again
        if (!found && !stopSearch) {
            setTimeout(searchForPhotograph, 500);
        }
    })
    .catch(error => {
        console.error('Search error:', error);
        if (!stopSearch) {
            setTimeout(searchForPhotograph, 1000);
        }
    });
}

function handleSearchTimeout() {
    if (timerInterval) clearInterval(timerInterval);
    
    const content = document.getElementById('content');
    
    if (lastValid) {
        displayPhotograph(lastValid, true);
    } else {
        content.innerHTML = `
            <div class="alert alert-warning text-center">
                <i class="fas fa-exclamation-triangle me-2"></i>
                No suitable photograph found within 10 seconds. Please try again.
            </div>
        `;
    }
    
    finishSearch();
}

function displayPhotograph(item, isTimeout = false) {
    const content = document.getElementById('content');
    
    const timeoutBadge = isTimeout ? `
        <div class="alert alert-warning mb-3">
            <i class="fas fa-clock me-2"></i>
            Search timed out. Showing best available result.
        </div>
    ` : '';
    
    const wordCountBadge = item.word_count >= 30 ? 
        `<span class="badge bg-success">✓ ${item.word_count} words</span>` : 
        `<span class="badge bg-warning">${item.word_count} words (less than 30)</span>`;
    
    content.innerHTML = `
        ${timeoutBadge}
        <div class="text-center">
            <h2 class="mb-3">${escapeHtml(item.title)}</h2>
            <div class="mb-3">${wordCountBadge}</div>
            <img src="${escapeHtml(item.image_url)}" 
                 alt="${escapeHtml(item.title)}" 
                 class="museum-image mb-4">
            <p class="text-start">${escapeHtml(item.description)}</p>
        </div>
    `;
}

function showError(message) {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="alert alert-danger text-center">
            <i class="fas fa-exclamation-circle me-2"></i>
            <strong>Error:</strong> ${escapeHtml(message)}
        </div>
    `;
    finishSearch();
}

function finishSearch() {
    if (searchTimeout) clearTimeout(searchTimeout);
    if (timerInterval) clearInterval(timerInterval);
    
    const searchBtn = document.getElementById('searchBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const timeoutCounter = document.getElementById('timeoutCounter');
    
    searchBtn.disabled = false;
    loadingSpinner.style.display = 'none';
    timeoutCounter.innerHTML = '';
    stopSearch = true;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Auto-start search on page load
    startSearch();
});
