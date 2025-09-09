from flask import Flask, render_template, request, jsonify
import os

app = Flask(__name__, static_url_path='', static_folder='.', template_folder='.')

# Serve the homepage (index.html)
@app.route("/")
def home():
    return app.send_static_file("index.html")

# Example chatbot API endpoint
@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        user_message = data.get("message", "")

        # Simple rule-based response (replace with your chatbot logic / AI later)
        if "hello" in user_message.lower():
            bot_reply = "Hi there! 👋 How can I help you today?"
        elif "bye" in user_message.lower():
            bot_reply = "Goodbye! Have a great day 🌱"
        else:
            bot_reply = f"You said: {user_message} (I’ll learn to respond better soon!)"

        return jsonify({"reply": bot_reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
