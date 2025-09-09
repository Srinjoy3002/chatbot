from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import google.generativeai as genai
import os
from pydantic import BaseModel

# Load API Key from environment
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError("❌ No API key found. Please set GEMINI_API_KEY in environment.")

genai.configure(api_key=API_KEY)

# Create FastAPI app
app = FastAPI()

# Allow frontend JS to call backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict to your domain later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (HTML, CSS, JS)
app.mount("/static", StaticFiles(directory=".", html=True), name="static")

# Route for homepage
@app.get("/")
def serve_index():
    return FileResponse("index.html")
# Models
class ChatIn(BaseModel):
    message: str
    language: str = "en"

class ChatOut(BaseModel):
    answer: str

# Chat Endpoint
@app.post("/chat", response_model=ChatOut)
async def chat(payload: ChatIn):
    farming_keywords = ["farm", "crop", "soil", "temperature", "humidity", "water", "irrigation", "plant", "field"]

    if any(word in payload.message.lower() for word in farming_keywords):
        instructions = """
        You are 🌱 Kalpataru, an AI Farming Assistant.
        Always provide a **very detailed farming analysis** in long form.
        
        Include:
        - Optimal temperature range for the crops with reasoning
        - Soil moisture levels (explain why too low or too high is harmful)
        - Humidity levels (give ideal values + warnings)
        - Rainfall/snowfall patterns and their impact
        - Step-by-step irrigation and fertilization plan
        - Natural remedies and eco-friendly methods
        - Long-term advice for healthy growth, pest control, and soil care
        """
    else:
        instructions = "Answer in simple language, briefly."

    prompt = f"""
    The farmer said:
    "{payload.message}"

    {instructions}

    - First detect the language of the farmer’s question.
    - Reply ONLY in that same language.
    - If farming-related, give long detailed suggestions.
    - If general, keep it short and clear.
    """

    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)

    return {"answer": response.text}
# Disease Diagnosis (Image)
@app.post("/diagnose")
async def diagnose(file: UploadFile = File(...)):
    try:
        model = genai.GenerativeModel("gemini-1.5")
        img = await file.read()
        response = model.generate_content(
            [
                "You are a plant disease expert. Diagnose the crop/tree and provide **detailed natural remedies**. Avoid decorative symbols. Use farmer-friendly language.",
                {"mime_type": file.content_type, "data": img}
            ]
        )
        return {"disease_report": response.text}
    except Exception as e:
        return {"disease_report": f"⚠️ Error: Could not process the image. {str(e)}"}

# Generic File Upload
@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    try:
        content = await file.read()

        model = genai.GenerativeModel("gemini-1.5-flash")  # use correct available model
        response = model.generate_content([
            "You are 🌱 Kalpataru, an AI Farming Assistant. Read the uploaded file (it may be text, PDF, or CSV). \
            Extract useful farming information and give detailed suggestions on temperature, soil, humidity, and crop care. \
            Always answer in long form with clear farmer-friendly explanations.",
            {"mime_type": file.content_type, "data": content}
        ])

        return {"message": response.text}
    except Exception as e:
        return {"message": f"Error processing file: {str(e)}"}
