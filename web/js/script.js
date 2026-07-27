// Lógica de Navegação da Sidebar
function switchPage(pageId, element) {
    if (element) {
        document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
        element.classList.add('active');
    }

    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');
    
    if (pageId === 'settings') {
        updateKeyStatus();
    }
}

// Estado Global
let vpnConnected = false;
// Bloqueia o menu de contexto (botão direito) para evitar inspeção e modo desenvolvedor
document.addEventListener('contextmenu', event => event.preventDefault());

let activeGameId = null;
let activeIsGlobal = null;

// Inicialização Assíncrona
async function initApp() {
    try {
        // Pede ao Python para limpar os processos e cache antigos
        await eel.clear_cache()();
        
        // Tempo mínimo de UX
        setTimeout(async () => {
            const loading = document.getElementById('loading-screen');
            loading.style.opacity = '0';
            setTimeout(() => loading.style.display = 'none', 500);
            
            await updateStatus();
            await loadGames();
        }, 1200);
    } catch (e) {
        console.error(e);
    }
}

// Carregar Cards da Biblioteca
async function loadGames() {
    const games = await eel.get_games()();
    const grid = document.getElementById('games-grid');
    grid.innerHTML = '';

    games.forEach(game => {
        const isActive = (vpnConnected && activeGameId === game.id);
        
        const card = document.createElement('div');
        card.className = `game-card ${isActive ? 'active' : ''}`;
        card.id = `card-${game.id}`;
        
        // Tratamento de Imagens
        let imgSrc = game.image;
        if (!imgSrc.startsWith("http")) {
            imgSrc = `assets/${game.image}?t=${Date.now()}`;
        }
        if (game.id === "custom") imgSrc = "https://via.placeholder.com/120/1a1a1a/ffffff?text=%2B";
        
        card.innerHTML = `
            <img src="${imgSrc}" onerror="this.src='https://via.placeholder.com/120/333/fff?text=?'">
            <h3>${game.name}</h3>
            <button class="btn-toggle" onclick="toggleRoute('${game.id}')">
                ${isActive ? 'LIGADO' : 'ATIVAR ROTA'}
            </button>
        `;
        
        grid.appendChild(card);
    });
}

// Atualizar o status global de rede
async function updateStatus() {
    const status = await eel.get_vpn_status()();
    vpnConnected = status.is_connected;
    activeGameId = status.active_game_id;
    activeIsGlobal = status.active_is_global;
    
    const indicator = document.querySelector('.status-indicator');
    const text = document.querySelector('.global-status span');
    
    if (vpnConnected) {
        indicator.classList.add('on');
        text.innerText = `Roteamento Ativo`;
        text.style.color = 'var(--text-main)';
        text.style.textShadow = '0 0 10px rgba(255,255,255,0.5)';
    } else {
        indicator.classList.remove('on');
        text.innerText = `Desconectado`;
        text.style.color = 'var(--text-muted)';
        text.style.textShadow = 'none';
    }
}

// Botão de ligar/desligar rota
async function toggleRoute(gameId) {
    const btn = document.querySelector(`#card-${gameId} .btn-toggle`);
    const oldText = btn.innerText;
    btn.innerText = "Aguarde...";
    
    const isGlobal = document.getElementById('toggle-global').checked;
    
    const result = await eel.toggle_game(gameId, isGlobal)();
    
    if (result.success) {
        await updateStatus();
        await loadGames();
    } else {
        alert(result.msg);
        btn.innerText = oldText;
    }
}

// Função para chamar o importador Python
async function importConfig() {
    const msgBox = document.getElementById('import-msg');
    msgBox.className = 'msg-box';
    msgBox.innerText = 'Abrindo explorador de arquivos...';
    
    const result = await eel.trigger_import()();
    
    if (result.success) {
        msgBox.classList.add('msg-success');
        msgBox.innerText = result.msg;
        updateKeyStatus();
    } else {
        msgBox.classList.add('msg-error');
        msgBox.innerText = result.msg;
    }
}

// Consultar status da chave registrada
async function updateKeyStatus() {
    try {
        let status = await eel.get_key_status()();
        let badge = document.getElementById('key-badge');
        let endpointText = document.getElementById('key-endpoint-text');
        let endpointIp = document.getElementById('key-endpoint-ip');
        let keyNameText = document.getElementById('key-name-text');
        let keyName = document.getElementById('key-name');
        let btnRemove = document.getElementById('btn-remove');
        let btnImport = document.getElementById('btn-import');

        if(status.registered) {
            badge.textContent = "Registrada";
            badge.className = "badge active";
            keyNameText.style.display = "block";
            keyName.textContent = status.key_name || "Chave Desconhecida";
            endpointText.style.display = "block";
            endpointIp.textContent = status.endpoint || "N/A";
            btnRemove.style.display = "block";
            btnImport.textContent = "Trocar Key";
        } else {
            badge.textContent = "Vazia";
            badge.className = "badge inactive";
            keyNameText.style.display = "none";
            endpointText.style.display = "none";
            btnRemove.style.display = "none";
            btnImport.textContent = "Import Key";
        }
    } catch (e) {
        console.error("Erro ao checar status da chave", e);
    }
}

// Remover chave atual
function removeConfig() {
    document.getElementById('confirm-modal').classList.add('show');
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').classList.remove('show');
}

async function proceedRemoveKey() {
    closeConfirmModal();
    const msgBox = document.getElementById('import-msg');
    msgBox.className = 'msg-box';
    msgBox.innerText = 'Limpando dados...';
    
    let result = await eel.remove_key()();
    if (result.success) {
        msgBox.className = 'msg-box msg-success';
        updateKeyStatus();
    } else {
        msgBox.className = 'msg-box msg-error';
    }
    msgBox.innerText = result.msg;
    setTimeout(() => {
        msgBox.style.display = 'none';
    }, 5000);
}

// Auto-Iniciar ao carregar o DOM
window.onload = initApp;
