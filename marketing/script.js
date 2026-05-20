// Animação do Chat Demo
const chatMessages = [
    { type: 'user', text: '🎤 (Áudio 0:05) "Quero cortar o cabelo amanhã às 14h"' },
    { type: 'ai', text: 'Deixa eu checar... ⏳' },
    { type: 'ai', text: 'Perfeito! O profissional Diego tem horário amanhã às 14:00. Posso confirmar?' },
    { type: 'user', text: 'Sim, pode confirmar!' },
    { type: 'ai', text: '✅ Agendado! Você recebeu um lembrete no seu celular. Até amanhã! ✂️' }
];

const chatContainer = document.getElementById('chat-demo');

function startChatAnimation() {
    chatContainer.innerHTML = '';
    let delay = 0;

    chatMessages.forEach((msg, index) => {
        setTimeout(() => {
            const bubble = document.createElement('div');
            bubble.className = `bubble ${msg.type}`;
            bubble.innerText = msg.text;
            chatContainer.appendChild(bubble);
            
            // Força reflow para animação
            bubble.offsetHeight;
            bubble.classList.add('show');

            // Se for a última mensagem, reinicia após um tempo
            if (index === chatMessages.length - 1) {
                setTimeout(startChatAnimation, 4000);
            }
        }, delay);
        
        delay += msg.type === 'user' ? 2000 : 1500;
    });
}

// Controle do Popup
function showDownloadPopup() {
    document.getElementById('download-popup').style.display = 'block';
}

function hideDownloadPopup() {
    document.getElementById('download-popup').style.display = 'none';
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('download-popup');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// Iniciar
window.onload = () => {
    startChatAnimation();
};
