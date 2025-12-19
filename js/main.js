// Main JavaScript for Duangjai Studio

// ==================== Utility Functions ====================

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} text - The text to escape
 * @returns {string} - The escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== Global State ====================

let allPosts = [];
let allActivities = [];
let allStudents = [];
let sliderInterval = null;
let currentSlide = 0;
let totalSlides = 1;
let currentCategoryFilter = null;

function getCategoryColorClass(category) {
    // Map categories to color classes based on reference (Purple, Blue, Green, etc.)
    const map = {
        'Video': 'badge-purple',
        'Cooking': 'badge-blue',
        'Food Story': 'badge-green',
        'Knowledge': 'badge-orange',
        // Fallback or map specific Duangjai categories
        'นักเรียนของเรา': 'badge-purple',
        'ความรู้ของเรา': 'badge-blue',
        'กิจกรรมของเรา': 'badge-green'
    };
    return map[category] || 'badge-default';
}

document.addEventListener('DOMContentLoaded', () => {
    // Initial Load
    initApp();

    // Initialize Cookie Banner
    initCookieBanner();

    // Initialize Student Gallery
    initStudentGallery();

    // Initialize Activities
    initActivities();

    // Mobile Menu Toggle logic
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('active');
        });
    }

    // Back Button Logic
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            exitPostDetail();
        });
    }

    // Initialize Hero Slider
    initHeroSlider();

    // Handle Browser Back Button
    window.addEventListener('popstate', (event) => {
        handleRouting();
    });
});

async function initApp() {
    // Only run if we are on a page with the blog grid
    const gridContainer = document.getElementById('blog-grid');
    if (!gridContainer) return;

    // Show Skeleton Loading
    renderSkeleton(gridContainer, 6);

    try {
        // Load posts
        const response = await fetch('content/posts.json');
        if (!response.ok) throw new Error('Failed to load posts');
        allPosts = await response.json();

        // Load students data (needed for student profile cards in articles)
        try {
            const studentsRes = await fetch('content/students.json');
            if (studentsRes.ok) {
                allStudents = await studentsRes.json();
            }
        } catch (e) {
            console.warn('Could not load students data:', e);
        }

        // Render category tabs
        renderCategoryTabs();

        // Check URL for specific post
        handleRouting();

    } catch (error) {
        console.error('Error initializing app:', error);
        gridContainer.innerHTML = `<p style="text-align:center; grid-column:1/-1;">ไม่สามารถโหลดข้อมูลได้: ${error.message}</p>`;
    }
}

function renderSkeleton(container, count) {
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        container.innerHTML += `
            <div class="grid-item skeleton-card">
                <div class="skeleton skeleton-img"></div>
                <div class="skeleton-content">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text-short"></div>
                </div>
            </div>
        `;
    }
}

function handleRouting() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('post');
    const category = urlParams.get('category');

    if (postId) {
        renderPostDetail(postId);
    } else {
        currentCategoryFilter = category;
        updateCategoryTabsActive();
        renderGrid();
    }
}


function renderCategoryTabs() {
    const tabsContainer = document.getElementById('category-tabs');
    if (!tabsContainer) return;

    // Get unique categories from posts
    const categories = [...new Set(allPosts.map(post => post.category))];

    // Clear and render tabs
    tabsContainer.innerHTML = '';

    // Add "All" button first
    const allBtn = document.createElement('button');
    allBtn.className = 'category-tab-btn' + (!currentCategoryFilter ? ' active' : '');
    allBtn.textContent = 'All';
    allBtn.onclick = () => clearCategoryFilter();
    tabsContainer.appendChild(allBtn);

    // Add category buttons
    categories.forEach(category => {
        const btn = document.createElement('button');
        btn.className = 'category-tab-btn' + (currentCategoryFilter === category ? ' active' : '');
        btn.textContent = category;
        btn.onclick = () => filterByCategory(category);
        tabsContainer.appendChild(btn);
    });
}

function updateCategoryTabsActive() {
    const tabs = document.querySelectorAll('.category-tab-btn');
    tabs.forEach(tab => {
        const isAll = tab.textContent === 'All';
        const isActive = isAll ? !currentCategoryFilter : tab.textContent === currentCategoryFilter;
        tab.classList.toggle('active', isActive);
    });
}

