// JavaScript para páginas de autenticação

// Toggle para mostrar/esconder senha
function togglePassword(fieldId = 'password') {
  const input = document.getElementById(fieldId);
  const icon = input.parentElement.querySelector('.form-input-icon');
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    `;
  } else {
    input.type = 'password';
    icon.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    `;
  }
}

// Validação de email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Mostrar erro no campo
function showError(fieldId, message) {
  const input = document.getElementById(fieldId);
  input.classList.add('error');
  
  // Remove erro existente
  const existingError = input.parentElement.querySelector('.form-error');
  if (existingError) {
    existingError.remove();
  }
  
  // Adiciona novo erro
  const error = document.createElement('div');
  error.className = 'form-error';
  error.textContent = message;
  
  if (input.parentElement.classList.contains('form-input-wrapper')) {
    input.parentElement.parentElement.appendChild(error);
  } else {
    input.parentElement.appendChild(error);
  }
}

// Limpar erro do campo
function clearError(fieldId) {
  const input = document.getElementById(fieldId);
  input.classList.remove('error');
  
  const error = input.parentElement.querySelector('.form-error') || 
                input.parentElement.parentElement.querySelector('.form-error');
  if (error) {
    error.remove();
  }
}

// Loading state no botão
function setButtonLoading(button, loading) {
  if (loading) {
    button.disabled = true;
    button.classList.add('btn-loading');
    button.dataset.originalText = button.textContent;
    button.textContent = '';
  } else {
    button.disabled = false;
    button.classList.remove('btn-loading');
    button.textContent = button.dataset.originalText;
  }
}

// Formulário de Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitButton = loginForm.querySelector('button[type="submit"]');
    
    // Limpar erros anteriores
    clearError('email');
    clearError('password');
    
    // Validação
    let hasError = false;
    
    if (!emailInput.value.trim()) {
      showError('email', 'Email é obrigatório');
      hasError = true;
    } else if (!isValidEmail(emailInput.value)) {
      showError('email', 'Email inválido');
      hasError = true;
    }
    
    if (!passwordInput.value) {
      showError('password', 'Senha é obrigatória');
      hasError = true;
    } else if (passwordInput.value.length < 6) {
      showError('password', 'Senha deve ter pelo menos 6 caracteres');
      hasError = true;
    }
    
    if (hasError) return;
    
    // Login via API
    setButtonLoading(submitButton, true);
    
    try {
      // Fazer requisição ao backend
      const response = await ApiService.login(
        emailInput.value.trim(),
        passwordInput.value
      );
      
      if (response.data.success) {
        console.log('✅ Login realizado com sucesso!');
        console.log('Usuário:', ApiService.getUser());
        
        // Redirecionar para o jogo
        window.location.href = '/jogo';
      } else {
        // Mostrar mensagem de erro do backend
        const errorMessage = response.data.message || 'Email ou senha incorretos';
        showError('password', errorMessage);
        setButtonLoading(submitButton, false);
      }
      
    } catch (error) {
      console.error('❌ Erro no login:', error);
      showError('password', 'Erro ao conectar com o servidor. Tente novamente.');
      setButtonLoading(submitButton, false);
    }
  });
  
  // Limpar erros ao digitar
  ['email', 'password'].forEach(fieldId => {
    const input = document.getElementById(fieldId);
    if (input) {
      input.addEventListener('input', () => clearError(fieldId));
    }
  });
}

