/**
 * Configuration du serveur backend pour iiLU
 * Modifiez BACKEND_URL avec l'URL de votre serveur local
 */

const CONFIG = {
    // ⚠️ IMPORTANT : Remplacez cette URL par celle fournie par ngrok
    // Exemple : 'https://1234-56-78-90-12.ngrok-free.app'
    BACKEND_URL: 'https://nonscholastic-ineradicable-catalina.ngrok-free.dev',
    
    // TEMPORAIRE pour les tests locaux :
    // BACKEND_URL: 'http://localhost:5000',
    
    // Ne pas modifier ci-dessous
    get API_URL() {
        return this.BACKEND_URL;
    },
    
    get WS_URL() {
        return this.BACKEND_URL;
    }
};

// Message d'avertissement si l'URL n'est pas configurée
if (CONFIG.BACKEND_URL.includes('localhost') || CONFIG.BACKEND_URL.includes('VOTRE-URL-NGROK')) {
    console.error('❌ ERREUR: Vous devez configurer BACKEND_URL avec votre URL ngrok !');
    console.error('📌 1. Lancez ngrok: ngrok http 5000');
    console.error('📌 2. Copiez l\'URL (ex: https://xxxx.ngrok-free.app)');
    console.error('📌 3. Mettez-la dans config.js');
    console.error('📌 4. Commitez et pushez sur GitHub');
} else {
    console.log('✅ Backend configuré:', CONFIG.BACKEND_URL);
}