function renderGrid() {
    const gridContainer = document.getElementById('blog-grid');
    const detailContainer = document.getElementById('post-detail-view');

    if (!gridContainer || !detailContainer) return;

    // Show Grid, Hide Detail
    gridContainer.style.display = 'grid';
    detailContainer.style.display = 'none';

    // Clear and Render Grid Items
    gridContainer.innerHTML = '';

    // Filter by category if set
    let postsToShow = [...allPosts];

    if (currentCategoryFilter) {
        postsToShow = postsToShow.filter(post => post.category === currentCategoryFilter);
    }

    // Sort by date descending (Newest first) - applies to all categories
    postsToShow.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Check if we are on homepage (indicated by existence of #stories-view-more)
    const viewMoreBtn = document.getElementById('stories-view-more');
    if (viewMoreBtn) {
        // We are on homepage, limit to 6
        if (postsToShow.length > 6) {
            postsToShow = postsToShow.slice(0, 6);
            viewMoreBtn.style.display = 'block';
        } else {
            viewMoreBtn.style.display = 'none';
        }
    }

    postsToShow.forEach((post, index) => {
        const article = createPostElement(post, index);
        gridContainer.appendChild(article);
    });
}

function createPostElement(post, index) {
    const article = document.createElement('article');

    // Simple Grid Layout - All cards equal size
    article.className = 'grid-item';
    article.onclick = () => navigateToPost(post.id);

    const title = escapeHtml(post.title);
    const excerpt = escapeHtml(post.excerpt);
    const category = escapeHtml(post.category);

    // Standard Card Structure
    article.innerHTML = `
        <div class="card-image">
            <img src="${escapeHtml(post.image)}" alt="${title}" loading="lazy">
            <span class="category-tag">${category}</span>
        </div>
        <div class="card-content">
            <h3>${title}</h3>
            <p>${excerpt}</p>
            <span class="read-more">อ่านต่อ <i class="fas fa-arrow-right"></i></span>
        </div>
    `;
    return article;
}

function filterByCategory(category) {
    currentCategoryFilter = category;
    const newUrl = window.location.pathname + '?category=' + encodeURIComponent(category);
    window.history.pushState({ category: category }, '', newUrl);
    updateCategoryTabsActive();
    renderGrid();
    // Scroll to blog section
    document.getElementById('duangjai-space').scrollIntoView({ behavior: 'smooth' });
}

function clearCategoryFilter() {
    currentCategoryFilter = null;
    const newUrl = window.location.pathname;
    window.history.pushState({}, '', newUrl);
    updateCategoryTabsActive();
    renderGrid();
}

function navigateToPost(id) {
    // Check if we are on the homepage (index.html or root)
    const path = window.location.pathname;
    const isHomepage = path.endsWith('index.html') || path === '/' || path.endsWith('/');

    if (isHomepage) {
        // Redirect to stories.html with post ID
        window.location.href = 'stories.html?post=' + id;
        return;
    }

    // Push new state
    const newUrl = window.location.pathname + '?post=' + id;
    window.history.pushState({ postId: id }, '', newUrl);
    renderPostDetail(id);
}

function exitPostDetail() {
    // Push state back to root of this page (remove query param)
    // We assume index.html is the root or current path without query
    const newUrl = window.location.pathname;
    window.history.pushState({}, '', newUrl);
    // Restore Grid

    renderGrid();

    // Restore Layout styles
    const parentSection = document.getElementById('duangjai-space');
    const detailContainer = document.getElementById('post-detail-view');
    const sectionHeader = document.querySelector('.section-header');
    const categoryTabs = document.getElementById('category-tabs');

    if (sectionHeader) sectionHeader.style.display = 'block'; // OR 'flex' depending on original, usually block
    if (categoryTabs) categoryTabs.style.display = 'flex'; // Tabs usually flex

    if (parentSection) {
        // Reset to original styles from CSS/HTML
        parentSection.style.paddingTop = '150px';
        parentSection.style.marginTop = '';
        parentSection.style.paddingLeft = '';
        parentSection.style.paddingRight = '';
        parentSection.style.width = '';
        // Note: .container logic is handled by CSS, we just remove inline overrides
    }

    if (detailContainer) {
        detailContainer.style.background = '#fff';
        detailContainer.style.padding = '30px';
        detailContainer.style.boxShadow = '0 5px 15px rgba(0,0,0,0.05)';
        detailContainer.style.marginTop = '';
    }

    // Scroll back to top of blog section
    document.getElementById('duangjai-space').scrollIntoView({ behavior: 'smooth' });
}

async function renderPostDetail(id) {
    const gridContainer = document.getElementById('blog-grid');
    const detailContainer = document.getElementById('post-detail-view');
    const contentContainer = document.getElementById('post-content-container');

    if (!gridContainer || !detailContainer) return;

    const post = allPosts.find(p => p.id === id);
    if (!post) {
        // Post not found
        renderGrid();
        return;
    }

    // Hide Grid, Show Detail
    gridContainer.style.display = 'none';
    detailContainer.style.display = 'block';

    // Immersive Mode Fixes: Hide Section Header and Tabs
    const sectionHeader = document.querySelector('.section-header');
    const categoryTabs = document.getElementById('category-tabs');
    if (sectionHeader) sectionHeader.style.display = 'none';
    if (categoryTabs) categoryTabs.style.display = 'none';

    // Immersive Mode Fixes: Remove padding/constraints from parent containers
    const parentSection = document.getElementById('duangjai-space');
    if (parentSection) {
        parentSection.style.paddingTop = '0'; // Remove top padding completely
        parentSection.style.marginTop = '0'; // Ensure no margin
        parentSection.style.maxWidth = '100%';
        parentSection.style.paddingLeft = '0';
        parentSection.style.paddingRight = '0';
        // Force width 100% to fill screen
        parentSection.style.width = '100%';
    }

    // Reset detail container info to allow full width hero
    detailContainer.style.background = 'transparent';
    detailContainer.style.padding = '0';
    detailContainer.style.boxShadow = 'none';
    detailContainer.style.maxWidth = '100%';
    detailContainer.style.marginTop = '0'; // Sit flush


    // Render Basic Info immediately
    // Generate Tags HTML
    const tagsHtml = post.tags ? post.tags.map(tag => `<span class="tag-badge" style="background:${getComputedStyle(document.documentElement).getPropertyValue('--bg-color')}; padding:5px 10px; border-radius:15px; font-size:0.8rem; margin-right:5px; color:#555;">#${tag}</span>`).join('') : '';

    // Get unique categories for sidebar
    const categories = [...new Set(allPosts.map(p => p.category))];
    const categoriesHtml = categories.map(cat => `<a href="stories.html?category=${encodeURIComponent(cat)}" class="sidebar-category-link">${cat}</a>`).join('');

    // Get popular articles (latest 4, excluding current)
    const popularPosts = allPosts.filter(p => p.id !== id).slice(0, 4);
    const popularHtml = popularPosts.map(p => `
        <a href="stories.html?post=${p.id}" class="sidebar-article-item">
            <img src="${p.image}" alt="${p.title}">
            <div class="sidebar-article-info">
                <h4>${p.title}</h4>
                <span class="sidebar-article-date">${formatDate(p.date)}</span>
            </div>
        </a>
    `).join('');

    // Find student linked to this article
    const linkedStudent = allStudents.find(s => s.articleId === id);
    let studentProfileHtml = '';

    if (linkedStudent) {
        studentProfileHtml = `
            <div class="sidebar-section student-profile-card">
                <div class="student-profile-header">
                    <img src="${linkedStudent.profileImage}" alt="${linkedStudent.nickname}" class="student-profile-image">
                    <div class="student-profile-name">
                        <h3>${linkedStudent.nickname} - ${linkedStudent.name}</h3>
                    </div>
                </div>
                <div class="student-profile-details">
                    <div class="student-detail-item">
                        <i class="fas fa-graduation-cap"></i>
                        <div>
                            <span class="detail-label">โรงเรียน</span>
                            <span class="detail-value">${linkedStudent.school}</span>
                        </div>
                    </div>
                    <div class="student-detail-item">
                        <i class="fas fa-university"></i>
                        <div>
                            <span class="detail-label">มหาวิทยาลัย</span>
                            <span class="detail-value">${linkedStudent.universityName}</span>
                        </div>
                    </div>
                    <div class="student-detail-item">
                        <i class="fas fa-building"></i>
                        <div>
                            <span class="detail-label">คณะ</span>
                            <span class="detail-value">${linkedStudent.faculty}</span>
                        </div>
                    </div>
                    <div class="student-detail-item">
                        <i class="fas fa-palette"></i>
                        <div>
                            <span class="detail-label">สาขา</span>
                            <span class="detail-value">${linkedStudent.major}</span>
                        </div>
                    </div>
                </div>
                <a href="portfolio.html" class="student-badge">
                    <i class="fas fa-heart"></i> 
                    <span>นักเรียนในดวงใจ</span>
                </a>
            </div>
        `;
    }

    // Immersive Hero Design with Two-Column Layout
    contentContainer.innerHTML = `
        <div class="immersive-post-hero" style="background-image: url('${post.image}');">
            <div class="immersive-hero-overlay"></div>
            <div class="container hero-content-centered">
                <span class="category-badge-immersive">${allPosts.find(p => p.id === id).category}</span>
                <h1 class="en-font immersive-title">${post.title}</h1>
                <div class="post-meta-immersive">
                    <span><i class="far fa-calendar"></i> ${formatDate(post.date)}</span>
                    <span class="separator">•</span>
                    <span><i class="far fa-user"></i> ${post.author || 'Admin'}</span>
                    <span class="separator">•</span>
                    <span><i class="far fa-clock"></i> 5 MIN READ</span>
                </div>
            </div>
        </div>
        
        <div class="container post-layout-container">
            <!-- Main Content Column -->
            <div class="post-main-content">
                <div class="post-body">
                    <p style="text-align:center; color:#888;">กำลังโหลดเนื้อหา...</p>
                </div>
                <!-- Tags moved to bottom -->
                <div class="post-tags-bottom">
                    ${tagsHtml}
                </div>
            </div>
            
            <!-- Sidebar Column -->
            <aside class="post-sidebar">
                
                <!-- Student Profile (if linked) -->
                ${studentProfileHtml}
                
                <!-- Popular Articles -->
                <div class="sidebar-section">
                    <h3 class="sidebar-title">บทความยอดนิยม</h3>
                    <div class="sidebar-articles">
                        ${popularHtml}
                    </div>
                </div>
                
                <!-- Categories -->
                <div class="sidebar-section">
                    <h3 class="sidebar-title">หมวดหมู่</h3>
                    <div class="sidebar-categories">
                        ${categoriesHtml}
                    </div>
                </div>
            </aside>
        </div>
    `;

    // Fetch actual content from contentFile
    try {
        const contentRes = await fetch(post.contentFile);
        if (contentRes.ok) {
            const actualContent = await contentRes.text();
            contentContainer.querySelector('.post-body').innerHTML = actualContent;
        } else {
            contentContainer.querySelector('.post-body').innerHTML = '<p>ไม่สามารถโหลดเนื้อหาได้</p>';
        }
    } catch (error) {
        console.error('Error loading post content:', error);
        contentContainer.querySelector('.post-body').innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดเนื้อหา</p>';
    }

    // Scroll to detail view
    detailContainer.scrollIntoView({ behavior: 'smooth' });
}



function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ==================== Hero Slider Functions ====================

async function initHeroSlider() {
    const sliderWrapper = document.querySelector('.slider-wrapper');
    const sliderDotsContainer = document.querySelector('.slider-dots');
    const prevBtn = document.querySelector('.slider-prev');
    const nextBtn = document.querySelector('.slider-next');
    const heroSlider = document.querySelector('.hero-slider');

    if (!sliderWrapper || !sliderDotsContainer) return;

    try {
        // Fetch posts for slider
        const response = await fetch('content/posts.json');
        if (!response.ok) throw new Error('Failed to load posts for slider');
        const posts = await response.json();

        // Sort by date (newest first) and pick 5 latest posts
        // Removing shuffle logic
        const sortedPosts = posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        const selectedPosts = sortedPosts.slice(0, 5);

        // Create slides for each selected post
        selectedPosts.forEach((post, index) => {
            const slideIndex = index + 1; // 0 is main hero
            const slideElement = createBlogSlide(post, slideIndex);
            sliderWrapper.appendChild(slideElement);

            // Add corresponding dot
            const dot = document.createElement('span');
            dot.className = 'slider-dot';
            dot.setAttribute('data-slide', slideIndex);
            dot.addEventListener('click', () => goToSlide(slideIndex));
            sliderDotsContainer.appendChild(dot);
        });

        totalSlides = 1 + selectedPosts.length; // Main hero + blog slides

        // Add click listeners to existing dot
        const firstDot = sliderDotsContainer.querySelector('.slider-dot[data-slide="0"]');
        if (firstDot) {
            firstDot.addEventListener('click', () => goToSlide(0));
        }

        // Navigation buttons
        if (prevBtn) prevBtn.addEventListener('click', prevSlide);
        if (nextBtn) nextBtn.addEventListener('click', nextSlide);

        // Pause on hover
        if (heroSlider) {
            heroSlider.addEventListener('mouseenter', stopAutoSlide);
            heroSlider.addEventListener('mouseleave', startAutoSlide);
        }

        // Start auto sliding
        startAutoSlide();

    } catch (error) {
        console.error('Error initializing hero slider:', error);
    }
}

function createBlogSlide(post, slideIndex) {
    const slide = document.createElement('div');
    slide.className = 'hero-slide';
    slide.setAttribute('data-slide', slideIndex);

    slide.innerHTML = `
        <div class="hero-bg">
            <img src="${post.image}" alt="${post.title}" loading="lazy">
        </div>
        <div class="hero-overlay">
            <div class="container hero-content">
                <span class="hero-category" style="display: inline-block; background: var(--primary-color); color: white; padding: 8px 20px; border-radius: 20px; font-size: 0.9rem; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px;">${post.category}</span>
                <h1 style="font-size: 2.8rem; line-height: 1.3; margin-bottom: 15px; font-weight: 500;">${post.title}</h1>
                <p style="font-size: 1.1rem; margin-bottom: 30px; max-width: 600px;">${post.excerpt}</p>
                <div class="hero-actions">
                    <a href="stories.html?post=${post.id}" class="btn btn-primary">อ่านต่อ</a>
                    <a href="stories.html" class="btn btn-outline">ดูทั้งหมด</a>
                </div>
            </div>
        </div>
    `;

    return slide;
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.slider-dot');

    if (index < 0 || index >= slides.length) return;

    // Remove active from all
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

    // Add active to current
    slides[index].classList.add('active');
    dots[index].classList.add('active');

    currentSlide = index;
}

function nextSlide() {
    const nextIndex = (currentSlide + 1) % totalSlides;
    goToSlide(nextIndex);
}

function prevSlide() {
    const prevIndex = (currentSlide - 1 + totalSlides) % totalSlides;
    goToSlide(prevIndex);
}

function startAutoSlide() {
    if (sliderInterval) clearInterval(sliderInterval);
    sliderInterval = setInterval(nextSlide, 6000); // 6 seconds
}

function stopAutoSlide() {
    if (sliderInterval) {
        clearInterval(sliderInterval);
        sliderInterval = null;
    }
}



// ==================== Student Gallery Functions ====================

async function initStudentGallery() {
    const homeGrid = document.getElementById('student-grid-home');
    const allGrid = document.getElementById('student-grid-all');

    try {
        // Always load student data (needed for article pages too)
        let jsonPath = 'content/students.json';

        const response = await fetch(jsonPath);
        if (!response.ok) throw new Error('Failed to load students');
        allStudents = await response.json();

        // Render for home page (12 students, 2 rows of 6)
        if (homeGrid) {
            renderStudentGrid(homeGrid, 12);
        }

        // Render for portfolio page (all students)
        if (allGrid) {
            renderStudentGrid(allGrid, allStudents.length);
        }

    } catch (error) {
        console.error('Error loading students:', error);
        if (homeGrid) homeGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: #888;">ไม่สามารถโหลดข้อมูลได้</p>';
        if (allGrid) allGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: #888;">ไม่สามารถโหลดข้อมูลได้</p>';
    }
}

function renderStudentGrid(container, limit) {
    container.innerHTML = '';

    const studentsToShow = allStudents.slice(0, limit);

    studentsToShow.forEach(student => {
        const card = createStudentCard(student);
        container.appendChild(card);
    });
}

function createStudentCard(student) {
    const card = document.createElement('div');
    card.className = 'student-card';

    // Only make card clickable if student has an articleId
    if (student.articleId) {
        card.onclick = () => {
            window.location.href = `stories.html?post=${student.articleId}`;
        };
        card.style.cursor = 'pointer';
    } else {
        // Non-clickable: add disabled style
        card.classList.add('student-card-disabled');
        card.style.cursor = 'default';
    }

    // Format name as: ชื่อเล่น - ชื่อจริง นามสกุล
    const displayName = `${student.nickname} - ${student.name} `;

    // Format university for profile card: แสดงเฉพาะชื่อมหาลัย
    let universityDisplay = student.universityName || student.university;

    card.innerHTML = `
        <img src="${student.profileImage}" alt="${student.name}" loading="lazy">
            <div class="student-overlay">
                <h3>${displayName}</h3>
                <p class="student-school">${student.school}</p>
                <p class="student-university">${universityDisplay}</p>
            </div>
    `;

    return card;
}

function openStudentModal(student) {
    const modal = document.getElementById('student-modal');
    const nameEl = document.getElementById('modal-student-name');
    const schoolEl = document.getElementById('modal-student-school');
    const universityEl = document.getElementById('modal-student-university');
    const portfolioGrid = document.getElementById('modal-portfolio-grid');

    if (!modal) return;

    // Format name as: ชื่อเล่น - ชื่อจริง นามสกุล
    const displayName = `${student.nickname} - ${student.name} `;
    nameEl.textContent = displayName;
    schoolEl.textContent = student.school;

    // Format university for modal: สาขา คณะ มหาลัย (แสดงคณะเฉพาะในหน้าผลงาน)
    let universityDisplay = '';
    if (student.major) {
        universityDisplay = `${student.major} ${student.faculty} ${student.universityName} `;
    } else {
        universityDisplay = student.university;
    }
    universityEl.textContent = universityDisplay;

    // Render portfolio images
    portfolioGrid.innerHTML = '';
    student.portfolioImages.forEach(imageUrl => {
        const item = document.createElement('div');
        item.className = 'modal-portfolio-item';
        item.innerHTML = `<img src="${imageUrl}" alt="ผลงาน ${student.name}" loading="lazy">`;
        portfolioGrid.appendChild(item);
    });

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeStudentModal() {
    const modal = document.getElementById('student-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('student-modal');
    if (modal && e.target === modal) {
        closeStudentModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeStudentModal();
    }
});

// ==================== Activity System ====================

async function initActivities() {
    // Check if we have activity containers
    const homeGrid = document.getElementById('activity-grid-home');
    const allGrid = document.getElementById('all-activities-grid');
    const detailView = document.getElementById('activity-detail-view');

    // Show Skeletons
    if (homeGrid) renderSkeleton(homeGrid, 2);
    if (allGrid) renderSkeleton(allGrid, 6);

    // Always fetch valid data first
    try {
        const response = await fetch('content/activities.json');
        if (!response.ok) throw new Error('Failed to load activities');
        allActivities = await response.json();

        // Sort by date (Newest first)
        allActivities.sort((a, b) => {
            const dateA = parseThaiDate(a.date, a.month, a.year);
            const dateB = parseThaiDate(b.date, b.month, b.year);
            return dateB - dateA;
        });

        // If on activity list page, check URL for detail view
        const urlParams = new URLSearchParams(window.location.search);
        const activityId = urlParams.get('activity');

        if (activityId && detailView) {
            renderActivityDetail(activityId);
        } else {
            // Render grids
            if (homeGrid) renderActivityGrid(homeGrid, 2); // Show 2 on home
            if (allGrid) renderActivityGrid(allGrid, allActivities.length);
        }


    } catch (error) {
        console.error('Error loading activities:', error);
    }
}

function parseThaiDate(dateStr, monthStr, yearStr) {
    const months = {
        'ม.ค.': 0, 'ก.พ.': 1, 'มี.ค.': 2, 'เม.ย.': 3, 'พ.ค.': 4, 'มิ.ย.': 5,
        'ก.ค.': 6, 'ส.ค.': 7, 'ก.ย.': 8, 'ต.ค.': 9, 'พ.ย.': 10, 'ธ.ค.': 11
    };

    // Handle date ranges like "21-23" -> take "21"
    const day = parseInt(dateStr.split('-')[0], 10);
    const month = months[monthStr];
    const year = parseInt(yearStr, 10) - 543; // Convert BE to AD

    return new Date(year, month, day);
}

function renderActivityGrid(container, limit) {
    container.innerHTML = '';
    // Sorting happens in initActivities now, so data is already sorted
    const activitiesToShow = allActivities.slice(0, limit);

    activitiesToShow.forEach(activity => {

        const card = document.createElement('div');
        card.className = 'activity-card';
        card.onclick = () => window.location.href = `activities.html?activity=${activity.id}`;

        card.innerHTML = `
        <div class="activity-card-image" style="background-image: url('${activity.image}')"></div>
            <div class="activity-card-content">
                <div>
                    <div class="activity-card-meta">
                        <span class="activity-card-date"><i class="far fa-calendar"></i> ${activity.date} ${activity.month}</span>
                        <span class="activity-card-category">${activity.category}</span>
                    </div>
                    <h3>${activity.title}</h3>
                    <p class="activity-card-excerpt">${activity.excerpt}</p>
                    <div class="activity-card-location">
                        <i class="fas fa-map-marker-alt"></i> ${activity.location}
                    </div>
                </div>
                <div class="activity-card-cta">
                    ดูรายละเอียด <i class="fas fa-arrow-right"></i>
                </div>
            </div>
    `;

        container.appendChild(card);
    });
}

async function renderActivityDetail(id) {
    const detailView = document.getElementById('activity-detail-view');
    const gridView = document.getElementById('all-activities-grid');
    const sectionHeader = document.querySelector('.section-header');

    if (!detailView) return;

    const activity = allActivities.find(a => a.id === id);
    if (!activity) return;

    // Hide Grid
    if (gridView) gridView.style.display = 'none';
    if (sectionHeader) sectionHeader.style.display = 'none';

    // Remove section padding for immersive view
    const section = document.getElementById('activities-page-list');
    if (section) section.classList.add('activity-detail-active');

    // Show Detail
    detailView.style.display = 'block';

    // Fetch content HTML
    let contentHtml = '<p>กำลังโหลด...</p>';
    try {
        const res = await fetch(activity.contentFile);
        if (res.ok) contentHtml = await res.text();
        else contentHtml = '<p>เนื้อหาไม่พร้อมใช้งาน</p>';
    } catch (e) {
        contentHtml = '<p>เนื้อหาไม่พร้อมใช้งาน</p>';
    }

    // Get registration link (formLink takes priority over registerLink)
    const regLink = activity.meta.formLink || activity.meta.registerLink;

    detailView.innerHTML = `
        <div class="activity-detail-wrapper" style="background: #f8f5f2; padding-top: 0;">
            <!-- Immersive Hero Section -->
            <div class="activity-immersive-hero" style="background-image: url('${activity.image}');">
                <div class="activity-hero-overlay"></div>
                <div class="container activity-hero-content-centered">
                    <span class="activity-category-badge">${activity.category}</span>
                    <h1 class="activity-immersive-title">${activity.title}</h1>
                    <p class="activity-immersive-excerpt">${activity.excerpt}</p>
                    <div class="activity-quick-info-immersive">
                        <div class="activity-quick-item"><i class="far fa-calendar-alt"></i> ${activity.date} ${activity.month} ${activity.year}</div>
                        <div class="activity-quick-item"><i class="far fa-clock"></i> ${activity.meta.time}</div>
                        <div class="activity-quick-item"><i class="fas fa-map-marker-alt"></i> ${activity.location}</div>
                    </div>
                    <a href="${regLink}" target="_blank" class="activity-cta-button-hero">
                        <i class="fas fa-calendar-check"></i> สมัครเข้าร่วม
                    </a>
                </div>
            </div>
            
            <div class="activity-detail-body">
                <div class="container activity-detail-grid">
                    <div class="activity-content-card">
                        ${contentHtml}
                    </div>
                    
                    <div class="activity-sidebar-card">
                        <div class="sidebar-title">${activity.title}</div>
                        
                        <div class="sidebar-info-item">
                            <div class="sidebar-info-label">วันที่</div>
                            <div class="sidebar-info-value">${activity.date} ${activity.month} ${activity.year}</div>
                        </div>
                        
                        <div class="sidebar-info-item">
                            <div class="sidebar-info-label">เวลา</div>
                            <div class="sidebar-info-value">${activity.meta.time}</div>
                        </div>
                        
                        <div class="sidebar-info-item">
                            <div class="sidebar-info-label">สถานที่</div>
                            <div class="sidebar-info-value">${activity.location}</div>
                        </div>
                        
                        <div class="sidebar-info-item">
                            <div class="sidebar-info-label">จำนวนที่รับ</div>
                            <div class="sidebar-info-value">${activity.meta.participants}</div>
                        </div>
                        
                        <div class="sidebar-info-item">
                            <div class="sidebar-info-label">ค่าใช้จ่าย</div>
                            <div class="sidebar-info-value highlight">${activity.meta.cost}</div>
                        </div>
                        
                        <a href="${regLink}" target="_blank" class="activity-cta-button" style="width:100%; justify-content:center; margin-top:20px;">
                            สมัครเลย
                        </a>
                    </div>
                </div>
            </div>
        </div >
        `;


    // Scroll to top
    window.scrollTo(0, 0);
}


// ==================== Cookie Consent Banner ====================

function initCookieBanner() {
    // Check if consent is already given
    if (localStorage.getItem('cookieConsent') === 'true') {
        const banner = document.getElementById('cookie-consent');
        if (banner) banner.style.display = 'none';
        return;
    }

    // Use existing cookie consent from HTML
    const banner = document.getElementById('cookie-consent');
    if (!banner) return;

    // Show banner
    banner.style.display = 'flex';

    // Handle accept button click
    const acceptBtn = document.getElementById('accept-cookies');
    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
            localStorage.setItem('cookieConsent', 'true');
            banner.style.display = 'none';
        });
    }
}