// Formulário de Registro
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const termsCheckbox = document.getElementById('terms');
    const submitButton = registerForm.querySelector('button[type="submit"]');
    
    // Limpar erros anteriores
    ['username', 'email', 'password', 'confirmPassword'].forEach(clearError);
    
    // Validação
    let hasError = false;
    
    if (!usernameInput.value.trim()) {
      showError('username', 'Usuário é obrigatório');
      hasError = true;
    } else if (usernameInput.value.trim().length < 3) {
      showError('username', 'Usuário deve ter pelo menos 3 caracteres');
      hasError = true;
    } else if (usernameInput.value.trim().length > 20) {
      showError('username', 'Usuário deve ter no máximo 20 caracteres');
      hasError = true;
    } else if (!/^[a-zA-Z0-9_]+$/.test(usernameInput.value.trim())) {
      showError('username', 'Usuário deve conter apenas letras, números e _');
      hasError = true;
    }
    
    if (!emailInput.value.trim()) {
      showError('email', 'Email é obrigatório');
      hasError = true;
    } else if (!isValidEmail(emailInput.value)) {
      showError('email', 'Email inválido');
      hasError = true;
    }
    
    if (!passwordInput.value) {
      showError('password', 'Senha é obrigatória');
      hasError = true;
    } else if (passwordInput.value.length < 6) {
      showError('password', 'Senha deve ter pelo menos 6 caracteres');
      hasError = true;
    } else if (passwordInput.value.length > 50) {
      showError('password', 'Senha deve ter no máximo 50 caracteres');
      hasError = true;
    }
    
    if (!confirmPasswordInput.value) {
      showError('confirmPassword', 'Confirme sua senha');
      hasError = true;
    } else if (passwordInput.value !== confirmPasswordInput.value) {
      showError('confirmPassword', 'As senhas não coincidem');
      hasError = true;
    }
    
    if (!termsCheckbox.checked) {
      alert('Você deve aceitar os Termos de Serviço e Política de Privacidade');
      hasError = true;
    }
    
    if (hasError) return;
    
    // Registro via API
    setButtonLoading(submitButton, true);
    
    try {
      // Fazer requisição ao backend
      const response = await ApiService.register(
        usernameInput.value.trim(),
        emailInput.value.trim(),
        passwordInput.value
      );
      
      if (response.data.success) {
        console.log('✅ Cadastro realizado com sucesso!');
        console.log('Usuário:', ApiService.getUser());
        
        // Redirecionar para o jogo
        window.location.href = '/jogo';
      } else {
        // Mostrar mensagens de erro do backend
        const errorMessage = response.data.message || 'Erro ao criar conta';
        
        // Se houver erros específicos de validação
        if (response.data.errors && Array.isArray(response.data.errors)) {
          // Mostrar primeiro erro em um campo relevante
          const firstError = response.data.errors[0];
          
          if (firstError.includes('username') || firstError.includes('usuário')) {
            showError('username', firstError);
          } else if (firstError.includes('email')) {
            showError('email', firstError);
          } else if (firstError.includes('senha') || firstError.includes('password')) {
            showError('password', firstError);
          } else {
            showError('email', errorMessage);
          }
        } else {
          showError('email', errorMessage);
        }
        
        setButtonLoading(submitButton, false);
      }
      
    } catch (error) {
      console.error('❌ Erro no cadastro:', error);
      showError('email', 'Erro ao conectar com o servidor. Tente novamente.');
      setButtonLoading(submitButton, false);
    }
  });
  
  // Limpar erros ao digitar
  ['username', 'email', 'password', 'confirmPassword'].forEach(fieldId => {
    const input = document.getElementById(fieldId);
    if (input) {
      input.addEventListener('input', () => clearError(fieldId));
    }
  });
}

// Login com Google (placeholder)
function loginWithGoogle() {
  console.log('🔐 Login com Google (em desenvolvimento)');
  alert('Login com Google será implementado em breve!');
}

// Login com Facebook (placeholder)
function loginWithFacebook() {
  console.log('🔐 Login com Facebook (em desenvolvimento)');
  alert('Login com Facebook será implementado em breve!');
}

// Registro com Google (placeholder)
function registerWithGoogle() {
  loginWithGoogle();
}

// Registro com Facebook (placeholder)
function registerWithFacebook() {
  loginWithFacebook();
}

// Log de página carregada
document.addEventListener('DOMContentLoaded', () => {
  const pageTitle = document.title;
  console.log(`🎲 Damas Apostas - ${pageTitle} carregada!`);
});
