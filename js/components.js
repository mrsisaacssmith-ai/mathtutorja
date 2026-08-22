// Shared header + footer, injected on every page.
// Uses `root` (relative path prefix) set per-page via <body data-root="..." data-page="...">

(function () {
  const body = document.body;
  const root = body.getAttribute('data-root') || '';
  const page = body.getAttribute('data-page') || '';

  const nav = [
    { href: 'index.html', label: 'Home', key: 'home' },
    { href: 'pages/schedule.html', label: 'Schedule', key: 'schedule' },
    { href: 'pages/pricing.html', label: 'Pricing', key: 'pricing' },
    { href: 'pages/policy.html', label: 'Policy', key: 'policy' },
    { href: 'pages/contact.html', label: 'Contact', key: 'contact' },
  ];

  const resolve = (href) => {
    // If we're inside /pages/, index.html needs ../ ; pages/x.html needs just x.html
    if (root === '../') {
      return href.startsWith('pages/') ? href.replace('pages/', '') : '../' + href;
    }
    return href;
  };

  const logoMark = `
    <svg class="logo-mark" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="19" stroke="#D6A419" stroke-width="2"/>
      <path d="M13 28L20 10L27 28" stroke="#0B1F3D" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16.5 21H23.5" stroke="#1E5631" stroke-width="2.4" stroke-linecap="round"/>
    </svg>`;

  const headerHTML = `
    <div class="nav">
      <a href="${resolve('index.html')}" class="logo">
        ${logoMark}
        <span>Math Tutor <span class="logo-ja">JA</span></span>
      </a>
      <ul class="nav-links" id="navLinks">
        ${nav.map(n => `<li><a href="${resolve(n.href)}" class="${page === n.key ? 'active' : ''}">${n.label}</a></li>`).join('')}
      </ul>
      <div class="nav-cta" id="navCta">
        <a href="${resolve('pages/login.html')}" class="btn btn-outline-navy btn-sm">Log in</a>
        <a href="${resolve('pages/signup.html')}" class="btn btn-primary btn-sm">Register</a>
        <button class="nav-toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>`;

  const loggedInCtaHTML = (isAdmin) => `
    <a href="${resolve(isAdmin ? 'pages/admin.html' : 'pages/portal.html')}" class="btn btn-outline-navy btn-sm">${isAdmin ? 'Admin' : 'My Portal'}</a>
    <button class="btn btn-primary btn-sm" id="logoutBtn" type="button">Log out</button>
    <button class="nav-toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>`;

  const footerHTML = `
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <a href="${resolve('index.html')}" class="logo" style="color:#FAF9F6; margin-bottom:14px;">
            ${logoMark}
            <span>Math Tutor <span style="color:#F0C24A">JA</span></span>
          </a>
          <p style="font-size:0.88rem; max-width:32ch; margin-top:14px;">One-on-one and small-group CSEC Mathematics coaching, online and face to face in Kingston.</p>
        </div>
        <div>
          <h4>Program</h4>
          <ul>
            <li><a href="${resolve('pages/schedule.html')}">Class schedule</a></li>
            <li><a href="${resolve('pages/pricing.html')}">Pricing</a></li>
            <li><a href="${resolve('pages/policy.html')}">Cancellation policy</a></li>
          </ul>
        </div>
        <div>
          <h4>Account</h4>
          <ul>
            <li><a href="${resolve('pages/signup.html')}">Register</a></li>
            <li><a href="${resolve('pages/login.html')}">Student login</a></li>
            <li><a href="${resolve('pages/portal.html')}">Class materials</a></li>
          </ul>
        </div>
        <div>
          <h4>Visit us</h4>
          <ul>
            <li>134 Constant Spring Road, Kingston</li>
            <li>Saturdays · 9am–5pm</li>
            <li><a href="${resolve('pages/contact.html')}">Contact us</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; 2026 Math Tutor JA. All rights reserved.</span>
        <span>Built for a 100% CSEC Mathematics pass rate.</span>
      </div>
    </div>`;

  document.addEventListener('DOMContentLoaded', () => {
    const headerEl = document.getElementById('siteHeader');
    const footerEl = document.getElementById('siteFooter');
    if (headerEl) headerEl.innerHTML = headerHTML;
    if (footerEl) footerEl.innerHTML = footerHTML;

    // Swap in logged-in state if a session exists (requires js/api.js loaded first).
    if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
      const navCta = document.getElementById('navCta');
      const user = Auth.getUser();
      if (navCta) {
        navCta.innerHTML = loggedInCtaHTML(user?.role === 'admin');
        const logoutBtn = document.getElementById('logoutBtn');
        logoutBtn?.addEventListener('click', () => {
          Auth.clearSession();
          window.location.href = resolve('index.html');
        });
      }
    }

    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    if (toggle && links) {
      toggle.addEventListener('click', () => {
        const isOpen = links.classList.toggle('open');
        toggle.setAttribute('aria-expanded', isOpen);
      });
    }
  });
})();