// ==========================================
// COOKIE CONSENT
// ==========================================
function initCookieConsent() {
    const cookieConsent = document.getElementById('cookie-consent');
    const acceptBtn = document.getElementById('accept-cookies');

    if (!cookieConsent) return;

    // Check if user already accepted cookies
    const cookiesAccepted = localStorage.getItem('cookiesAccepted');

    if (!cookiesAccepted) {
        // Show cookie consent after a short delay
        setTimeout(() => {
            cookieConsent.classList.add('show');
        }, 1000);
    }

    // Handle accept button click
    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
            localStorage.setItem('cookiesAccepted', 'true');
            cookieConsent.classList.remove('show');
        });
    }
}

// Initialize cookie consent on page load
document.addEventListener('DOMContentLoaded', initCookieConsent);


// ==================== Atmosphere Gallery System ====================

let atmosphereImages = [];
let displayedImageIndices = [];
let lastChangedSlot = -1;
let atmosphereSlotCount = 12; // Default slot count

async function initAtmosphereGallery() {
    const grid = document.getElementById('atmosphere-grid');
    if (!grid) return;

    // Detect page: homepage shows 8 slots, courses page shows 12
    const isHomepage = window.location.pathname.endsWith('index.html') ||
        window.location.pathname === '/' ||
        window.location.pathname.endsWith('/');
    atmosphereSlotCount = isHomepage ? 8 : 12;

    try {
        // Load images from JSON
        const response = await fetch('data/atmosphere.json');
        if (!response.ok) throw new Error('Failed to load atmosphere images');
        const data = await response.json();
        atmosphereImages = data.images;

        // Initial display
        displayInitialImages(grid);

        // Start staggered rotation (every 6 seconds, change one random slot)
        startStaggeredRotation(grid);

    } catch (error) {
        console.error('Error loading atmosphere gallery:', error);
        grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: #888;">ไม่สามารถโหลดรูปภาพได้</p>';
    }
}

