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
    } else if (pageId === 'console') {
        loadAdapters();
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
        
        let placeholderPlus = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='120' height='120' fill='%231a1a1a'/><text x='50%' y='50%' fill='%23fff' dominant-baseline='middle' text-anchor='middle' font-size='48'>+</text></svg>";
        let placeholderQuestion = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='120' height='120' fill='%23333333'/><text x='50%' y='50%' fill='%23fff' dominant-baseline='middle' text-anchor='middle' font-size='24'>?</text></svg>";
        
        if (game.id === "custom") imgSrc = placeholderPlus;
        
        card.innerHTML = `
            <img src="${imgSrc}" onerror="this.src='${placeholderQuestion}'">
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
            document.getElementById('toggle-console').checked = status.console_mode || false;
            if(status.console_mode) {
                document.getElementById('label-console').classList.add('active-label');
            } else {
                document.getElementById('label-console').classList.remove('active-label');
            }
        } else {
            badge.textContent = "Vazia";
            badge.className = "badge inactive";
            keyNameText.style.display = "none";
            endpointText.style.display = "none";
            btnRemove.style.display = "none";
            btnImport.textContent = "Import Key";
            document.getElementById('toggle-console').checked = false;
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

// Tutorial Modal e Console Mode
function openTutorialModal() {
    document.getElementById('tutorial-modal').classList.add('show');
}

function closeTutorialModal() {
    document.getElementById('tutorial-modal').classList.remove('show');
}

async function toggleConsoleMode() {
    const isChecked = document.getElementById('toggle-console').checked;
    if(isChecked) {
        document.getElementById('label-console').classList.add('active-label');
    } else {
        document.getElementById('label-console').classList.remove('active-label');
    }
    
    // Envia o estado para o Python salvar
    const result = await eel.toggle_console_mode(isChecked)();
    if(result.success && vpnConnected) {
        // Se a VPN já estiver ligada, avisa que precisa reconectar
        alert("O modo mudou! Desligue e ligue a VPN novamente para aplicar o novo roteamento de Console.");
    }
}

// Carrega os adaptadores de rede
async function loadAdapters() {
    const pub = document.getElementById("public-adapter");
    const priv = document.getElementById("private-adapter");
    
    // Mostra loading
    pub.innerHTML = '<option value="">Buscando placas...</option>';
    priv.innerHTML = '<option value="">Buscando placas...</option>';
    
    const adapters = await eel.get_network_adapters()();
    
    if (adapters && adapters.length > 0) {
        pub.innerHTML = '<option value="">-- Selecione --</option>';
        priv.innerHTML = '<option value="">-- Selecione --</option>';
        
        adapters.forEach(name => {
            const opt1 = document.createElement("option");
            opt1.value = name;
            opt1.textContent = name;
            pub.appendChild(opt1);
            
            const opt2 = document.createElement("option");
            opt2.value = name;
            opt2.textContent = name;
            priv.appendChild(opt2);
        });
    } else {
        pub.innerHTML = '<option value="">Nenhuma placa encontrada</option>';
        priv.innerHTML = '<option value="">Nenhuma placa encontrada</option>';
    }
}

// Dispara o ICS PowerShell
async function triggerICS(enable) {
    const pub = document.getElementById("public-adapter").value;
    const priv = document.getElementById("private-adapter").value;
    const msgBox = document.getElementById("ics-msg");
    
    if (enable && (!pub || !priv)) {
        msgBox.className = "msg-box msg-error";
        msgBox.innerText = "Você precisa selecionar as duas placas de rede!";
        msgBox.style.display = "block";
        setTimeout(() => msgBox.style.display = 'none', 4000);
        return;
    }
    
    if (enable && pub === priv) {
        msgBox.className = "msg-box msg-error";
        msgBox.innerText = "As placas não podem ser a mesma!";
        msgBox.style.display = "block";
        setTimeout(() => msgBox.style.display = 'none', 4000);
        return;
    }
    
    msgBox.className = "msg-box";
    msgBox.innerText = enable ? "Ativando roteamento do Windows (Isso pode demorar alguns segundos)..." : "Desligando roteamento...";
    msgBox.style.display = "block";
    
    // Desabilita botões temporariamente
    document.getElementById("btn-enable-ics").disabled = true;
    document.getElementById("btn-disable-ics").disabled = true;
    
    const result = await eel.configure_ics(pub, priv, enable)();
    
    if (result.success) {
        msgBox.className = "msg-box msg-success";
    } else {
        msgBox.className = "msg-box msg-error";
    }
    msgBox.innerText = result.msg;
    
    document.getElementById("btn-enable-ics").disabled = false;
    document.getElementById("btn-disable-ics").disabled = false;
    
    setTimeout(() => msgBox.style.display = 'none', 5000);
}

// Auto-Iniciar ao carregar o DOM
window.onload = initApp;
