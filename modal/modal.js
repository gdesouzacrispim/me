function openModal(modalId) {
    document.getElementById(modalId).style.display = "block";
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
}

// Fecha a modal quando o usuário clica fora dela
window.onclick = function(event) {
    const modal = document.getElementById('modal1');
    if (event.target == modal) {
        closeModal('modal1');
    }
}
