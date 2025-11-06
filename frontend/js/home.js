// JavaScript para a página inicial

// Redirecionamentos
function redirectToGame() {
  window.location.href = '/jogo';
}

function redirectToLogin() {
  // Por enquanto redireciona para o jogo
  // Mais tarde pode criar página de login separada
  window.location.href = '/jogo';
}

function redirectToRegister() {
  // Por enquanto redireciona para o jogo
  // Mais tarde pode criar página de registro separada
  window.location.href = '/jogo';
}

// Smooth scroll para seções
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Animação de entrada para elementos
function observeElements() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-in');
      }
    });
  }, {
    threshold: 0.1
  });

  document.querySelectorAll('section').forEach(section => {
    observer.observe(section);
  });
}

// Inicializar quando página carregar
document.addEventListener('DOMContentLoaded', () => {
  observeElements();
  
  // Log de página carregada
  console.log('🎲 Damas Apostas - Página inicial carregada!');
  
  // Atualizar lobbies ativos (simulação)
  updateLiveLobbies();
});

// Simular atualização de lobbies ativos
function updateLiveLobbies() {
  // Aqui você pode fazer requisição ao servidor para pegar lobbies reais
  console.log('📊 Lobbies atualizados');
  
  // Exemplo: atualizar a cada 10 segundos
  setTimeout(updateLiveLobbies, 10000);
}

// Adicionar efeito de hover nos cards
document.querySelectorAll('.feature-card, .lobby-card').forEach(card => {
  card.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-5px)';
  });
  
  card.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0)';
  });
});

// Menu mobile (adicionar depois se necessário)
function toggleMobileMenu() {
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenu) {
    mobileMenu.classList.toggle('hidden');
  }
}

// Analytics de cliques (opcional)
document.querySelectorAll('button').forEach(button => {
  button.addEventListener('click', function() {
    console.log('Botão clicado:', this.textContent);
  });
});
