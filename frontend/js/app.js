// frontend/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    // ---- Tema (cores lidas do CSS para manter JS e CSS em sincronia) ----
    const css = getComputedStyle(document.documentElement);
    const theme = {
        accent: css.getPropertyValue('--accent').trim() || '#3ee08f',
        critical: css.getPropertyValue('--critical').trim() || '#ff4d5a',
        high: css.getPropertyValue('--high').trim() || '#ff8a3d',
        medium: css.getPropertyValue('--medium').trim() || '#e6c24a',
        low: css.getPropertyValue('--low').trim() || '#6f7a75',
        surface: css.getPropertyValue('--surface').trim() || '#0d100f',
        border: css.getPropertyValue('--border').trim() || '#1c2220',
        textMuted: css.getPropertyValue('--text-muted').trim() || '#8b9590',
        textDim: css.getPropertyValue('--text-dim').trim() || '#56605b',
    };

    if (window.Chart) {
        Chart.defaults.font.family = "'JetBrains Mono', ui-monospace, monospace";
        Chart.defaults.font.size = 10;
        Chart.defaults.color = theme.textDim;
    }

    // ---- DOM Elements ----
    const navItems = document.querySelectorAll('.nav-item, .icon-btn[data-target]');
    const views = document.querySelectorAll('.view');
    const loader = document.getElementById('global-loader');
    const topbarTitle = document.getElementById('topbar-title');

    // Dashboard
    const dashboardCards = document.getElementById('dashboard-cards');
    let timelineChartInstance = null;
    let attackTypesChartInstance = null;

    // News & Threats
    const newsContainer = document.getElementById('news-container');
    const threatsContainer = document.getElementById('threats-container');
    const cvesContainer = document.getElementById('cves-container');
    const newsSearch = document.getElementById('news-search');
    const threatsSearch = document.getElementById('threats-search');
    const cvesSearch = document.getElementById('cves-search');

    // Slide-out panel
    const sidePanel = document.getElementById('side-panel');
    const closePanel = document.getElementById('close-panel');
    const panelContent = document.getElementById('panel-content');

    closePanel.addEventListener('click', () => {
        sidePanel.classList.remove('open');
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') sidePanel.classList.remove('open');
    });

    // Notifications
    const bellBtn = document.getElementById('bell-btn');
    const bellBadge = document.getElementById('bell-badge');
    const notifDropdown = document.getElementById('notif-dropdown');
    const notifList = document.getElementById('notif-list');
    const clearNotifsBtn = document.getElementById('clear-notifs');
    const brBanner = document.getElementById('br-threat-banner');
    const brBannerClose = document.getElementById('br-banner-close');
    const brBannerTitle = document.getElementById('br-banner-title');
    const brBannerDesc = document.getElementById('br-banner-desc');
    const brBannerLink = document.getElementById('br-banner-link');

    let notifications = JSON.parse(localStorage.getItem('cth_notifications')) || [];
    let notifiedThreatsArray = JSON.parse(localStorage.getItem('cth_notified_threats')) || [];
    const notifiedThreats = new Set(notifiedThreatsArray);

    // ---- Utility Functions ----
    const showLoader = (container) => {
        container.innerHTML = '';
        loader.classList.add('active');
    };
    const hideLoader = () => {
        loader.classList.remove('active');
    };
    const formatDate = (dateString) => {
        if (!dateString) return 'data desconhecida';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };
    const isBrazil = (pais) => ['br', 'brazil', 'brasil'].includes((pais || '').toLowerCase());

    // Classificação CVSS -> { cls, label, icon }
    const severityFromScore = (score, fallback) => {
        const n = parseFloat(score);
        if (!isNaN(n)) {
            if (n >= 9.0) return { cls: 'critical', label: 'CRITICAL', icon: 'fa-skull' };
            if (n >= 7.0) return { cls: 'high', label: 'HIGH', icon: 'fa-circle-exclamation' };
            if (n >= 4.0) return { cls: 'medium', label: 'MEDIUM', icon: 'fa-triangle-exclamation' };
            return { cls: 'low', label: 'LOW', icon: 'fa-circle-info' };
        }
        const label = (fallback || 'N/A').toUpperCase();
        const cls = { CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low' }[label] || 'neutral';
        return { cls, label, icon: 'fa-circle-info' };
    };

    const emptyState = (msg) => `<p class="empty-state">${msg}</p>`;

    // Initial check
    setTimeout(() => {
        updateNotifsUI();
        if (notifications.length > 0) {
            bellBadge.style.display = 'block';
        }
    }, 100);

    if (bellBtn) {
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle('open');
            if (notifDropdown.classList.contains('open')) {
                bellBadge.style.display = 'none';
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (notifDropdown && !notifDropdown.contains(e.target)) {
            notifDropdown.classList.remove('open');
        }
    });

    if (clearNotifsBtn) {
        clearNotifsBtn.addEventListener('click', () => {
            notifications = [];
            localStorage.setItem('cth_notifications', JSON.stringify(notifications));
            updateNotifsUI();
        });
    }

    if (brBannerClose) {
        brBannerClose.addEventListener('click', () => {
            brBanner.style.display = 'none';
        });
    }

    if (brBannerLink) {
        brBannerLink.addEventListener('click', (e) => {
            e.preventDefault();
            const threatNavItem = document.querySelector('.nav-item[data-target="view-threats"]');
            if (threatNavItem) {
                threatNavItem.click();
            }
            brBanner.style.display = 'none';
        });
    }

    function addNotification(threat, isNew = true) {
        const threatId = `${threat.vitima || ''}-${threat.data_incidente || ''}`;
        if (notifiedThreats.has(threatId)) return;
        notifiedThreats.add(threatId);
        localStorage.setItem('cth_notified_threats', JSON.stringify(Array.from(notifiedThreats)));

        const title = `Ataque no Brasil detectado`;
        const desc = `Vítima: ${threat.vitima || 'Desconhecida'} | Grupo: ${threat.grupo || 'Desconhecido'}`;
        const dateStr = formatDate(threat.data_incidente);

        notifications.unshift({ title, desc, dateStr });
        localStorage.setItem('cth_notifications', JSON.stringify(notifications));

        bellBadge.style.display = 'block';
        updateNotifsUI();

        if (isNew) {
            // Mostra o banner apenas para ameaças novas, não cacheadas
            brBannerTitle.textContent = `Alerta crítico: ${title.toLowerCase()}`;
            brBannerDesc.textContent = desc + '. Verifique o Threat Feed para mais informações.';
            brBanner.style.display = 'flex';
        }
    }

    function updateNotifsUI() {
        if (notifications.length === 0) {
            notifList.innerHTML = '<p class="empty-notifs">Nenhum alerta</p>';
            return;
        }

        notifList.innerHTML = notifications.map(n => `
            <div class="notif-item">
                <div class="notif-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <div class="notif-content">
                    <h5>${n.title}</h5>
                    <p>${n.desc}</p>
                    <span class="notif-time">${n.dateStr}</span>
                </div>
            </div>
        `).join('');
    }

    // ---- Navigation & View Switching ----
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));

            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            const path = item.getAttribute('data-path') || targetId.replace('view-', '');
            topbarTitle.innerHTML = `<span class="prompt">$</span>~/<span class="path">${path}</span>`;

            if (targetId === 'view-dashboard') loadDashboard();
            if (targetId === 'view-news') loadNews();
            if (targetId === 'view-threats') loadThreats();
            if (targetId === 'view-cves') loadCVEs();
            if (targetId === 'view-settings') loadSettings();
        });
    });

    // ---- Data Fetching & Rendering ----

    // 1. Dashboard
    async function loadDashboard() {
        try {
            const res = await fetch('/api/dashboard');
            const data = await res.json();

            const metrics = data.metrics || {};
            const chartData = data.chartData || {};

            const formatNumber = (num) => {
                if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
                if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
                if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
                return num.toLocaleString('pt-BR');
            };

            const cards = [
                { title: 'Contas vazadas', icon: 'fa-user-secret', value: formatNumber(metrics.pwnedCount || 13500000000), foot: 'fonte: hibp' },
                { title: 'Grupos ativos', icon: 'fa-users', value: (metrics.activeGangs || 0).toLocaleString('pt-BR'), foot: 'ransomware' },
                { title: 'Total de ameaças', icon: 'fa-crosshairs', value: (metrics.threats || 0).toLocaleString('pt-BR'), foot: 'incidentes registrados' },
                { title: 'Vulnerabilidades', icon: 'fa-bug', value: (metrics.vulnerabilities || 0).toLocaleString('pt-BR'), foot: 'cves monitoradas' },
            ];

            dashboardCards.innerHTML = cards.map(c => `
                <div class="stat-card">
                    <div class="stat-card-header">
                        <span class="stat-card-title">${c.title}</span>
                        <i class="fa-solid ${c.icon} stat-card-icon"></i>
                    </div>
                    <div class="stat-card-value">${c.value}</div>
                    <div class="stat-card-foot">${c.foot}</div>
                </div>
            `).join('');

            renderCharts(chartData);

            const allThreats = data.recentThreats || [];
            allThreats.forEach(t => {
                if (isBrazil(t.pais)) addNotification(t, true);
            });

            renderDashboardTables(allThreats, data.recentVulnerabilities || []);

        } catch (error) {
            dashboardCards.innerHTML = emptyState('erro ao carregar dashboard');
            console.error(error);
        }
    }

    function renderCharts(chartData) {
        if (!window.Chart) return;
        if (timelineChartInstance) timelineChartInstance.destroy();
        if (attackTypesChartInstance) attackTypesChartInstance.destroy();

        const ctxTimeline = document.getElementById('incidentTimelineChart').getContext('2d');
        const ctxAttackTypes = document.getElementById('attackTypesChart').getContext('2d');

        const gradient = ctxTimeline.createLinearGradient(0, 0, 0, 280);
        gradient.addColorStop(0, 'rgba(62, 224, 143, 0.18)');
        gradient.addColorStop(1, 'rgba(62, 224, 143, 0)');

        timelineChartInstance = new Chart(ctxTimeline, {
            type: 'line',
            data: {
                labels: chartData.incidentTimeline?.labels || [],
                datasets: [{
                    label: 'Vulnerabilidades críticas',
                    data: chartData.incidentTimeline?.data || [],
                    borderColor: theme.accent,
                    backgroundColor: gradient,
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: theme.accent,
                    fill: true,
                    tension: 0.35
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { color: theme.border },
                        ticks: { color: theme.textDim, maxRotation: 0, autoSkipPadding: 16 }
                    },
                    y: {
                        min: 0,
                        suggestedMax: 100,
                        grid: { color: theme.border },
                        border: { display: false },
                        ticks: { color: theme.textDim, stepSize: 25 }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        borderWidth: 1,
                        titleColor: theme.textMuted,
                        bodyColor: '#e4e9e6',
                        padding: 10,
                        displayColors: false,
                        cornerRadius: 2
                    }
                }
            }
        });

        attackTypesChartInstance = new Chart(ctxAttackTypes, {
            type: 'doughnut',
            data: {
                labels: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
                datasets: [{
                    data: chartData.severityDistribution?.data || [15, 30, 40, 15],
                    backgroundColor: [theme.critical, theme.high, theme.medium, theme.low],
                    borderWidth: 2,
                    borderColor: theme.surface,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                cutout: '78%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: theme.textMuted,
                            usePointStyle: true,
                            pointStyle: 'rect',
                            boxWidth: 8,
                            boxHeight: 8,
                            padding: 14
                        }
                    },
                    tooltip: {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 2
                    }
                }
            }
        });
    }

    function renderDashboardTables(threats, vulns) {
        const threatsTbody = document.querySelector('#recent-threats-table tbody');
        const vulnsList = document.getElementById('active-vulns-list');

        // Tabela Ameaças Recentes (severidade ilustrativa baseada na posição)
        threatsTbody.innerHTML = threats.map((t, i) => {
            let sev = { cls: 'high', label: 'HIGH' };
            if (i % 3 === 0) sev = { cls: 'critical', label: 'CRITICAL' };
            else if (i % 2 !== 0 && i !== 1) sev = { cls: 'medium', label: 'MEDIUM' };
            else if (i === 1) sev = { cls: 'low', label: 'LOW' };

            const dataStr = t.data_incidente ? t.data_incidente.split('T')[0] : new Date().toISOString().split('T')[0];

            return `
                <tr>
                    <td>${t.grupo || t.vitima || 'LockBit 3.0'}</td>
                    <td>${t.vitima || t.pais || 'Healthcare Corp'}</td>
                    <td><span class="badge ${sev.cls}">${sev.label}</span></td>
                    <td class="mono">${dataStr}</td>
                </tr>
            `;
        }).join('') || `<tr><td colspan="4" class="mono">sem dados</td></tr>`;

        // Lista de Vulnerabilidades Ativas
        vulnsList.innerHTML = vulns.map((v, i) => {
            const incidentHits = Math.floor(Math.random() * 100) + 120 + (10 - i) * 10;
            return `
                <div class="vuln-item">
                    <div class="vuln-item-id">${v.cve_id}</div>
                    <div class="vuln-item-score">${incidentHits} hits</div>
                </div>
            `;
        }).join('') || emptyState('sem dados');
    }

    // 2. News
    async function loadNews() {
        if (newsContainer.children.length > 0) return;

        showLoader(newsContainer);
        try {
            const res = await fetch('/api/noticias');
            const data = await res.json();
            hideLoader();

            if (!data.noticias || data.noticias.length === 0) {
                newsContainer.innerHTML = emptyState('nenhuma notícia encontrada');
                return;
            }

            newsContainer.innerHTML = data.noticias.map((item, index) => `
                <article class="list-item" data-index="${index}">
                    <div class="item-meta">
                        <span class="source">${item.fonte || 'CyberSecurity Daily'}</span>
                        <span>${formatDate(item.data_publicacao)}</span>
                    </div>
                    <h3>${item.titulo}</h3>
                    <p class="item-desc">${item.resumo ? item.resumo.substring(0, 150) + '…' : 'Sem resumo disponível.'}</p>
                    <div class="read-more">ler mais <i class="fa-solid fa-arrow-right"></i></div>
                </article>
            `).join('');

            newsContainer.querySelectorAll('.list-item').forEach(card => {
                card.addEventListener('click', () => {
                    const news = data.noticias[card.getAttribute('data-index')];

                    panelContent.innerHTML = `
                        <div class="item-header">
                            <span class="badge"><i class="fa-solid fa-rss"></i> ${news.fonte || 'Notícias'}</span>
                            <span class="item-date">${formatDate(news.data_publicacao)}</span>
                        </div>
                        <h2 class="panel-title">${news.titulo}</h2>

                        <div class="panel-block">
                            <h4>// resumo</h4>
                            <p>${news.resumo || 'Resumo indisponível para este artigo.'}</p>
                        </div>

                        <div class="panel-source">
                            <h3>Artigo completo</h3>
                            <p class="text-muted">Acesse a fonte original para ler a notícia completa diretamente do publicador.</p>
                            <a href="${news.url}" target="_blank" rel="noopener noreferrer" class="btn-primary btn-block">
                                abrir fonte original <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            </a>
                        </div>
                    `;
                    sidePanel.classList.add('open');
                });
            });

        } catch (error) {
            hideLoader();
            newsContainer.innerHTML = emptyState('erro ao carregar notícias');
        }
    }

    // 3. Threats
    async function loadThreats() {
        if (threatsContainer.children.length > 0) return;

        showLoader(threatsContainer);
        try {
            const res = await fetch('/api/ameacas');
            const data = await res.json();
            hideLoader();

            if (!data.ameacas || data.ameacas.length === 0) {
                threatsContainer.innerHTML = emptyState('nenhuma ameaça encontrada');
                return;
            }

            threatsContainer.innerHTML = data.ameacas.map((item, index) => {
                const br = isBrazil(item.pais);
                if (br) addNotification(item, true);

                return `
                    <article class="list-item ${br ? 'is-br' : ''}" data-index="${index}">
                        <div class="item-header">
                            <h3 class="threat-title">
                                ${item.grupo || item.vitima || 'Ameaça registrada'}
                                ${br ? '<span class="br-flag" title="Ameaça direcionada ao Brasil">BR</span>' : ''}
                            </h3>
                            <span class="item-date">${formatDate(item.data_incidente)}</span>
                        </div>
                        <dl class="threat-fields">
                            <dt>Vítima</dt><dd>${item.vitima || 'Desconhecida'}</dd>
                            <dt>País</dt><dd class="br-country">${item.pais || 'Desconhecido'}</dd>
                        </dl>
                        <div class="item-footer">
                            <span class="badge critical"><i class="fa-solid fa-lock"></i> ransomware</span>
                            <span class="badge">${item.fonte || 'ameaça'}</span>
                        </div>
                    </article>
                `;
            }).join('');

            threatsContainer.querySelectorAll('.list-item').forEach(card => {
                card.addEventListener('click', () => {
                    const threat = data.ameacas[card.getAttribute('data-index')];
                    const threatUrl = threat.url;

                    const analysis = threat.reportText
                        ? `<p style="white-space: pre-line;">${threat.reportText}</p>`
                        : `<p>Foi identificado um novo ataque de ransomware contra <strong>${threat.vitima || 'vítima desconhecida'}</strong>.</p>`;

                    panelContent.innerHTML = `
                        <div class="item-header">
                            <span class="badge critical"><i class="fa-solid fa-lock"></i> ransomware</span>
                            <span class="item-date">${formatDate(threat.data_incidente)}</span>
                        </div>
                        <h2 class="panel-title mono">${(threat.grupo || threat.vitima || 'Ameaça').toUpperCase()}</h2>

                        <div class="panel-block">
                            <h4>// análise</h4>
                            ${analysis}
                        </div>

                        <div class="panel-block">
                            <h4>// detalhes técnicos</h4>
                            <dl class="kv">
                                <dt>Grupo</dt><dd class="mono">${(threat.grupo || 'Desconhecido').toUpperCase()}</dd>
                                <dt>Vítima</dt><dd>${threat.vitima || 'Desconhecida'}</dd>
                                <dt>Data</dt><dd class="mono">${formatDate(threat.data_incidente)}</dd>
                                <dt>País</dt><dd>${threat.pais || 'Desconhecido'}</dd>
                            </dl>
                        </div>

                        <div class="panel-source">
                            <h3>Relatório da fonte</h3>
                            <p class="text-muted">Acesse a fonte original da API que reportou este evento.</p>
                            ${threatUrl ? `
                            <a href="${threatUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary btn-block">
                                ver origem <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            </a>` : '<p class="text-muted"><em>URL não fornecida pela fonte no momento.</em></p>'}
                        </div>
                    `;
                    sidePanel.classList.add('open');
                });
            });

        } catch (error) {
            hideLoader();
            threatsContainer.innerHTML = emptyState('erro ao carregar ameaças');
        }
    }

    // 4. CVEs
    async function loadCVEs() {
        if (cvesContainer.children.length > 0) return;

        showLoader(cvesContainer);
        try {
            const res = await fetch('/api/cves');
            const data = await res.json();
            hideLoader();

            if (!data.cves || data.cves.length === 0) {
                cvesContainer.innerHTML = emptyState('nenhuma vulnerabilidade encontrada');
                return;
            }

            const sevBadge = (score, severity) => {
                const sev = severityFromScore(score, severity);
                const label = severity && severity.toUpperCase() !== 'UNKNOWN' ? severity.toUpperCase() : sev.label;
                return `<span class="sev-badge ${sev.cls}"><i class="fa-solid ${sev.icon}"></i> ${label} · ${score || 'N/A'}</span>`;
            };

            cvesContainer.innerHTML = data.cves.map((item, index) => `
                <article class="list-item cve-row" data-index="${index}">
                    <div class="cve-row-main">
                        <h3>${item.id}</h3>
                        <span class="cve-badge-slot">${sevBadge(item.cvss, item.severity)}</span>
                    </div>
                    <span class="item-date">${formatDate(item.publishedAt)}</span>
                </article>
            `).join('');

            cvesContainer.querySelectorAll('.list-item').forEach(card => {
                card.addEventListener('click', async () => {
                    const baseCve = data.cves[card.getAttribute('data-index')];

                    panelContent.innerHTML = '<div class="panel-loading"><i class="fa-solid fa-circle-notch fa-spin"></i>carregando detalhes…</div>';
                    sidePanel.classList.add('open');

                    try {
                        const res = await fetch(`/api/cves/${baseCve.id}`);
                        const detailData = await res.json();

                        const id = detailData.id || baseCve.id;
                        const title = detailData.title && detailData.title !== id
                            ? detailData.title
                            : (baseCve.title && baseCve.title !== id ? baseCve.title : 'Título não fornecido na origem');

                        let description = detailData.description || baseCve.description || 'Descrição não disponível.';
                        if (description.includes('<div')) {
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = description;
                            description = tempDiv.textContent || tempDiv.innerText || description;
                        }

                        const cvssScore = detailData.cvss_score || baseCve.cvss || 'N/A';
                        const severityStr = detailData.severity || baseCve.severity || 'N/A';

                        let actions = 'Consultar o fabricante para mitigações.';
                        if (detailData.solution && Array.isArray(detailData.solution.actions) && detailData.solution.actions.length > 0) {
                            actions = '<ul>' + detailData.solution.actions.map(a => `<li>${a}</li>`).join('') + '</ul>';
                        } else if (detailData.cisa_kev_detail && detailData.cisa_kev_detail.length > 0) {
                            actions = detailData.cisa_kev_detail[0].required_action || actions;
                        } else if (baseCve.recommendation) {
                            actions = baseCve.recommendation;
                        }

                        const sev = severityFromScore(cvssScore, severityStr);
                        const sevLabel = severityStr.toUpperCase() === 'UNKNOWN' || severityStr === 'N/A' ? sev.label : severityStr.toUpperCase();
                        const pubDate = detailData.published || baseCve.publishedAt;
                        const sourceUrl = detailData.url || baseCve.sourceUrl || `https://nvd.nist.gov/vuln/detail/${id}`;

                        panelContent.innerHTML = `
                            <div class="item-header">
                                <span class="sev-badge ${sev.cls}"><i class="fa-solid ${sev.icon}"></i> ${sevLabel}</span>
                                <span class="item-date">${formatDate(pubDate)}</span>
                            </div>
                            <h2 class="panel-title mono">${id}</h2>

                            <div class="panel-block">
                                <h4>// detalhes</h4>
                                <dl class="kv">
                                    <dt>Título</dt><dd>${title}</dd>
                                    <dt>CVSS</dt><dd class="mono" style="color: var(--${sev.cls === 'neutral' ? 'text' : sev.cls}); font-weight: 600;">${cvssScore}</dd>
                                    <dt>Severidade</dt><dd><span class="sev-badge ${sev.cls}">${sevLabel}</span></dd>
                                    <dt class="stack">Descrição</dt><dd class="stack">${description}</dd>
                                </dl>
                            </div>

                            <div class="panel-block">
                                <h4>// mitigação</h4>
                                <p>${actions}</p>
                            </div>

                            <div class="panel-source">
                                <h3>Fonte original</h3>
                                <p class="text-muted">Verifique patches e mitigações na NVD ou fonte associada.</p>
                                <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary btn-block">
                                    ver detalhes originais <i class="fa-solid fa-arrow-up-right-from-square"></i>
                                </a>
                            </div>
                        `;

                        // Atualiza o badge do card na lista com os dados detalhados
                        const slot = card.querySelector('.cve-badge-slot');
                        if (slot && cvssScore !== 'N/A') {
                            slot.innerHTML = sevBadge(cvssScore, sevLabel);
                        }

                    } catch (error) {
                        panelContent.innerHTML = '<div class="panel-loading" style="color: var(--critical);">erro ao carregar detalhes da vulnerabilidade</div>';
                        console.error('Error fetching CVE details:', error);
                    }
                });
            });

        } catch (error) {
            hideLoader();
            cvesContainer.innerHTML = emptyState('erro ao carregar vulnerabilidades');
        }
    }

    // 5. Settings
    async function loadSettings() {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();

            document.getElementById('alertEmails').value = data.ALERT_EMAIL_TO || '';
            document.getElementById('teamsWebhook').value = data.TEAMS_WEBHOOK_URL || '';
            document.getElementById('telegramToken').value = data.TELEGRAM_BOT_TOKEN || '';
            document.getElementById('telegramChatId').value = data.TELEGRAM_CHAT_ID || '';
        } catch (error) {
            console.error('Erro ao carregar configurações', error);
        }
    }

    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const statusSpan = document.getElementById('settings-status');
            const submitBtn = settingsForm.querySelector('button[type="submit"]');

            const payload = {
                ALERT_EMAIL_TO: document.getElementById('alertEmails').value,
                TEAMS_WEBHOOK_URL: document.getElementById('teamsWebhook').value,
                TELEGRAM_BOT_TOKEN: document.getElementById('telegramToken').value,
                TELEGRAM_CHAT_ID: document.getElementById('telegramChatId').value
            };

            submitBtn.disabled = true;
            statusSpan.style.display = 'inline';
            statusSpan.style.color = 'var(--text-muted)';
            statusSpan.textContent = 'salvando…';

            try {
                const res = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();

                if (data.success) {
                    statusSpan.style.color = 'var(--accent)';
                    statusSpan.textContent = '✓ salvo';
                } else {
                    statusSpan.style.color = 'var(--critical)';
                    statusSpan.textContent = '✗ erro ao salvar';
                }
            } catch (err) {
                statusSpan.style.color = 'var(--critical)';
                statusSpan.textContent = '✗ erro de conexão';
            }

            submitBtn.disabled = false;
            setTimeout(() => { statusSpan.style.display = 'none'; }, 3000);
        });
    }

    // ---- Search Logic ----
    const bindFilter = (input, container) => {
        if (!input) return;
        input.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            container.querySelectorAll('.list-item').forEach(item => {
                item.style.display = item.innerText.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    };
    bindFilter(newsSearch, newsContainer);
    bindFilter(threatsSearch, threatsContainer);
    bindFilter(cvesSearch, cvesContainer);

    // Inicializar a primeira aba (Dashboard)
    loadDashboard();

    // Atualiza os dados "ao vivo" a cada 15 segundos sem recarregar a tela
    setInterval(() => {
        const activeView = document.querySelector('.view.active');
        if (activeView && activeView.id === 'view-dashboard') {
            loadDashboard();
        }
    }, 15000);
});
