const fs = require('fs');
const path = require('path');

// Ubicación del archivo JSON
const rutaBD = path.join(__dirname, '../data/giras.json');

class Gira {
    // Constructor (POO)
    constructor(id, artista, nombreTour, origen, destino, aforoTotal) {
        this.id = id;
        this.artista = artista;
        this.nombreTour = nombreTour;
        this.origen = origen;
        this.destino = destino;
        this.aforoTotal = parseInt(aforoTotal);
        this.estado = "Confirmada"; // Estado por defecto según el flujo de su informe
    }

    // Método para leer todas las giras del JSON
    static obtenerTodas() {
        const datosCrudos = fs.readFileSync(rutaBD, 'utf-8');
        return JSON.parse(datosCrudos);
    }

    // Método para buscar una gira específica por ID (Rutas dinámicas)
    static obtenerPorId(id) {
        const giras = this.obtenerTodas();
        return giras.find(g => g.id === id);
    }

    // Método para guardar una nueva gira en el JSON
    static guardar(nuevaGira) {
        const giras = this.obtenerTodas();
        giras.push(nuevaGira);
        fs.writeFileSync(rutaBD, JSON.stringify(giras, null, 2));
        return nuevaGira;
    }
}

module.exports = Gira;