function displayInitialImages(grid) {
    grid.innerHTML = '';
    displayedImageIndices = [];

    // Shuffle and pick images based on slot count
    const shuffled = [...atmosphereImages].sort(() => Math.random() - 0.5);
    const initialImages = shuffled.slice(0, atmosphereSlotCount);

    initialImages.forEach((image, index) => {
        const originalIndex = atmosphereImages.findIndex(img => img.src === image.src);
        displayedImageIndices.push(originalIndex);

        const item = document.createElement('div');
        item.className = 'atmosphere-item';
        item.setAttribute('data-slot', index);
        item.innerHTML = `<img src="${image.src}" alt="${image.alt}" loading="lazy">`;
        grid.appendChild(item);
    });
}

function startStaggeredRotation(grid) {
    function scheduleNextRotation() {
        // Random interval between 3000ms (3s) and 6000ms (6s)
        const randomInterval = Math.floor(Math.random() * 3000) + 3000;
        setTimeout(() => {
            rotateRandomSlot(grid);
            scheduleNextRotation(); // Schedule next rotation
        }, randomInterval);
    }
    scheduleNextRotation();
}

function rotateRandomSlot(grid) {
    if (atmosphereImages.length <= atmosphereSlotCount) return; // Not enough images to rotate

    // Pick a random slot (avoid the last changed slot if possible)
    let slot;
    do {
        slot = Math.floor(Math.random() * atmosphereSlotCount);
    } while (slot === lastChangedSlot && atmosphereImages.length > atmosphereSlotCount);

    lastChangedSlot = slot;

    // Find a new image that's not currently displayed
    let newImageIndex;
    do {
        newImageIndex = Math.floor(Math.random() * atmosphereImages.length);
    } while (displayedImageIndices.includes(newImageIndex));

    // Get the slot element
    const slotElement = grid.querySelector(`[data-slot="${slot}"]`);
    if (!slotElement) return;

    const img = slotElement.querySelector('img');
    if (!img) return;

    // Fade out
    img.classList.add('fading');

    // After fade out, change image and fade in
    setTimeout(() => {
        const newImage = atmosphereImages[newImageIndex];
        img.src = newImage.src;
        img.alt = newImage.alt;

        // Update tracking
        displayedImageIndices[slot] = newImageIndex;

        // Fade in
        img.classList.remove('fading');
    }, 500); // Match CSS transition duration
}

