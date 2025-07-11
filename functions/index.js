// functions/index.js
exports.getCurrentExchangeRate = functions.https.onCall(async (data, context) => {
  try {
    const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    const apiData = await response.json();
    
    if (apiData && apiData.rates && apiData.rates.PEN) {
      const rate = apiData.rates.PEN;
      
      // Guardar en Firestore
      await admin.firestore().collection("exchange_rates").add({
        date: admin.firestore.FieldValue.serverTimestamp(),
        rateUSD_to_PEN: rate,
        source: "exchangerate-api.com",
        requestedBy: context.auth?.uid || 'anonymous'
      });
      
      return { 
        success: true, 
        rate: rate,
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error("Invalid API response");
    }
  } catch (error) {
    console.error("Error:", error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});