from flask import Flask, request, jsonify, render_template
import requests
import os
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
app = Flask(__name__)

GEMINI_API_KEY = "AIzaSyD0wMd8MtWnH1D0ArstE4bzrY0BzFgcmeo"
# Try explicit version if available
GEMINI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key={GEMINI_API_KEY}"

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/ask", methods=["POST"])
def ask():
    user_msg = request.json.get("message", "")
    farming_prompt = f"You are Kalpataru, an AI farming assistant. Answer clearly and practically. The user asks: {user_msg}"

    try:
        response = requests.post(
            GEMINI_ENDPOINT,
            headers={"Content-Type": "application/json"},
            json={"contents": [{"parts": [{"text": farming_prompt}]}]}
        )
        data = response.json()
        print("🔎 Gemini raw response:", data)

        bot_reply = None
        # safer parsing
        if "candidates" in data and data["candidates"]:
            first = data["candidates"][0]
            content = first.get("content")
            if content:
                parts = content.get("parts", [])
                if parts:
                    text = parts[0].get("text")
                    if text:
                        bot_reply = text

        if not bot_reply:
            # If there is an error field, return that
            err = data.get("error")
            if err:
                return jsonify({"reply": f"⚠️ Error from Gemini API: {err}"}), 500
            return jsonify({"reply": "⚠️ Gemini returned no usable text. Check model permissions or availability."})

        return jsonify({"reply": bot_reply})

    except Exception as e:
        return jsonify({"reply": f"⚠️ Error: {str(e)}"}), 500
if __name__ == "__main__":

    app.run(host="0.0.0.0", port=5000, debug=True)