// Initialize atmosphere gallery on page load
document.addEventListener('DOMContentLoaded', initAtmosphereGallery);


// ==================== Testimonial Carousel System ====================

let testimonials = [];
let currentTestimonialIndex = 0;

async function initTestimonialCarousel() {
    const slidesContainer = document.getElementById('testimonial-slides');
    const dotsContainer = document.getElementById('testimonial-dots');
    const prevBtn = document.getElementById('testimonial-prev');
    const nextBtn = document.getElementById('testimonial-next');

    if (!slidesContainer) return;

    try {
        // Load testimonials from JSON
        const response = await fetch('data/testimonials.json');
        if (!response.ok) throw new Error('Failed to load testimonials');
        const data = await response.json();

        // Shuffle testimonials randomly
        testimonials = data.testimonials.sort(() => Math.random() - 0.5);

        // Render testimonial cards
        renderTestimonialCards(slidesContainer);

        // Render navigation dots
        renderTestimonialDots(dotsContainer);

        // Add navigation event listeners
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                goToTestimonial(currentTestimonialIndex - 1);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                goToTestimonial(currentTestimonialIndex + 1);
            });
        }

        // Auto-advance (optional - every 5 seconds)
        setInterval(() => {
            goToTestimonial(currentTestimonialIndex + 1);
        }, 5000);

    } catch (error) {
        console.error('Error loading testimonials:', error);
        slidesContainer.innerHTML = '<p style="text-align:center; color:#888; padding: 40px;">ไม่สามารถโหลดข้อมูลได้</p>';
    }
}

