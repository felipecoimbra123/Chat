document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000';
    let socket;
    let currentUser = null;
    let currentRecipient = null;

    const loginView = document.getElementById('login-view');
    const chatView = document.getElementById('chat-view');

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const authError = document.getElementById('auth-error');

    const userList = document.getElementById('user-list');
    const currentUserDisplay = document.getElementById('current-user-display');
    const logoutBtn = document.getElementById('logout-btn');
    const welcomeMessage = document.getElementById('welcome-message');
    const chatWindow = document.getElementById('chat-window');
    const chattingWith = document.getElementById('chatting-with');
    const messages = document.getElementById('messages');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');

    const showView = (viewId) => {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
    };
    
    const authRequest = async (endpoint, body) => {
        try {
            const res = await fetch(`${API_URL}/api/auth/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            return data;
        } catch (error) {
            authError.textContent = error.message;
        }
    };

    registerBtn.addEventListener('click', async () => {
        const body = { username: usernameInput.value, password: passwordInput.value };
        const data = await authRequest('register', body);
        if (data) alert(data.message);
    });

    loginBtn.addEventListener('click', async () => {
        const body = { username: usernameInput.value, password: passwordInput.value };
        const data = await authRequest('login', body);
        if (data && data.token) {
            localStorage.setItem('token', data.token);
            currentUser = data.username;
            connectToChat();
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        socket.disconnect();
        currentUser = null;
        currentRecipient = null;
        userList.innerHTML = '';
        showView('login-view');
    });

    const connectToChat = () => {
        currentUserDisplay.textContent = currentUser;
        showView('chat-view');
        
        socket = io(API_URL);

        socket.on('connect', () => {
            const token = localStorage.getItem('token');
            socket.emit('authenticate', token);
        });

        socket.on('update-user-list', (users) => {
            userList.innerHTML = '';
            users.forEach(user => {
                if (user === currentUser) return; 
                const li = document.createElement('li');
                li.textContent = user;
                li.dataset.username = user;
                li.addEventListener('click', () => startPrivateChat(user));
                userList.appendChild(li);
            });
        });

        socket.on('private-message', ({ sender, message, createdAt }) => {
            if (sender === currentRecipient || sender === currentUser) {
                displayMessage(sender, message);
            }
        });

        socket.on('history', (history) => {
            messages.innerHTML = '';
            history.forEach(msg => displayMessage(msg.sender, msg.message));
        });
    };

    const startPrivateChat = (recipient) => {
        currentRecipient = recipient;
        
        document.querySelectorAll('#user-list li').forEach(li => li.classList.remove('active'));
        document.querySelector(`#user-list li[data-username='${recipient}']`).classList.add('active');

        welcomeMessage.classList.add('hidden');
        chatWindow.classList.remove('hidden');
        chattingWith.textContent = recipient;
        messages.innerHTML = '';

        socket.emit('load-history', recipient);
    };

    const displayMessage = (sender, message) => {
        const li = document.createElement('li');
        li.textContent = message;
        li.classList.add(sender === currentUser ? 'sent' : 'received');
        messages.appendChild(li);
        messages.scrollTop = messages.scrollHeight;
    };

    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = messageInput.value;
        if (message && currentRecipient) {
            socket.emit('private-message', { recipient: currentRecipient, message });
            messageInput.value = '';
        }
    });

    const token = localStorage.getItem('token');
    if (token) {
        try {
            currentUser = JSON.parse(atob(token.split('.')[1])).username;
            connectToChat();
        } catch (e) {
            localStorage.removeItem('token');
        }
    }
});