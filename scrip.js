// Elementos del DOM
document.addEventListener('DOMContentLoaded', () => {
    loadUsersFromLocalStorage(); // Cargar usuarios al iniciar
});

const menu = document.getElementById('menu');
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const userActionsSection = document.getElementById('userActionsSection');
const userActionsBtn = document.getElementById('userActionsBtn');
const backToMenuFromActions = document.getElementById('backToMenuFromActions');

const registerOption = document.getElementById('registerOption');
const loginOption = document.getElementById('loginOption');

const backToMenuFromRegister = document.getElementById('backToMenuFromRegister');
const backToMenuFromLogin = document.getElementById('backToMenuFromLogin');

const videoRegister = document.getElementById('videoRegister');
const videoLogin = document.getElementById('videoLogin');

const registerUsernameInput = document.getElementById('registerUsername');
const deleteUsernameInput = document.getElementById('deleteUsername');

const loginBtnEntry = document.getElementById('loginBtnEntry');
const loginBtnExit = document.getElementById('loginBtnExit');
const deleteUserBtn = document.getElementById('deleteUserBtn');
const clearAllUsersBtn = document.getElementById('clearAllUsersBtn');
const showUsersBtn = document.getElementById('showUsersBtn');

// Lista de usuarios en memoria
let registeredUsers = [];

// Función para inicializar la cámara
async function startCamera(videoElement) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoElement.srcObject = stream;
    } catch (err) {
        console.error("Error al acceder a la cámara:", err);
    }
}

// Muestra la sección de acciones de usuario
userActionsBtn.addEventListener('click', () => {
    menu.style.display = 'none';
    userActionsSection.style.display = 'block';
});

// Regresa al menú principal
backToMenuFromActions.addEventListener('click', () => {
    userActionsSection.style.display = 'none';
    menu.style.display = 'block';
});


// Función para mostrar el formulario y ocultar el menú
function showForm(targetForm) {
    menu.style.display = 'none';
    registerForm.style.display = 'none';
    loginForm.style.display = 'none';
    targetForm.style.display = 'block';
}

// Función para regresar al menú principal
function backToMenu() {
    menu.style.display = 'block';
    registerForm.style.display = 'none';
    loginForm.style.display = 'none';
    stopCamera(videoRegister);
    stopCamera(videoLogin);
}

function stopCamera(videoElement) {
    if (videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
    }
}

// Función para guardar usuarios en LocalStorage
function saveUsersToLocalStorage() {
    localStorage.setItem('users', JSON.stringify(registeredUsers));
}

// Función para cargar usuarios desde LocalStorage
function loadUsersFromLocalStorage() {
    const users = localStorage.getItem('users');
    registeredUsers = users ? JSON.parse(users) : [];
    console.log("Usuarios cargados desde LocalStorage:", registeredUsers);
}

// Función para registrar un nuevo usuario
async function registerUser() {
    const username = registerUsernameInput.value.trim();
    if (!username) {
        alert("Por favor, ingresa un nombre de usuario.");
        return;
    }

    const detection = await faceapi.detectSingleFace(videoRegister, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detection) {
        alert("No se detectó ningún rostro. Intenta nuevamente.");
        return;
    }

    // Verificar si el rostro ya existe
    const isDuplicateFace = registeredUsers.some(user => {
        const distance = faceapi.euclideanDistance(user.descriptor, detection.descriptor);
        return distance < 0.6; // Umbral para detección duplicada
    });

    if (isDuplicateFace) {
        alert("Este rostro ya está registrado con otro usuario.");
        return;
    }

    registeredUsers.push({
        username,
        descriptor: Array.from(detection.descriptor)
    });

    saveUsersToLocalStorage();
    await sendToGoogleForms(username); // Enviar a Google Forms
    alert(`Usuario ${username} registrado con éxito.`);
    registerUsernameInput.value = '';

}

// Función para manejar "Marcar entrada" o "Marcar salida"
async function loginUser(action) {
    const detection = await faceapi.detectSingleFace(videoLogin, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detection) {
        alert("No se detectó ningún rostro. Intenta nuevamente.");
        return;
    }

    const userMatch = registeredUsers.find(user => {
        const distance = faceapi.euclideanDistance(user.descriptor, detection.descriptor);
        return distance < 0.6; // Umbral para coincidencia
    });

    if (userMatch) {
        alert(`${action} registrada para: ${userMatch.username}`);
    } else {
        alert("Usuario no reconocido.");
    }
}