function renderTestimonialCards(container) {
    container.innerHTML = '';

    testimonials.forEach((testimonial, index) => {
        const card = document.createElement('div');
        card.className = 'testimonial-card';
        card.innerHTML = `
            <div class="testimonial-profile">
                <img src="${testimonial.photo}" alt="${testimonial.name}" class="testimonial-photo">
                <div class="testimonial-info">
                    <h4>${testimonial.name}</h4>
                    <div class="testimonial-accepted">
                        <i class="fas fa-graduation-cap"></i>
                        Accepted to ${testimonial.university} - ${testimonial.major}
                    </div>
                </div>
            </div>
            <p class="testimonial-quote">"${testimonial.quote}"</p>
        `;
        container.appendChild(card);
    });
}

function renderTestimonialDots(container) {
    if (!container) return;
    container.innerHTML = '';

    testimonials.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.className = 'testimonial-dot' + (index === 0 ? ' active' : '');
        dot.addEventListener('click', () => goToTestimonial(index));
        container.appendChild(dot);
    });
}

function goToTestimonial(index) {
    // Handle wrap-around
    if (index < 0) index = testimonials.length - 1;
    if (index >= testimonials.length) index = 0;

    currentTestimonialIndex = index;

    // Update slide position
    const slidesContainer = document.getElementById('testimonial-slides');
    if (slidesContainer) {
        slidesContainer.style.transform = `translateX(-${index * 100}%)`;
    }

    // Update dots
    const dots = document.querySelectorAll('.testimonial-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

// Initialize testimonial carousel on page load
document.addEventListener('DOMContentLoaded', initTestimonialCarousel);
