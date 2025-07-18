// functions/index.js

// --- 1. Importaciones de Módulos ---
// Módulos de Firebase para las funciones y el acceso de administrador
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Módulo para hacer llamadas a APIs externas (para el tipo de cambio)
const fetch = require("node-fetch");

// --- 2. Inicialización de Firebase Admin ---
// Esto se hace una sola vez para toda la aplicación de backend
admin.initializeApp();

// --- 3. Exportación de Cloud Functions ---

/**
 * FUNCIÓN 1: Obtiene el tipo de cambio actual de USD a PEN.
 * Se activa mediante una llamada desde el cliente (onCall).
 */
exports.getCurrentExchangeRate = functions.https.onCall(async (data, context) => {
  try {
    const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    const apiData = await response.json();
    
    if (apiData && apiData.rates && apiData.rates.PEN) {
      const rate = apiData.rates.PEN;
      
      // Opcional: Guardar un registro del tipo de cambio obtenido para auditoría
      await admin.firestore().collection("exchange_rates").add({
        date: admin.firestore.FieldValue.serverTimestamp(),
        rateUSD_to_PEN: rate,
        requestedBy: context.auth ? context.auth.uid : 'anonymous'
      });
      
      return { success: true, rate: rate };
    } else {
      throw new Error("Respuesta inválida de la API de tipo de cambio.");
    }
  } catch (error) {
    console.error("Error en getCurrentExchangeRate:", error);
    throw new functions.https.HttpsError('internal', 'Error al obtener el tipo de cambio.', error);
  }
});

/**
 * FUNCIÓN 2: Actualiza el estado de un cliente de "potencial" a "existente".
 * Se activa automáticamente cuando se crea un nuevo documento en la colección `sales`.
 */
exports.updateCustomerStatusOnFirstSale = functions.firestore
  .document('sales/{saleId}')
  .onCreate(async (snap, context) => {
    const saleData = snap.data();

    // Verificación de seguridad: nos aseguramos de que la venta tenga un cliente asociado
    if (!saleData || !saleData.customer || !saleData.customer.id) {
        console.log("La venta no tiene un ID de cliente válido. Abortando.");
        return null;
    }

    const customerId = saleData.customer.id;
    const customerRef = admin.firestore().collection("customers").doc(customerId);

    try {
        const customerDoc = await customerRef.get();

        if (!customerDoc.exists) {
            console.log(`Cliente con ID ${customerId} no fue encontrado.`);
            return null;
        }

        const customerData = customerDoc.data();

        // La regla de negocio principal: solo actuar si el cliente es "potencial"
        if (customerData.type === "potencial") {
            console.log(`Cliente ${customerId} es potencial. Actualizando a 'existente'.`);
            
            // Actualizamos el tipo y, como bonus, añadimos la fecha de la primera compra
            return customerRef.update({
                type: "existente",
                firstPurchaseDate: admin.firestore.FieldValue.serverTimestamp(), // Usa el timestamp del servidor
            });
        } else {
            console.log(`El cliente ${customerId} ya es 'existente'. No se requiere acción.`);
            return null;
        }
    } catch (error) {
        console.error("Error procesando updateCustomerStatusOnFirstSale:", error);
        return null;
    }
});