// Función para eliminar un usuario
function deleteUser() {
    const username = deleteUsernameInput.value.trim();
    if (!username) {
        alert("Por favor, ingresa un nombre de usuario.");
        return;
    }

    registeredUsers = registeredUsers.filter(user => user.username !== username);
    saveUsersToLocalStorage();
    alert(`Usuario ${username} ha sido eliminado.`);
    deleteUsernameInput.value = '';
}

// Función para eliminar todos los usuarios
function clearAllUsers() {
    if (confirm("¿Estás seguro de eliminar todos los usuarios?")) {
        registeredUsers = [];
        localStorage.removeItem('users');
        alert("Todos los usuarios han sido eliminados.");
    }
}

// Función para mostrar todos los usuarios
function showAllUsers() {
    if (registeredUsers.length === 0) {
        alert("No hay usuarios registrados.");
    } else {
        alert(`Usuarios registrados: ${registeredUsers.map(user => user.username).join(", ")}`);
    }
}

// Asignar eventos a los botones
registerOption.addEventListener('click', () => {
    showForm(registerForm);
    startCamera(videoRegister);
});

loginOption.addEventListener('click', () => {
    showForm(loginForm);
    startCamera(videoLogin);
});

backToMenuFromRegister.addEventListener('click', backToMenu);
backToMenuFromLogin.addEventListener('click', backToMenu);

registerBtn.addEventListener('click', registerUser);
loginBtnEntry.addEventListener('click', () => loginUser("Entrada"));
loginBtnExit.addEventListener('click', () => loginUser("Salida"));
deleteUserBtn.addEventListener('click', deleteUser);
clearAllUsersBtn.addEventListener('click', clearAllUsers);
showUsersBtn.addEventListener('click', showAllUsers);

// Cargar modelos
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
]).then(() => {console.log("Modelos cargados correctamente.")
loadUsersFromLocalStorage(); // Cargar usuarios al iniciar la aplicación
});

async function sendToGoogleForms(username) {
    const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdVctRJsOLUkabaETY9CoE9SMN_KzmdhcwMmC12Z20yd3H_Zw/formResponse?usp=dialog";

    const formData = new URLSearchParams();
    formData.append("entry.1402587030", username);
    // Reemplaza con el nombre del campo de tu formulario

    try {
        const response = await fetch(formUrl, {
            method: "POST",
            body: formData,
        });

        if (response.ok || response.status === 302) {
            console.log("Usuario registrado en Google Forms:", user);
            alert(`Usuario ${user.username} registrado en la hoja.`);
        } else {
            console.warn("Respuesta inesperada al enviar datos al formulario:", response);
            alert(`Usuario ${username} se registró, pero hubo un problema con la confirmación.`);
        }
        }
        catch (err) {
            console.error("Error al conectar con Google Forms:", err);
            alert("Hubo un error al guardar el registro en Google Forms.");
        }
    }

// Enviar datos a Google Forms
async function sendToGoogleForms(username, tipoRegistro) {
    const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSeFCgpEsG5jLEEcKGaM0B8k9kGvBEAqLU4RM_FtUbqxqK-zLQ/formResponse";

    const formData = new URLSearchParams();
    formData.append("entry.1746382971", username); // ID del campo "Nombre"
    const currentTime = new Date().toLocaleTimeString();

    if (tipoRegistro === "Entrada") {
        formData.append("entry.2036839321", currentTime); // Hora de Entrada
    } else if (tipoRegistro === "Salida") {
        formData.append("entry.1232266359", currentTime); // Hora de Salida
    }

    try {
        await fetch(formUrl, { method: "POST", body: formData, mode: "no-cors" });
        alert(`${tipoRegistro} registrada para ${username} a las ${currentTime}`);
    } catch (error) {
        console.error("Error al enviar datos a Google Forms:", error);
        alert(`Error al registrar ${tipoRegistro}.`);
    }
}

// Función para Marcar Entrada/Salida
async function loginUser(tipoRegistro) {
    const detection = await faceapi.detectSingleFace(videoLogin, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
    if (!detection) {
        alert("No se detectó ningún rostro.");
        return;
    }

    const userMatch = registeredUsers.find(user => faceapi.euclideanDistance(user.descriptor, detection.descriptor) < 0.6);
    if (userMatch) {
        await sendToGoogleForms(userMatch.username, tipoRegistro);
    } else {
        alert("Usuario no reconocido.");
    }
}




    

