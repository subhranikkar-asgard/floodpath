require('dotenv').config({path: '.env.local'});
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'User Query: "Going from Ultadanga to Park Street"',
      config: {
        responseMimeType: 'application/json',
      }
    });
    console.log('Success:', response.text);
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
